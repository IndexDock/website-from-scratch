import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const validator = resolve("scripts/validate-release.mjs");
// The real template, not a stand-in. This fixture exists to prove an untouched template
// is rejected, so it has to test the file an agent actually copies. A hand-written
// imitation would keep passing while the template drifted past the check — which already
// happened once: guidance prose added to the template satisfied the filled-in test on its
// own, and only a manual run caught it.
const reportTemplate = await readFile(resolve("agent/templates/qa-report.md"), "utf8");
const temporaryRoot = await mkdtemp(join(tmpdir(), "indexdock-release-validation-"));
const siteSource = `export const siteConfig = {
  siteUrl: "https://example.com",
  primaryConversionPath: "/contact/",
  brandAssetOwner: "client",
  faviconPath: "/client.ico",
  socialImagePath: "/client-social.png",
  indexingEnabled: true,
};\n`;

// A filled report: past the template-size floor and citing the run its claims rest on.
const qaReport = `# QA report

## Scope
Five routes, business mode, verified before publication.

## Hard requirements
All met. Evidence is the promotion gate run below, read in full rather than assumed.

## Responsive and browser matrix
Forty Playwright checks across the five configured browser and viewport projects.

## Accessibility
Automated axe reported no critical or serious violations.

## Lighthouse targets
Performance, accessibility, best practices and SEO gates all passed.

## Production verification
CI run: https://github.com/example/example/actions/runs/32285166008
`;

const cases = [
  { name: "valid business release", valid: true, mutate: async () => {} },
  {
    name: "duplicate descriptions",
    valid: false,
    mutate: async (root) => writeFile(join(root, "dist/contact/index.html"), pageHtml({
      title: "Contact",
      description: "Home description",
      canonical: "https://example.com/contact/",
    })),
  },
  {
    name: "wrong canonical route",
    valid: false,
    mutate: async (root) => writeFile(join(root, "dist/contact/index.html"), pageHtml({
      title: "Contact",
      description: "Contact description",
      canonical: "https://unrelated.example/contact/",
    })),
  },
  {
    name: "incomplete sitemap",
    valid: false,
    mutate: async (root) => writeFile(join(root, "dist/sitemap.xml"), sitemap(["https://example.com/"])),
  },
  {
    name: "missing primary conversion route",
    valid: false,
    mutate: async (root) => writeFile(join(root, "src/data/site.ts"), siteSource.replace('primaryConversionPath: "/contact/"', 'primaryConversionPath: "/quote/"')),
  },
  {
    name: "FAQPage schema matches visible text",
    valid: true,
    mutate: async (root) => writeFile(join(root, "dist/contact/index.html"), faqPageHtml({
      title: "Contact",
      description: "Contact description",
      canonical: "https://example.com/contact/",
      question: "Do you offer free consultations?",
      answer: "Yes, the first 15 minutes are free.",
    })),
  },
  {
    name: "FAQPage schema drifts from visible text",
    valid: false,
    mutate: async (root) => writeFile(join(root, "dist/contact/index.html"), faqPageHtml({
      title: "Contact",
      description: "Contact description",
      canonical: "https://example.com/contact/",
      question: "Do you offer free consultations?",
      answer: "Yes, the first 15 minutes are free.",
      visibleAnswer: "Reach out any time and we will get back to you.",
    })),
  },
  // The design-review rule had no coverage in either direction, which is why the
  // phase module and the gate could contradict each other unnoticed. Both halves
  // are asserted now: allowed before publication, rejected at it.
  {
    name: "noindex release may carry design-review concepts",
    valid: true,
    mutate: async (root) => {
      await writeNoindexBaseline(root);
      await mkdir(join(root, "dist/design-review"), { recursive: true });
      await writeFile(join(root, "dist/design-review/concept-a.html"), conceptHtml("Concept A"));
    },
  },
  {
    name: "indexable release rejects design-review concepts",
    valid: false,
    mutate: async (root) => {
      await mkdir(join(root, "dist/design-review"), { recursive: true });
      await writeFile(join(root, "dist/design-review/concept-a.html"), conceptHtml("Concept A"));
    },
  },
  {
    name: "indexable release requires a QA report",
    valid: false,
    mutate: async (root) => rm(join(root, "project/QA-REPORT.md")),
  },
  {
    name: "the shipped QA report template is not a QA report",
    valid: false,
    mutate: async (root) => writeFile(join(root, "project/QA-REPORT.md"), reportTemplate),
  },
  {
    name: "a QA report must cite the run its results come from",
    valid: false,
    mutate: async (root) => writeFile(
      join(root, "project/QA-REPORT.md"),
      qaReport.replace("CI run: https://github.com/example/example/actions/runs/32285166008", "Everything passed."),
    ),
  },
  {
    name: "a noindex release does not need a QA report yet",
    valid: true,
    mutate: async (root) => {
      await writeNoindexBaseline(root);
      await rm(join(root, "project/QA-REPORT.md"));
    },
  },
];

try {
  for (const testCase of cases) {
    const fixtureRoot = join(temporaryRoot, testCase.name.replaceAll(" ", "-"));
    await writeBaseline(fixtureRoot);
    await testCase.mutate(fixtureRoot);
    const result = spawnSync(process.execPath, [validator], { cwd: fixtureRoot, encoding: "utf8" });
    const passed = result.status === 0;
    if (passed !== testCase.valid) {
      throw new Error(`${testCase.name}: expected valid=${testCase.valid}, received exit ${result.status}.\n${result.stdout}${result.stderr}`);
    }
  }
  console.log(`${cases.length} business-release gate cases passed.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function writeBaseline(root) {
  await mkdir(join(root, "src/data"), { recursive: true });
  await mkdir(join(root, "dist/contact"), { recursive: true });
  await mkdir(join(root, "project"), { recursive: true });
  await writeFile(join(root, "src/data/site.ts"), siteSource);
  await writeFile(join(root, "project/QA-REPORT.md"), qaReport);
  await writeFile(join(root, "dist/index.html"), pageHtml({
    title: "Home",
    description: "Home description",
    canonical: "https://example.com/",
  }));
  await writeFile(join(root, "dist/contact/index.html"), pageHtml({
    title: "Contact",
    description: "Contact description",
    canonical: "https://example.com/contact/",
  }));
  await writeFile(join(root, "dist/404.html"), `<!doctype html><html><head><title>Not found</title><meta name="description" content="Missing page"><meta name="robots" content="noindex, nofollow"><link rel="icon" href="/client.ico"></head><body>Not found</body></html>`);
  await writeFile(join(root, "dist/client.ico"), "fixture");
  await writeFile(join(root, "dist/client-social.png"), "fixture");
  await writeFile(join(root, "dist/robots.txt"), "User-agent: *\nAllow: /\n");
  await writeFile(join(root, "dist/sitemap.xml"), sitemap(["https://example.com/", "https://example.com/contact/"]));
}

function pageHtml({ title, description, canonical }) {
  const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Fixture Business" });
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="index, follow"><meta property="og:image" content="https://example.com/client-social.png"><meta property="og:image:alt" content="Fixture social preview"><meta name="twitter:image" content="https://example.com/client-social.png"><link rel="canonical" href="${canonical}"><link rel="icon" href="/client.ico"><script type="application/ld+json">${schema}</script></head><body>${title}</body></html>`;
}

function faqPageHtml({ title, description, canonical, question, answer, visibleAnswer = answer }) {
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } }],
  });
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="index, follow"><meta property="og:image" content="https://example.com/client-social.png"><meta property="og:image:alt" content="Fixture social preview"><meta name="twitter:image" content="https://example.com/client-social.png"><link rel="canonical" href="${canonical}"><link rel="icon" href="/client.ico"><script type="application/ld+json">${schema}</script></head><body><h1>${title}</h1><section><h2>${question}</h2><p>${visibleAnswer}</p></section></body></html>`;
}

function sitemap(locations) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((location) => `<url><loc>${location}</loc></url>`).join("")}</urlset>`;
}

// Deliberately bare: no favicon, no canonical, no og:image. A concept preview is a
// standalone mockup, and the gate must not judge it as a site page. If the exclusion
// in validate-release.mjs ever regresses, this page starts failing those checks.
function conceptHtml(title) {
  return `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`;
}

// Turns the indexable baseline into the pre-publication state: indexing off, every
// page noindex, and robots.txt blocking crawling.
async function writeNoindexBaseline(root) {
  await writeFile(join(root, "src/data/site.ts"), siteSource.replace("indexingEnabled: true", "indexingEnabled: false"));
  await writeFile(join(root, "dist/index.html"), noindexPageHtml({ title: "Home", description: "Home description" }));
  await writeFile(join(root, "dist/contact/index.html"), noindexPageHtml({ title: "Contact", description: "Contact description" }));
  await writeFile(join(root, "dist/robots.txt"), "User-agent: *\nDisallow: /\n");
}

function noindexPageHtml({ title, description }) {
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="noindex, nofollow"><link rel="icon" href="/client.ico"></head><body>${title}</body></html>`;
}
