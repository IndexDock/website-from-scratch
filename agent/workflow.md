# IndexDock Starter workflow

This vendor-neutral workflow is the durable control plane used by the thin Codex and Claude Code entry skills.

## Task startup

1. Read and validate `project/project-state.json`.
2. If `blockers` or `conflicts` are non-empty, explain them and stop before guessing or overwriting approved information.
3. Read `project/DECISIONS.md`, `project/PROGRESS.md`, and approved phase documents.
4. Load the single module matching `workflow.phase`.
5. Briefly summarize completed work, saved approvals, current phase, and next action.

The learner path uses one learner-visible main task from discovery through publication. Repository state must also permit safe recovery after an interruption, but never instruct the learner to create or switch tasks as a routine workflow step.

## Source hierarchy

When sources conflict, use:

1. explicit approved user decisions;
2. `project/project-state.json`;
3. approved project documents;
4. `project/DECISIONS.md`;
5. current implementation;
6. inference.

Record unresolved contradictions in `conflicts` and stop rather than silently selecting a lower-priority source.

## Phase selection

| State value | Module |
| --- | --- |
| `bootstrap` | `agent/phases/bootstrap.md` |
| `scope` | `agent/phases/scope.md` |
| `business-plan` | `agent/phases/business-plan.md` |
| `design-discovery` | `agent/phases/design-discovery.md` |
| `design-review` | `agent/phases/design-review.md` |
| `implementation` | `agent/phases/implementation.md` |
| `quality-review` | `agent/phases/quality-review.md` |
| `publication` | `agent/phases/publication.md` |
| `maintenance` | `agent/phases/maintenance.md` |

## Durable checkpoint

After a meaningful change:

1. update approved project documents;
2. append decisions and progress without rewriting history;
3. update `project/project-state.json` last;
4. run `npm run sync:status`;
5. run `npm run validate:agent`;
6. commit when it passes;
7. merge `origin/main` into the session branch if the learner has uploaded anything since the last push;
8. push the session branch, then read the promotion run.

Push every checkpoint. A cloud session's branch is its durable store, and an unpushed commit is lost when the session VM is reclaimed. The promotion workflow advances `main` only when the full gate passes, so a failing push leaves the live site untouched. Step 7 exists because a learner asset upload lands on `main` and promotion will not advance a `main` that has moved ahead of the branch. See `agent/contracts/git-delivery.md`.

Do not store credentials, tokens, payment details, or private authentication data.

## Orchestration

Follow `agent/contracts/orchestration.md` in every phase. Keep the main task focused on learner facts, decisions, approvals, and concise results. Persist important information after substantial work and delegate bounded work automatically when supported. Do not instruct Codex or the learner to compact context manually.

## Approval gates

- Scope approval is required before the business plan.
- Brief, sitemap, and content plan are approved as one website-plan package before design discovery.
- Design approval is required before implementation.
- Final website approval is required before publication and before removing `noindex`.

The learner verifies business truth and preference. The orchestrator verifies technical correctness.
