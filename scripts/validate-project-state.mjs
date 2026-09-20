import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  phaseOrder,
  schemaVersion as expectedSchemaVersion,
  provider as expectedProvider,
  workerNamePattern,
  valuesOf,
} from "./project-state-vocabulary.mjs";

const stateSource = process.argv[2]
  ? resolve(process.argv[2])
  : new URL("../project/project-state.json", import.meta.url);
const state = JSON.parse(await readFile(stateSource, "utf8"));

const errors = [];
// Every closed value set comes from project-state-vocabulary.mjs, which the
// schema is checked against, so this file and the schema cannot disagree.
const phases = valuesOf("/properties/workflow/properties/phase/enum");
const statuses = valuesOf("/properties/workflow/properties/status/enum");
const deploymentMethods = valuesOf("/properties/deployment/properties/deploymentMethod/enum");
const repositoryVisibilities = valuesOf("/properties/deployment/properties/repositoryVisibility/enum");
const promotionModes = valuesOf("/properties/deployment/properties/promotionMode/enum");
const customDomainDecisions = valuesOf("/properties/deployment/properties/customDomainDecision/enum");
const designStatuses = valuesOf("/properties/design/properties/status/enum");
const implementationStatuses = valuesOf("/properties/implementation/properties/status/enum");
const siteModes = valuesOf("/properties/implementation/properties/siteMode/enum");
const checkpoints = valuesOf("/properties/workflow/properties/courseCheckpointId/enum");
const approvalKeys = ["scope", "websitePlan", "design", "finalWebsite"];
const secretKeyPattern = /(password|passwd|secret|token|api[-_]?key|private[-_]?key|payment)/i;

function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  return true;
}

function requireNonEmptyString(value, path) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
  }
}

function inspectForSecrets(value, path = "state") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (secretKeyPattern.test(key)) errors.push(`${path}.${key} looks like a forbidden secret field.`);
    inspectForSecrets(child, `${path}.${key}`);
  }
}

// Repositories created from an earlier template carry 3.0.0, so the message has to name
// the migration rather than only the mismatch. It is three edits, and no data is lost.
if (state.schemaVersion === "3.0.0") {
  errors.push(
    `schemaVersion is 3.0.0 and must be ${expectedSchemaVersion}. To migrate: delete ` +
      "deployment.cloudflareAccountId and deployment.previewUrl, both of which were never filled, " +
      `then set schemaVersion to ${expectedSchemaVersion} and run npm run sync:status.`,
  );
} else if (state.schemaVersion === "3.1.0") {
  // 3.2.0 only adds the share-references course checkpoint as an allowed value, so a 3.1.0
  // file is already valid in every other respect and the migration is the version string
  // alone. Naming it matters more here than for 3.0.0, not less: an error that reports only
  // a mismatch invites a mid-course learner repository to be treated as needing a data
  // migration it does not need.
  errors.push(
    `schemaVersion is 3.1.0 and must be ${expectedSchemaVersion}. To migrate: set ` +
      `schemaVersion to ${expectedSchemaVersion} and run npm run sync:status. No field ` +
      "changes, because 3.2.0 only adds an allowed course checkpoint value.",
  );
} else if (state.schemaVersion !== expectedSchemaVersion) {
  errors.push(`schemaVersion must be ${expectedSchemaVersion}.`);
}

if (requireObject(state.project, "project")) {
  requireNonEmptyString(state.project.name, "project.name");
  // Null until bootstrap records the repository the learner actually created.
  // The template must not ship an identity that belongs to another repository.
  if (state.project.repository !== null && (typeof state.project.repository !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(state.project.repository))) {
    errors.push("project.repository must be an owner/repository identifier or null.");
  }
  if (state.project.language !== null && typeof state.project.language !== "string") {
    errors.push("project.language must be a string or null.");
  }
}

if (requireObject(state.workflow, "workflow")) {
  if (!phases.has(state.workflow.phase)) errors.push("workflow.phase is not a supported phase.");
  if (!statuses.has(state.workflow.status)) errors.push("workflow.status is not supported.");
  requireNonEmptyString(state.workflow.nextAction, "workflow.nextAction");
  if (!checkpoints.has(state.workflow.courseCheckpointId)) {
    errors.push("workflow.courseCheckpointId is not a stable course checkpoint ID.");
  }
}

if (requireObject(state.approvals, "approvals")) {
  for (const key of approvalKeys) {
    if (!(key in state.approvals)) errors.push(`approvals.${key} is required.`);
    else if (state.approvals[key] !== null && typeof state.approvals[key] !== "boolean") {
      errors.push(`approvals.${key} must be boolean or null.`);
    }
  }
}

for (const key of ["design", "implementation", "deployment"]) {
  requireObject(state[key], key);
}
if (state.design) {
  if (!designStatuses.has(state.design.status)) errors.push("design.status is not supported.");
}
if (state.implementation) {
  if (!implementationStatuses.has(state.implementation.status)) errors.push("implementation.status is not supported.");
  if (!siteModes.has(state.implementation.siteMode)) errors.push("implementation.siteMode is not supported.");
}
if (state.deployment) {
  if (state.deployment.provider !== expectedProvider) errors.push(`deployment.provider must be ${expectedProvider}.`);
  if (!deploymentMethods.has(state.deployment.deploymentMethod)) errors.push("deployment.deploymentMethod is not supported.");
  if (!customDomainDecisions.has(state.deployment.customDomainDecision)) errors.push("deployment.customDomainDecision is not supported.");
  // The schema declares this pattern but nothing executed it, so an unusable name could be
  // recorded and then written into wrangler.jsonc, where Cloudflare rejects the build.
  if (state.deployment.workerName !== null && !workerNamePattern.test(state.deployment.workerName ?? "")) {
    errors.push("deployment.workerName is not a valid Cloudflare Worker name.");
  }
  if ("repositoryVisibility" in state.deployment && !repositoryVisibilities.has(state.deployment.repositoryVisibility)) {
    errors.push("deployment.repositoryVisibility is not supported.");
  }
  if ("promotionMode" in state.deployment && !promotionModes.has(state.deployment.promotionMode)) {
    errors.push("deployment.promotionMode is not supported.");
  }
}

// Switching the repository to private is a required closing step, not an
// offer. The agent cannot change visibility itself, so this gate is what
// stops the course being reported complete while the learner's site source
// is still public.
if (state.workflow?.courseCheckpointId === "course-complete" && state.deployment?.repositoryVisibility !== "private") {
  errors.push("course-complete requires deployment.repositoryVisibility to be private.");
}

if (!Array.isArray(state.blockers)) errors.push("blockers must be an array.");
if (!Array.isArray(state.conflicts)) errors.push("conflicts must be an array.");
if (state.implementation?.noindex !== true && state.implementation?.siteMode !== "business") {
  errors.push("starter and design-review modes must remain noindex.");
}
if (state.approvals?.design !== true && state.workflow?.phase === "implementation") {
  errors.push("implementation phase requires design approval.");
}
if (state.approvals?.finalWebsite !== true && state.implementation?.noindex === false) {
  errors.push("indexing cannot be enabled before final website approval.");
}

const currentPhaseIndex = phaseOrder.indexOf(state.workflow?.phase);
const phaseAtLeast = (phase) => currentPhaseIndex >= phaseOrder.indexOf(phase);

if (phaseAtLeast("business-plan") && state.approvals?.scope !== true) {
  errors.push("business-plan and later phases require scope approval.");
}
if (phaseAtLeast("design-discovery") && state.approvals?.websitePlan !== true) {
  errors.push("design-discovery and later phases require website-plan approval.");
}
if (phaseAtLeast("implementation") && state.approvals?.design !== true) {
  errors.push("implementation and later phases require design approval.");
}
if (phaseAtLeast("publication") && state.approvals?.finalWebsite !== true) {
  errors.push("publication and maintenance phases require final website approval.");
}

inspectForSecrets(state);

if (errors.length > 0) {
  console.error("Project state validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Project state is valid.");
