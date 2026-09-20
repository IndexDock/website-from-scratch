# Vendored icon set

## Phosphor Icons

- Source: `@phosphor-icons/core`, <https://github.com/phosphor-icons/core>
- Version: `2.1.1`, pinned exactly in `devDependencies`
- Retrieved: 2026-08-21
- Licence: MIT, reproduced verbatim in `LICENSE.txt`

`phosphor/` holds a curated subset of the library's 1,512 icons, in all six weights, scoped to
what a freelancer, local-service or solo-professional marketing site typically needs — see
`agent/contracts/icons.md` for the reasoning. `selection.json` is the source of truth for the
exact count; run `npm run sync:icons` after editing it to keep the committed files in step. The
set started at 399 names (2,394 files, about 1.1 MB) and was trimmed deliberately: most of
Phosphor's twelve arrow shape families, several niche verticals (heavy industrial, lab science,
farming, marine, aviation), interactive-app chrome (sign-in/out, upload, filters), and duplicate
near-variants within a group were dropped. The files that remain are copied unmodified.

The set is committed rather than fetched at build time. Codex has no agent-phase internet, as
`agent/contracts/quality.md` records, so an icon that is not in the repository does not exist
when the agent builds a learner's website. Committing it also keeps the promise in
`agent/contracts/orchestration.md` that the learner never installs or configures anything.

`@phosphor-icons/core` is a devDependency only so the lockfile pins the source of the copy. No
code imports it and nothing from `node_modules` reaches the build.

### Refreshing or growing the set

1. Edit `selection.json`. Every icon is listed there, grouped by purpose; arrows are grouped a
   second level down by shape family. A new arrow must declare one of the vendored families
   (currently `straight`, `bend-round`, `caret`), or `npm run validate:icons` rejects it. To
   bring back one of Phosphor's other nine arrow shape families (see `agent/contracts/icons.md`
   for which three are kept and why), add it as a new key under `arrowShapes` with a short
   description and list its arrows underneath, matching the shape the three current families
   use — `@phosphor-icons/core`'s `IconCategory.ARROWS` names the full upstream set.
2. To move to a newer Phosphor release, change `version` in `selection.json` and install the
   matching exact version: `npm install --save-dev --save-exact @phosphor-icons/core@<version>`.
   The two must agree or `sync-icons.mjs` refuses to run.
3. Run `npm run sync:icons`. It rewrites `phosphor/` from scratch, so a name removed from the
   selection has its files deleted.
4. Commit the result. `npm run validate:icons` fails when the committed files and the selection
   have drifted apart.

Note that the upstream git tags stop at `v2.0.8` while npm is at `2.1.1`, so npm is the only
reproducible pin available. Refresh deliberately, in its own commit — an icon set is a design
decision, and a silent upgrade can change the shape of a mark already on a published site.

## Viber

`brand/viber-regular.svg` and `brand/viber-fill.svg` are IndexDock's own work, not Phosphor's.
Phosphor has no Viber mark, and Viber is an approved contact channel under
`agent/contracts/discoverability.md`.

They are drawn on the same `0 0 256 256` grid as Phosphor's assets, with the regular weight's
16-unit stroke, so they sit correctly beside the rest of the set. Only two weights exist,
because a brand mark has one shape and hand-drawing six versions of it would be busywork.
`agent/contracts/icons.md` states that brand logos outside Phosphor are the one place a weight
mismatch is expected.

The Viber name and logo are trademarks of their owner. They are used here only to label a link
to a business's own Viber contact, which is nominative use, and carry no endorsement.
