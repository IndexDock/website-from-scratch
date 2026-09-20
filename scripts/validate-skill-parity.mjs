import { readFile } from "node:fs/promises";

// The orchestrator skill exists twice because no vendor reads the other's directory:
// Claude Code loads `.claude/skills/`, and anything following AGENTS.md loads
// `.agents/skills/`. Two copies that drift are how a rule silently stops applying on one
// surface, which is the same failure mode that once hid the frontend-design preload
// defect. So the copies must be identical — with no exceptions carved out of the
// comparison, for the reason described below.
const root = new URL("../", import.meta.url);
const neutralPath = "\.agents/skills/indexdock-website/SKILL.md";
const claudePath = "\.claude/skills/indexdock-website/SKILL.md";
const errors = [];

// This file used to allow one pinned `<!-- claude-only:start -->` block, because the
// vendored design plugin lives under `.claude/` and the vendor-neutral copy cannot name
// that path. The block was removed once each path gained its own design method file:
// there were then two vendor-specific paragraphs to carry, not one, and a mechanism that
// admits exactly one pinned exception could not hold the second.
//
// The instruction that replaced it names no path at all — each orchestrator is told to
// read the method file *its own instruction file names* — so it is true on both paths and
// lives in the shared body.
//
// Nothing was given up in the trade. The block's purpose was to guarantee that Claude's
// orchestrator still had a pointer to its guidance; that guarantee now sits in
// `validate-design-plugin.mjs`, which requires CLAUDE.md to name the vendored skill path,
// AGENTS.md to name the vendor-neutral one, and both to name the craft rubric —
// unconditionally, so deleting a paragraph fails the build rather than passing by default.
// That check is symmetric, which the block never was.
//
// So: vendor-specific text belongs in CLAUDE.md or AGENTS.md, and this pair stays
// identical. Reintroducing the markers would reopen the drift this file exists to stop,
// and is rejected below rather than silently accepted.
const removedMarkers = ["<!-- claude-only:start -->", "<!-- claude-only:end -->"];

const read = async (relativePath) => {
  try {
    return (await readFile(new URL(relativePath, root), "utf8")).replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
};

const neutral = await read(neutralPath);
const claude = await read(claudePath);

if (neutral === null) errors.push(`${neutralPath} is missing.`);
if (claude === null) errors.push(`${claudePath} is missing.`);

if (neutral !== null && claude !== null) {
  for (const [path, text] of [
    [neutralPath, neutral],
    [claudePath, claude],
  ]) {
    for (const marker of removedMarkers) {
      if (text.includes(marker)) {
        errors.push(
          `${path} uses ${marker}. Vendor-only blocks were removed from this pair: the two design ` +
            "method files made a single pinned exception unworkable, and each vendor's own path is " +
            "now named in CLAUDE.md or AGENTS.md instead. Put vendor-specific text there.",
        );
      }
    }
  }

  // Neither copy may name a Claude path. For the neutral copy that is a correctness rule —
  // nothing on that path can open a `.claude/` file. For the Claude copy it follows from
  // the files being identical, and it is the check that keeps a well-meaning edit from
  // adding a Claude-only sentence here instead of in CLAUDE.md, where it belongs.
  for (const [path, text] of [
    [neutralPath, neutral],
    [claudePath, claude],
  ]) {
    for (const [index, line] of text.split("\n").entries()) {
      if (line.includes("\.claude/")) {
        errors.push(
          `${path}:${index + 1} names a \.claude/ path. This pair is shared by every vendor, so a ` +
            `vendor-specific path belongs in CLAUDE.md or AGENTS.md: ${line.trim()}`,
        );
      }
    }
  }

  if (claude.trimEnd() !== neutral.trimEnd()) {
    errors.push(`${claudePath} and ${neutralPath} differ. They carry one body and must be identical.`);
  }
}

if (errors.length) {
  console.error("Skill parity validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`${claudePath} and ${neutralPath} are identical; neither carries vendor-specific text.`);
