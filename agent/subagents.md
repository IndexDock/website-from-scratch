# Subagent workers and auditors

The main IndexDock orchestrator remains the only authoritative user-facing writer. It automatically delegates bounded design creation and implementation packets to one sequential writer at a time, and delegates independent review lanes to read-only auditors. Subagents never question the learner, change approvals or workflow state, commit, push, deploy, or handle credentials. The fallback workflow remains fully usable without subagents.

| Agent | Access | Used by |
| --- | --- | --- |
| `design-worker` | write | `agent/phases/design-review.md` |
| `implementation-worker` | write | `agent/phases/implementation.md` |
| `visual-auditor` | read-only | `agent/phases/design-review.md`, `agent/phases/quality-review.md` |
| `accessibility-auditor` | read-only | `agent/phases/quality-review.md` |
| `discoverability-auditor` | read-only | `agent/phases/quality-review.md` |
| `production-readiness-auditor` | read-only | `agent/phases/quality-review.md` |

Only one writing worker runs at a time. The four auditors have independent scopes and may run in parallel.

## Where the definitions live

Every agent is defined twice, because no vendor reads the other's directory.

- Claude Code loads every `*.md` file in `.claude/agents/` automatically, on the web and locally, as Markdown with frontmatter.
- Codex reads project-scoped agents from the `*.toml` files in `.codex/agents/`.

The two sets must be kept in step. An agent added, renamed or re-scoped on one path belongs on the other, and the two descriptions stay identical.

Codex documents subagents for the CLI, the IDE extension, and the desktop app. Cloud support is not stated explicitly. If a Codex Cloud session cannot spawn them, the orchestrator runs the same bounded phase packets itself, as `agent/contracts/orchestration.md` requires; nothing about the workflow changes.

## Two layers of design guidance, and one asymmetry left in it

Design guidance comes in two layers. `agent/rubrics/design-craft.md` is the **standard**: what has to be true of a design before it is worth judging. It is vendor-neutral, authoritative, and read on both paths. The second layer is **method**: how a designer arrives there. Both paths carry one, and the `design-worker`, `implementation-worker` and `visual-auditor` on each side read the rubric and their method file together on every run.

The method files differ, because their sources do:

- Claude reads a vendored copy of Anthropic's `frontend-design` guidance from `.claude/skills/frontend-design/`, a Claude-specific directory the Codex path cannot reach into.
- Codex reads `.agents/skills/frontend-design/SKILL.md`, written by IndexDock for this project.

OpenAI publishes no counterpart to Anthropic's skill — the `openai/skills` catalog's only design-adjacent entries are Figma integrations — so the Codex file had to be authored rather than vendored.

The two cover much of the same ground, because there is only so much to say about arriving at a design that is not generic. What matters is that the Codex file copies no wording: every sentence is written for this repository, so it is not a modified version of Anthropic's file and the Apache-2.0 duty to mark changed files does not attach to it. Two practical things follow. A refresh of the vendored copy never turns into a three-way merge. And this project's constraints are written in rather than edited out — Anthropic's file tells a designer to pin down an unstated subject and to write copy where the brief has none, IndexDock forbids both, and the authored file simply never says it.

Keep it that way when editing. Reaching for the vendored file's phrasing is what would turn an independent file into a derivative one, and it is the licence notice next door that would become inaccurate.

Where the rubric and either method file disagree, the rubric wins, on both paths.

Because the vendored copy carries a `.claude-plugin/plugin.json` manifest, Claude Code discovers it in place on session start, with no marketplace, no install step and no network request — which is what keeps the promise in `agent/contracts/orchestration.md` that the learner never configures an agent environment. See `.claude/skills/frontend-design/NOTICE.md` for provenance and the refresh procedure.

That path is `.claude/skills/frontend-design/skills/frontend-design/SKILL.md`, not the plugin directory above it. The nesting is the vendor's own layout, and the shorthand form only ever names the directory. An orchestrator that passes the directory to a worker has handed it a path with no file at the end. Quote the full path whenever a worker is expected to read it.

On both paths, the six design agents reach their method file by **reading it at its path**, unconditionally, on every run. Claude's three do not use the `skills:` preload field, and adding it back would be a mistake. Preload was tried and measured: it works in a local session, but on Claude Code on the web — the surface learners use — a subagent receives nothing, under either the bare `frontend-design` or the namespaced `frontend-design:frontend-design` spelling. Claude Code skips an unresolvable `skills:` entry with only a debug-log warning, so the guidance vanished silently on the one environment that mattered, and the repository looked correct throughout.

The Codex file is deliberately held to the same rule, even though Codex discovers `.agents/skills/` on its own by walking from the working directory to the project root. Discovery is a convenience for the main task, not a delivery guarantee for a worker, and a discovery mechanism that fails does so quietly — which is the whole lesson above. So the three `.codex/agents/*.toml` definitions name the path and read it regardless.

Reading by path costs one tool call and behaves identically everywhere, which is the point: local and web must not diverge, because divergence is what hid the defect. The instruction is deliberately unconditional — "read both every time" rather than "read if not already present" — so no agent can talk itself out of it. `scripts/validate-design-plugin.mjs` fails the build if any of the six stops naming its method file, or if either path stops resolving.

## The orchestrator skill is duplicated the same way

Claude Code reads `.claude/skills/indexdock-website/SKILL.md`; Codex, and anything else following `AGENTS.md`, reads `.agents/skills/indexdock-website/SKILL.md`. Both carry one identical body, so a rule added to either belongs in both. Edit both files, or neither.

The two are now fully identical, and neither may name a `.claude/` path.

They were not always. The Claude copy used to carry one pinned extra paragraph about the vendored design plugin, wrapped in marker comments that `scripts/validate-skill-parity.mjs` cut out before comparing. That worked while exactly one vendor had a design method file to point at. Once Codex gained its own there were two vendor-specific paragraphs to place, and a mechanism admitting a single pinned exception could not hold the second.

The instruction that replaced it names no path: each orchestrator reads the method file *its own instruction file names*. That sentence is true on both paths, so it lives in the shared body, and the vendor-specific paths stay in `CLAUDE.md` and `AGENTS.md` where they are already required.

Nothing was given up. The block existed to guarantee Claude's orchestrator still had a pointer to its guidance, and that guarantee moved to `scripts/validate-design-plugin.mjs`, which now requires `CLAUDE.md` to name the vendored skill path, `AGENTS.md` to name the vendor-neutral one, and both to name the craft rubric — unconditionally, so deleting a paragraph fails the build instead of passing by default. The old check was conditional and one-sided; this one is neither.

`scripts/validate-skill-parity.mjs` enforces that. The markers are not a general escape hatch: the block's text is pinned in the script, so it is the vendored-plugin paragraph or the build fails, and rewording it means editing the script in the same review. The check also requires exactly one block, requires it to end the file — blank lines around a block mid-document cannot be told apart from the separator its neighbours already shared, so removing it for comparison would be guesswork — and rejects any `.claude/` path in the vendor-neutral copy, backticked or bare.
