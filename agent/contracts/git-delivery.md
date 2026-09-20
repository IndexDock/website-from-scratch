# Git delivery contract

## Why the learner path uses a branch

This is no longer a hard platform limit on Claude Code. Before Claude Code v2.1.203, any direct push to the default branch was blocked; before v2.1.211, Auto mode still only allowed pushes to the working branch, branches Claude created, and routine pushes to the default branch. From v2.1.211 onward, Auto mode allows pushes to any branch by default, including the default branch, subject to a classifier that treats branches like `production` or `release` as deploy candidates and still blocks force-pushes and secrets. Codex still cannot push to `main` — a cloud task ends with a diff, not a push — but Claude Code alone could now push straight to `main` if this repository let it.

The workflow keeps the branch-and-promote path anyway, for two reasons that don't depend on any push restriction:

- **The deterministic gate decides, not the agent's own judgment.** `.github/workflows/promote.yml` only advances `main` once the full gate in `agent/contracts/quality.md` passes — build, tests, accessibility, Lighthouse, content integrity. Letting an agent push its own work straight to the branch Workers Builds deploys from means trusting the agent to self-certify that work, which is exactly the risk the gate exists to remove.
- **A session branch is the durable store for a cloud session.** The VM is reclaimed after inactivity, and an unpushed commit is lost with it. Because promotion keeps `main` current automatically, a resumed session starts from `main` and needs no branch selection — which matters because a new cloud session creates a new branch and cannot resume the previous one's.

The agent works on its own session branch, and that branch **must** be named `claude/…`, `codex/…` or `indexdock/…`. `.github/workflows/promote.yml` triggers on those three prefixes only: a branch named anything else is never gated, never promoted and never deployed, and nothing reports the omission. The repository promotes that branch to `main` itself, through `.github/workflows/promote.yml`, once the deterministic gate passes. Workers Builds then deploys `main`.

The learner never creates a branch, opens a pull request, merges, resolves a conflict, or picks a branch from a selector. If a phase seems to require one of those, the workflow is wrong, not the learner.

## Learner website checkpoints

Commit and push after each durable checkpoint that changes files:

1. bootstrap or state initialization;
2. scope approval;
3. website-plan approval;
4. design direction saved;
5. design concepts ready;
6. design approval;
7. implementation ready for quality review;
8. each coherent correction set;
9. final website approval;
10. publication candidate ready;
11. production publication verified;
12. each maintenance release.

Pushing at every checkpoint is deliberate, for the durability reason above: an unpushed commit is lost when the VM is reclaimed.

Run `npm run validate:agent` before every push. A push that fails the promotion gate leaves `main` untouched, so the site stays on the last good state; read the failing run, fix it, and push again.

A state-only approval may share a commit with the immediately following transition only when no unrelated work intervenes, but it must be saved before crossing the gate.

## Promotion is not publication

Promotion advances `main` and redeploys. It does not publish, because publication is gated by content, not by branch: `implementation.noindex` stays `true` and review routes stay removed until `approvals.finalWebsite` is recorded. Intermediate promotions therefore deploy an unindexed site to a URL only the learner knows.

Never describe promotion to the learner as publishing, and never flip `noindex` to make a promotion look finished.

## Learner-supplied assets

An agent can see an image the learner attaches but has no access to its bytes or its path. Ask the learner to upload logos and photographs by sharing the direct link `https://github.com/<owner>/<repo>/upload/main`, built from the recorded repository — it opens GitHub's **Add file → Upload files** page directly, with nothing to find, choose, or select: no folder, no path, no branch. Fetch the upload, move each file where it belongs, and commit it on the session branch yourself. Do not ask a learner to paste an image into chat as the delivery mechanism for a repository asset.

That upload commits to `main`, which is the branch promotion advances. As soon as the learner confirms it, and before fetching or moving a single file, run `git fetch origin main` and merge `origin/main` into the session branch. Skipping this is not a stylistic slip: `promote.yml` refuses to advance a `main` that has moved ahead of the branch, so the next two pushes fail the promotion job and the learner watches red runs appear on work that was correct. Recover the same way if it has already happened — fetch, merge, push again — and never surface the branch mechanics to the learner.

## IndexDock repository development

Development of the reusable Starter itself uses a stricter milestone rule. A development milestone is complete only when every intended file is committed, pushed, visible on GitHub, and the committed branch passes required validation.

The template repository permits multiple development branches and does not use the promotion workflow, which excludes it by three independent signals: the `is_template` flag, the repository owner, and the repository name.

`main` is the single trunk and the template surface, because learner repositories are created from it directly. Every merge into `main` must arrive through a pull request and must leave the starter deployable and in starter state: bootstrap phase, `noindex`, Starter branding, and no learner content.

Pilot test runs happen in a separate throwaway repository created from the template, exercising the same path a learner takes. No client website content belongs on a branch here.
