import { readFile, writeFile } from "node:fs/promises";

// Cloudflare requires the dashboard Worker name and `name` in wrangler.jsonc to match,
// or the build fails. Nothing in the learner's setup flow asks for that name — Cloudflare
// picks it — so the template cannot ship a value that matches. Reconciling the two was a
// hand-edit described in prose in agent/phases/bootstrap.md, which is the kind of step
// that gets skipped or done inconsistently. This makes it deterministic and, with
// --check, self-verifying.
//
// Shape follows scripts/sync-status.mjs: work out the expected value, then either write
// it or compare and fail naming the command that fixes it.
const stateUrl = new URL("../project/project-state.json", import.meta.url);
const wranglerUrl = new URL("../wrangler.jsonc", import.meta.url);
const state = JSON.parse(await readFile(stateUrl, "utf8"));

// Same pattern as agent/schemas/project-state.schema.json.
const workerNamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Only observed deployment facts are used, never a guess.
//
// An earlier version fell back to the repository name when neither was recorded. That was
// wrong in two ways. Bootstrap records project.repository before it asks for the live URL,
// so there is a window where the only available source is the guess — and during it
// --check would reject a correct committed name and demand it be overwritten. And the
// guess is not reliable: Cloudflare de-duplicates a colliding name, so the Worker for
// repository `my-site` can genuinely be `my-site-2`. Reconciling against something nobody
// observed can break a working deployment, so the script now does nothing until there is
// a real value to reconcile against.
function expectedWorkerName() {
  const recorded = state.deployment?.workerName;
  if (recorded) {
    if (!workerNamePattern.test(recorded)) {
      // Deliberately not normalized. Silently lowercasing "MySite" to "mysite" would make
      // wrangler.jsonc disagree with the state file while --check reported a match, which
      // is the exact drift this script exists to catch.
      fail(
        `deployment.workerName "${recorded}" is not a valid Cloudflare Worker name. ` +
          "Record the name exactly as it appears in the Cloudflare dashboard.",
      );
    }
    return recorded;
  }

  const url = state.deployment?.workersDevUrl;
  if (!url) return null;

  let label;
  try {
    label = new URL(url).hostname.split(".")[0];
  } catch {
    // A recorded URL is ground truth. Ignoring an unreadable one and carrying on would
    // certify a value nobody checked.
    fail(
      `deployment.workersDevUrl "${url}" cannot be read as a URL, so the Worker name ` +
        "cannot be derived from it. Record the full address, including https://.",
    );
  }
  if (!label || !workerNamePattern.test(label)) {
    fail(`deployment.workersDevUrl "${url}" does not start with a valid Worker name.`);
  }
  return label;
}

const expected = expectedWorkerName();

// Nothing observed yet. That is the template's own state, and also a learner repository
// between bootstrap recording the repository and the learner supplying the live URL.
if (!expected) {
  console.log("No Worker recorded yet, so wrangler.jsonc keeps its shipped placeholder name.");
  process.exit(0);
}

const current = await readFile(wranglerUrl, "utf8");

// Read and write by regex rather than JSON.parse plus JSON.stringify, because a round trip
// would strip the file's comments and reformat it. Reading configuration this way is
// already the idiom here; scripts/validate-release.mjs reads src/data/site.ts the same way.
//
// The catch is that "name" is not unique in a Wrangler config — kv_namespaces,
// d1_databases and durable_objects bindings all use it — so a lone regex could rewrite a
// binding instead of the Worker. Rather than parse the file to find out which is which,
// require the answer to be unambiguous: exactly one "name" key at the start of a line. A
// config with bindings has more, and this refuses to touch it instead of guessing.
//
// The file is .jsonc and comments are legal in it, so nothing here may assume otherwise.
const namePattern = /^(\s*"name"\s*:\s*)"([^"]*)"/m;
const nameKeys = [...current.matchAll(/^\s*"name"\s*:\s*"[^"]*"/gm)];

if (nameKeys.length === 0) {
  fail('wrangler.jsonc has no top-level "name" field to synchronize.');
}
if (nameKeys.length > 1) {
  fail(
    `wrangler.jsonc has ${nameKeys.length} "name" entries, so the Worker's own name cannot be ` +
      "identified safely. Bindings such as kv_namespaces also use \"name\"; set the Worker name by hand.",
  );
}

const currentName = current.match(namePattern)[2];

if (process.argv.includes("--check")) {
  if (currentName !== expected) {
    fail(
      `wrangler.jsonc names Worker "${currentName}" but the recorded deployment is "${expected}". ` +
        "Run npm run sync:worker.",
    );
  }
  console.log(`wrangler.jsonc matches the recorded Worker name ${expected}.`);
} else if (currentName === expected) {
  console.log(`wrangler.jsonc already names Worker ${expected}.`);
} else {
  await writeFile(wranglerUrl, current.replace(namePattern, `$1"${expected}"`), "utf8");
  console.log(`Updated wrangler.jsonc Worker name from ${currentName} to ${expected}.`);
}
