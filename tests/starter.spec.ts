import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("starter exposes the approved primary actions and noindex state", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("IndexDock Starter");
  await expect(page.getByRole("heading", { level: 1, name: "Your website is live." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "What happens after setup?" })).toBeVisible();
  await expect(page.getByText(/^You stay in one guided task/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the course" })).toHaveAttribute("href", "https://www.indexdock.com/en-US/school/website-from-scratch");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/indexdock-mark.svg");
  await expect(page.getByRole("link", { name: "Built with IndexDock Starter" })).toHaveAttribute("rel", "nofollow");
});

// The suite runs under prefers-reduced-motion: reduce so axe measures the page a reader
// sees rather than one caught mid-animation, per agent/contracts/quality.md, which also
// carries the rule for opting back in. This test's subject *is* the animation, and
// src/components/IndexDockMark.astro answers reduced motion with `animation: none` on
// `.mark-piece`, so it has to ask for motion to see anything. Note that global.css only
// shortens durations; it leaves `animation-name` intact.
//
// test.use replaces contextOptions wholesale rather than merging, so any second key added
// to `use.contextOptions` in playwright.config.ts has to be repeated here.
test.describe("with motion enabled", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("starter uses a large continuously animated docking mark and sticky header", async ({ page }) => {
    await page.goto("/");

    const markShell = page.locator(".mark-shell");
    const box = await markShell.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThanOrEqual(286);

    const signalAnimation = await page.locator(".mark-signal--two").evaluate((element) => getComputedStyle(element).animationName);
    expect(signalAnimation).toContain("dock-in");
    expect(signalAnimation).toContain("docked-drift");

    await expect(page.locator(".site-header")).toHaveCSS("position", "sticky");
    const viewport = page.viewportSize();
    const headerBox = await page.locator(".site-header").boundingBox();
    const headerInnerBox = await page.locator(".site-header__inner").boundingBox();
    const contentShellBox = await page.locator("body > .page-shell").boundingBox();
    expect(headerBox?.width).toBeCloseTo(viewport?.width ?? 0, 0);
    expect(headerInnerBox?.x).toBeCloseTo(contentShellBox?.x ?? 0, 0);
    expect(headerInnerBox?.width).toBeCloseTo(contentShellBox?.width ?? 0, 0);
    const scrollMargin = await page.locator("#next-title").evaluate((element) => parseFloat(getComputedStyle(element).scrollMarginTop));
    expect(scrollMargin).toBeGreaterThan(0);
  });

  // Reduced motion measures animations at their end state, so a transform that overflows
  // only while it is moving would never be seen — and most visitors have no reduced-motion
  // preference, so for them that scrollbar is real. This repeats the overflow check with
  // motion running to keep that case covered.
  test("no horizontal overflow while animations are running", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test("starter honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".mark-signal--two")).toHaveCSS("animation-name", "none");
});

test("starter social preview is a 1200 by 630 image", async ({ page }) => {
  await page.goto("/");
  const dimensions = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/indexdock-starter-social.png";
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(dimensions).toEqual({ width: 1200, height: 630 });
});

test("starter metadata never publishes localhost URLs", async ({ page }) => {
  await page.goto("/");
  const head = await page.locator("head").innerHTML();
  expect(head).not.toContain("localhost");
  expect(head).not.toContain("127.0.0.1");
});

test("starter has no serious or critical automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(({ impact }) => impact === "critical" || impact === "serious");
  expect(blocking).toEqual([]);
});

test("starter has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("unknown routes serve the branded 404 response", async ({ page }) => {
  const response = await page.goto("/missing-route");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "This page has not docked yet." })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
