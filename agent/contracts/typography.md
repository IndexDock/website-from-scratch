# Typography contract

Every `line-height` on the site goes through one of three named leading tokens, and every
display headline is deliberately shaped.

This contract closes two habits that make display type read as unconsidered — set by a
mechanical default rather than by a decision.

**Display leading left at the body value.** A heading keeps roughly the same line height as
body text, because ~1.2 is the value a browser applies to everything and nobody changed it on
the heading. At body size that is invisible. At display size it is not: the extra leading pulls
the lines of a two-line headline apart until the block reads as two separate sentences stacked
on top of each other instead of one object. Tightening the leading is most of what makes
display type look composed — the headline becomes a single shape the eye takes in at once.

**The headline left unshaped.** Line breaks in a headline fall wherever the container edge
happens to land, so one line runs long and the next is a stray word or two. A headline is a
shape on the page as well as a sentence, and left to the browser that shape is an accident.
An accidental shape looks accidental: three long lines and one short one is the usual result.
A shaped headline has lines balanced to near-equal length so the block reads as a rectangle,
or it is staggered on purpose with breaks that were checked at every width.

`npm run validate:typography` enforces the mechanical half of this and runs inside
`npm run validate:agent`, immediately after `npm run validate:icons`. The judgement half is
below. Where this contract and `agent/rubrics/design-craft.md` disagree on a matter of craft,
the rubric wins.

## The leading scale

`src/styles/global.css` `:root` defines exactly three unitless custom properties, and every
`line-height` on the site is one of them:

```css
:root {
  --leading-display: 0.88;  /* headings rendered at display size */
  --leading-heading: 1.15;  /* the default for every heading */
  --leading-text: 1.7;      /* body copy, lists, captions, small text */
}
```

- **`--leading-display`** sits between `0.80` and `0.90` inclusive. It belongs to headings set
  at display size and nothing else. It is a real tightening, not a nudge: at this value the
  headline reads as one block.
- **`--leading-heading`** sits between `0.90` and `1.25` inclusive. It is the default every
  heading gets, through the base rule below. It has to stay comfortable for a heading that
  wraps to several lines at a small size, not only for a large one- or two-line heading, so it
  sits nearer the middle of its range than the bottom — a value that reads as composed on a
  section title and does not crush the lines of a wrapping subheading together.
- **`--leading-text`** is `1.5` or greater. It is the authored floor for running text, and the
  number that keeps the page readable and resilient to a reader's own stylesheet — see the WCAG
  note below.

All three are unitless on purpose. A unitless `line-height` is a multiple of the element's own
font size, so it scales correctly when a heading and its children differ in size; a `px` or
`em` line-height is a fixed gap that breaks the moment the type it applies to changes size.

## The base rule

One rule in `global.css` sets the heading default, in the same place as the other element-level
base rules:

```css
h1, h2, h3, h4, h5, h6 { line-height: var(--leading-heading); }
```

Every heading inherits `--leading-heading` from this rule. A heading that wants display leading
overrides it with `--leading-display` in its own rule and then satisfies the shaping
requirement. A heading that needs something between the two does not get an off-scale value; it
keeps `--leading-heading`, and the scale is widened by a recorded decision instead.

## Binding rules

`npm run validate:typography` checks all of these over `src/` — `.css` files and the contents
of `<style>` blocks in `.astro` components.

1. **`:root` defines all three tokens**, each within its stated range, each unitless. No `px`,
   no `em`, no `%` on any of them.
2. **The base rule exists.** One rule whose selector list is exactly the six element selectors
   `h1` through `h6`, in any order, setting `line-height: var(--leading-heading)`.
3. **Every `line-height` declaration is a token.** Anywhere in `src/`, other than the three
   token definitions in `:root`, a `line-height` value must be exactly `var(--leading-display)`,
   `var(--leading-heading)` or `var(--leading-text)`. A raw numeric literal is a failure. A
   `line-height` carried inside a `font:` shorthand — the `font: 600 0.9rem/1.2 …` form — is a
   failure too: line-height is its own declaration so it can be read, checked and changed on its
   own. The single escape hatch is a comment `leading-allow: <reason>` on the same line as the
   declaration or the line immediately above it. The reason is mandatory, so an exception is a
   decision on the record rather than a silent one.
4. **Every display headline is shaped.** A rule that sets `line-height: var(--leading-display)`
   must also satisfy one of:
   - `text-wrap: balance` declared in the same rule; or
   - a comment `headline-shaped: <reason>` on the `line-height: var(--leading-display)` line or
     the line immediately above it.

   `text-wrap: pretty` does not satisfy this — it prevents orphans but does not balance the
   block into a shape. A bare `<br>` in the markup does not satisfy it on its own: a headline
   shaped with explicit breaks still needs the `headline-shaped:` comment, and that comment
   must say the breaks were checked across the responsive matrix in `agent/contracts/quality.md`,
   because a break that reads well at 1440 can strand a word at 320.

## WCAG 1.4.12 and the accessibility tier

WCAG 1.4.12 Text Spacing is a user-override-resilience criterion. It requires that when a
reader applies their own stylesheet setting `line-height` to at least `1.5` times the font
size, no content is clipped, overlapped or cut off. It does not forbid a tight authored default
on a heading — the reader's override replaces the authored value, and the criterion is about
whether the layout survives that, not about what the author chose.

The real hazards of tight display leading are two, and neither is WCAG 1.4.12:

- **Descender collision.** At `0.80`–`0.90` the descenders of one line — `g`, `y`, `p`, `j`,
  `q` — can touch or overlap the ascenders and capitals of the line below. This has to be
  checked by eye at the actual value on the actual typeface, and it is the accessibility
  auditor's line.
- **Leakage onto body text.** A tight value that escapes its display scope and reaches
  paragraphs, lists or captions makes running text materially harder to read.

`--leading-text >= 1.5` is the authored body floor that removes the second hazard and keeps the
page override-safe by default. The accessibility tier in `agent/contracts/quality.md` still
outranks anything in this file: if an accessibility finding and this contract conflict, the
finding wins.

At the time of writing this is the first place a WCAG success criterion is named by number in
this repository.

## Scope

Enforced over `src/` only: `.css` files and `<style>` blocks in `.astro` components. Not
`public/`, not `agent/`, `project/`, `docs`, or any `README`. None of those reach a rendered
page as authored CSS.

Design-review concepts are out of scope for the same reason: they live under
`public/design-review/`, which the gate never reads. They deliberately vary their type
treatment — leading included — across concepts so the learner can compare real options
before one is chosen, and `agent/phases/design-review.md` says so. The rule applies the
moment a concept is promoted into `src/` as the shipped site.

## What this contract will also hold

This is the designated home for the rest of the font rules as they are written down. Two are
already in this contract's forward scope; when each is specified it extends this file and this
gate rather than opening a new place for font rules to live:

- **Font-face verification** — the display face and the body face are named in the design
  packet before implementation, and verified against the built CSS so the page ships the faces
  that were chosen.
- **The curated font-pairing list** — the small set of display/body pairings the starter
  offers, and how a business's type direction selects one.

Neither reopens the question of where typography rules belong: they land here.
