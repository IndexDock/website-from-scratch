# Design craft rubric

The generative counterpart to `design-review.md`. That rubric says how to judge a design; this one says what has to be true of a design before it is worth judging. It applies to design concepts, to the implemented site, and to any agent doing either job, in the main task or in a worker.

This file is authoritative. Where any external design guidance, house habit, or preloaded craft material disagrees with it, this file and the contracts it names win.

## The distinctiveness floor

A concept is not finished until all four exist and are written down:

- **Palette.** Four to six named values, chosen for this business. Not a default accent dropped onto a neutral page.
- **Type.** A display face and a body face paired deliberately, with an explicit scale and intentional weights and spacing. Leading is part of that scale: `agent/contracts/typography.md` is binding, and it routes every `line-height` through one of three tokens, tightens display headings to their own value, and asks that the headline be shaped rather than left to wrap where the container ends. The type treatment is part of the design, not a neutral delivery vehicle for the words.
- **Layout.** A stated composition concept, not a stack of full-width centred sections.
- **Signature.** One element the visitor would remember and could not have seen on a different business's site. Spend boldness here and keep everything around it disciplined.

Concepts must differ from each other in several of these dimensions, not in colour alone. Match execution to ambition: a maximalist direction needs elaborate detail, a minimal one needs precision in spacing and type. Elegance is executing the chosen direction well, not choosing a smaller one.

## Standing conventions

These conventions govern unless the learner's approved direction says otherwise. They are strong defaults rather than laws: each one names a habit that reads as machine-generated, and the learner's approved direction outranks every one of them. When a learner's direction lands on a standing convention, comply silently, build what was asked for, and record the choice as theirs in `project/DECISIONS.md`. The rules elsewhere in this file that a contract or the publication gate enforces — the icon system, the delivery constraints, and content integrity — are not conventions and are not open in this way.

Each convention below is a named heading followed by prose saying what the habit is and why it reads as generated. The list is expected to grow: a new convention is added as another heading in the same form at the end of this section.

### The three named defaults are not free choices

Three looks recur regardless of subject, so they read as an absence of choice:

- a warm cream background near `#F4F1EA` with a high-contrast serif display and a terracotta accent;
- a near-black background with a single bright acid-green or vermilion accent;
- a broadsheet layout with hairline rules, zero border radius, and dense newspaper columns.

Each is legitimate for some businesses. None may be arrived at by default. Where the learner's approved direction asks for one of them, the learner's direction wins and the choice is recorded as theirs.

### Structure has to mean something

Numbering, eyebrows, dividers, labels, and step markers encode something true about the content or they do not appear. Numbered markers are correct only when the content genuinely is a sequence the reader must follow in order.

The eyebrow is the device this rule is broken on most: a small line of styled text dropped above every section heading as an automatic decoration, whether or not it says anything the heading doesn't. An eyebrow is allowed only when it is one of three things: a category name, a step number in a real sequence, or a section label the visitor actually navigates by — a real anchor or nav target, not just an `id` attribute nobody links to. Anything else does not get an eyebrow; the content it would have carried belongs in the heading itself or the first line of body copy. "An eyebrow" means the visual pattern — a short label set apart from body text above a heading — not a specific class name, so renaming the CSS class does not exempt anything from this test. Even where it passes, an eyebrow should rarely appear more than once on a page. That's a soft default rather than a hard cap enforced by a validator: a design that genuinely earns two or three, such as a real multi-category layout, is not automatically wrong, but it should be rare, and each instance still has to pass the closed-list test on its own.

### Motion is one moment rather than a scattering

One orchestrated moment usually lands harder than scattered effects, and extra animation is itself a signal of generated work. Whatever motion a direction settles on, the reduced-motion end state under "Delivery constraints this project imposes" below is a gate requirement rather than a convention, and applies to it regardless.

### A direction that would suit any business in the trade is a default

Test the direction against the business it is for, before writing code and again before reporting. If any part of it is what you would have produced for any other business in the same trade, it is a default rather than a choice: change it and say what you changed and why.

### Parallel facts get counted, not run together

Three or more short, independent, non-sequential facts — hours, service areas, contact channels — are not glued into one line with `·`, `•`, `|`, or a slash, and not left as a bare bulleted list with default markers either. Each fact becomes an object the eye can count: a row of chips, cards, a numbered grid, or a table of contrasts, chosen to fit what the items are, using one highlighting method — a fill, a border, or elevation — consistently across the set rather than several stacked on the same item. `<ul>` stays the right element when the items are genuinely prose-like or sequential — a real list is not banned, an undifferentiated one is.

### Buttons that are peers share one width

A cluster of sibling buttons that are peers — same role, same weight, presented as equal choices, such as Call / Message on Viber / Message on Telegram — shares one width across the group: as wide as the longest label the group is expected to carry, padding kept, bounded by the container, so the group reads as a tidy column or an evenly divided row rather than coming out ragged or letting a longer label push one sibling wider than the rest. That equal-width group is centred in its container, not left- or right-aligned. A label that still overflows the shared width is truncated with an ellipsis — the button does not reflow or stretch to fit it — while the full text stays the button's accessible name and, where it helps a sighted reader, its `title`. Both the shared width and the truncation hold at every width in the responsive matrix in `agent/contracts/quality.md`, mobile included, where the group is usually a full-width stack and a ragged or overflowing label is at its worst. This governs only buttons that are peers in one cluster: a button standing alone, or two of deliberately different rank such as a primary action next to a secondary one, are sized independently.

### The hero composition is a choice, not a split

Text on one side of the hero and a large image on the other, every time, for every business, is the layout chosen before the content is known, which is why it carries no meaning. It is the safest arrangement of two unknown things, and that is exactly why it says nothing about the business it is for; a visitor has already seen it many times this month. The hero composition is a decision with a stated reason, and the reason belongs in the concept alongside the palette and the type, stated where each concept states its icon weight and its display leading. Only where the learner directed the split themselves does it instead become a `project/DECISIONS.md` entry, as the preamble to this section requires.

There are real alternatives, and they are named here only as illustration: a full-bleed image with type laid over it, type alone at a size that carries the page on its own, asymmetric or overlapping blocks, a collage of several small images, or a split that is deliberately uneven. The list is not a menu, and picking from it unread is the same failure this convention names. The reason has to cite something about this business rather than its category: a hero reason reading "a clean two-column layout suits a professional service" is exactly the failure that "A direction that would suit any business in the trade is a default" above already condemns. A page that repeats the same split down its whole length has the same problem. Alternating two-column feature rows remain legitimate where the content is genuinely paired, because the tell is repetition without reason rather than the split itself.

## One icon system

`agent/contracts/icons.md` is binding, and it is short: every icon on the site comes from the vendored set through `src/components/Icon.astro`, or the design uses no icons at all. Never a text character standing in for one.

An emoji, a dingbat, a check mark or a bare arrow in copy is the single most reliable tell of generated work, and the reason is mechanical rather than a matter of taste. The site's typeface has no glyph for those characters, so the browser substitutes a different font: the weight, the size and the baseline are all wrong, every time, and emoji additionally render differently on every operating system, so nobody designing the page sees what the visitor sees.

Two choices belong in the concept alongside the palette and the type, because both are typographic decisions: the **icon weight**, chosen so the icon's stroke sits with the type's stem, and the **arrow shape family**, chosen so the arrow's geometry agrees with the letterforms — straight arrows with a geometric sans, rounded ones with a humanist or rounded face. One of each per site, and never two arrow shape families mixed on one page. The contract carries the measurements and the three vendored families.

## Content integrity outranks craft

`agent/contracts/content-integrity.md` is not negotiable for design reasons, and this is where general design advice most often conflicts with this project:

- Never invent the subject, the audience, the page's purpose, or a line of copy to give a layout something to hold. A real business already has all four.
- Where the approved packet is silent or thin, report the gap to the orchestrator and design around the absence. Say plainly what is missing and what the design assumes in its place.
- Placeholder copy, invented statistics, stock claims, and imaginary imagery are defects, not drafts.
- Copy is design material. Write from the visitor's side of the screen, name actions by what happens when they are used, keep one action's name identical through the whole flow, and let each element do exactly one job.

## Delivery constraints this project imposes

Deliberate typography usually means custom faces, and custom faces are the standard way to fail the publication gate in `agent/contracts/quality.md`:

- Self-host font files in the repository under `public/`. No third-party font CDN.
- At most two families. Subset them. Use `font-display: swap`.
- Preload only the face that renders above the fold.
- Never let a font choice cost the Performance or Accessibility targets in `agent/contracts/quality.md`; a distinctive face that fails the gate is not distinctive, it is unpublished.

Leading follows the same logic. `agent/contracts/typography.md` fixes the three tokens in `src/styles/global.css` and `npm run validate:typography` enforces them inside the gate: every `line-height` is `var(--leading-display)`, `var(--leading-heading)` or `var(--leading-text)`, the body token stays at `1.5` or more so a reader's own stylesheet cannot break the page, and any rule that takes the display token also balances or deliberately breaks the headline. The contract carries the WCAG 1.4.12 framing; the accessibility tier in `agent/contracts/quality.md` still wins over it.

Motion follows the same logic: respect reduced-motion preferences, keep focus visible, and stay responsive at every width in the matrix in `agent/contracts/quality.md`.

Respecting reduced motion is load-bearing, not decorative. Under `prefers-reduced-motion: reduce` an animated element must present its **final** state immediately — full opacity, final position — never its starting state and never a frozen midpoint. The accessibility tier measures the page in exactly that mode, so a scroll reveal that begins at `opacity: 0` and has no reduced-motion end state presents invisible text to the checker and fails on contrast. Building the end state correctly is what lets a distinctive reveal survive the gate instead of being flattened to satisfy it.

## Self-critique before handing over

Review the direction against the approved packet and the standing conventions before writing code, and again before reporting. Then remove one thing that does not serve the brief.

Rendered evidence comes only from the continuous integration run. Judge from the source and never claim a rendered result you did not read.
