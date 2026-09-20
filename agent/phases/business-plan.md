# Business plan

## Goal

Create one approval package containing `BRIEF.md`, `SITEMAP.md`, and `CONTENT-PLAN.md` from verified facts.

## Actions

Apply `agent/contracts/content-integrity.md`, `agent/contracts/assets.md`, `agent/contracts/state.md`, and `agent/contracts/orchestration.md`.

Cover business identity, occupation, customers and problems, services, differentiation and trust, website goals and actions, frequently asked customer questions, and available assets and restrictions. Reuse answers and asset statuses already recorded.

Ask directly whether the learner gets the same few questions from customers or prospects, and capture their actual answers. Never invent plausible-sounding questions or answers to populate an FAQ section; when the learner has none to share, leave FAQ out entirely rather than manufacturing content.

Only when an asset's status remains unknown, ask the learner to upload the logo, portrait, or other image through GitHub's **Add file → Upload files**. Do not make them choose a folder, a path, or a branch: they upload, you fetch and place the file. Do not ask them to attach or paste it into the chat, because an agent can see an attached image but has no access to its bytes, so the asset would never reach the repository. Record the filename in the asset inventory.

The upload lands on `main`. Merge `origin/main` into the session branch before fetching the files, as `agent/contracts/git-delivery.md` requires, or the next promotions fail.

## Exit

Save the package as `project/BRIEF.md`, `project/SITEMAP.md`, and `project/CONTENT-PLAN.md`. Set `approvals.websitePlan` only after the learner explicitly approves the complete package and before design discovery.
