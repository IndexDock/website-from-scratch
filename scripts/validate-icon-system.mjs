import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

// Enforces agent/contracts/icons.md, which answers habit #12 in the AI design bias
// catalogue: emoji, dingbats and stray arrows dropped inline. Two jobs.
//
// 1. Integrity. The vendored set, its licence, its notice and the Icon component are all
//    present and internally consistent, and every file that has to name the contract still
//    does. Same shape as validate-design-plugin.mjs, for the same reason: a rule nothing
//    reads is not a rule.
// 2. The glyph gate. No emoji, dingbat, arrow or separator character appears anywhere in
//    the rendered site's source. This is the part a human reviewer reliably misses, because
//    a stray arrow looks fine until you notice it came from a different font.
//
// O(n) time in the total bytes of scanned source plus the number of vendored icon files.
// O(m) space for m findings, which is zero on a passing run.

const root = process.cwd();
const errors = [];
const note = (message) => errors.push(message);

const read = async (relativePath) => {
  try {
    return (await readFile(resolve(root, relativePath), "utf8")).replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
};

const requireFile = async (relativePath, minimumLength) => {
  const text = await read(relativePath);
  if (text === null) note(`${relativePath} is missing.`);
  else if (text.trim().length < minimumLength) note(`${relativePath} is present but effectively empty.`);
  return text;
};

// ---------------------------------------------------------------------------
// 1. Integrity
// ---------------------------------------------------------------------------

const contract = "agent/contracts/icons.md";
const selectionPath = "src/icons/selection.json";

await requireFile(contract, 1000);
await requireFile("src/icons/LICENSE.txt", 500);
await requireFile("src/icons/NOTICE.md", 500);
await requireFile("src/components/Icon.astro", 500);

const selectionText = await read(selectionPath);
let selection = null;
if (selectionText === null) {
  note(`${selectionPath} is missing. Nothing records which icons are vendored.`);
} else {
  try {
    selection = JSON.parse(selectionText);
  } catch (error) {
    note(`${selectionPath} is not valid JSON: ${error.message}`);
  }
}

if (selection) {
  const shapes = Object.keys(selection.arrowShapes ?? {});
  const arrowGroups = selection.groups?.arrows ?? {};

  // Every arrow declares exactly one shape family, so the deferred typography-matching
  // rule has a second axis to read rather than having to re-derive it by eye.
  const undeclared = Object.keys(arrowGroups).filter((shape) => !shapes.includes(shape));
  if (undeclared.length) {
    note(`${selectionPath} groups arrows under ${undeclared.join(", ")}, which arrowShapes does not describe.`);
  }
  const unusedShapes = shapes.filter((shape) => !(shape in arrowGroups));
  if (unusedShapes.length) {
    note(`${selectionPath} describes shape families with no arrows in them: ${unusedShapes.join(", ")}.`);
  }

  const owner = new Map();
  const allNames = new Set();
  for (const [group, contents] of Object.entries(selection.groups ?? {})) {
    const lists = Array.isArray(contents) ? { [group]: contents } : contents;
    for (const [subgroup, names] of Object.entries(lists)) {
      for (const name of names) {
        if (owner.has(name)) note(`${selectionPath} lists "${name}" in both ${owner.get(name)} and ${subgroup}.`);
        owner.set(name, subgroup);
        allNames.add(name);
      }
    }
  }

  // Arrows are vendored for three shape families only (straight, caret, bend-round), a
  // deliberate size cut against Phosphor's full twelve-family ARROWS category rather than
  // the complete vocabulary. Growing coverage is a recorded decision in src/icons/NOTICE.md,
  // not a default this check re-imposes.

  // Every selected name resolves in every declared weight. sync-icons.mjs --check compares
  // file contents; this confirms the set is complete before anything reads from it.
  let missingFiles = 0;
  for (const weight of selection.weights ?? []) {
    for (const name of allNames) {
      try {
        await stat(resolve(root, "src/icons/phosphor", weight, `${name}.svg`));
      } catch {
        missingFiles += 1;
        if (missingFiles <= 5) note(`src/icons/phosphor/${weight}/${name}.svg is missing.`);
      }
    }
  }
  if (missingFiles > 5) note(`… and ${missingFiles - 5} further vendored icon files are missing.`);

  for (const [name, weights] of Object.entries(selection.brand ?? {})) {
    for (const weight of weights) {
      try {
        await stat(resolve(root, "src/icons/brand", `${name}-${weight}.svg`));
      } catch {
        note(`src/icons/brand/${name}-${weight}.svg is missing, but selection.json declares it.`);
      }
    }
  }
}

// The contract has to stay referenced on both vendor paths and in the phases that build
// and check a page, or it becomes a file nothing reads. Mirrors mustReferenceCraft in
// scripts/validate-design-plugin.mjs.
const mustReferenceContract = [
  ".claude/agents/design-worker.md",
  ".claude/agents/implementation-worker.md",
  ".claude/agents/visual-auditor.md",
  ".claude/agents/accessibility-auditor.md",
  ".codex/agents/design-worker.toml",
  ".codex/agents/implementation-worker.toml",
  ".codex/agents/visual-auditor.toml",
  ".codex/agents/accessibility-auditor.toml",
  "agent/contracts/README.md",
  "agent/phases/design-discovery.md",
  "agent/phases/implementation.md",
  "agent/phases/quality-review.md",
  "agent/rubrics/design-craft.md",
  ".agents/skills/frontend-design/SKILL.md",
  "CLAUDE.md",
  "AGENTS.md",
];

for (const path of mustReferenceContract) {
  const text = await read(path);
  if (text === null) {
    note(`${path} is missing.`);
    continue;
  }
  // The contracts index sits beside the contracts and lists them by bare filename, so it
  // is the one file where the full path would be the odd spelling out.
  const expected = path === "agent/contracts/README.md" ? "icons.md" : contract;
  if (!text.includes(expected)) note(`${path} no longer references ${expected}.`);
}

// ---------------------------------------------------------------------------
// 2. The glyph gate
// ---------------------------------------------------------------------------

// Only the rendered site is scanned. agent/, project/, README.md and docs/ use "→"
// correctly to describe real UI navigation — "Add file → Upload files" — and none of that
// reaches a page. Habit #12 is about the shipped site, not about documentation prose.
const scanRoots = ["src", "public"];
// Full-path match, not by-name: only the vendored icon set is skipped, not any directory
// that happens to be called "icons" (a learner's public/icons/ favicons, say).
const skipPaths = new Set(["src/icons"]);
// Concepts under public/design-review/ are meant to differ from each other, including on
// icon weight and arrow shape, so the design worker can compare real options before one is
// picked; agent/phases/design-review.md and the design-worker prompts say so explicitly.
// The rule below still applies once a concept is promoted into the shipped site.
const oneWeightExemptPaths = new Set(["public/design-review"]);
const scanExtensions = new Set([".astro", ".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".json", ".svg", ".txt"]);

// Characters that trip a rule below but are legitimate: the legal marks a footer needs.
const allowedCharacters = new Set(["©", "®", "™"]);

// Order matters: the structural ranges are checked before the emoji catch-all, because
// several arrows and dingbats are also Extended_Pictographic and "arrow" is the label that
// tells a reader what to do about it.
const rules = [
  { label: "arrow", pattern: /[←-⇿⟰-⟿⤀-⥿⬀-⯿]/u },
  { label: "dingbat", pattern: /[✀-➿]/u },
  { label: "separator glyph", pattern: /[·•‣▪▫●◦▸►]/u },
  { label: "emoji", pattern: /\p{Extended_Pictographic}|\p{Regional_Indicator}|️/u },
];

// `|` is ordinary TypeScript union-type syntax in .astro frontmatter (ContactLink.astro's
// `channel: "telegram" | "viber"`, and more like it in SeoHead.astro and BaseLayout.astro), so
// it cannot join the universal rule above without flagging legitimate code. It gets its own
// pass instead, narrowed to what a visitor actually sees: an .astro file's template portion
// (everything after the closing `---` of frontmatter — a file with no frontmatter delimiter is
// scanned in full) and .html files outright. Never the frontmatter itself, and never
// .ts/.tsx/.js/.mjs/.json/.css.
const pipeRule = { label: "separator glyph" };

// Returns the template portion of an .astro file's source, plus the 1-based line number where
// that portion begins in the full file, so findings still point at the right line.
const templatePortion = (text) => {
  const frontmatter = text.match(/^---\n[\s\S]*?\n---\n/);
  if (!frontmatter) return { template: text, startLine: 1 };
  return { template: text.slice(frontmatter[0].length), startLine: frontmatter[0].split("\n").length };
};

const suggestions = new Map([
  ["→", 'an <Icon name="arrow-right" />'],
  ["←", 'an <Icon name="arrow-left" />'],
  ["↑", 'an <Icon name="arrow-up" />'],
  ["↓", 'an <Icon name="arrow-down" />'],
  ["↗", 'an <Icon name="arrow-up-right" />'],
  ["↳", 'an <Icon name="arrow-bend-down-right" />'],
  ["➔", 'an <Icon name="arrow-right" />'],
  ["✓", 'an <Icon name="check" />'],
  ["✔", 'an <Icon name="check-fat" />'],
  ["✗", 'an <Icon name="x" />'],
  ["✘", 'an <Icon name="x" />'],
  ["★", 'an <Icon name="star" weight="fill" />'],
  ["·", "separate elements, or plain punctuation"],
  ["•", "a list, or separate elements the eye can count"],
  ["|", "separate elements, or plain punctuation"],
]);

const listFiles = async (directory) => {
  let entries;
  try {
    entries = await readdir(resolve(root, directory), { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return skipPaths.has(path) ? [] : listFiles(path);
      const dot = entry.name.lastIndexOf(".");
      return dot > 0 && scanExtensions.has(entry.name.slice(dot)) ? [path] : [];
    }),
  );
  return nested.flat();
};

const allowComment = /icons-allow:\s*\S/;
const findings = [];

for (const scanRoot of scanRoots) {
  for (const path of await listFiles(scanRoot)) {
    const text = await read(path);
    if (text === null) continue;
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      // An exception is allowed, but it has to be written down with a reason, on the
      // offending line or the one above it. A suppression nobody can explain is a defect
      // with a comment on it.
      if (allowComment.test(line) || (index > 0 && allowComment.test(lines[index - 1]))) continue;
      for (const character of line) {
        if (allowedCharacters.has(character)) continue;
        const rule = rules.find(({ pattern }) => pattern.test(character));
        if (!rule) continue;
        const codepoint = character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
        const replacement = suggestions.get(character) ?? "an <Icon />, or nothing";
        findings.push(
          `${path}:${index + 1}:${line.indexOf(character) + 1} `
            + `${rule.label} "${character}" (U+${codepoint}) — use ${replacement}.`,
        );
        break;
      }
    }
  }
}

for (const scanRoot of scanRoots) {
  for (const path of await listFiles(scanRoot)) {
    if (!path.endsWith(".astro") && !path.endsWith(".html")) continue;
    const text = await read(path);
    if (text === null) continue;
    const { template, startLine } = path.endsWith(".astro")
      ? templatePortion(text)
      : { template: text, startLine: 1 };
    const lines = template.split("\n");
    for (const [index, line] of lines.entries()) {
      if (allowComment.test(line) || (index > 0 && allowComment.test(lines[index - 1]))) continue;
      for (const character of line) {
        if (character !== "|") continue;
        const fileLine = startLine + index;
        const codepoint = character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
        const replacement = suggestions.get(character) ?? "an <Icon />, or nothing";
        findings.push(
          `${path}:${fileLine}:${line.indexOf(character) + 1} `
            + `${pipeRule.label} "${character}" (U+${codepoint}) — use ${replacement}.`,
        );
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. One weight, one arrow shape family
// ---------------------------------------------------------------------------

// The two binding rules in agent/contracts/icons.md are checkable, so they are checked
// rather than left to review. Both are about consistency across a whole site, which is
// precisely the kind of thing that survives a page-by-page read and only shows up when
// someone looks at two pages side by side.
if (selection) {
  const site = await read("src/data/site.ts");
  const declaredWeight = site?.match(/iconWeight:\s*"(\w+)"/)?.[1];
  const declaredShape = site?.match(/arrowShape:\s*"([\w-]+)"/)?.[1];

  if (!declaredWeight) note("src/data/site.ts does not declare iconWeight, so no weight rule can be enforced.");
  if (!declaredShape) note("src/data/site.ts does not declare arrowShape, so no arrow rule can be enforced.");

  const shapeOf = new Map();
  for (const [shape, names] of Object.entries(selection.groups?.arrows ?? {})) {
    for (const name of names) shapeOf.set(name, shape);
  }

  // Brand marks are vendored in whichever weights they were drawn at, not all six, and
  // agent/contracts/icons.md names this as the one place a weight mismatch is expected
  // and accepted rather than a defect the rule below should catch.
  const brandWeights = new Map(Object.entries(selection.brand ?? {}));

  const usages = [];
  for (const scanRoot of scanRoots) {
    for (const path of await listFiles(scanRoot)) {
      const text = await read(path);
      if (text === null || !text.includes("<Icon")) continue;
      // Matched across the whole file, not line by line, so a tag wrapped across several
      // lines is still seen. The line number is recovered from the match's offset.
      for (const match of text.matchAll(/<Icon\b([^>]*)>/gs)) {
        const tag = match[1];
        const name = tag.match(/\bname="([\w-]+)"/)?.[1];
        if (!name) continue;
        const line = text.slice(0, match.index).split("\n").length;
        usages.push({ path, line, name, weight: tag.match(/\bweight="(\w+)"/)?.[1] });
      }
    }
  }

  const isExempt = (path) => [...oneWeightExemptPaths].some((exempt) => path === exempt || path.startsWith(`${exempt}/`));
  const enforceableUsages = usages.filter((usage) => !isExempt(usage.path));

  // `fill` is the solid partner of any stroked weight, so it stays available for brand
  // marks and for the solid half of an empty/filled pair. Every other override means two
  // stroke weights on one page, which is the defect.
  for (const { path, line, name, weight } of enforceableUsages) {
    if (!weight || weight === declaredWeight) continue;
    if (brandWeights.get(name)?.includes(weight)) continue;
    if (weight !== "fill") {
      note(
        `${path}:${line} renders <Icon name="${name}" weight="${weight}" /> while the site weight is `
          + `"${declaredWeight}". Two stroke weights on one site read as an accident. Drop the override, `
          + 'or use "fill" if this is a brand mark or a solid state.',
      );
    }
  }

  const usedShapes = new Map();
  for (const { path, line, name } of enforceableUsages) {
    const shape = shapeOf.get(name);
    if (!shape) continue;
    if (!usedShapes.has(shape)) usedShapes.set(shape, `${path}:${line} (${name})`);
  }
  for (const [shape, where] of usedShapes) {
    if (declaredShape && shape !== declaredShape) {
      note(
        `${where} uses an arrow from the "${shape}" family, but src/data/site.ts declares "${declaredShape}". `
          + "One arrow shape family per site: mixing a rounded turn with a sharp one is as visible as "
          + "mixing two typefaces by accident.",
      );
    }
  }
}

if (findings.length) {
  note(
    `${findings.length} stray glyph(s) in the rendered site. These come from a fallback font, so their `
      + "weight, size and baseline never match the words around them, and emoji look different on every "
      + "operating system. Replace each with src/components/Icon.astro, or remove it. "
      + "See agent/contracts/icons.md. If one is genuinely correct, put "
      + "`icons-allow: <reason>` in a comment on or above that line.",
  );
  for (const finding of findings.slice(0, 40)) note(`  ${finding}`);
  if (findings.length > 40) note(`  … and ${findings.length - 40} more.`);
}

if (errors.length) {
  console.error("Icon system validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const arrowTotal = Object.values(selection.groups?.arrows ?? {}).reduce((total, list) => total + list.length, 0);
console.log(
  `Icon system is intact: ${arrowTotal} arrows across ${Object.keys(selection.arrowShapes ?? {}).length} shape families, `
    + `${Object.keys(selection.groups ?? {}).length} groups, ${(selection.weights ?? []).length} weights, `
    + `${contract} is referenced everywhere it must be, and no stray glyphs in ${scanRoots.join(" or ")}.`,
);
