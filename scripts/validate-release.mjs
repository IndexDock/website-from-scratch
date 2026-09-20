import { access, readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = process.cwd();
const distRoot = resolve(root, "dist");
const source = await readFile(resolve(root, "src/data/site.ts"), "utf8");
const indexingEnabled = /indexingEnabled:\s*true/.test(source);
const clientOwned = /brandAssetOwner:\s*["']client["']/.test(source);
const siteUrlMatch = source.match(/siteUrl:\s*["'](https:\/\/[^"']+)["']/);
const siteUrl = siteUrlMatch?.[1];
const primaryConversionPath = source.match(/primaryConversionPath:\s*["']([^"']+)["']/)?.[1];
const failures = [];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return files.flat();
}

function has(html, pattern) {
  return pattern.test(html);
}

function contentOf(html, pattern) {
  return html.match(pattern)?.[1];
}

function decodeHtmlEntities(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

// FAQPage schema is supposed to mirror what a visitor can actually read, not
// just be well-formed, so structured-data validation checks it against this
// rather than the raw HTML, which would trivially contain its own JSON-LD.
function visibleTextOf(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  return decodeHtmlEntities(body.replace(/<script[\s\S]*?<\/script>/gi, ""));
}

function routeForHtml(pagePath) {
  if (pagePath === "index.html") return "/";
  if (pagePath.endsWith("/index.html")) return `/${pagePath.slice(0, -"index.html".length)}`;
  return `/${pagePath.replace(/\.html$/, "")}`;
}

function parseJsonLd(html, pagePath) {
  return [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        failures.push(`${pagePath}: invalid JSON-LD block.`);
        return null;
      }
    })
    .filter(Boolean);
}

function structuredDataNodes(blocks) {
  return blocks.flatMap((block) => {
    if (Array.isArray(block)) return structuredDataNodes(block);
    if (!block || typeof block !== "object") return [];
    return Array.isArray(block["@graph"])
      ? [block, ...structuredDataNodes(block["@graph"])]
      : [block];
  });
}

function validateStructuredData(blocks, pagePath, visibleText) {
  for (const rootBlock of blocks) {
    if (!rootBlock || typeof rootBlock !== "object" || Array.isArray(rootBlock) || rootBlock["@context"] !== "https://schema.org") {
      failures.push(`${pagePath}: each JSON-LD root requires @context https://schema.org.`);
    }
  }

  for (const block of structuredDataNodes(blocks)) {
    if (!("@graph" in block) && (typeof block["@type"] !== "string" || block["@type"].trim() === "")) {
      failures.push(`${pagePath}: JSON-LD node requires a non-empty @type.`);
    }
    if (block["@type"] === "FAQPage") {
      if (!Array.isArray(block.mainEntity) || block.mainEntity.length === 0) {
        failures.push(`${pagePath}: FAQPage requires non-empty visible questions and answers.`);
      }
      for (const item of block.mainEntity ?? []) {
        if (item?.["@type"] !== "Question" || typeof item.name !== "string" || item.name.trim() === "" || item.acceptedAnswer?.["@type"] !== "Answer" || typeof item.acceptedAnswer?.text !== "string" || item.acceptedAnswer.text.trim() === "") {
          failures.push(`${pagePath}: FAQPage contains an invalid question or answer.`);
          continue;
        }
        if (!visibleText.includes(item.name.trim())) {
          failures.push(`${pagePath}: FAQPage question "${item.name}" does not appear in the page's visible text.`);
        }
        if (!visibleText.includes(item.acceptedAnswer.text.trim())) {
          failures.push(`${pagePath}: FAQPage answer for "${item.name}" does not appear in the page's visible text.`);
        }
      }
    }

    if (block["@type"] === "BreadcrumbList") {
      if (!Array.isArray(block.itemListElement) || block.itemListElement.length < 2) {
        failures.push(`${pagePath}: BreadcrumbList requires at least two ordered items.`);
      }
      for (const [index, item] of (block.itemListElement ?? []).entries()) {
        if (item?.["@type"] !== "ListItem" || item.position !== index + 1 || typeof item.name !== "string" || typeof item.item !== "string") {
          failures.push(`${pagePath}: BreadcrumbList contains an invalid or misordered item.`);
        }
      }
    }
  }
}

const isDesignReviewPath = (relativePath) => relativePath.split("/").includes("design-review");

const allFiles = await listFiles(distRoot);
const relativeFiles = allFiles.map((file) => relative(distRoot, file).replaceAll("\\", "/"));

// agent/phases/design-review.md publishes homepage concepts to public/design-review/
// so the learner can review them on their own live URL — the only delivery mechanism
// that works identically on Claude Code and Codex. Astro copies public/ into dist/,
// so rejecting these paths at every stage made that phase impossible to execute and
// forced the pilot onto vendor-specific preview links instead.
//
// The requirement in agent/contracts/quality.md is "no exposed design-review routes"
// on the *published* site, and publication is what indexingEnabled marks. Enforce it
// there, which is also exactly what agent/phases/publication.md already instructs:
// "Remove temporary review routes and enable indexing."
if (indexingEnabled && relativeFiles.some(isDesignReviewPath)) {
  failures.push("Release contains an exposed design-review route.");
}

// Concept previews are self-contained mockups, not site pages. Judging them on
// canonical URLs, og:image or title uniqueness would fail them for reasons that do
// not apply. src/data/routes.ts and src/pages/robots.txt.ts already exclude them
// from the sitemap and from crawling.
const htmlFiles = allFiles.filter(
  (file) => file.endsWith(".html") && !isDesignReviewPath(relative(distRoot, file).replaceAll("\\", "/")),
);

const configuredAssets = [...source.matchAll(/(?:faviconPath|socialImagePath):\s*["'](\/[^"']+)["']/g)]
  .map((match) => match[1]);

for (const assetPath of configuredAssets) {
  try {
    await access(resolve(distRoot, assetPath.slice(1)));
  } catch {
    failures.push(`Configured release asset does not exist: ${assetPath}`);
  }
}

const titles = new Set();
const descriptions = new Set();
const canonicals = new Set();
const indexableRoutes = new Map();
let homepageJsonLdCount = 0;
let homepagePrimaryEntityCount = 0;

for (const file of htmlFiles) {
  const pagePath = relative(distRoot, file).replaceAll("\\", "/");
  const html = await readFile(file, "utf8");
  const is404 = pagePath === "404.html";
  const jsonLd = parseJsonLd(html, pagePath);
  validateStructuredData(jsonLd, pagePath, visibleTextOf(html));
  if (pagePath === "index.html") {
    homepageJsonLdCount = jsonLd.length;
    homepagePrimaryEntityCount = structuredDataNodes(jsonLd).filter((node) => {
      const supportingTypes = new Set(["WebSite", "WebPage", "FAQPage", "BreadcrumbList", "Question", "Answer", "ListItem"]);
      return typeof node["@type"] === "string"
        && !supportingTypes.has(node["@type"])
        && typeof node.name === "string"
        && node.name.trim() !== "";
    }).length;
  }

  if (!has(html, /<link\s+rel="icon"\s+href="\/[^"]+"/)) failures.push(`${pagePath}: missing favicon.`);
  if (!has(html, /<title>[^<]+<\/title>/)) failures.push(`${pagePath}: missing title.`);
  if (!has(html, /<meta\s+name="description"\s+content="[^"]+"/)) failures.push(`${pagePath}: missing description.`);
  if (/https?:\/\/(?:localhost|127\.0\.0\.1)/.test(html)) failures.push(`${pagePath}: contains a local development URL.`);

  if (!indexingEnabled || is404) {
    if (!has(html, /<meta\s+name="robots"\s+content="noindex, nofollow"/)) failures.push(`${pagePath}: Starter, review, and 404 pages must remain noindex.`);
    if (is404 && has(html, /<link\s+rel="canonical"/)) failures.push("404.html: must not declare an indexable canonical URL.");
    continue;
  }

  const title = contentOf(html, /<title>([^<]+)<\/title>/);
  const description = contentOf(html, /<meta\s+name="description"\s+content="([^"]+)"/);
  const canonical = contentOf(html, /<link\s+rel="canonical"\s+href="(https:\/\/[^"]+)"/);
  const route = routeForHtml(pagePath);
  const expectedCanonical = siteUrl ? new URL(route, `${siteUrl.replace(/\/$/, "")}/`).href : undefined;
  if (!has(html, /<meta\s+name="robots"\s+content="index, follow"/)) failures.push(`${pagePath}: indexable page requires index, follow.`);
  if (!canonical) failures.push(`${pagePath}: indexable page requires an absolute HTTPS canonical URL.`);
  if (canonical && expectedCanonical && canonical !== expectedCanonical) failures.push(`${pagePath}: canonical must match its configured site route (${expectedCanonical}).`);
  if (!has(html, /<meta\s+property="og:image"\s+content="https:\/\//)) failures.push(`${pagePath}: missing absolute HTTPS og:image.`);
  if (!has(html, /<meta\s+property="og:image:alt"\s+content="[^"]+"/)) failures.push(`${pagePath}: missing og:image alt text.`);
  if (!has(html, /<meta\s+name="twitter:image"\s+content="https:\/\//)) failures.push(`${pagePath}: missing absolute HTTPS twitter:image.`);
  if (title && titles.has(title)) failures.push(`${pagePath}: duplicate page title.`);
  if (description && descriptions.has(description)) failures.push(`${pagePath}: duplicate page description.`);
  if (canonical && canonicals.has(canonical)) failures.push(`${pagePath}: duplicate canonical URL.`);
  if (title) titles.add(title);
  if (description) descriptions.add(description);
  if (canonical) canonicals.add(canonical);
  if (expectedCanonical) indexableRoutes.set(route, expectedCanonical);
}

if (indexingEnabled) {
  // agent/phases/quality-review.md makes project/QA-REPORT.md an exit condition, and the
  // same file forbids asserting responsive, accessibility or Lighthouse results the agent
  // did not read from a completed run. Nothing enforced either, so a pilot reached
  // publication with no report at all and the evidence for "quality review passed" lived
  // only in a chat transcript that expires with the session. The report is the durable
  // record of which CI run the claims rest on, which is why the run reference is required
  // and not just the file.
  try {
    const qaReport = await readFile(resolve(root, "project/QA-REPORT.md"), "utf8");
    // Strip the template's own guidance comments first. They are prose, and counting
    // them would let an untouched template satisfy the filled-in check using nothing
    // but the instructions telling the agent to fill it in. The same applies to the
    // run reference: a run URL shown as an example is not a run that was read.
    const authored = qaReport.replace(/<!--[\s\S]*?-->/g, "");
    // Measure the filled-in body, not the file size. agent/templates/qa-report.md is
    // headings and nothing else, so a report that still has no prose beneath them is
    // the template regardless of how many sections it kept or dropped. A byte-count
    // floor would sit only ~200 bytes above the template and break on either side.
    // Headings only. Blockquotes are left in deliberately: quoting a run's own output is
    // evidence, and excluding it would penalise the most concrete kind of finding.
    const body = authored
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("#"))
      .join(" ")
      .trim();
    // Accept a run URL or a run id introduced by the word "run", allowing the separators
    // people actually type — "run 32285166008", "CI run #32285166008", "run ID 32285166008".
    // The point is that a run was read, not that it was cited in one exact shape.
    const citesRun = /actions\/runs\/\d+|\brun\b[^\n]{0,20}?\d{6,}/i.test(authored);
    if (body.length < 200) {
      failures.push("project/QA-REPORT.md has headings but no findings; it is still the empty template.");
    } else if (!citesRun) {
      failures.push(
        "project/QA-REPORT.md does not cite the continuous-integration run its results come from. " +
          "Add the run URL (.../actions/runs/<id>) or its id, for example \"CI run 32285166008\".",
      );
    }
  } catch {
    failures.push("Publication requires a completed project/QA-REPORT.md.");
  }

  if (!clientOwned) failures.push("Indexable business sites require brandAssetOwner: \"client\".");
  if (!siteUrl) failures.push("Indexable business sites require an HTTPS siteUrl.");
  if (!primaryConversionPath) failures.push("Indexable business sites require primaryConversionPath for Lighthouse coverage.");
  if (primaryConversionPath && !indexableRoutes.has(primaryConversionPath)) failures.push(`Primary conversion path is not an indexable built route: ${primaryConversionPath}`);
  if (/faviconPath:\s*["']\/indexdock-mark\.svg["']/.test(source)) failures.push("Indexable business site still uses the Starter favicon.");
  if (/socialImagePath:\s*["']\/indexdock-starter-social\.png["']/.test(source)) failures.push("Indexable business site still uses the Starter social image.");
  if (homepageJsonLdCount === 0 || homepagePrimaryEntityCount === 0) failures.push("Indexable business homepage requires a named primary entity in accurate visible-content-aligned structured data.");

  try {
    const robots = await readFile(resolve(distRoot, "robots.txt"), "utf8");
    if (/^\s*Disallow:\s*\/\s*$/im.test(robots)) failures.push("robots.txt blocks the entire indexable site.");
  } catch {
    failures.push("Indexable business site requires robots.txt.");
  }

  try {
    const sitemap = await readFile(resolve(distRoot, "sitemap.xml"), "utf8");
    const sitemapLocations = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim()));
    for (const [route, expectedUrl] of indexableRoutes) {
      if (!sitemapLocations.has(expectedUrl)) failures.push(`sitemap.xml omits indexable route ${route} (${expectedUrl}).`);
    }
  } catch {
    failures.push("Indexable business site requires sitemap.xml.");
  }
} else {
  const robots = await readFile(resolve(distRoot, "robots.txt"), "utf8");
  if (!/^\s*Disallow:\s*\/\s*$/im.test(robots)) failures.push("Starter robots.txt must block crawling.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(indexingEnabled
  ? `Business release metadata is valid across ${htmlFiles.length} HTML files.`
  : `Starter release metadata is valid across ${htmlFiles.length} HTML files and remains noindex.`);
