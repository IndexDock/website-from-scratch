import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Concept pages published under public/design-review/ used to reach the learner
// with nothing having rendered them first. tests/starter.spec.ts only ever visits
// "/" and a missing route, so the whole browser tier — five widths, axe, contrast —
// measured the Starter page and never a concept, and the only reviewer that looked
// at concepts at all was a read-only agent reading source it cannot render. The
// learner was therefore the first entity with eyes on the page, which is how a
// visual bug survives review and gets faithfully rebuilt in implementation.
//
// Scope is deliberately narrow, and the reason is the promotion gate. .github/
// workflows/promote.yml runs `npm run validate:milestone` as its `gate` job and the
// `promote` job needs it to pass, so a test added here decides whether main advances
// and whether the site redeploys. A false positive does not merely annoy: it
// withholds every concept from the learner, who waits while somebody diagnoses a
// check that was wrong. Only assertions that cannot fail on a correct page belong in
// this file.

const distRoot = resolve(process.cwd(), "dist");

function listFiles(directory: string): string[] {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    });
  } catch (error) {
    // A missing dist/ means nothing was built, which is the same answer as no concepts:
    // skip rather than fail, and let the web server report the real problem if there is
    // one. Only that one error is swallowed. Any other read failure - a permission
    // problem, a broken symlink, an I/O error - would otherwise be indistinguishable
    // from an honestly empty directory, and the whole tier would report a clean pass
    // having checked nothing at all. Silence is the failure this file exists to remove,
    // so anything else is rethrown and fails loudly.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

// Same test as scripts/validate-release.mjs uses to hold these pages to different
// rules at release time. Keeping the two identical means one definition of what a
// review route is: a path with a design-review segment. Concept routes are named by
// whoever builds them and are unknown when this file is written, so nothing here may
// hard-code a concept path.
const isDesignReviewPath = (relativePath: string): boolean => relativePath.split("/").includes("design-review");

// Follows routeForHtml in scripts/validate-release.mjs. scripts/serve-dist.mjs resolves
// a directory to its index.html, so both shapes a concept can take —
// design-review/concept-a/index.html and design-review/concept-a.html — resolve.
//
// One case is deliberately absent rather than overlooked: that function also maps a bare
// "index.html" to "/", and this one does not, because it only ever sees paths that
// already carry a design-review segment and the site root cannot be one of them. Adding
// the branch would be unreachable code claiming to handle a case that cannot arrive.
// The two are not interchangeable, and neither file should be edited on the assumption
// that they are.
function routeForHtml(pagePath: string): string {
  if (pagePath.endsWith("/index.html")) return `/${pagePath.slice(0, -"index.html".length)}`;
  return `/${pagePath.replace(/\.html$/, "")}`;
}

const conceptRoutes = listFiles(distRoot)
  .map((file) => relative(distRoot, file).replaceAll("\\", "/"))
  .filter((path) => path.endsWith(".html") && isDesignReviewPath(path))
  .map(routeForHtml)
  .sort();

// Deliberately excluded: geometric overlap detection. agent/phases/design-review.md
// names overlapping content as a defect, and the obvious implementation — comparing
// bounding boxes and failing when two intersect — is not reliable enough to sit in a
// blocking gate. Overlap is a legitimate compositional device: a card lifted over a
// hero edge, a heading crossing an image, a badge pinned to a corner are all
// deliberate, and every one of them intersects. There is no property readable from
// the DOM that separates the intended overlap from the accidental one, so the check
// would fail correct concepts, and a failure here withholds the preview link from
// the learner entirely. The defects that actually recur — a page wider than its
// viewport, text that cannot be read against what sits behind it — are caught by the
// overflow and axe checks below, contrast included. A genuine overlap the learner
// spots goes into the defect bucket in agent/phases/design-review.md, is repaired in
// the main task, and costs them no revision round. This paragraph exists so that
// exclusion reads as a decision rather than an oversight.
//
// Also deliberately excluded: Lighthouse, performance, SEO and metadata assertions.
// Review routes are noindex throwaways removed before publication, and holding them
// to publication targets would stall the learner behind a number that does not
// matter. agent/contracts/quality.md records both exclusions.

if (conceptRoutes.length === 0) {
  // The template ships with no concepts and that is the normal state — the directory
  // only exists between design review and publication. A skipped test states that in
  // the report; an empty loop would report the same clean pass whether the discovery
  // worked or silently broke.
  test.skip("design-review concepts are defect-checked when any are published", () => {});
}

for (const route of conceptRoutes) {
  test.describe(`design-review concept ${route}`, () => {
    // Each project in playwright.config.ts pins one of the five widths in
    // agent/contracts/quality.md, so these run at 320, 390, 430, 768 and 1440
    // automatically. Do not rebuild that matrix in here.
    test("has no horizontal overflow at this viewport width", async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    // Serious and critical only. This is a defect check on a throwaway preview, not
    // the full accessibility gate the published site has to clear, and minor or
    // moderate findings on a concept are noise that would block promotion for
    // nothing. Colour-contrast failures land in this band, which is the single most
    // common concept defect and the one the learner is least able to report as a
    // technical fault.
    test("has no serious or critical automated accessibility violations", async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations
        .filter(({ impact }) => impact === "critical" || impact === "serious")
        .map(({ id, impact, nodes }) => `${id} (${impact}): ${nodes.map((node) => node.target.join(", ")).join(" | ")}`);
      expect(blocking).toEqual([]);
    });

    // A concept that builds but renders as an empty or collapsed page is a defect the
    // learner should never be shown, and it is invisible to the checks above: nothing
    // overflows and axe finds nothing to fail. The floors are set well below anything
    // a real homepage concept produces, because the failure being caught is a blank
    // page rather than a short one. Nothing here asserts copy, which is unknowable
    // from this file.
    test("actually rendered visible content", async ({ page }) => {
      await page.goto(route);
      const rendered = await page.evaluate(() => ({
        height: Math.max(document.body.getBoundingClientRect().height, document.body.scrollHeight),
        textLength: document.body.innerText.trim().length,
      }));
      expect(rendered.height).toBeGreaterThan(200);
      expect(rendered.textLength).toBeGreaterThan(0);
    });
  });
}
