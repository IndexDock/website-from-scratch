---
name: frontend-design
description: Design method for IndexDock website work. Use when creating homepage concepts, choosing a palette, type pairing, layout or signature element, implementing an approved concept, or auditing whether a design reads as templated.
---

# Design method

This file is method: how to arrive at a design worth judging. It does not restate the rules.

Two files outrank it. `agent/rubrics/design-craft.md` is the craft standard — the distinctiveness floor, the named defaults that are not free choices, and the font and motion constraints this project imposes. `agent/contracts/content-integrity.md` outranks both. Where this file and either of them disagree, they win, and nothing here licenses an exception to them.

## Start from the business, not from the page

Generic work comes from designing a category. Distinctive work comes from designing a business.

The approved packet is the only source of subject, audience, page purpose, and copy. `project/BRIEF.md`, `project/CONTENT-PLAN.md`, `project/DESIGN-DIRECTION.md` and the recorded asset inventory already contain all four, because a real business already has them. Never invent any of them, and never write a line of copy to give a layout something to hold. Where the packet is silent or thin, that is a gap: report it to the orchestrator, design around the absence, and say plainly what the design assumes in its place.

Within those facts, the business's own world is where the non-generic choices come from — its materials, its tools, the artifacts it produces, the vocabulary its customers actually use. A locksmith, a ceramicist and a tax adviser have different worlds, and a direction derived from one of them cannot be lifted onto another. That is the test: if the direction would transfer unchanged to a different business in the same trade, it came from the category.

## The hero is a thesis

The first screen states what this business is. Lead with whatever is most particular to it, in whatever form carries that best — a headline, a photograph of real work, a demonstration, one arresting detail.

A large number with a small caption, three supporting statistics and a gradient accent is the answer that arrives when no choice was made. Use it only when the packet genuinely makes a number the most characteristic thing, and be able to say why.

## Two passes: plan, critique the plan, then build

Write the plan before any code, and keep it short:

- **Palette** — named values chosen for this business.
- **Type** — the faces and the role each one plays, with a scale.
- **Layout** — one sentence of prose plus an ASCII wireframe, so alternatives can be compared cheaply before either is built.
- **Signature** — the one element the visitor would remember.

Then critique that plan against the packet, before writing code. Work out what you would have produced for any other business in the same trade; wherever the plan matches it, that part is a default rather than a choice. Change it, and record what changed and why.

Only then build, deriving every colour, size and spacing decision from the revised plan. A plan that the code quietly departs from was not a plan.

Do this thinking privately and report the result, not the working. The orchestrator is the only one who speaks to the learner; what you hand back is a direction and the reasoning behind it.

## Match execution to ambition

A maximalist direction needs elaborate detail to be convincing; a minimal one needs precision in spacing, type and alignment. Elegance is executing the chosen direction well, not retreating to a smaller one.

The rubric asks for one signature element and quiet around it. In practice that is a budget: you get one place to be bold, so decide early which it is, and treat every later temptation to add a second as a proposal to move the first rather than to keep both. Structural devices — numbering, eyebrows, dividers, labels, step markers — do not count as boldness and earn their place only by encoding something true about the content.

Motion follows the same logic: one orchestrated moment usually lands harder than effects scattered across the page, and surplus animation is itself a signal of generated work. Build the reduced-motion end state as `agent/rubrics/design-craft.md` requires; it is a correctness rule, not a courtesy.

## Pick the icon weight and the arrow shape from the type

`agent/contracts/icons.md` bans text glyphs and requires one icon weight and one arrow shape family per site. It states the rule; this is how to arrive at the two choices, and the moment to make them is when the type is settled, not later.

Weight is arithmetic. The vendored set draws its strokes at 8, 12, 16 and 24 units in a 256-unit grid for thin, light, regular and bold, which is 0.031em, 0.047em, 0.063em and 0.094em on an icon sized at `1em`. A typeface's stem is roughly 0.06em at Light, 0.08 to 0.09em at Regular, and 0.14em at Bold. Match the two numbers and the icon stops looking bolted on. If the body face is light and the display face is heavy, follow the body face: icons live in running text far more often than in headlines.

Shape is judgement, and it is the part that is easy to skip. Look at how the letterforms turn. A geometric sans turns through corners and straight segments, so the `straight` family agrees with it. A rounded or humanist face turns through curves, so `bend-round` agrees with it. Where the type is neutral and nothing argues either way, `straight` is the honest default and `caret` — head only, no shaft — is the quiet option where a full arrow would shout. `agent/contracts/icons.md` lists the three vendored families; a direction that genuinely needs a fourth is vendored back in following "Refreshing or growing the set" in `src/icons/NOTICE.md`, not approximated from one of these three.

Then apply it once, everywhere. A page that uses a curved arrow in the hero and a sharp one in the footer has made the same mistake as one that uses two typefaces by accident, and it is just as visible.

## Tighten the display leading and shape the headline

`agent/contracts/typography.md` is binding: every `line-height` on the site is one of three tokens in `src/styles/global.css`, and a display heading takes the tight one — between 0.80 and 0.90 — while body copy stays at 1.5 or more. This is method, not preference. At display size the browser default pulls a two-line headline into two sentences; tightening it makes the block read as one object, and that is most of what makes display type look composed.

The headline is also a shape. Left alone the browser breaks it wherever the column ends, so one line runs long and the next is a stray word. Set `text-wrap: balance` so the lines come out near-equal, or place explicit breaks and check them at 320, 390, 430, 768 and 1440 — a break that reads well on desktop can strand a word on a phone. The contract requires a `headline-shaped:` comment when the shape is done with explicit breaks.

## Watch CSS specificity

Distinctive layouts fail most often on selectors that cancel each other out. A section-level class and a component class — say `.section` and `.cta` — carry identical specificity, so when both set the same property the one that wins is simply the one declared later in the stylesheet, not the one you were editing. Vertical rhythm is where this bites, because section padding tends to get set from both directions.

Decide which layer owns a given property and set it only there. When spacing comes out wrong, read the computed value and the rule the browser actually applied before changing anything; adding a more specific selector to force the result you want buries the conflict instead of resolving it.

## Copy is design material

The words in the design are the approved words. Within them, the same intentionality applies as to spacing and colour.

Write from the visitor's side of the screen: use the words this business's customers use for the thing they want, not the words the site's own structure suggests. Name an action by what happens when it is used — "Get a quote", not "Submit" — and keep that name identical everywhere the action appears, so the button, the heading above it and the confirmation all agree. Treat error and empty states as direction rather than mood: say what happened and what to do next. Let each element do exactly one job, so a caption is not quietly carrying a claim the page never makes elsewhere.

## Critique again before handing over

Review the built result against the packet the same way you reviewed the plan, then remove one thing that does not serve the brief.

Judge from the source. Rendered evidence — browsers, screenshots, accessibility and performance results — comes only from the continuous integration run. Never claim a rendered result you did not read.
