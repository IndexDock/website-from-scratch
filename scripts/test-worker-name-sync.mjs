import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Every case below is reachable only in a learner repository, which is exactly where
// nothing else exercises this script. Each fixture is a throwaway copy of the two files
// the script reads, so the real project state is never touched.
const script = resolve("scripts/sync-worker-name.mjs");
const temporaryRoot = await mkdtemp(join(tmpdir(), "indexdock-worker-name-"));

const wranglerFile = (name) => `{
  "$schema": "./node_modules/wrangler/config-schema.json",
  // A comment that must survive the write.
  "name": "${name}",
  "compatibility_date": "2026-07-21",
  "workers_dev": true,
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  }
}
`;

const baseState = {
  project: { name: "Fixture website", repository: null, language: null },
  deployment: { workerName: null, workersDevUrl: null },
};

const cases = [
  {
    name: "nothing recorded leaves the shipped placeholder alone",
    state: {},
    wrangler: "indexdock-starter-website",
    expectWrangler: "indexdock-starter-website",
    expectExit: 0,
  },
  {
    // The earlier version guessed from the repository name here, which let --check reject
    // a correct committed name and demand a guess in its place.
    name: "a recorded repository alone is not enough to reconcile against",
    state: { project: { repository: "julia/my-site" } },
    wrangler: "my-site-2",
    expectWrangler: "my-site-2",
    expectExit: 0,
  },
  {
    name: "a recorded Worker name is written",
    state: { deployment: { workerName: "nails-site" } },
    wrangler: "indexdock-starter-website",
    expectWrangler: "nails-site",
    expectExit: 0,
  },
  {
    name: "the live URL is used when no Worker name is recorded",
    state: { deployment: { workersDevUrl: "https://nails-site.acme.workers.dev/" } },
    wrangler: "indexdock-starter-website",
    expectWrangler: "nails-site",
    expectExit: 0,
  },
  {
    name: "a recorded Worker name wins over the URL",
    state: {
      deployment: { workerName: "recorded-worker", workersDevUrl: "https://other.acme.workers.dev/" },
    },
    wrangler: "indexdock-starter-website",
    expectWrangler: "recorded-worker",
    expectExit: 0,
  },
  {
    // Ground truth must never be discarded in silence.
    name: "an unreadable live URL fails instead of falling back",
    state: {
      project: { repository: "julia/other-repo" },
      deployment: { workersDevUrl: "nails-site.acme.workers.dev" },
    },
    wrangler: "indexdock-starter-website",
    expectWrangler: "indexdock-starter-website",
    expectExit: 1,
    expectMessage: "cannot be read as a URL",
  },
  {
    // Written exactly as recorded. An earlier version lowercased it, which left the state
    // file saying "MySite" and wrangler.jsonc saying "mysite" while --check reported a
    // match — the precise drift this script exists to catch.
    name: "a recorded Worker name is written exactly as recorded",
    state: { deployment: { workerName: "MySite" } },
    wrangler: "indexdock-starter-website",
    expectWrangler: "MySite",
    expectExit: 0,
  },
  {
    name: "a recorded Worker name that breaks Cloudflare's rules fails loudly",
    state: { deployment: { workerName: "-not a name-" } },
    wrangler: "indexdock-starter-website",
    expectWrangler: "indexdock-starter-website",
    expectExit: 1,
    expectMessage: "not a valid Cloudflare Worker name",
  },
  {
    // kv_namespaces, d1_databases and durable_objects all use "name". The script refuses
    // to guess which one is the Worker rather than rewriting the wrong entry.
    name: "a config with more than one name entry is left alone",
    state: { deployment: { workerName: "nails-site" } },
    wrangler: "indexdock-starter-website",
    rawWrangler: `{
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "name": "some-kv"
    }
  ],
  "name": "indexdock-starter-website"
}
`,
    expectExit: 1,
    expectMessage: 'has 2 "name" entries',
  },
  {
    // The file is .jsonc, so a comment anywhere in it must not break the script. An
    // earlier version parsed the file to find the top-level name, which meant stripping
    // comments first and failing on any it could not strip.
    name: "comments elsewhere in the config do not break the read",
    state: { deployment: { workerName: "nails-site" } },
    rawWrangler: `{
  // Leading comment.
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "indexdock-starter-website",
  /* A block comment mentioning a URL: https://example.com/guide */
  "compatibility_date": "2026-07-21"
}
`,
    expectWrangler: "nails-site",
    expectExit: 0,
    expectContains: ["// Leading comment.", "https://example.com/guide"],
  },
];

let checked = 0;

try {
  for (const testCase of cases) {
    const root = join(temporaryRoot, testCase.name.replaceAll(" ", "-"));
    await mkdir(join(root, "project"), { recursive: true });
    await mkdir(join(root, "scripts"), { recursive: true });

    const state = structuredClone(baseState);
    Object.assign(state.project, testCase.state.project ?? {});
    Object.assign(state.deployment, testCase.state.deployment ?? {});
    await writeFile(join(root, "project/project-state.json"), JSON.stringify(state, null, 2));
    await writeFile(join(root, "wrangler.jsonc"), testCase.rawWrangler ?? wranglerFile(testCase.wrangler));
    // The script resolves both files relative to its own location, so it has to run from
    // inside the fixture rather than from the repository.
    await writeFile(join(root, "scripts/sync-worker-name.mjs"), await readFile(script, "utf8"));

    const write = spawnSync(process.execPath, [join(root, "scripts/sync-worker-name.mjs")], { encoding: "utf8" });
    const output = `${write.stdout}${write.stderr}`;

    if (write.status !== testCase.expectExit) {
      throw new Error(`${testCase.name}: expected exit ${testCase.expectExit}, received ${write.status}.\n${output}`);
    }
    if (testCase.expectMessage && !output.includes(testCase.expectMessage)) {
      throw new Error(`${testCase.name}: expected the failure to mention "${testCase.expectMessage}".\n${output}`);
    }

    const written = await readFile(join(root, "wrangler.jsonc"), "utf8");
    if (testCase.expectWrangler) {
      const actual = written.match(/^\s*"name"\s*:\s*"([^"]*)"/m)?.[1];
      if (actual !== testCase.expectWrangler) {
        throw new Error(`${testCase.name}: expected Worker name "${testCase.expectWrangler}", found "${actual}".`);
      }
    }
    if (!testCase.rawWrangler && !written.includes("// A comment that must survive the write.")) {
      throw new Error(`${testCase.name}: the JSONC comment was lost, so the file was rewritten rather than edited.`);
    }
    for (const fragment of testCase.expectContains ?? []) {
      if (!written.includes(fragment)) {
        throw new Error(`${testCase.name}: expected the written file to still contain "${fragment}".`);
      }
    }

    // Whatever the write did, --check must agree with the file it left behind.
    const check = spawnSync(
      process.execPath,
      [join(root, "scripts/sync-worker-name.mjs"), "--check"],
      { encoding: "utf8" },
    );
    if (check.status !== testCase.expectExit) {
      throw new Error(
        `${testCase.name}: --check disagreed with the write, exiting ${check.status} where the write exited ` +
          `${write.status}.\n${check.stdout}${check.stderr}`,
      );
    }
    checked += 1;
  }

  // Drift has to be caught, or the check inside validate:agent is decorative.
  const driftRoot = join(temporaryRoot, "drift");
  await mkdir(join(driftRoot, "project"), { recursive: true });
  await mkdir(join(driftRoot, "scripts"), { recursive: true });
  const driftState = structuredClone(baseState);
  driftState.deployment.workerName = "nails-site";
  await writeFile(join(driftRoot, "project/project-state.json"), JSON.stringify(driftState, null, 2));
  await writeFile(join(driftRoot, "wrangler.jsonc"), wranglerFile("something-else"));
  await writeFile(join(driftRoot, "scripts/sync-worker-name.mjs"), await readFile(script, "utf8"));
  const drift = spawnSync(
    process.execPath,
    [join(driftRoot, "scripts/sync-worker-name.mjs"), "--check"],
    { encoding: "utf8" },
  );
  if (drift.status === 0) {
    throw new Error("--check passed while wrangler.jsonc disagreed with the recorded Worker name.");
  }

  console.log(`${checked} worker-name cases passed, and --check rejects drift.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
