# Cloudflare deployment contract

Deployment is owned by Cloudflare Workers Builds, not by the agent. The learner connects the repository to Cloudflare once, in the browser, before starting the agent. Every push to `main` after that builds and deploys automatically. Codex and Claude Code follow the same vendor-neutral rules, on the web and locally.

## Learner setup, before the first agent session

The learner performs these in the browser, in order:

1. create and verify a GitHub account;
2. create their repository from the IndexDock Starter template, private, default branch `main`, no other branches;
3. create and verify a permanent Cloudflare account;
4. **Build → Compute (Workers & Pages) → Create application → Continue with GitHub**, authorize the Cloudflare GitHub App, select the repository, keep the production branch `main`, use build command `npm run build` and deploy command `npx wrangler deploy`, leave **builds for non-production branches off**, and deploy. This flow never asks for a Worker name; Cloudflare derives one, in practice from the repository name;
5. if Cloudflare prompts to set up the account's `workers.dev` subdomain, complete that now. An interactive `wrangler deploy` from a terminal prompts for this the first time; an automated Workers Builds deploy cannot, so on a brand-new account the first build can succeed without the Worker ever getting a live address until this is done;
6. confirm the starter page is live on its `workers.dev` URL.

The learner sets no build variables. `.node-version` pins the build runtime in the repository, so the Node version travels with the template instead of living in dashboard state, and it stays in step with the version continuous integration uses.

Leaving non-production branch builds off is deliberate. The agent pushes a checkpoint many times over one website, and each push would otherwise trigger an extra preview build against a finite free build allowance, producing URLs nobody is asked to look at. The learner reviews `main`, at one address, throughout.

Cloudflare's own Workers Builds documentation states that the Worker name in the dashboard must match `name` in the Wrangler configuration file, or the build fails. Nothing asks the learner for that name, and the template cannot ship it, because it depends on the repository name they chose. Reconciling the two is therefore a normal bootstrap step rather than an error path: run `npm run sync:worker`, which writes the recorded Worker name into `wrangler.jsonc`. Temporary Cloudflare accounts are not supported.

Never ask the learner to paste credentials, tokens, API keys, OAuth URLs, payment details, or registrant contact data into chat or into repository files, and never commit them. The agent never holds a Cloudflare credential, because it never deploys.

## The template repository is not a website project

`IndexDock/website-from-scratch` is where the Starter itself is developed, and so is any repository that is itself a GitHub template. The learner website workflow never runs there: no scope interview, no business plan, no deployment reconciliation. Pilot runs happen in a separate repository created from the template.

`main` is pull-request only there, so `.github/workflows/promote.yml` excludes it. That guard is keyed to the repository's `is_template` flag, its owner, and its name rather than to workflow state, because agents write state and nothing in a session can forge the repository it is running in. Any one of the three blocks promotion. It uses three because a literal name does not survive a rename, and a name comparison that stops matching disarms the guard without failing.

Pilot repositories must therefore be created on a personal account rather than under the `IndexDock` owner, which the guard treats as the source repository. A pilot run in the wrong place promotes nothing and deploys nothing.

## Agent responsibilities at bootstrap

The template ships `project.repository` as `null`, so detect the repository from the checked-out `origin` remote before anything else — ask the learner directly only if no `origin` remote is configured — then:

- ask for the live `workers.dev` URL, verify it resolves to the starter page, and record it as `deployment.workersDevUrl`;
- derive the Worker name from that URL, record it as `deployment.workerName`, and run `npm run sync:worker` to write it into `wrangler.jsonc`. Correct the file rather than asking the learner to rename the Worker, and explain that the next promotion applies the fix;
- record `deployment.deploymentMethod` as `workers-builds` and `deployment.repositoryVisibility` as `private`;
- if no URL exists because the first build failed, read the build log guidance in the course, name the likely cause — Worker-name mismatch is the most common — and give exact dashboard steps.

Never assume a deployment exists. Read `deployment.deploymentMethod` and `deployment.workersDevUrl` from saved state and report what they actually say. `wrangler.jsonc` proves only that the project packages correctly; it is not evidence that a Worker exists, that Workers Builds is connected, or that anything is live.

If deployment state is unrecorded, say so plainly and do not describe the repository as deployed.

## Deployment happens through promotion

The agent never runs `wrangler deploy`. It commits to its session branch and pushes; the promotion workflow validates and advances `main`; Workers Builds deploys `main`. See `git-delivery.md`.

`wrangler.jsonc` is deployment source of truth. Keep `workers_dev` explicitly enabled until a custom-domain decision changes the routing plan. `wrangler deploy --dry-run` remains a packaging check and requires no authorization.

Non-production branch builds stay disabled. Promotion keeps `main` current, so there is nothing a branch preview would show that the live URL does not.

## Verification

The agent cannot fetch the live site from a cloud sandbox, because `*.workers.dev` is not on the network allowlist and Codex has no agent-phase internet. Live verification therefore runs in CI, which has full network access, and the agent reads its result. Technical verification never replaces learner review.

After the starter deployment and again after final publication, show the exact live URL and ask the learner to review the complete site. Bootstrap review does not set `approvals.finalWebsite`.

## Fallback

If promotion does not reach the live site after bounded diagnosis, record `deployment.promotionMode` as `manual-merge`, explain what failed, and ask the learner for the single action that unblocks it — merging the pull request the workflow opened, or retrying the build in the dashboard. Ask the learner to return only the public URL. Verify it through CI, request the same full learner review, and resume the same workflow without restarting the task.

## Custom domain and closeout

After final publication verification, ask whether to configure a custom domain now or later and record the decision. If later, preserve the verified `workers.dev` URL and do not repeat the question. If now, distinguish an existing domain from a purchase. Domain attachment happens in the Cloudflare dashboard after ownership and zone readiness; any registration requires explicit confirmation of the exact domain and current price before a billable action.

After the domain decision, confirm the repository is still private. It was created private, so this is a check, not a change: ask the learner what the label beside the repository name reads. If it reads Public, ask them to switch it in **Settings → General → Change visibility**. Workers Builds keeps deploying a private repository, because the Cloudflare GitHub App retains its authorization. Record `deployment.repositoryVisibility` as `private` only after the learner confirms what they see, and never set `course-complete` before that.

## Template surface

The learner-facing template is complete on `main`; new learner repositories deploy from `main` without branch changes. Development branches are IndexDock infrastructure, not learner deployment instructions, and no client website content ever merges into `main`.
