# Bootstrap

## Goal

Confirm the starter is runnable, the learner's Cloudflare connection is working, and durable state can be recovered before business discovery begins.

## Actions

- Apply `agent/contracts/state.md`, `agent/contracts/orchestration.md`, `agent/contracts/git-delivery.md`, and `agent/contracts/cloudflare-deployment.md`.
- Confirm the learner has already created the repository from the IndexDock template, created and verified a permanent Cloudflare account, and imported the repository into Workers & Pages. The learner creates the Worker; the agent never does.
- Record `project.repository` by reading the `origin` remote already configured in this checkout — the same remote already checked at task start to rule out the template repository — for example `git remote get-url origin`, and parsing `owner/repo` from it. The template ships it as `null`, so this is the first thing to establish. Ask the learner for the repository URL only if no `origin` remote is configured at all; do not ask by default. Synchronize status, validate state, and summarize.
- Ask for the live `workers.dev` URL, and say exactly how to find it: in the Cloudflare dashboard open **Build → Compute (Workers & Pages)**, select the Worker, and copy the address ending in `workers.dev` shown on its overview; open it to confirm the starter page appears, then paste the address into the chat. Assume the learner has never used the dashboard before.
- Confirm the URL serves the starter page, record it as `deployment.workersDevUrl`, and set `deployment.deploymentMethod` to `workers-builds` and `deployment.repositoryVisibility` to `private`. Record the Worker name derived from that URL as `deployment.workerName`, then run `npm run sync:worker`, which writes it into `wrangler.jsonc`. Correct the file rather than asking the learner to rename the Worker. `npm run validate:agent` fails if the two drift apart afterwards.
- If the learner has no live URL because the first build failed, diagnose from the dashboard build log. A Worker name that does not match `name` in `wrangler.jsonc` is the most common cause; give exact steps and continue as soon as the page is reachable.
- Never infer a deployment from `wrangler.jsonc` alone. If deployment state is unrecorded, say so rather than describing the repository as deployed.
- Run `npm run validate:agent`, then commit and push the bootstrap checkpoint. The promotion workflow advances `main` and Workers Builds redeploys; confirm the run succeeded before treating the checkpoint as delivered.
- Ask the learner to review the complete setup-success page at its live URL. This review is not final website approval.
- Explain that the expected experience stays in this one main task, and that branches, pushes, promotion, and deployment are automatic.
- Explain the supported product boundary when needed.
- Move to `scope` only when the learner is ready to describe the requested website.

## Exit

State is valid, no unresolved repository conflict exists, the live starter URL is recorded and reviewed by the learner, the first promotion has succeeded, and the next action is the two-question scope interview.
