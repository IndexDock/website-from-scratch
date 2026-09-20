// Verifies a live Cloudflare deployment.
//
// This runs in continuous integration, not in the agent session. A cloud agent
// sandbox cannot reach *.workers.dev: it is not on Claude Code's network
// allowlist, and Codex has no agent-phase internet. CI has full network access,
// so live verification belongs there and the agent reads the result.
//
// Usage:
//   node scripts/verify-cloudflare-deployment.mjs <url> [--commit <sha>] [--timeout <seconds>]

const args = process.argv.slice(2);
const candidate = args[0];
const readFlag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
};

if (!candidate || candidate.startsWith("--")) {
  console.error("Usage: node scripts/verify-cloudflare-deployment.mjs <url> [--commit <sha>] [--timeout <seconds>]");
  process.exit(1);
}

let url;
try {
  url = new URL(candidate);
} catch {
  console.error("Deployment URL is invalid.");
  process.exit(1);
}
if (url.protocol !== "https:") {
  console.error("Deployment verification requires an HTTPS URL.");
  process.exit(1);
}

const expectedCommit = readFlag("--commit");
const deadlineSeconds = Number(readFlag("--timeout") ?? 600);
if (!Number.isFinite(deadlineSeconds) || deadlineSeconds <= 0) {
  console.error("--timeout must be a positive number of seconds.");
  process.exit(1);
}

const deadline = Date.now() + deadlineSeconds * 1000;
const versionUrl = new URL("/version.json", url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt() {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };

  const body = await response.text();
  if (!body.toLowerCase().includes("indexdock")) {
    return { ok: false, reason: "the live response does not contain the expected IndexDock marker" };
  }

  // Only meaningful once the build emits it. An older deployment that predates
  // the endpoint returns 404, which is a mismatch worth waiting out rather than
  // a hard failure.
  let servedCommit = null;
  if (expectedCommit) {
    const versionResponse = await fetch(versionUrl, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (versionResponse?.ok) {
      servedCommit = await versionResponse
        .json()
        .then((payload) => payload?.commit ?? null)
        .catch(() => null);
    }
    if (servedCommit && !expectedCommit.startsWith(servedCommit) && !servedCommit.startsWith(expectedCommit)) {
      return { ok: false, reason: `the live site is serving commit ${servedCommit}, not ${expectedCommit}` };
    }
  }

  return { ok: true, status: response.status, resolvedUrl: response.url, servedCommit };
}

let last = { ok: false, reason: "no attempt completed" };
while (Date.now() < deadline) {
  last = await attempt().catch((error) => ({ ok: false, reason: error.message }));
  if (last.ok) break;
  const remaining = deadline - Date.now();
  if (remaining <= 0) break;
  console.log(`Waiting for the deployment: ${last.reason}.`);
  await sleep(Math.min(15_000, remaining));
}

if (!last.ok) {
  console.error(`Deployment verification failed after ${deadlineSeconds}s: ${last.reason}.`);
  process.exit(1);
}

if (expectedCommit && !last.servedCommit) {
  console.log("Commit verification unavailable: the deployment does not expose /version.json. Verified by marker only.");
}

console.log(JSON.stringify({
  verified: true,
  url: last.resolvedUrl,
  status: last.status,
  commit: last.servedCommit,
  verifiedAt: new Date().toISOString(),
}, null, 2));
