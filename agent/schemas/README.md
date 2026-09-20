# Schemas

Machine-readable schemas for persistent workflow state live here. Runtime validation also enforces cross-field approval and indexing rules that JSON Schema alone does not express clearly.

## Versioning

Project package versions and persistent-state schema versions are independent:

- The package remains pre-1.0. Patch versions identify coherent pilot correction milestones. Update `package.json` and the root package entries in `package-lock.json` together.
- State schemas use semantic versioning as durable data contracts. A major version indicates that an older saved state requires migration because required fields, meanings, or invariants changed. Additive backward-compatible changes use a minor version; compatible corrections use a patch version.
- Every schema major bump must update the schema, runtime validator, current state, generated status behavior, fixtures, and documented migration or initialization path in one coherent change.
- Package and schema versions do not need to match.

The Cloudflare automation milestone is package `0.1.2`. Project-state schema `2.0.0` replaces schema `1.0.0` because the new repository-mode and deployment fields are required and older state must be initialized or migrated before deployment.

Schema `3.0.0` accompanies the Workers Builds learner-path redesign. It adds `deployment.repositoryVisibility` and `deployment.promotionMode` and the `create-repository`, `upload-assets` and `secure-repository` course checkpoints, and it removes three fields outright:

- `project.repositoryMode`. Pilot runs now happen in a separate repository created from the template, so every repository carrying this state file is a website project and the distinction has no remaining consumer. The one thing it still gated — keeping automatic promotion out of the template repository — moved to a three-signal check — `is_template`, repository owner and repository name — in `.github/workflows/promote.yml`, which agents cannot write.
- `deployment.provisioningMode` and `deployment.wranglerAuthorization`. The agent never provisions a Worker or authorizes Wrangler.

`project.repository` becomes nullable and ships as `null`, so a learner no longer inherits a state file naming somebody else's repository; bootstrap records the real one. `scripts/detect-repository-mode.mjs` existed only to detect and repair that inherited lie and is deleted.

This is a breaking change with no migration path, which is deliberate: the only `2.x` state file was this repository's own, and every learner repository is created fresh from the template. A fixture in `scripts/test-project-state-validation.mjs` proves a `2.1.0` state file is now rejected rather than silently accepted.

Schema `3.1.0` removes two fields that could never be filled:

- `deployment.cloudflareAccountId`. No phase ever asks for it, and the agent holds no Cloudflare credential, so nothing was ever in a position to record one.
- `deployment.previewUrl`. Builds for non-production branches are deliberately switched off, per `agent/contracts/cloudflare-deployment.md`, so no preview URL exists to record.

Both rendered in the learner-facing `project/STATUS.md` as "Not recorded" for the entire life of a project, which reads as missing work rather than as a field with no meaning.

### Correction: `deployment.deploymentMethod`

Still under `3.1.0`, with no version change: the schema listed `wrangler` and `manual-dashboard`, which `scripts/validate-project-state.mjs` has rejected since repository mode was removed. Those two values described the world before the Workers Builds redesign, when the agent deployed the site itself. The validator was narrowed then; the schema was not.

This is not a schema bump because the data contract did not change. No state file's validity changes: the validator is what runs, and it has rejected both values all along. Only the written description was wrong, so bumping the version would force every mid-course repository through a migration that alters nothing.

The lists now live once, in `scripts/project-state-vocabulary.mjs`, which the validator imports. `npm run validate:schema-parity` checks this schema declares the same values and fails if either side gains or loses one. It is not a JSON Schema implementation and validates no state file — it only proves the two documents agree. It runs inside `validate:agent`.

### Migrating to `3.1.0`

Unlike the `3.0.0` bump, this one has a migration, because repositories created from the template before it exist and are mid-course. It is three edits and loses nothing: delete `deployment.cloudflareAccountId` and `deployment.previewUrl`, set `schemaVersion` to the current version, and run `npm run sync:status`. `scripts/validate-project-state.mjs` names those steps when it sees a `3.0.0` file, rather than only reporting the mismatch. It interpolates the version it expects rather than naming `3.1.0`, so a `3.0.0` file moves straight to the current schema instead of being sent through an intermediate one.

Schema `3.2.0` accompanies the design interview becoming an explicit, ordered procedure inside `agent/phases/design-discovery.md`. It adds one course checkpoint, `share-references`, titled "Share websites you like", between `review-brief` and `choose-design`.

This is a minor version because the change is purely additive: one new allowed value in an existing enum. No field is added, removed, or given a new meaning, and every `3.1.0` state file is already valid against every other rule.

### Migrating to `3.2.0`

One edit: set `schemaVersion` to `3.2.0` and run `npm run sync:status`. Nothing else changes, because the new checkpoint is a value a project may later hold, not a field it must carry. `scripts/validate-project-state.mjs` says exactly that when it sees a `3.1.0` file, so a mid-course repository is not sent looking for a data migration that does not exist.
