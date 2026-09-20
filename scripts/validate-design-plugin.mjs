import { readFile, readdir, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const pluginDir = "\.claude/skills/frontend-design";
const craftRubric = "agent/rubrics/design-craft.md";
const neutralDesignSkill = "\.agents/skills/frontend-design/SKILL.md";
const errors = [];

const read = async (relativePath) => {
  try {
    return (await readFile(new URL(relativePath, root), "utf8")).replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
};

const exists = async (relativePath) => {
  try {
    return (await stat(new URL(relativePath, root))).isFile();
  } catch {
    return false;
  }
};

// The vendored plugin must be intact. Claude Code discovers it in place, so a missing
// file here silently removes the craft guidance from every phase worker.
const manifestPath = `${pluginDir}/.claude-plugin/plugin.json`;
const manifestText = await read(manifestPath);

if (manifestText === null) {
  errors.push(`${manifestPath} is missing. The vendored frontend-design plugin will not load.`);
} else {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    errors.push(`${manifestPath} is not valid JSON: ${error.message}`);
  }
  if (manifest && manifest.name !== "frontend-design") {
    errors.push(`${manifestPath} declares name "${manifest.name}"; the workflow references "frontend-design".`);
  }
}

for (const required of ["LICENSE.txt", "NOTICE.md", "skills/frontend-design/SKILL.md"]) {
  const path = `${pluginDir}/${required}`;
  const contents = await read(path);
  if (contents === null) errors.push(`${path} is missing.`);
  else if (contents.trim().length < 200) errors.push(`${path} is present but effectively empty.`);
}

// The craft standard is the vendor-neutral authority both Claude and Codex satisfy.
const craftText = await read(craftRubric);
if (craftText === null) errors.push(`${craftRubric} is missing.`);
else if (craftText.trim().length < 500) errors.push(`${craftRubric} is present but effectively empty.`);

// The rubric is the bar; the method file is how an agent gets there. Claude reads the
// vendored copy for that, Codex reads this one. A stub here would leave the Codex path
// with the standard and no method, which is the gap this file exists to close, so the
// length floor matches the rubric's rather than the vendored plugin's.
const neutralDesignText = await read(neutralDesignSkill);
if (neutralDesignText === null) {
  errors.push(`${neutralDesignSkill} is missing. The Codex path would lose its design method.`);
} else {
  if (neutralDesignText.trim().length < 500) {
    errors.push(`${neutralDesignSkill} is present but effectively empty.`);
  }
  // Method never outranks the standard, so the file has to say so in the one place an
  // agent is guaranteed to look: its own text.
  if (!neutralDesignText.includes(craftRubric)) {
    errors.push(`${neutralDesignSkill} does not reference ${craftRubric}, so nothing tells a reader which one wins.`);
  }
  // Same rule as the vendor-neutral orchestrator skill in validate-skill-parity.mjs:
  // nothing on this path can open a `.claude/` file, so naming one is a dead reference.
  for (const [index, line] of neutralDesignText.split("\n").entries()) {
    if (line.includes("\.claude/")) {
      errors.push(
        `${neutralDesignSkill}:${index + 1} names a \.claude/ path, which the vendor-neutral path cannot read: ${line.trim()}`,
      );
    }
  }
}

// Resolve a `skills:` frontmatter entry to the SKILL.md it names. A skill Claude Code
// cannot resolve is skipped with only a debug-log warning, so an unresolvable entry has
// to fail here or the preload quietly stops happening.
const skillCandidates = (entry) => {
  if (entry.includes(":")) {
    const [plugin, skill] = entry.split(":");
    return [`\.claude/skills/${plugin}/skills/${skill}/SKILL.md`, `\.claude/skills/${plugin}/SKILL.md`];
  }
  return [`\.claude/skills/${entry}/SKILL.md`, `\.claude/skills/${entry}/skills/${entry}/SKILL.md`];
};

const frontmatterSkills = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  const lines = match[1].split("\n");
  const start = lines.findIndex((line) => line.trim() === "skills:");
  if (start === -1) return [];
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s+-\s+(\S+)\s*$/);
    if (!item) break;
    entries.push(item[1]);
  }
  return entries;
};

const agentDir = "\.claude/agents";
const agentFiles = (await readdir(new URL(agentDir, root))).filter(
  (name) => name.endsWith(".md") && name !== "README.md",
);

let preloadCount = 0;
for (const name of agentFiles) {
  const path = `${agentDir}/${name}`;
  const text = await read(path);
  if (text === null) continue;
  for (const entry of frontmatterSkills(text)) {
    preloadCount += 1;
    const candidates = skillCandidates(entry);
    const resolved = await Promise.all(candidates.map(exists));
    if (!resolved.some(Boolean)) {
      errors.push(
        `${path} preloads skill "${entry}", which resolves to no SKILL.md. Tried: ${candidates.join(", ")}.`,
      );
    }
  }
  // Reading the vendored file by path is the only mechanism that works on every
  // surface, so that path must not rot.
  for (const [, quoted] of text.matchAll(/`(\.claude\/skills\/[^`]*SKILL\.md)`/g)) {
    if (!(await exists(quoted))) errors.push(`${path} references \`${quoted}\`, which does not exist.`);
  }
}

// The three design agents must each instruct a read of the vendored guidance.
// `skills:` preload is not a substitute: it resolves in a local session but not
// on Claude Code on the web, where it is skipped with only a debug-log warning,
// so an agent relying on it would silently lose the craft standard for learners.
const vendoredSkill = `${pluginDir}/skills/frontend-design/SKILL.md`;
for (const name of ["design-worker.md", "implementation-worker.md", "visual-auditor.md"]) {
  const path = `${agentDir}/${name}`;
  const text = await read(path);
  if (text === null) {
    errors.push(`${path} is missing.`);
  } else if (!text.includes(vendoredSkill)) {
    errors.push(`${path} no longer instructs a read of ${vendoredSkill}.`);
  }
}

// The orchestrator instruction files are read before any agent definition, so a stale
// path there reaches a worker first: it gets copied into a packet, and the packet then
// points at a file that does not exist. Any backticked SKILL.md path here must resolve,
// exactly as it must inside .claude/agents/.
for (const path of ["CLAUDE.md", "AGENTS.md"]) {
  const text = await read(path);
  if (text === null) {
    errors.push(`${path} is missing.`);
    continue;
  }
  for (const [, quoted] of text.matchAll(/`(\.claude\/skills\/[^`]*SKILL\.md)`/g)) {
    if (!(await exists(quoted))) errors.push(`${path} references \`${quoted}\`, which does not exist.`);
  }
}

// CLAUDE.md must carry the full skill path outright, not merely whenever it happens to
// mention the plugin directory. A conditional check passes by default the moment the
// paragraph is deleted wholesale, which is the failure that leaves the Claude main task
// with no pointer to its method file while the build stays green. AGENTS.md is held to
// the same standard for its own method file in mustReferenceNeutralDesign below.
const claudeInstructions = await read("CLAUDE.md");
if (claudeInstructions !== null && !claudeInstructions.includes(vendoredSkill)) {
  errors.push(
    `CLAUDE.md does not name ${vendoredSkill}. ` +
      "The plugin directory holds no SKILL.md, so the shorthand alone sends a worker to a path with no file at the end.",
  );
}

// The craft standard has to stay referenced on both vendor paths and in the phase
// modules, or the rubric becomes a file nothing reads.
const mustReferenceCraft = [
  "\.claude/agents/design-worker.md",
  "\.claude/agents/implementation-worker.md",
  "\.claude/agents/visual-auditor.md",
  "\.codex/agents/design-worker.toml",
  "\.codex/agents/implementation-worker.toml",
  "\.codex/agents/visual-auditor.toml",
  "agent/phases/design-discovery.md",
  "agent/phases/design-review.md",
  "agent/phases/implementation.md",
  "agent/rubrics/design-review.md",
  // Both entry files, so that deleting a design paragraph from either one fails here
  // rather than silently leaving that vendor's main task without the standard.
  "CLAUDE.md",
  "AGENTS.md",
];

for (const path of mustReferenceCraft) {
  const text = await read(path);
  if (text === null) errors.push(`${path} is missing.`);
  else if (!text.includes(craftRubric)) errors.push(`${path} no longer references ${craftRubric}.`);
}

// Codex discovers `.agents/skills/` by itself, but discovery is a convenience for the main
// task, not a delivery guarantee for a worker — and a discovery mechanism that fails does so
// quietly, which is exactly how the `skills:` preload defect hid. So the Codex design agents
// name the method file and read it by path, and the Codex entry file points the main task at
// it for the runs where no subagent is available.
const mustReferenceNeutralDesign = [
  "\.codex/agents/design-worker.toml",
  "\.codex/agents/implementation-worker.toml",
  "\.codex/agents/visual-auditor.toml",
  "AGENTS.md",
];

for (const path of mustReferenceNeutralDesign) {
  const text = await read(path);
  if (text === null) errors.push(`${path} is missing.`);
  else if (!text.includes(neutralDesignSkill)) {
    errors.push(`${path} no longer instructs a read of ${neutralDesignSkill}.`);
  }
}

if (errors.length) {
  console.error("Design plugin validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Vendored frontend-design plugin is intact and the three Claude design agents read it by path, ` +
    `${neutralDesignSkill} is intact and the three Codex design agents read it by path, ` +
    `${preloadCount} optional skill preload(s) resolve, and ${craftRubric} is referenced everywhere it must be.`,
);
