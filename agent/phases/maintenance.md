# Maintenance

## Goal

Resume safely after publication while preserving approved truth and deployment stability.

## Actions

Apply `agent/contracts/orchestration.md`, `agent/contracts/git-delivery.md`, `agent/contracts/state.md`, `agent/contracts/content-integrity.md`, `agent/contracts/discoverability.md`, `agent/contracts/quality.md`, and `agent/contracts/cloudflare-deployment.md` as relevant to the change.

Classify the requested change and identify affected approved documents before editing:

- For a material design-direction change, set `approvals.design` and `approvals.finalWebsite` to `false`, move back to `design-review`, and require renewed design approval, implementation, quality review, and final website approval.
- For any other public-facing content, design, contact, route, metadata, or behavior change, set `approvals.finalWebsite` to `false`, move back to the earliest affected implementation or quality-review phase, and require relevant independent QA plus renewed final website approval.
- For a purely internal change that cannot alter the rendered site or its production behavior, retain the existing product approvals but still run the relevant technical validation.

Implement the smallest coherent update, append decisions and progress, and use the same bounded-worker rules for substantial design or implementation changes. Do not push a public-facing maintenance release until every invalidated approval has been renewed and durably recorded, because a pushed checkpoint that passes the gate is promoted and deployed automatically.

Release through the same loop as every other checkpoint: `npm run validate:agent`, commit, push, read the promotion run, then read the live verification job before telling the learner the change is live.

## Exit

The change passed the promotion gate, the live verification job confirms it on production, and recorded deployment state is accurate.
