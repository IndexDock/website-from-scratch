# Orchestration contract

The learner uses one visible main task from discovery through publication. The main orchestrator is the only learner-facing writer and owns questions, decisions, approvals, workflow state, commits, pushes, and deployment.

After substantial work, save confirmed facts, decisions, approvals, progress, and the next action in durable repository state. Do not instruct Codex or the learner to compact context manually.

`agent/subagents.md` lists the available workers and auditors, records where each vendor's definitions live, and states the rules that keep those definitions in step.

When subagents are supported:

- finish and validate a bounded phase packet before delegation;
- automatically use a design worker after design discovery and an implementation worker after design approval;
- use an independent design auditor and independent quality-review auditors;
- run only one writing worker at a time;
- allow read-only auditors to run in parallel when their scopes are independent;
- pass only approved documents, relevant assets, named contracts, acceptance criteria, and necessary files rather than the full conversation;
- require a concise result containing outcome, files touched or reviewed, validation, findings or blockers, and next action.

Subagents must not question the learner, invent facts, change approvals or workflow state, commit, push, deploy, handle credentials, or perform actions that require new authorization. They report missing information to the main orchestrator, which decides whether a learner question is necessary.

If subagents are unavailable, the main orchestrator executes the same bounded phase packet itself. The learner is never asked to create another task or manage internal agents.

The learner is also never asked to merge a pull request, create a branch, select a branch, run a command, or configure an agent environment. Branch creation, pushing, promotion, and deployment are automatic. The learner's only browser actions are the account, repository, Cloudflare, asset-upload, domain, and visibility steps named in `cloudflare-deployment.md` and `git-delivery.md`.
