import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

// Playwright cannot run inside a cloud agent sandbox, so a stale e2e spec is
// otherwise only discovered in CI, at full five-browser cost. This checks the
// cheap part locally: every literal string or class selector the spec asserts
// must actually appear in the build it will run against.
const root = process.cwd();
const distRoot = resolve(root, "dist");
const testsRoot = resolve(root, "tests");

async function listFiles(directory, predicate) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return listFiles(path, predicate);
    return predicate(path) ? [path] : [];
  }));
  return files.flat();
}

function decodeHtmlEntities(html) {
  return html
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

const specFiles = await listFiles(testsRoot, (path) => path.endsWith(".spec.ts"));
if (specFiles.length === 0) {
  console.log("No Playwright spec files found; skipping e2e freshness check.");
  process.exit(0);
}

const htmlFiles = await listFiles(distRoot, (path) => extname(path) === ".html");
if (htmlFiles.length === 0) {
  console.error("dist/ has no built HTML files. Run `npm run build` before validate:e2e-freshness.");
  process.exit(1);
}

const builtText = decodeHtmlEntities(
  (await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))).join("\n"),
);
const builtClassNames = new Set(
  [...builtText.matchAll(/\bclass="([^"]*)"/g)]
    .flatMap((match) => match[1].split(/\s+/))
    .filter(Boolean),
);
// Title must match a real <title> tag exactly: a whole-page substring search
// would miss a changed title when the old string still appears elsewhere on
// the page, e.g. in an attribution link.
const builtTitles = new Set(
  [...builtText.matchAll(/<title>([^<]*)<\/title>/g)].map((match) => match[1].trim()),
);

const failures = [];

for (const specFile of specFiles) {
  const specPath = relative(root, specFile).replaceAll("\\", "/");
  const source = await readFile(specFile, "utf8");

  for (const match of source.matchAll(/toHaveTitle\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) {
    const expected = match[1];
    if (!builtTitles.has(expected)) {
      failures.push(`${specPath}: asserts title "${expected}", which does not match any built page's <title>.`);
    }
  }

  for (const match of source.matchAll(/getByRole\(([^)]*)\)/g)) {
    const nameMatch = match[1].match(/name:\s*"((?:[^"\\]|\\.)*)"/);
    if (!nameMatch) continue;
    const expected = nameMatch[1];
    if (!builtText.includes(expected)) {
      failures.push(`${specPath}: asserts an accessible name "${expected}", which does not appear anywhere in the built site.`);
    }
  }

  for (const match of source.matchAll(/locator\(\s*["']\.([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    const className = match[1];
    if (!builtClassNames.has(className)) {
      failures.push(`${specPath}: selects ".${className}", which does not appear in any built page.`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "The e2e spec references text or selectors the built site no longer has. "
    + "Every CI browser project will fail on this exact mismatch, at full matrix cost. "
    + "Rewrite the spec to test the real implemented site before pushing.\n",
  );
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`e2e spec assertions match the built site across ${specFiles.length} spec file(s).`);
