import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
    // Scan the page a reader actually sees, not one caught mid-animation. axe reads
    // computed colours, so an element part-way through an opacity fade measures as
    // near-invisible: a pilot run reported nine serious colour-contrast failures at
    // ratios of 1.13-1.19 for text that was solid and readable a moment later, and
    // the reveal was deleted to silence them. Reduced motion is the correct fix
    // rather than a workaround, because agent/rubrics/design-craft.md already
    // requires every reveal to honour it, so this measures the documented end
    // state. It tightens the gate: replayed against that run, the nine artefacts
    // disappear and the two genuine contrast failures still fail.
    //
    // This has to sit inside contextOptions. `reducedMotion` is a browser-context option,
    // not a top-level `use` option, and writing it directly under `use` applies it to
    // nothing — every test then runs with motion enabled. `npm run check` does catch that
    // mistake, as ts(2769) on this file, so the type checker is the backstop here rather
    // than a failing test.
    //
    // scripts/run-lighthouse.mjs passes Chrome --force-prefers-reduced-motion for the same
    // reason. Both tiers run axe, so setting it in only one is worse than neither: the
    // remaining tier reports the animation artefact with nothing to contradict it.
    contextOptions: {
      reducedMotion: "reduce",
    },
  },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "mobile-chromium-390",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "mobile-webkit-430",
      use: { ...devices["iPhone 15 Pro Max"], viewport: { width: 430, height: 932 } },
    },
    {
      name: "desktop-chromium-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "desktop-firefox-768",
      use: { ...devices["Desktop Firefox"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-webkit-320",
      use: { ...devices["Desktop Safari"], viewport: { width: 320, height: 800 } },
    }
  ],
});
