# Publication

## Goal

Publish only the approved website and verify the production result independently from the quality-review checkpoint.

## Actions

- Apply `agent/contracts/orchestration.md`, `agent/contracts/git-delivery.md`, `agent/contracts/cloudflare-deployment.md`, `agent/contracts/discoverability.md`, `agent/contracts/quality.md`, and `agent/contracts/attribution.md`.
- Read the saved `approvals.finalWebsite` value. If it is not true, stop at the gate; do not repeat an approval question already answered and recorded.
- Remove temporary review routes, delete `project/design-reference/` — whose screenshots the repository's history still retains, as `agent/contracts/assets.md` explains — and enable indexing only for the approved business site. This content change is what publishes the site; promotion alone never does.
- Run `npm run validate:agent`, commit the publication candidate, and push it. The promotion workflow runs the full gate and advances `main`; Workers Builds deploys it.
- Read the promotion run and the live verification job. Confirm the client favicon, absolute social image, canonical URLs, crawler files, sitemap, structured data, redirects, public routes, and absence of review routes on production. If the live check fails, treat the release as unpublished and fix it before telling the learner anything is live.
- If promotion does not reach the live site after bounded diagnosis, record `deployment.promotionMode` as `manual-merge`, explain the single unblocking action, and continue once the URL is reachable.
- Record deployment details without storing credentials.
- Ask the learner to review the complete production website at its exact URL. After confirmation, ask whether to configure a custom domain now or later, record that decision, and follow the Cloudflare deployment contract. A domain purchase always requires exact domain-and-price approval.
- After the domain decision, ask the learner to confirm the label beside the repository name still reads **Private**. It was created private, so this is a check, not a change; if it reads Public, ask them to switch it in **Settings → General → Change visibility**. Explain that deployment keeps working either way, because the Cloudflare GitHub App retains its authorization. Record `deployment.repositoryVisibility` as `private` only after the learner confirms what they see; never assume it.
- Do not set `workflow.courseCheckpointId` to `course-complete` until that is recorded. State validation rejects the combination, so a course reported complete over a public repository fails the gate.

## Exit

The promoted production commit passes the full gate, the live URL is independently verified in CI, the learner has reviewed it, and a post-deployment evidence commit records the deployment accurately on the remote branch.
