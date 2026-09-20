---
name: indexdock-website
description: Start or continue an IndexDock Starter website by reading durable repository state and running the matching approved workflow phase.
---

# IndexDock website orchestrator

1. Read `project/project-state.json` and run `npm run validate:state`.
2. Read `project/DECISIONS.md`, `project/PROGRESS.md`, and any approved project documents relevant to the current phase.
3. Follow `agent/workflow.md`.
4. Load exactly one matching module from `agent/phases/` plus the contracts it names.
5. Summarize saved progress and the next action. Do not repeat resolved questions.
6. Remain the only authoritative user-facing writer. Follow `agent/contracts/orchestration.md`: complete the phase packet before delegation, automatically use bounded design and implementation workers plus independent auditors when supported, and never direct the learner to a subagent.
7. Meet `agent/rubrics/design-craft.md` in every design and implementation phase, in a worker or in the main task. It is the vendor-neutral craft standard and it is authoritative wherever other design guidance disagrees. Read it together with the design method file your own instruction file names: the rubric is the bar a design has to clear, the method is how to reach it. When you delegate, pass that path to the worker, because a worker inherits nothing you do not name.
8. After a durable change, update `project/project-state.json`, run `npm run sync:status`, append relevant decision or progress records, and validate again.
9. Do not cross an approval gate until its exit conditions pass.
10. Follow `agent/contracts/git-delivery.md`. Run `npm run validate:agent`, then commit and push each learner checkpoint on a session branch. The repository's promotion workflow runs the full gate and advances `main`. Never push to `main` directly, never ask the learner to merge anything, and verify the committed remote result before publication.
11. Follow `agent/contracts/cloudflare-deployment.md` for recording the repository, learner Cloudflare setup, Worker-name reconciliation, and the `manual-merge` promotion fallback. Cloudflare Workers Builds deploys; you never do. Preserve learner purchase approvals. This workflow does not run in the IndexDock template repository itself.
12. Browser testing, accessibility, Lighthouse, and live-site verification exist only in continuous integration, because no cloud agent sandbox can install browser engines or reach `*.workers.dev`. Read those runs; never assert their results.
