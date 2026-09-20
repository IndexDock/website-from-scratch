import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

// Copies the icons named in src/icons/selection.json out of the pinned
// @phosphor-icons/core package and into src/icons/phosphor/, so the set is committed
// rather than fetched. It has to be committed: Codex has no agent-phase internet, so an
// icon that is not in the repository does not exist when the agent builds a learner site.
//
// Same generate-and-check shape as sync-status.mjs and sync-worker-name.mjs. Run it bare
// to write the files; run it with --check to fail when the committed files have drifted
// from the selection, which is how validate:agent keeps the two honest.
//
// O(n) time in the number of selected icon files (399 names x 6 weights = 2394 reads and
// writes). O(1) extra space beyond one file's contents at a time: files stream through
// one by one rather than being collected.

const root = process.cwd();
const selectionPath = resolve(root, "src/icons/selection.json");
const packageRoot = resolve(root, "node_modules/@phosphor-icons/core");
const outputRoot = resolve(root, "src/icons/phosphor");
const checkOnly = process.argv.includes("--check");

const fail = (lines) => {
  console.error(`Icon sync ${checkOnly ? "check" : ""} failed:\n`);
  for (const line of [lines].flat()) console.error(`- ${line}`);
  process.exit(1);
};

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`${relative(root, path)} could not be read: ${error.message}`);
  }
};

const selection = await readJson(selectionPath);
const installed = await readJson(resolve(packageRoot, "package.json"));

if (installed.version !== selection.version) {
  fail(
    `src/icons/selection.json pins ${selection.source}@${selection.version} but the installed package is ${installed.version}. `
      + "Update the pin and re-run `npm run sync:icons`, or reinstall the pinned version.",
  );
}

// Flatten the grouped selection into one name list. Arrows nest a second level, because
// their shape family is data the deferred typography-matching rule will read.
const selectedNames = [];
for (const contents of Object.values(selection.groups)) {
  if (Array.isArray(contents)) selectedNames.push(...contents);
  else for (const list of Object.values(contents)) selectedNames.push(...list);
}
const names = [...new Set(selectedNames)].sort();

// Phosphor names the regular weight bare and suffixes every other weight.
const sourceFileName = (name, weight) => (weight === "regular" ? `${name}.svg` : `${name}-${weight}.svg`);

const expected = new Map();
for (const weight of selection.weights) {
  for (const name of names) {
    expected.set(`${weight}/${name}.svg`, resolve(packageRoot, "assets", weight, sourceFileName(name, weight)));
  }
}

// Line endings are normalised on both sides before comparing. .gitattributes already pins
// *.svg to LF, but core.autocrlf is on for most Windows checkouts, and a --check that can
// fail on line endings alone would be a trap rather than a gate.
const normalise = (text) => text.replace(/\r\n/g, "\n");

const missingSources = [];
const contents = new Map();
for (const [target, source] of expected) {
  try {
    contents.set(target, normalise(await readFile(source, "utf8")));
  } catch {
    missingSources.push(`${relative(root, source)} does not exist, but selection.json asks for ${target}.`);
  }
}
if (missingSources.length) fail(missingSources);

// Walks every weight directory actually on disk, not just the ones selection.json still
// declares, so a weight dropped from the selection shows up as stale rather than staying
// invisible to --check until a bare run silently deletes it.
const listCommitted = async () => {
  const found = new Set();
  let weightDirs;
  try {
    weightDirs = (await readdir(outputRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return found;
  }
  for (const weight of weightDirs) {
    let entries;
    try {
      entries = await readdir(resolve(outputRoot, weight));
    } catch {
      continue;
    }
    for (const entry of entries) if (entry.endsWith(".svg")) found.add(`${weight}/${entry}`);
  }
  return found;
};

if (checkOnly) {
  const committed = await listCommitted();
  const problems = [];
  for (const [target, expectedText] of contents) {
    if (!committed.has(target)) {
      problems.push(`src/icons/phosphor/${target} is missing.`);
      continue;
    }
    const actual = normalise(await readFile(resolve(outputRoot, target), "utf8"));
    if (actual !== expectedText) problems.push(`src/icons/phosphor/${target} does not match the pinned package.`);
  }
  for (const target of committed) {
    if (!contents.has(target)) {
      const [weight] = target.split("/");
      const problem = selection.weights.includes(weight)
        ? `src/icons/phosphor/${target} is committed but not in selection.json.`
        : `src/icons/phosphor/${target} is committed under weight "${weight}", which selection.json no longer declares.`;
      problems.push(problem);
    }
  }
  if (problems.length) {
    fail([
      ...problems.slice(0, 20),
      ...(problems.length > 20 ? [`… and ${problems.length - 20} more.`] : []),
      "Run `npm run sync:icons` and commit the result.",
    ]);
  }
  console.log(`Vendored icons match selection.json: ${names.length} names across ${selection.weights.length} weights.`);
  process.exit(0);
}

await rm(outputRoot, { recursive: true, force: true });
for (const weight of selection.weights) await mkdir(resolve(outputRoot, weight), { recursive: true });
for (const [target, text] of contents) await writeFile(resolve(outputRoot, target), text, "utf8");

console.log(
  `Wrote ${contents.size} icon files to src/icons/phosphor/ `
    + `(${names.length} names x ${selection.weights.length} weights from ${selection.source}@${selection.version}).`,
);
