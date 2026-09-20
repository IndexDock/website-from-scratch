import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const validator = resolve(root, "scripts/validate-project-state.mjs");
const shippedState = resolve(root, "project/project-state.json");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "indexdock-state-validation-"));

// Pinned, not read from project/project-state.json. Deriving fixtures from live
// project state means a negative case only stays negative while the project has
// not reached the state it is meant to reject: once a learner approves their
// scope, "business plan without scope approval" inherits scope: true, becomes a
// perfectly legal state, and the case fails against a validator that is behaving
// correctly. test:state runs inside validate:agent, so that failure blocks every
// push from the first approval onwards. scripts/test-release-validation.mjs pins
// its own fixture source for the same reason.
const baseState = {
  $schema: "../agent/schemas/project-state.schema.json",
  schemaVersion: "3.2.0",
  project: { name: "Fixture website", repository: null, language: null },
  workflow: {
    phase: "bootstrap",
    status: "ready",
    nextAction: "Deploy the starter page and continue in the IndexDock course.",
    courseCheckpointId: "deploy-placeholder",
  },
  approvals: { scope: null, websitePlan: null, design: null, finalWebsite: null },
  design: { status: "not-started", conceptCount: null, selectedConcept: null },
  implementation: { status: "starter-ready", siteMode: "starter", noindex: true },
  deployment: {
    provider: "cloudflare-workers",
    deploymentMethod: "not-selected",
    repositoryVisibility: null,
    promotionMode: "ci-auto",
    workerName: null,
    workersDevUrl: null,
    productionUrl: null,
    customDomainDecision: null,
    customDomain: null,
    deployedCommit: null,
    verifiedAt: null,
    fallbackReason: null,
  },
  lastCheckpoint: null,
  blockers: [],
  conflicts: [],
};

// Each negative case states every condition it depends on, including the approval
// it is named after. Relying on the baseline to supply half the condition is the
// defect above in miniature.
const cases = [
  {
    name: "valid bootstrap",
    valid: true,
    mutate: () => {},
  },
  {
    name: "business plan without scope approval",
    valid: false,
    mutate: (state) => {
      state.workflow.phase = "business-plan";
      state.approvals.scope = null;
    },
  },
  {
    name: "design discovery without website-plan approval",
    valid: false,
    mutate: (state) => {
      state.workflow.phase = "design-discovery";
      state.approvals.scope = true;
      state.approvals.websitePlan = null;
    },
  },
  {
    name: "implementation without design approval",
    valid: false,
    mutate: (state) => {
      state.workflow.phase = "implementation";
      state.approvals.scope = true;
      state.approvals.websitePlan = true;
      state.approvals.design = null;
    },
  },
  {
    name: "publication without final approval",
    valid: false,
    mutate: (state) => {
      state.workflow.phase = "publication";
      state.approvals.scope = true;
      state.approvals.websitePlan = true;
      state.approvals.design = true;
      state.approvals.finalWebsite = null;
      state.design.status = "approved";
      state.design.conceptCount = 2;
      state.design.selectedConcept = "Test concept";
      state.implementation.siteMode = "business";
      // Indexing must stay off here, or the state is rejected by the noindex rule
      // instead of the approval rule this case exists to prove.
      state.implementation.noindex = true;
    },
  },
  {
    name: "deploying through workers builds",
    valid: true,
    mutate: (state) => {
      state.project.repository = "learner/example-site";
      state.deployment.deploymentMethod = "workers-builds";
      state.deployment.repositoryVisibility = "public";
    },
  },
  {
    name: "deploying directly with wrangler",
    valid: false,
    mutate: (state) => {
      state.project.repository = "learner/example-site";
      state.deployment.deploymentMethod = "wrangler";
    },
  },
  {
    name: "deploying by hand from the Cloudflare dashboard",
    valid: false,
    mutate: (state) => {
      state.project.repository = "learner/example-site";
      state.deployment.deploymentMethod = "manual-dashboard";
    },
  },
  {
    name: "unsupported design status",
    valid: false,
    mutate: (state) => {
      state.design.status = "in-review";
    },
  },
  {
    name: "unsupported implementation status",
    valid: false,
    mutate: (state) => {
      state.implementation.status = "shipped";
    },
  },
  {
    name: "unsupported site mode",
    valid: false,
    mutate: (state) => {
      state.implementation.siteMode = "portfolio";
    },
  },
  {
    name: "malformed repository identifier",
    valid: false,
    mutate: (state) => {
      state.project.repository = "not-an-owner-slash-repo/";
    },
  },
  {
    name: "unsupported repository visibility",
    valid: false,
    mutate: (state) => {
      state.deployment.repositoryVisibility = "internal";
    },
  },
  {
    name: "unsupported promotion mode",
    valid: false,
    mutate: (state) => {
      state.deployment.promotionMode = "auto-merge";
    },
  },
  {
    name: "course complete while the repository is still public",
    valid: false,
    mutate: (state) => {
      state.workflow.courseCheckpointId = "course-complete";
      state.deployment.repositoryVisibility = "public";
    },
  },
  {
    name: "course complete after the repository is private",
    valid: true,
    mutate: (state) => {
      state.workflow.courseCheckpointId = "course-complete";
      state.deployment.repositoryVisibility = "private";
    },
  },
  {
    name: "superseded schema version is rejected",
    valid: false,
    mutate: (state) => {
      state.schemaVersion = "2.1.0";
    },
  },
  {
    // Both named migration branches are asserted on their message, not merely on
    // rejection. The generic arm rejects these versions anyway, so without `expect` a
    // deleted branch would leave every case still green.
    name: "3.0.0 is rejected with its migration steps",
    valid: false,
    expect: "delete deployment.cloudflareAccountId",
    mutate: (state) => {
      state.schemaVersion = "3.0.0";
    },
  },
  {
    name: "3.1.0 is rejected with its one-line migration",
    valid: false,
    expect: "only adds an allowed course checkpoint value",
    mutate: (state) => {
      state.schemaVersion = "3.1.0";
    },
  },
  {
    name: "forbidden credential field",
    valid: false,
    mutate: (state) => {
      state.deployment.apiToken = "do-not-store";
    },
  },
];

try {
  for (const testCase of cases) {
    const state = structuredClone(baseState);
    testCase.mutate(state);
    const fixture = join(temporaryDirectory, `${testCase.name.replaceAll(" ", "-")}.json`);
    await writeFile(fixture, JSON.stringify(state));
    const result = spawnSync(process.execPath, [validator, fixture], { encoding: "utf8" });
    const passed = result.status === 0;
    if (passed !== testCase.valid) {
      throw new Error(`${testCase.name}: expected valid=${testCase.valid}, received exit ${result.status}.\n${result.stdout}${result.stderr}`);
    }
    // Exit status alone cannot tell a bespoke migration message from the generic mismatch
    // that would replace it, because both exit non-zero. A case that checked only status
    // would keep passing after the branch it covers was deleted, which is the regression
    // this assertion exists to catch.
    if (testCase.expect) {
      const output = `${result.stdout}${result.stderr}`;
      if (!output.includes(testCase.expect)) {
        throw new Error(`${testCase.name}: expected output to contain ${JSON.stringify(testCase.expect)}.\n${output}`);
      }
    }
  }

  // The fixtures are pinned, so the file this repository actually ships is no
  // longer covered by any of them. Check it directly instead, unmodified: it must
  // be valid whatever phase the project has reached.
  const shipped = spawnSync(process.execPath, [validator, shippedState], { encoding: "utf8" });
  if (shipped.status !== 0) {
    throw new Error(`project/project-state.json is not valid.\n${shipped.stdout}${shipped.stderr}`);
  }

  console.log(`${cases.length} project-state gate cases passed, and project/project-state.json is valid.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
