import { readFile } from "node:fs/promises";
import { vocabularies } from "./project-state-vocabulary.mjs";

// agent/schemas/project-state.schema.json is documentation: nothing executes it, and
// scripts/validate-project-state.mjs is what actually decides whether a state file is
// valid. Documentation nobody runs goes stale quietly. It did: the validator dropped
// "wrangler" and "manual-dashboard" from deployment.deploymentMethod when repository mode
// was removed in 9357c9e, and the schema kept listing them, so the file that describes the
// contract disagreed with the file that enforces it for two releases.
//
// This check compares every closed value set the validator enforces against the schema
// keyword that declares it. It is not a JSON Schema implementation and does not validate
// any state file — it only proves the two documents say the same thing.
const schemaPath = "agent/schemas/project-state.schema.json";
const schema = JSON.parse(await readFile(new URL(`../${schemaPath}`, import.meta.url), "utf8"));
const checkpointsPath = "agent/course-checkpoints.json";
const checkpointsFile = JSON.parse(await readFile(new URL(`../${checkpointsPath}`, import.meta.url), "utf8"));
const errors = [];

/**
 * Resolves a JSON Pointer against the parsed schema, so a vocabulary can name the exact
 * keyword it mirrors instead of this script hard-coding the nesting.
 *
 * How: splits on "/", unescapes the two characters JSON Pointer escapes ("~1" for "/" and
 * "~0" for "~"), then walks the object one segment at a time. Returns undefined as soon as
 * a segment is missing, which the caller reports as a keyword the schema does not declare.
 *
 * O(d) time where d is the number of segments: one property lookup each. O(d) space for
 * the split segments.
 */
function resolvePointer(pointer) {
  let current = schema;
  for (const raw of pointer.split("/").slice(1)) {
    const segment = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current === null || typeof current !== "object" || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Renders a list of allowed values for an error message, so a failure names the exact
 * strings to add or remove rather than only saying the two sides differ.
 *
 * O(n) time and space in the number of values: one JSON.stringify per value.
 */
function format(values) {
  return values.length ? values.map((value) => JSON.stringify(value)).join(", ") : "(empty)";
}

for (const [pointer, { label, values, keyword = "enum" }] of Object.entries(vocabularies)) {
  const declared = resolvePointer(pointer);

  if (declared === undefined) {
    errors.push(
      `${schemaPath} declares no ${keyword} at ${pointer}, but the validator enforces one for ` +
        `${label}. Add it, or remove the vocabulary entry if the field is gone.`,
    );
    continue;
  }

  // A `const` is a single value; an `enum` is an array. Compare both as lists so one
  // routine covers them, and so changing a field between the two forms is caught here.
  const declaredValues = keyword === "const" ? [declared] : declared;
  if (!Array.isArray(declaredValues)) {
    errors.push(`${schemaPath} has a non-array enum at ${pointer} for ${label}.`);
    continue;
  }

  // Order carries no meaning in either file, so compare as sets. JSON.stringify makes
  // null, strings and numbers comparable by value without special cases.
  const declaredSet = new Set(declaredValues.map((value) => JSON.stringify(value)));
  const enforcedSet = new Set(values.map((value) => JSON.stringify(value)));
  const onlyInSchema = [...declaredSet].filter((value) => !enforcedSet.has(value)).map(JSON.parse);
  const onlyInValidator = [...enforcedSet].filter((value) => !declaredSet.has(value)).map(JSON.parse);

  if (onlyInSchema.length) {
    errors.push(
      `${label}: ${schemaPath} permits ${format(onlyInSchema)}, which the validator rejects. ` +
        "A state file the schema calls valid would fail validation.",
    );
  }
  if (onlyInValidator.length) {
    errors.push(
      `${label}: the validator accepts ${format(onlyInValidator)}, which ${schemaPath} does not ` +
        "list. The schema understates what the workflow can record.",
    );
  }
}

// agent/course-checkpoints.json is the third copy of the course checkpoint list, after the
// vocabulary and the schema, and it is the one nothing executes: no script reads it, so a
// value added to the other two and forgotten here would drift silently. That is exactly the
// incident in this file's header, one document further along.
//
// Order is compared here, unlike the value sets above. In the schema an enum is an
// unordered set of permitted values, but this file is the learner's course sequence, so a
// checkpoint in the wrong slot is a defect even when every id is present.
const checkpointIds = (checkpointsFile.checkpoints ?? []).map((checkpoint) => checkpoint.id);
const enforcedCheckpoints = vocabularies["/properties/workflow/properties/courseCheckpointId/enum"].values;
if (checkpointIds.length !== enforcedCheckpoints.length || checkpointIds.some((id, index) => id !== enforcedCheckpoints[index])) {
  errors.push(
    `courseCheckpointId: ${checkpointsPath} lists ${format(checkpointIds)}, but the validator ` +
      `enforces ${format(enforcedCheckpoints)}. The two must agree in both membership and order, ` +
      "because this file is the sequence the learner is shown.",
  );
}

if (errors.length) {
  console.error("Schema parity validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "\nThe values live in scripts/project-state-vocabulary.mjs. Change them there and mirror " +
      `the change in ${schemaPath} and, for course checkpoints, in ${checkpointsPath}.`,
  );
  process.exit(1);
}

console.log(
  `${schemaPath} declares the same values scripts/validate-project-state.mjs enforces ` +
    `(${Object.keys(vocabularies).length} checked), and ${checkpointsPath} lists the same ` +
    `${checkpointIds.length} course checkpoints in the same order.`,
);
