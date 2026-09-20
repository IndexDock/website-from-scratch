# Icon contract

One icon system per site, or no icons at all. Never a text glyph.

This contract answers a specific habit: symbols dropped inline. An emoji, a dingbat like `+`
or a check mark, or a bare arrow trailing a "Read more" link. They read as generated for a
concrete reason — the site's typeface has no glyph for them, so the browser substitutes a
different font. Weight, size and baseline never match the words around them, and emoji render
differently on every operating system, so nobody designing the page ever sees what the visitor
sees.

`npm run validate:icons` enforces the mechanical half of this and runs inside
`npm run validate:agent`. The judgement half is below.

## The mechanism

Every icon reaches a page through `src/components/Icon.astro` and nothing else:

```astro
<Icon name="arrow-right" />
<Icon name="phone" label="Call us" />
<Icon name="star" weight="fill" class="rating-star" />
```

- `name` is any icon in `src/icons/selection.json`. A name that is not vendored fails the
  build; it never renders as nothing.
- The icon is sized in `em` and inherits `currentColor`, so it tracks the type it sits in.
  Do not give an icon a fixed pixel size that ignores its surroundings.
- `.icon` in `src/styles/global.css` handles baseline alignment once, for the whole site.
- Leave `label` unset for decoration; the icon is then hidden from assistive technology. Set
  it when the icon carries meaning. An icon-only control always has an accessible name, as
  `agent/contracts/discoverability.md` already requires for messenger contacts.

The set is Phosphor Icons, MIT, vendored under `src/icons/`. It is committed rather than
fetched because Codex has no agent-phase internet, as `agent/contracts/quality.md` records, and
because the learner never installs anything. `src/icons/NOTICE.md` covers provenance and how to
refresh or grow the set.

## One weight

The site declares a single icon weight in `siteConfig.iconWeight` and stays with it. Phosphor
offers six: `thin`, `light`, `regular`, `bold`, `fill`, `duotone`. Choose it when the type is
chosen, and record it in the design packet, because an icon weight is a typographic decision
rather than a preference.

Until the fuller rule below is written, use the measurements. Phosphor's stroke widths in its
256-unit grid are 8, 12, 16 and 24 for thin, light, regular and bold — that is 0.031em, 0.047em,
0.063em and 0.094em on a `1em` icon. Typical font stem widths run about 0.06em at Light,
0.08–0.09em at Regular, and 0.14em at Bold. So:

- a light or thin body face takes `light`, occasionally `thin` at large sizes only;
- a normal text weight takes `regular`;
- a heavy display face takes `bold`.

`duotone` is a deliberate look, not a default. Reach for it because the direction calls for
two-tone marks, and then use it everywhere.

`fill` is the exception, and a narrow one. It is the solid partner of whatever stroked weight
the site uses, so it stays available for two things and nothing else:

- **brand and display marks.** An outline stroke at 3rem or more stops reading as a mark and
  starts reading as a line drawing. The starter's own GitHub mark is `fill` for exactly this
  reason while the rest of the page is `bold`.
- **the solid half of an empty-and-filled pair**, such as a filled rating star against an
  outline one.

Any other weight override puts two stroke weights on one site, which reads as an accident.
`npm run validate:icons` enforces this: it compares every `weight=` on the site against
`siteConfig.iconWeight` and allows only `fill`.

## One arrow shape

Arrows have a second axis that weight does not cover: shape. Phosphor groups its arrows into
twelve shape families; `src/icons/selection.json` vendors three of them, chosen for the range of
typefaces a small-business site is likely to use, and the site draws from one of them.

| Family | Character | Sits with |
| --- | --- | --- |
| `straight` | Straight shaft, open head, right angles and 45° only | Geometric and neutral grotesque sans |
| `bend-round` | Turns through a rounded corner | Rounded and humanist faces |
| `caret` | Head only, no shaft | Anything; the quiet option where an arrow would shout |

The other nine families — including `arc` (humanist/serif pairing), `fat` (heavy display type)
and `bend-sharp` (technical/grotesque pairing) — are not vendored. If a site's typeface direction
genuinely needs one, vendor it back in following "Refreshing or growing the set" in
`src/icons/NOTICE.md` rather than substituting a character.

The site records its family in `siteConfig.arrowShape`, beside its icon weight. Two rules are
binding, and `npm run validate:icons` checks both against every `<Icon>` on the site:

- **One family per site.** A `caret-right` beside a `straight` `arrow-right` reads as visibly
  inconsistent, the same way mixing two typefaces by accident would.

The pairing column is guidance, not a gate: the validator checks that one family is used, not
that it is the *right* family for the type. Which family a given typeface classification should
select is still open.

## What is banned outright

None of these may appear anywhere in `src/` or `public/`:

- emoji, in copy, as bullet markers, or as section icons;
- arrows and dingbats as characters — check marks, cross marks, heavy plus and minus signs,
  and every arrow in Unicode's arrow blocks;
- separator glyphs used as text — the middle dot, the bullet, the vertical bar (`|`), and their
  relatives. Habit #13 in the catalogue covers why: a separator dot is what you type when you
  have not decided how the facts relate.

The exception is narrow and has to be written down. Put `icons-allow: <reason>` in a comment on
the offending line or the one directly above it. The reason is required, so an exception is a
decision on the record rather than a silent suppression.

Documentation is out of scope. `agent/`, `project/`, `README.md` and `docs/` use `→`
correctly to describe real interface navigation — "Add file → Upload files" — and none of it
reaches a rendered page.

## Marks Phosphor does not have

Some brand marks are not in the set. Viber is the only one today, and it lives in
`src/icons/brand/` as IndexDock's own drawing, at `regular` and `fill` only.

This is the one place a weight mismatch is expected and accepted. A brand mark has one shape;
redrawing it six times to satisfy the weight rule would be busywork, and a logo reads as a logo
regardless. Reach `Icon.astro` for it the same way as any other icon.

Never redraw a brand mark from memory to fill a gap. Either the mark is accurate enough to
carry the brand's name honestly, or the link uses text.
