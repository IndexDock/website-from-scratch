import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import lighthouse from "lighthouse";
import { chromium } from "@playwright/test";

const root = process.cwd();
const reportDirectory = resolve(root, ".lighthouseci");
const siteSource = await readFile(resolve(root, "src/data/site.ts"), "utf8");
const indexHtml = await readFile(resolve(root, "dist/index.html"), "utf8");
const config = JSON.parse(await readFile(resolve(root, "lighthouserc.json"), "utf8"));
const primaryPath = siteSource.match(/primaryConversionPath:\s*["']([^"']+)["']/)?.[1] ?? "/";
const auditPaths = [...new Set(["/", primaryPath])];
const isPlaceholder = /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(indexHtml);
const failures = [];

await mkdir(reportDirectory, { recursive: true });
const profileDirectory = await mkdtemp(join(reportDirectory, "chrome-profile-"));
const serverPort = await reservePort();
const chromePort = await reservePort();
let serverError = "";
let chromeError = "";

const staticServer = spawn(process.execPath, [resolve(root, "scripts/serve-dist.mjs")], {
  cwd: root,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(serverPort) },
  stdio: ["ignore", "ignore", "pipe"],
  windowsHide: true,
});
staticServer.stderr.on("data", (chunk) => { serverError += chunk; });

const chromeProcess = spawn(chromium.executablePath(), [
  "--headless=new",
  // Lighthouse's accessibility category runs axe, including colour contrast, right after
  // load. Without this the audit lands mid-animation and reads a fading element's blended
  // colour as unreadable text: a reveal starting at opacity 0.12 scores 0 on
  // colour-contrast and drops the category to 0.82, under the 0.95 floor in
  // lighthouserc.json. Playwright is told the same thing in playwright.config.ts. Setting
  // it in only one of the two is worse than neither, because the remaining voice reports
  // an artefact with nothing to contradict it.
  "--force-prefers-reduced-motion",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${chromePort}`,
  `--user-data-dir=${profileDirectory}`,
  "about:blank",
], {
  stdio: ["ignore", "ignore", "pipe"],
  windowsHide: true,
});
chromeProcess.stderr.on("data", (chunk) => { chromeError += chunk; });

let browser;

try {
  await waitForUrl(`http://127.0.0.1:${serverPort}/`, staticServer, () => serverError);
  const version = await waitForJson(`http://127.0.0.1:${chromePort}/json/version`, chromeProcess, () => chromeError);
  browser = await chromium.connectOverCDP(version.webSocketDebuggerUrl);

  for (const path of auditPaths) {
    const url = new URL(path, `http://127.0.0.1:${serverPort}`).href;
    const result = await lighthouse(url, {
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      output: ["html", "json"],
      port: chromePort,
    });

    if (!result) throw new Error(`Lighthouse returned no result for ${path}.`);
    const [htmlReport, jsonReport] = result.report;
    const slug = path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replaceAll(/[^a-zA-Z0-9_-]/g, "-");
    const stamp = Date.now();
    await writeFile(resolve(reportDirectory, `${slug}-${stamp}.report.html`), htmlReport);
    await writeFile(resolve(reportDirectory, `${slug}-${stamp}.report.json`), jsonReport);

    applyAssertions(result.lhr, path);
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopChild(chromeProcess);
  await stopChild(staticServer);
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Lighthouse gates passed for ${auditPaths.join(", ")} (${isPlaceholder ? "safe placeholder" : "indexable client site"}).`);

function applyAssertions(report, path) {
  for (const [key, rule] of Object.entries(config.ci.assert.assertions)) {
    const category = key.replace(/^categories:/, "");
    const [severity, options] = rule;
    const score = report.categories?.[category]?.score;
    const minimum = category === "seo" && !isPlaceholder ? 1 : options.minScore;

    if (typeof score === "number" && score >= minimum) continue;
    const message = `Lighthouse ${category} score ${score ?? "missing"} for ${path} is below ${minimum}.`;
    if (severity === "warn") console.warn(`Warning: ${message}`);
    else failures.push(message);
  }
}

function reservePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Could not reserve a local port."));
        return;
      }
      const { port } = address;
      probe.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function waitForJson(url, child, errorOutput) {
  const response = await waitForResponse(url, child, errorOutput);
  return response.json();
}

async function waitForUrl(url, child, errorOutput) {
  await waitForResponse(url, child, errorOutput);
}

async function waitForResponse(url, child, errorOutput) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Process exited before ${url} was ready.\n${errorOutput()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for ${url}.\n${errorOutput()}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
}
