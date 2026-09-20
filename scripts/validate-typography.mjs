import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

// Enforces agent/contracts/typography.md, which answers two habits in display type: headings
// left at inherited body leading, and headlines whose line breaks fall wherever the container
// ends. Both read as generated for a mechanical reason, and both are checkable, so they are
// checked here rather than left to a review pass.
//
// Four jobs.
//
//   1. Integrity. The contract exists, is not a stub, and every file that has to name it
//      still does. Same shape as validate-icon-system.mjs: a rule nothing reads is not a
//      rule.
//   2. The scale. src/styles/global.css :root defines exactly the three leading tokens,
//      each unitless and each inside its stated range.
//   3. The base rule. One rule sets line-height on all six heading elements to the heading
//      token, so every heading has a defined leading rather than the browser default.
//   4. The leading gate. Every line-height declaration anywhere in src/ is one of the three
//      tokens (or a written-down exception), no line-height hides inside a font: shorthand,
//      and every rule that opts into the display token also shapes its headline block.
//
// O(n) time in the total bytes of scanned CSS plus the number of files under src/. O(m)
// space for m findings, which is zero on a passing run. The CSS scan is a light hand-rolled
// pass — a brace-matching tokeniser and a handful of line regexes — not a full CSS parser,
// for the same reason validate-icon-system.mjs hand-rolls its glyph scan: the surface is
// small, the shapes it has to recognise are few, and a parser dependency the learner never
// installs is a worse trade than a scan a reader can follow.

const root = process.cwd();
const contract = "agent/contracts/typography.md";
const errors = [];
const note = (message) => errors.push(message);

const read = async (relativePath) => {
  try {
    return (await readFile(resolve(root, relativePath), "utf8")).replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
};

// Blanks the parts of a stylesheet that must not be read as CSS syntax — /* ... */ comment
// bodies and the insides of "..." / '...' string literals — replacing each character with a
// space while keeping newlines, so the result is the same length as the original and a
// character index maps to the same line in both. Blanking string bodies matters because a
// `{` or `}` inside `content: "{"` would otherwise desync the brace matcher. The
// leading-allow: and headline-shaped: comments are read from the RAW lines, by line number,
// before this runs — this pass only needs to stop a comment or string body from being
// mistaken for a declaration or a brace. O(n) in the length of the CSS.
const stripInert = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(
      /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g,
      (string) => string[0] + string.slice(1, -1).replace(/[^\n]/g, " ") + string[string.length - 1],
    );

// ---------------------------------------------------------------------------
// 1. Integrity
// ---------------------------------------------------------------------------

const contractText = await read(contract);
if (contractText === null) {
  note(`${contract} is missing. The typography rules have no home.`);
} else if (contractText.trim().length < 1500) {
  // The contract carries the leading scale, the WCAG framing, the shaping rule and the
  // scope, so a copy shorter than this is a stub that lost one of them.
  note(`${contract} is present but far shorter than a complete contract (under 1500 characters).`);
}

// The contract has to stay referenced wherever a binding contract is named on design and
// implementation work, or it becomes a file nothing reads. This list mirrors the set that
// references agent/contracts/icons.md, minus the icon-data-specific files (the vendored
// set's own NOTICE, the icon gate itself), plus the design-review rubric and the
// accessibility auditor, because tight display leading is a review concern and descender
// collision is an accessibility one. Every path is verified to exist below.
const mustReferenceContract = [
  "CLAUDE.md",
  "AGENTS.md",
  "agent/contracts/README.md",
  "agent/rubrics/design-craft.md",
  "agent/rubrics/design-review.md",
  "agent/templates/qa-report.md",
  "agent/phases/design-discovery.md",
  "agent/phases/implementation.md",
  "agent/phases/quality-review.md",
  ".agents/skills/frontend-design/SKILL.md",
  ".claude/agents/design-worker.md",
  ".claude/agents/implementation-worker.md",
  ".claude/agents/visual-auditor.md",
  ".claude/agents/accessibility-auditor.md",
];

for (const path of mustReferenceContract) {
  const text = await read(path);
  if (text === null) {
    note(`${path} is missing, so it cannot reference ${contract}.`);
    continue;
  }
  // The contracts index sits beside the contracts and lists them by bare filename, so it is
  // the one file where the full path would be the odd spelling out.
  const expected = path === "agent/contracts/README.md" ? "typography.md" : contract;
  if (!text.includes(expected)) note(`${path} no longer references ${expected}.`);
}

// ---------------------------------------------------------------------------
// 2. The leading scale in :root
// ---------------------------------------------------------------------------

const globalCssPath = "src/styles/global.css";
const globalCss = await read(globalCssPath);
if (globalCss === null) {
  note(`${globalCssPath} is missing, so the leading scale cannot be checked.`);
}

// Each token, the range it must sit in, and why the range is where it is. Inclusive on both
// ends. Kept as data so the pass line and the failure messages read from one source.
const tokenSpec = [
  { name: "--leading-display", min: 0.8, max: 0.9, role: "headings at display size" },
  { name: "--leading-heading", min: 0.9, max: 1.25, role: "the default for every heading" },
  { name: "--leading-text", min: 1.5, max: Infinity, role: "body copy, lists, captions, small text" },
];

/**
 * Returns the body text of the first `:root { ... }` block in a stylesheet, by matching
 * braces from the opening `{` so a nested block (an @-rule, say) does not end it early.
 * Null when there is no :root block. O(n) in the length of the stylesheet.
 */
const rootBlock = (css) => {
  const start = css.search(/:root\s*\{/);
  if (start === -1) return null;
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
};

const rootTokens = new Map();
if (globalCss !== null) {
  const block = rootBlock(stripInert(globalCss));
  if (block === null) {
    note(`${globalCssPath} has no :root block, so the leading tokens are not defined.`);
  } else {
    for (const { name, min, max, role } of tokenSpec) {
      // The declaration, up to its terminating semicolon. Anything after a `/*` on the line
      // is a trailing comment and not part of the value.
      const match = block.match(new RegExp(`${name}\\s*:\\s*([^;/]+)`));
      if (!match) {
        note(`${globalCssPath} :root does not define ${name} (${role}).`);
        continue;
      }
      const raw = match[1].trim();
      // Unitless means a bare number: digits with an optional single decimal point and
      // nothing else. "0.88" passes; "0.88em", "20px", "88%" and "calc(...)" do not,
      // because a line-height with a unit is a fixed gap that breaks when the type resizes.
      if (!/^\d*\.?\d+$/.test(raw)) {
        note(`${globalCssPath} :root sets ${name} to "${raw}", which is not a unitless number.`);
        continue;
      }
      const value = Number.parseFloat(raw);
      const ceiling = max === Infinity ? "" : `–${max}`;
      if (value < min || value > max) {
        note(
          `${globalCssPath} :root sets ${name} to ${value}, outside its range ${min}${ceiling || " and up"}. ` +
            `${name} is for ${role}; see agent/contracts/typography.md.`,
        );
        continue;
      }
      rootTokens.set(name, value);
    }
  }
}

// ---------------------------------------------------------------------------
// CSS scan helpers
// ---------------------------------------------------------------------------

// Precomputes newline offsets so an index can be turned into a 1-based line number in
// O(log n) with a binary search. Built once per scan unit.
const lineIndexer = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
};

/**
 * Collects the innermost rules from a stylesheet: a rule whose body contains no further `{`,
 * so an @media wrapper is walked through rather than reported as a rule. Returns the
 * selector (whitespace collapsed), the body text, and the character offset of the body
 * start, which the caller turns into a line number. O(n) in the length of the CSS.
 */
const innermostRules = (css) => {
  const rules = [];
  const stack = [];
  let tokenStart = 0;
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (c === "{") {
      stack.push({ selStart: tokenStart, selEnd: i });
      tokenStart = i + 1;
    } else if (c === "}") {
      const open = stack.pop();
      if (open) {
        const body = css.slice(open.selEnd + 1, i);
        if (!body.includes("{")) {
          rules.push({
            selector: css.slice(open.selStart, open.selEnd).trim().replace(/\s+/g, " "),
            body,
            bodyStart: open.selEnd + 1,
          });
        }
      }
      tokenStart = i + 1;
    }
  }
  return rules;
};

// A leading-allow: or headline-shaped: comment counts when it is on the cited line or the
// line immediately above it, and it must carry a non-empty reason.
const allowOnOrAbove = (rawLines, oneBasedLine, keyword) => {
  const pattern = new RegExp(`${keyword}:\\s*\\S`);
  const here = rawLines[oneBasedLine - 1] ?? "";
  const above = rawLines[oneBasedLine - 2] ?? "";
  return pattern.test(here) || pattern.test(above);
};

// A tokenised line-height: var(--leading-display|heading|text), optionally with a var()
// fallback the browser would only reach if the token were undefined, and optionally with a
// trailing !important. Both of those still route the value through the token, so both pass.
const tokenValuePattern =
  /^var\(\s*--leading-(?:display|heading|text)\s*(?:,[^)]*)?\)(?:\s*!important)?$/;

// ---------------------------------------------------------------------------
// Build the scan units: every .css file whole, every <style> block in an .astro file
// ---------------------------------------------------------------------------

// Enforced over src/ only. Design-review concepts are not a special case here: they live
// under public/design-review/, which this gate never reads, so they are already out of
// scope. The rule applies the moment a concept is promoted into src/ as the shipped site.
const scanRoot = "src";

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
      if (entry.isDirectory()) return listFiles(path);
      return /\.(css|astro)$/.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
};

// Each unit is a slice of CSS with the line the slice starts on, so a finding inside an
// .astro <style> block reports the line in the .astro file, not in the block.
const scanUnits = [];
for (const path of await listFiles(scanRoot)) {
  const text = await read(path);
  if (text === null) continue;
  if (path.endsWith(".css")) {
    scanUnits.push({ path, css: text, lineOffset: 0 });
  } else {
    // Only the content of <style ...>...</style> is CSS. Everything else in an .astro file
    // is markup or frontmatter and is not this gate's concern.
    for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
      const lineOffset = text.slice(0, match.index).split("\n").length - 1;
      scanUnits.push({ path, css: match[1], lineOffset });
    }
  }
}

// ---------------------------------------------------------------------------
// 3. The base rule: h1..h6 { line-height: var(--leading-heading) }
// ---------------------------------------------------------------------------

const sixHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"].join(",");
let baseRuleFound = false;
if (globalCss !== null) {
  for (const rule of innermostRules(stripInert(globalCss))) {
    const selectorKey = rule.selector
      .split(",")
      .map((part) => part.trim())
      .sort()
      .join(",");
    if (selectorKey !== sixHeadings) continue;
    if (/line-height\s*:\s*var\(\s*--leading-heading\s*\)/.test(rule.body)) baseRuleFound = true;
  }
}
if (globalCss !== null && !baseRuleFound) {
  note(
    `${globalCssPath} has no base rule "h1, h2, h3, h4, h5, h6 { line-height: var(--leading-heading); }". ` +
      "Without it a heading with no line-height of its own keeps the browser default. See agent/contracts/typography.md.",
  );
}

// ---------------------------------------------------------------------------
// 4. The leading gate
// ---------------------------------------------------------------------------

let tokenisedCount = 0;
let allowedCount = 0;
let shapedCount = 0;
const allowedExceptions = [];

// A line-height carried inside a `font:` shorthand — the `/` slot after the size, whether
// its value is a number, a length or a keyword. `font-family` and the other longhands never
// reach here because the hyphen breaks the `font\s*:` match, and string values (quoted
// family names) are already blanked by stripInert so a stray `/` in one cannot show up.
const fontShorthandLeading = /\/\s*(-?[\d.]+[a-z%]*|normal|inherit|initial|unset|revert(?:-layer)?)/i;

for (const { path, css, lineOffset } of scanUnits) {
  const rawLines = css.split("\n");
  const stripped = stripInert(css);
  const lineOf = lineIndexer(stripped);

  // -- every line-height declaration is a token, or a written-down exception --------------
  // Scanned over the whole stripped unit rather than line by line, so a value wrapped onto
  // the next physical line is still seen. The lookbehind pins the match to a property-name
  // boundary, so a custom property such as `--card-line-height` is not mistaken for one.
  for (const match of stripped.matchAll(/(?<=^|[;{\s])line-height\s*:\s*([^;}]+)/g)) {
    const reportLine = lineOffset + lineOf(match.index);
    const value = match[1].trim().replace(/\s+/g, " ");
    if (tokenValuePattern.test(value)) {
      tokenisedCount += 1;
      continue;
    }
    if (allowOnOrAbove(rawLines, lineOf(match.index), "leading-allow")) {
      allowedCount += 1;
      allowedExceptions.push(`${path}:${reportLine} line-height: ${value}`);
      continue;
    }
    note(
      `${path}:${reportLine} sets line-height to "${value}". Every line-height in src/ must be ` +
        "var(--leading-display), var(--leading-heading) or var(--leading-text). A raw number, or a keyword " +
        "such as `normal`, is not allowed. If this one is genuinely correct — a zeroed line-height on an " +
        "icon wrapper, say — put `leading-allow: <reason>` in a comment on this line or the one above.",
    );
  }

  // -- a line-height component inside a font: shorthand is forbidden ----------------------
  for (const match of stripped.matchAll(/(?<=^|[;{\s])font\s*:\s*([^;}]+)/g)) {
    const shorthand = match[1].trim().replace(/\s+/g, " ");
    if (!fontShorthandLeading.test(shorthand)) continue;
    const reportLine = lineOffset + lineOf(match.index);
    if (allowOnOrAbove(rawLines, lineOf(match.index), "leading-allow")) {
      allowedCount += 1;
      allowedExceptions.push(`${path}:${reportLine} font: ${shorthand}`);
      continue;
    }
    note(
      `${path}:${reportLine} carries a line-height inside a font: shorthand ("${shorthand}"). ` +
        "Split line-height into its own declaration so it can be checked and changed on its own, and make it " +
        "a leading token. See agent/contracts/typography.md.",
    );
  }

  // -- every rule that opts into the display token also shapes its headline ---------------
  for (const rule of innermostRules(stripped)) {
    const displayMatch = rule.body.match(/line-height\s*:\s*var\(\s*--leading-display\s*\)/);
    if (!displayMatch) continue;
    const declarationLine = lineOffset + lineOf(rule.bodyStart + displayMatch.index);
    const hasBalance = /text-wrap\s*:\s*balance/.test(rule.body);
    // text-wrap: pretty is deliberately not accepted: it suppresses orphans but does not
    // balance the block into a shape, which is the whole of the shaping habit.
    const hasComment = allowOnOrAbove(rawLines, declarationLine - lineOffset, "headline-shaped");
    if (hasBalance || hasComment) {
      shapedCount += 1;
      continue;
    }
    note(
      `${path}:${declarationLine} rule "${rule.selector}" sets line-height: var(--leading-display) but does not ` +
        "shape the headline. Add `text-wrap: balance` to the same rule, or a `headline-shaped: <reason>` comment " +
        "on the line-height line or the one above stating how the block is shaped and that the breaks were checked " +
        "across the responsive matrix. See agent/contracts/typography.md.",
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (errors.length) {
  console.error("Typography validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\nThe rule this enforces, and the reasoning behind it, are in ${contract}.`);
  process.exit(1);
}

const exceptionSummary = allowedExceptions.length
  ? ` Allowed exceptions: ${allowedExceptions.join("; ")}.`
  : "";
console.log(
  `Typography is intact: ${rootTokens.size} leading tokens in range, ${tokenisedCount} line-height ` +
    `declarations all tokenised, ${shapedCount} display headline${shapedCount === 1 ? "" : "s"} shaped, ` +
    `${allowedCount} allowed exception${allowedCount === 1 ? "" : "s"}.${exceptionSummary}`,
);
