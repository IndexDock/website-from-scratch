# Quality review

## Goal

Prove the implemented site satisfies hard publication requirements and document quality targets.

## Actions

Apply `agent/contracts/orchestration.md`, `agent/contracts/quality.md`, `agent/contracts/discoverability.md`, `agent/contracts/content-integrity.md`, `agent/contracts/icons.md`, `agent/contracts/typography.md`, `agent/contracts/attribution.md`, and `agent/rubrics/quality-review.md`. Every requirement this phase enforces lives in those files. When subagents are supported, automatically run independent read-only review lanes for visual/responsive quality, accessibility/interaction, SEO/AEO and structured data, and code/production readiness. Keep detailed evidence in `project/QA-REPORT.md`, starting from `agent/templates/qa-report.md`, and return concise findings to the main orchestrator. Fill the sections in and name the continuous-integration run the results come from; `npm run validate:release` requires both once indexing is enabled, so an unfilled template blocks publication rather than passing quietly.

The technical production-completeness gate is the orchestrator's responsibility, and it runs across two tiers as defined in `agent/contracts/quality.md`:

- **Tier 1**, here in the session: `npm run validate:agent` covers state, Astro diagnostics, the production build, release validation, and Cloudflare packaging.
- **Tier 2**, in continuous integration: push the checkpoint and read the resulting run. Playwright across the five browser projects, automated axe, and Lighthouse only exist there, because browser engines cannot be installed inside a cloud agent sandbox. Report what the run actually says. Never assert responsive, accessibility, or Lighthouse results the agent did not read from a completed run, and never treat an unfinished or skipped run as a pass.

Together they cover responsive widths, browser coverage, accessibility, content integrity, favicon and sharing assets, metadata, crawlability, structured data, FAQ and breadcrumb consistency, redirects and error behaviour, contact controls, navigation, attribution, and production build output.

`npm run validate:icons` runs inside Tier 1 and settles the mechanical half of `agent/contracts/icons.md`: no emoji, dingbat or text arrow survives in the source. It cannot judge the rest. Whether the icon weight actually sits with the type, whether one arrow shape family is used throughout, and whether every icon-only control has an accessible name are the visual and accessibility lanes' work, and a green Tier 1 is not evidence for any of them.

`npm run validate:typography` runs beside it and settles the mechanical half of `agent/contracts/typography.md`: every `line-height` is one of the three leading tokens and every display rule opts into shaping. Whether the display leading actually reads as tightened, whether the headline shape holds at each width, and whether descenders collide at the tight value are again the visual and accessibility lanes' work.

Ask the learner to judge only business accuracy, contact information, tone, imagery, visual suitability, and whether the website represents the business, on the live URL. Do not ask the learner to detect technical SEO, AEO, schema, redirect, or crawler defects.

## Exit

Blocking technical defects are fixed, the promotion gate has passed on the pushed checkpoint, `project/QA-REPORT.md` is complete and records the CI run it relies on, and the learner explicitly approves the business facts and visual result. Set `approvals.finalWebsite` immediately after that approval so publication reads it without asking again. Record requested corrections without restarting the task. A material design-direction change reopens design approval.
