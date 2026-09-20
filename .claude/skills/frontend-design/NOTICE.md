# Vendored plugin notice

This directory contains a redistributed copy of the **frontend-design** plugin.

| | |
| --- | --- |
| Upstream work | `frontend-design` |
| Author | Anthropic (`support@anthropic.com`) |
| Homepage | https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design |
| Source | `https://github.com/anthropics/claude-plugins-official.git`, path `plugins/frontend-design` |
| Retrieved | 2026-08-10 |
| Licence | Apache License 2.0, reproduced verbatim in `LICENSE.txt` |

`skills/frontend-design/SKILL.md` and `LICENSE.txt` are unmodified byte-for-byte copies. Nothing in this directory is an IndexDock modification of Anthropic's work; `.claude-plugin/plugin.json` and this notice are the only files written by IndexDock, and the manifest exists solely to make the copy load as a plugin.

## Why the copy exists

`agent/contracts/orchestration.md` guarantees that the learner is never asked to run a command or configure an agent environment. A marketplace install would break that guarantee: Claude Code prompts before installing a marketplace plugin, and a plugin from an external source does not load until that prompt is accepted.

A folder under `.claude/skills/` that contains a `.claude-plugin/plugin.json` manifest is instead discovered in place on session start, with no marketplace, no install step, and no network request. The copy is what makes the guarantee hold.

How the skill is addressed differs by environment, which is why nothing depends on it. A local session lists the plugin as `frontend-design@skills-dir` and exposes the skill as both `frontend-design` and `frontend-design:frontend-design`. Claude Code on the web reports no plugins at all, exposes only the bare name, and delivers neither spelling to a subagent through the `skills:` preload field. The phase agents therefore read `skills/frontend-design/SKILL.md` by path instead, which behaves the same everywhere.

## Where IndexDock's own rules live

The copied file is general design guidance written for a designer with a free hand. It is not adjusted to this project, and parts of it do not apply here — most importantly its advice to pin down an unstated subject yourself and to write copy where the brief has none. IndexDock never invents business facts or copy.

Those constraints are **not** patched into the copy. They live in:

- `agent/rubrics/design-craft.md` — the vendor-neutral craft standard, which is authoritative wherever the two disagree;
- `.agents/skills/frontend-design/SKILL.md` — IndexDock's own design method, which the Codex path reads in place of this copy. It covers similar ground but copies no wording from the file below, so it is not a modified version of Anthropic's work and refreshing that file never obliges anyone to reconcile it;
- `.claude/agents/design-worker.md`, `implementation-worker.md`, `visual-auditor.md` — the per-role framing that governs how each agent uses the guidance it reads;
- `agent/contracts/content-integrity.md` — the rule that outranks all of the above.

Keeping the copy unmodified is deliberate: it keeps the licence notice honest and makes a refresh a plain overwrite.

## Refreshing the copy

The copy is frozen at the retrieval date above and receives no automatic updates. To refresh it:

1. Overwrite `skills/frontend-design/SKILL.md` and `LICENSE.txt` from the upstream path listed above.
2. Set `version` and `metadata.vendoredOn` in `.claude-plugin/plugin.json` to the new retrieval date, and update the table in this file.
3. Re-read `agent/rubrics/design-craft.md` and confirm it still resolves every conflict with the new upstream text.
4. Run `npm run validate:agent`.
