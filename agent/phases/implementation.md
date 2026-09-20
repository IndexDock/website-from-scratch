# Implementation

## Goal

Build the approved static Astro website from the approved plan and design.

## Actions

- Apply `agent/contracts/orchestration.md`, `agent/contracts/git-delivery.md`, `agent/contracts/assets.md`, `agent/contracts/content-integrity.md`, `agent/contracts/discoverability.md`, `agent/contracts/icons.md`, `agent/contracts/typography.md`, `agent/contracts/attribution.md`, and `agent/rubrics/design-craft.md`.
- Verify design approval before writing production pages.
- Save a bounded implementation packet containing the approved plan, content, design, assets, routes, named contracts, and acceptance criteria.
- When subagents are supported, automatically delegate that packet to one clean-context implementation worker. Run no concurrent writing worker. The main orchestrator reviews the diff and remains responsible for state, commits, pushes, and learner communication. When subagents are unavailable, the main task meets `agent/rubrics/design-craft.md` itself; the standard belongs to the work, not to the worker.
- Implementation is fidelity, not a second design pass. Carry the approved concept's palette, type scale, spacing rhythm, and signature element across every route rather than only the homepage, and observe the font delivery rules in `agent/rubrics/design-craft.md` so a distinctive face does not cost the performance gate in `agent/contracts/quality.md`.
- Use Astro components, TypeScript, CSS variables, and minimal client JavaScript.
- Keep important facts in rendered text and include only accurate structured data.
- Use direct contact actions unless a real approved form endpoint exists.
- Take every icon from `src/components/Icon.astro`, at the packet's declared weight and arrow shape family. A text glyph standing in for an icon — an emoji, a dingbat, a check mark, a bare arrow — fails `npm run validate:icons`, which runs inside `validate:agent`. When the packet needs an icon the vendored set does not have, report it rather than substituting a character.
- Route every `line-height` through a leading token defined in `src/styles/global.css` `:root` — `var(--leading-display)`, `var(--leading-heading)` or `var(--leading-text)` — and shape every display headline with `text-wrap: balance` or checked explicit breaks. A raw `line-height`, or one hidden inside a `font:` shorthand, fails `npm run validate:typography`, which runs inside `validate:agent`. `agent/contracts/typography.md` carries the ranges and the single escape hatch.
- Include a client-specific favicon, social preview, entity-appropriate schema, answer-ready content, conditional FAQ (using only the learner-supplied questions and answers from the business plan, marked up as `FAQPage` schema that matches the visible text exactly) and breadcrumbs, accessible messenger icons, and sticky navigation when appropriate.
- Preserve the Starter attribution component and keep review output `noindex`.
- Rewrite `tests/starter.spec.ts` (and any other e2e spec under `tests/`) to assert the real implemented site's routes, visible text, and primary actions, as part of the same packet. The shipped spec tests the placeholder Starter page; left unchanged it fails every check across the full browser matrix at full CI cost instead of failing locally in seconds.

- Run `npm run validate:agent` before each push, and push each coherent checkpoint so the work survives session expiry and reaches the live URL. `validate:agent` now includes `validate:e2e-freshness`, which fails fast if the e2e spec still asserts text or selectors the build no longer has.

## Exit

The approved routes and content are implemented, `npm run validate:agent` passes, the implementation checkpoint is pushed and promoted, and the site is ready for independent quality review.
