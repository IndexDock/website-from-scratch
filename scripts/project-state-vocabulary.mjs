// The closed sets of values project state may hold, in one place.
//
// Why this file exists: these lists were written out twice, once in
// scripts/validate-project-state.mjs and once in
// agent/schemas/project-state.schema.json. Only the validator runs, so when
// deployment.deploymentMethod was narrowed in the validator the schema kept
// listing "wrangler" and "manual-dashboard" for two more releases and nothing
// noticed. Now the validator imports these values and
// scripts/validate-schema-parity.mjs checks the schema still declares the same
// ones, so the two documents cannot drift apart silently.
//
// Each entry names the JSON Pointer of the schema keyword it mirrors, so the
// parity check can find its counterpart without guessing.

// Workflow phases, in the order the workflow runs them. Exported as an array
// because the validator also needs the order to check phase-gated approvals.
export const phaseOrder = [
  "bootstrap",
  "scope",
  "business-plan",
  "design-discovery",
  "design-review",
  "implementation",
  "quality-review",
  "publication",
  "maintenance",
];

// The exact schemaVersion string this validator understands.
export const schemaVersion = "3.2.0";

// The only deployment provider the workflow supports.
export const provider = "cloudflare-workers";

// Cloudflare's own Worker naming rule, duplicated here because nothing executes
// the schema that declares it.
export const workerNamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

// Every closed value set, keyed by the schema keyword it must match.
export const vocabularies = {
  "/properties/schemaVersion/const": {
    label: "schemaVersion",
    values: [schemaVersion],
    keyword: "const",
  },
  "/properties/workflow/properties/phase/enum": {
    label: "workflow.phase",
    values: phaseOrder,
  },
  "/properties/workflow/properties/status/enum": {
    label: "workflow.status",
    values: ["ready", "in-progress", "awaiting-approval", "blocked", "complete"],
  },
  "/properties/workflow/properties/courseCheckpointId/enum": {
    label: "workflow.courseCheckpointId",
    values: [
      "setup-accounts",
      "create-repository",
      "deploy-placeholder",
      "star-repository",
      "start-agent",
      "review-brief",
      "share-references",
      "choose-design",
      "upload-assets",
      "review-website",
      "connect-domain",
      "secure-repository",
      "course-complete",
    ],
  },
  "/properties/design/properties/status/enum": {
    label: "design.status",
    values: ["not-started", "discovery", "concepts-ready", "approved"],
  },
  "/properties/implementation/properties/status/enum": {
    label: "implementation.status",
    values: ["starter-ready", "not-started", "in-progress", "qa-ready", "approved", "published"],
  },
  "/properties/implementation/properties/siteMode/enum": {
    label: "implementation.siteMode",
    values: ["starter", "design-review", "business"],
  },
  "/properties/deployment/properties/provider/const": {
    label: "deployment.provider",
    values: [provider],
    keyword: "const",
  },
  // Workers Builds is the only supported deployment mechanism. The agent never
  // deploys, so no other method is reachable from this workflow.
  "/properties/deployment/properties/deploymentMethod/enum": {
    label: "deployment.deploymentMethod",
    values: ["not-selected", "workers-builds"],
  },
  "/properties/deployment/properties/repositoryVisibility/enum": {
    label: "deployment.repositoryVisibility",
    values: [null, "public", "private"],
  },
  "/properties/deployment/properties/promotionMode/enum": {
    label: "deployment.promotionMode",
    values: [null, "ci-auto", "manual-merge"],
  },
  "/properties/deployment/properties/customDomainDecision/enum": {
    label: "deployment.customDomainDecision",
    values: [null, "now", "later"],
  },
};

/**
 * Looks up one vocabulary by the schema keyword it mirrors and returns its
 * values as a Set, which is what callers actually test membership against.
 *
 * How: reads the entry from the `vocabularies` map above and copies its values
 * into a fresh Set, so a caller cannot mutate the shared list. Throws on an
 * unknown pointer, because that means a typo rather than a missing value.
 *
 * O(n) time in the number of values in that one vocabulary: it copies them
 * once. O(n) space: the returned Set holds a copy.
 */
export function valuesOf(pointer) {
  const entry = vocabularies[pointer];
  if (!entry) throw new Error(`No vocabulary is registered for ${pointer}.`);
  return new Set(entry.values);
}
