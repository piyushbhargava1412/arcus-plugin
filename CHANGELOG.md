# Changelog

All notable changes to the **ARCUS** plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **OpenCode integration as an npm plugin — `arcus-opencode` (additive, non-breaking).** ARCUS now
  ships as a standalone OpenCode plugin package at `plugins/arcus-opencode/` (distribution model:
  **bundle-and-stage**). The package carries a self-contained `bundled/` payload (skills, helper
  scripts, agent-resources, schemas) **built from the authoring source `plugins/arcus/`** at publish
  time via `scripts/build-bundle.mjs`, which bakes the OpenCode-specific transforms (skills copied;
  `arcus:<name>` → `<name>` rewritten in each `SKILL.md` for OpenCode's flat addressing — staged copies
  only, sources untouched). At session start the plugin (`src/index.ts`) resolves its **own install
  dir** via `import.meta` (not the user's repo), stages `bundled/{skills,agents,commands}` into the
  target repo's `.opencode/`, and runs `bundled/scripts/bootstrap.sh` (CWD = target repo) to stage the
  deterministic helpers into `.arcus/bin` + write `.arcus/env`. Because resolution is package-relative,
  `ARCUS_HOME` points at the installed package's `bundled/`, so it works in **any** target repo with no
  `plugins/arcus/` present. Two install paths: (1) **npm** — `{ "plugin": ["arcus-opencode"] }` in the
  target's `opencode.json` (requires the package published to npm; OpenCode fetches into
  `~/.cache/opencode/node_modules/`); (2) **local** — `npm install` the package + a one-line
  `.opencode/plugins/*.ts` re-export, no publish needed. Verified end-to-end in a **separate throwaway
  repo** (OpenCode 1.17.11): all 13 skills staged into the target `.opencode/skills/`, `.arcus/bin` +
  `.arcus/env` created, `ARCUS_HOME` = `<target>/node_modules/arcus-opencode/bundled`, and `arcus-guide`
  loaded and used by the model. `plugins/arcus/` remains the single source of truth; `bundled/`, the
  staged target dirs, and dev `node_modules` are git-ignored. No existing trigger, skill/agent roster
  entry, checkpoint key, artifact name, or helper-script CLI changed. `model-strategy` gains an
  **OpenCode column** in its Tier-to-Platform Model String table (default provider GitHub Copilot:
  opus→`github-copilot/claude-opus-4.8`, sonnet→`github-copilot/claude-sonnet-4.6`,
  haiku→`github-copilot/claude-haiku-4.5`; Amazon Bedrock documented as the alternative). Under
  OpenCode the resolved string is pinned per agent via `model:` frontmatter (no dispatch-time `model`
  param), so the per-agent pins land with the agent port (`agents.opencode/`). The plugin is
  **intentionally silent in the TUI** — no toast, no terminal output: `bootstrap.sh`'s stdout is captured
  via Bun `$.quiet()` (so its status line cannot ghost the prompt input) and the outcome is recorded only
  through **structured logs** (`client.app.log`, service `arcus-opencode`). Successful skill/agent
  discovery is its own confirmation. **No OpenCode command files** are
  shipped: ARCUS's user-facing invocation is its natural-language trigger phrases (declared in skill
  `description`s), which OpenCode auto-routes via the `skill` tool — verified in a target repo
  (`what is arcus`→`arcus-guide`, `sync context`→`context-drift-sync` both routed unprompted). The
  Claude/Copilot `/arcus:<name>` slash form was always a name-derived by-product, not an authored
  artifact, so no command surface is recreated (it remains a future discoverability-only option). All
  **16 agents** are now shipped: the build (`scripts/build-bundle.mjs`) converts the Claude-dialect
  `plugins/arcus/agents/*.md` frontmatter to OpenCode dialect at build time (single source of truth, no
  parallel dir) — `mode: subagent` + `hidden: true`, `model:` pinned per tier (4 opus / 1 haiku / 11
  sonnet), `permission` derived from `tools`/`disallowed-tools` (incl. `question: deny` for
  `subagent-task-dispatcher` as the `AskUserQuestion` analog), nested `metadata:` dropped, folded
  descriptions collapsed, and Claude color words mapped to **quoted** `#hex` (a bare `#hex` is a YAML
  comment → null, which OpenCode's validator rejects). `permission.task` is left at OpenCode's default
  (allow) — a restrictive config would block dispatch. Verified in the target repo: OpenCode validates
  all 16, and the model dispatched `security-reviewer` and `context-pack-builder` via the Task tool.
  **Publish-ready:** the package now compiles its entry to `dist/index.js` via `esbuild` (matching the
  published-OpenCode-plugin convention), ships `README.md` + `INSTALL.md`, and is **pnpm-native**
  (`pnpm-lock.yaml`; `pnpm.ignoredBuiltDependencies` silences the esbuild build-script prompt — the build
  works under `--ignore-scripts`). `prepack` rebuilds both `bundled/` and `dist/` so the tarball is always
  complete (75 files, ~136 kB). **Distribution = GitHub Release tarball, no npm registry/login**: a target
  repo installs via `pnpm add -D <release-tarball-url>` + a one-line `.opencode/plugins/*.ts` re-export of
  `arcus-opencode`. (Empirically, OpenCode's `"plugin"` array does **not** install a `.tgz` path/URL — it
  only resolves npm-registry names or local plugin dirs — so the tarball is installed into the repo's
  `node_modules` and loaded via the local loader.) Verified end-to-end in a clean repo: the documented
  flow stages 13 skills + 16 agents, the staged artifacts + `node_modules` are git-ignored, and the tree
  is clean (ARCUS-ready) after committing the loader/config. `arcus-guide` loaded and answered.
  **Single version + automated releases:** the OpenCode package no longer carries an independent version —
  `scripts/sync-version.mjs` derives it from the canonical `plugins/arcus/.claude-plugin/plugin.json` at
  build/pack time (the Claude plugin and the OpenCode package now always share one version; aligned at
  `2.0.0`). A new GitHub Action (`.github/workflows/release-opencode-plugin.yml`) publishes a GitHub
  Release with the `.tgz` whenever `plugin.json`'s version changes on `main` (idempotent: skips if the
  release already exists), so bumping the canonical version is the only release action needed.
  **Near-zero manual setup:** installation is now just two steps — `pnpm add -D <tarball>` + a one-line
  `.opencode/plugins/*.ts` loader. No `opencode.json` is required (OpenCode allows skills by default,
  verified), and the plugin **auto-manages `.gitignore`** (idempotently appends `.opencode/skills/`,
  `.opencode/agents/`, `.arcus/` under a labeled header) so the working tree stays clean with no manual
  ignore edits. The loader file remains the one irreducible step pre-publish — `"plugin":
  ["arcus-opencode"]` only resolves from OpenCode's registry cache, not a repo's local `node_modules`
  (confirmed), so it works only once the package is published to a registry. The loader may instead be
  installed **globally** (`~/.config/opencode/` + `~/.config/opencode/plugins/arcus.ts`) so ARCUS loads
  in **every** repo with no per-project setup — verified end-to-end in a fresh repo (skills/agents
  staged, `.gitignore` managed, `ARCUS_HOME` resolved to the global install).
  **One-command installer:** added `plugins/arcus-opencode/install.sh`, attached to each GitHub Release
  as a standalone asset, so a user installs with a single `curl -fsSL .../releases/latest/download/install.sh | sh`
  (no repo clone). It resolves the release tarball via the GitHub API (latest or `--version X.Y.Z`,
  with an `ARCUS_OPENCODE_TARBALL_URL` override for private mirrors), runs `pnpm add`, and writes the
  loader — supporting both project and `--global` scopes. POSIX `sh`, idempotent; verified end-to-end
  in both scopes against a packed tarball.

- **Four repo-context discovery agents (ARC-0009).** The repo-context discovery capabilities are now
  pure model-only **agents** under `plugins/arcus/agents/` (matching the
  `context-pack-builder`/`subagent-task-dispatcher` precedent): `repo-overview-discovery` (renamed from
  the `repository-context-builder` skill → `repo_scope.md` + `repo_map.md`), `flow-discovery` (renamed
  from `flow-and-scope-discovery` → `flows/*.md`), `test-pattern-discovery` (→ `testing-patterns.md`),
  and `design-pattern-discovery` (→ `design-and-coding-patterns.md`). Each is `user-invocable: false`,
  `disable-model-invocation: true`, with its templates/references relocated under
  `plugins/arcus/agent-resources/<agent>/` and referenced via `"$ARCUS_HOME"/agent-resources/...`.
  Agent `description` fields carry **no** user trigger phrases — model-dispatch signal only.

### Changed

- **`repo-agentifier` is now the single user-facing entry for building `.context/` (ARC-0009).** It
  dispatches the four discovery agents **by name** (overview first, then flow/test/design in parallel)
  instead of reading prompt templates, and its existing-`.context/` behavior is **confirm → full
  rebuild** (deleting stale `flows/*.md` first). Users wanting a graceful, incremental update are
  pointed at `sync context` (`arcus:context-drift-sync`).
- **Roster / model-strategy / test harness updated for the conversion.** `agents.md` pure-agent roster
  9 → 13; `model-strategy` stage rows renamed (`repository-context-builder`→`repo-overview-discovery`,
  `flow-and-scope-discovery`→`flow-discovery`); `tests/lib/skills.mjs` `DISPATCHED_ONLY` gains the four
  agents; eval-spec folders renamed with `skill_name` updated; surface-count guard updated to **13 skill
  dirs + 16 agent files**.

### Removed

- **The four standalone discovery skills and their eight user triggers (ARC-0009, BREAKING).** Removed
  the `repository-context-builder`, `flow-and-scope-discovery`, `test-pattern-discovery`, and
  `design-pattern-discovery` **skills** (now agents) along with their trigger phrases ("build shared
  repository context", "refresh the context", "discover and persist flows", "what does this repo
  actually do", "discover and persist testing patterns", "how do we write tests?", "discover and
  persist design patterns", "baseline the coding style"). The only supported user verbs for context are
  now **build/rebuild** (`repo-agentifier`) and **sync** (`context-drift-sync`). Also removed the four
  now-redundant prompt templates from `repo-agentifier/assets/` (kept `agents-template.md`).

### Changed

- **`arcus-controller` SKILL.md trimmed to the authoring-style standard.** Cut the `Key Principles`
  footer (replaced by a short `Owned state` note), stripped leaked callee internals from the
  Brainstorm, Implementation, Code Review, and Loopback sections, merged the duplicate Mode/Activation
  tables, removed duplicated stage-key lists, and reduced the Canonical Pipeline table to a
  checkpoint-key → phase-group → owner map (dropped the internal-leaking `Execution` column). No
  contract surface (triggers, tokens, stage keys) changed.
- **Versioning working agreement (`AGENTS.md`).** Documented the semver bump policy: evaluate and
  apply the bump on every material interaction, log under `CHANGELOG.md` `[Unreleased]`, bump once per
  accumulated release, with major/minor/patch rules tied to the plugin's contract surface.
- **`AGENTS.md` trimmed ~44% (1379 → 769 words).** Collapsed the inline "Two Surfaces" and
  "Three-Tier Capability Library" sections into pointers to their canonical homes
  (`plugins/arcus/agents.md`, `site/concepts/capability-library.md`), reduced the roster lists to a
  link to `agents.md#roster`, dropped the deferred-branch / one-planning-file invariants already
  stated in `.context/repo_scope.md`, and made the prose model-facing. Reduces eager session-load cost
  (`CLAUDE.md` imports `AGENTS.md` via `@`). No content lost — only de-duplicated.

## [1.5.0] - 2026-06-25

### Added

- **Skills vs Agents — two surfaces (ARC-0008).** ARCUS capabilities are now split across two
  *surfaces*, an axis **orthogonal** to the `layer:` tier: **Skills** (`plugins/arcus/skills/<name>/SKILL.md`)
  are user **and** model invocable and exposed as `/arcus:<name>`; **Agents**
  (`plugins/arcus/agents/<name>.md`, flat files) are model-only, dispatched **by name** from a
  skill/orchestrator, and never user-facing. Resulting layout: **16 skill dirs + 13 agent files**.
  Canonical agent frontmatter (`name`, `description`, `layer`, `tools`, `disallowed-tools`, `model`,
  `color`) is documented in `plugins/arcus/agents.md`.
- **L1-13 `checkAgentFrontmatter`.** A new Layer-1 static check governing the agent surface (name ==
  basename, description, valid `layer`, tier-word `model`), with good/planted-bad fixtures; the
  planted-violation coverage map is bumped to **13** checks.

### Changed

- **11 pure agents moved out of `skills/` into `agents/`:** `subagent-task-dispatcher`,
  `spec-compliance-reviewer`, `code-quality-reviewer`, `security-reviewer`, `performance-reviewer`,
  `history-context-reviewer`, `review-consolidator`, `code-simplifier`, `simplify-and-verify`,
  `context-pack-builder`, `context-drift-sync`. Bundled resources are co-located in sibling
  `agents/<name>/` dirs; advisory reviewers keep their read-only guards.
- **`test-spec-compiler` and `pull-request-builder` krill-split** into a thin `layer: coordinator`
  **skill wrapper** (owns the user trigger + dispatch) and a same-named `layer: capability`
  **execution agent** (owns the workflow + assets). Their Layer-2 eval specs are unchanged.
- **Test harness is agent-aware.** `tests/lib/skills.mjs` gains `walkAgents()` + `walkAll()`; every L1
  check and roster (`DISPATCHED_ONLY`, `ADVISORY_REVIEWERS`, `tierCounts`, cross-references L1-7,
  eval-spec L1-12) resolves over the **union** of `skills/ ∪ agents/`, so the surface move is
  order-independent. The `layer:` role axis survives on agents (still gating capability-no-state).
- **Trigger corpus** (`tests/e2e/triggers/corpus.json`) no longer routes any user phrase to a pure
  agent; the two thin wrappers keep their triggers.
- **Docs + manifests** updated for the skills-vs-agents split (`AGENTS.md`, `README.md`,
  `site/concepts/capability-library.md`, plugin/marketplace descriptions) and the shared `.context/`
  snapshot synced (`repo_map.md`, `repo_scope.md`, `testing-patterns.md`).

## [1.4.0] - 2026-06-23

### Added

- **Three-tier capability library (ARC-0006).** Every `SKILL.md` now declares a `layer:`
  (`capability | coordinator | orchestrator | substrate | utility`) and `standalone:` flag, making the
  taxonomy machine-readable. **Capabilities** are atomic, stateless, plug-n-play building blocks (given
  declared inputs → one output; no checkpoint/branch ops); **Coordinators** are thin stateless
  sequencers of capabilities; **Orchestrators** own the checkpoint, branch, and stage gates.
- **Explicit `## Contract` sections on all 16 existing capabilities** (Inputs / Outputs / Mode /
  Clarification Policy) and **`## Layer Rules`** on every coordinator and orchestrator. Contracts use
  **domain concept names** (`implementation_plan`, `spec_grounding`, `context_pack`,
  `acceptance_criteria`, `change_set`) instead of ARCUS artifact filenames, so each capability is
  reusable **standalone** by a developer who has never used ARCUS.
- **`kick-off` coordinator (new).** A brainstorm-only coordinator (context-pack-builder →
  spec-finalizer); inherits the `"brainstorm / kick off / architect <STORY>"` triggers. It sequences
  exactly those two capabilities and stops, returning a `context_pack` and a `spec_grounding`.
- **`review-consolidator` capability (new).** Extracted from `code-reviewer`: given structured
  specialist findings, produces a calibrated, deduplicated verdict and the review artifact.
- **`simplify-and-verify` capability (new).** Extracted from `code-simplifier`: given a file set and a
  test command, mutates toward simplicity, re-runs the tests, and returns `SIMPLIFIED` or `REVERTED`.
- **Split planning artifacts, one owner each.** `spec-finalizer` writes a self-contained
  `grounded-spec.md` (grounded story decisions) and `implementation-planner` writes a single `plan.md`
  (design deliberation + atomic task list); the former separate `blueprint.md` is folded into `plan.md`
  and the checkpoint stage key `blueprint` is renamed to `plan`. Each capability owns exactly one file,
  so no section-ownership manifest is needed. **Substrate convention under `plugins/arcus/schemas/`:**
  `output-convention.md` (the hybrid output-path rule), shipped inside the plugin (not the git-ignored
  `.arcus/`) so it is version-controlled and distributed with every install.
- **`## Standalone Invocation` sections + standalone triggers** on the specialist reviewers
  (security / performance / code-quality / history-context — `disable-model-invocation: true`
  preserved, so organic firing stays blocked), plus `code-reviewer`, `pull-request-builder`, and
  `simplify-and-verify`.
- **`site/concepts/capability-library.md` (new docs page).** Explains the three tiers, the plug-n-play
  idea, and a concrete standalone-usage example; wired into the VitePress sidebar and cross-linked from
  the pipeline and modes pages. A matching three-tier section was added to the `arcus:arcus-guide`.

### Changed

- **Unified `arcus-controller` orchestrator (ARC-0006).** A single orchestrator now drives **both**
  experiences over the identical canonical stage sequence: **interactive** mode (default; triggers
  `"implement <STORY>"` / `"plan <STORY>"`; dialogue stages run in the main thread with a handoff gate
  after each phase group) and **autonomous** mode (triggers `"forge <STORY>"` / `"afk <STORY>"`;
  one-shot subagents, no gates, milestone-only output). The brainstorm phase delegates to the new
  `kick-off` coordinator.
- **`spec-finalizer` and `implementation-planner` decoupled.** Their bodies no longer read hard-coded
  `.arcus/specs/…` paths; they receive named inputs (`story`, `context_pack`, `spec_grounding`) and an
  explicit `mode: dialogue | autonomous` parameter that the body branches on (no more caller-inferred
  behavior). Each gained a `## Caller Guidance` section for pipeline-vs-standalone sourcing.
- **Medium capabilities parameterized + terminology-decoupled.** `context-pack-builder`,
  `test-spec-compiler` (`blueprint` → `implementation_plan`), `spec-compliance-reviewer` (`DoD` →
  `acceptance_criteria`, plus `claimed_files`), and `pull-request-builder` (`change_set` + `story`) now
  take named inputs and no longer read ARCUS paths from their bodies.
- **`code-reviewer` and `code-simplifier` thinned into coordinators** that delegate to the new
  `review-consolidator` and `simplify-and-verify` capabilities, respectively.
- **`AGENTS.md` navigation index** updated with the three-tier taxonomy table, the new skill entries,
  and the unified `arcus-controller` triggers; the documentation site and `arcus:arcus-guide` reframe
  the old "Gated vs AFK" language as "Interactive vs Autonomous" (two modes of one orchestrator).

### Removed

- **`solution-architect` skill.** Superseded by the `kick-off` coordinator (which inherits its
  brainstorm triggers) and the unified `arcus-controller` interactive mode (which now owns the gated,
  full-pipeline driving). All references across skills, docs, and the navigation index were updated.

## [1.3.0] - 2026-06-21

### Added

- **Context Engineering: `design-and-coding-patterns` artifact + dedicated docs (ARCUS-0005).** A new,
  fifth shared `.context/` artifact — `design-and-coding-patterns.md` — captures the repository's design
  patterns, layering/structure conventions, naming idioms, and error-handling conventions, plus a
  curated **Avoid** list of anti-patterns. It is **static by design**: discovered once during
  agentification and maintained thereafter only by `arcus:context-drift-sync` when a genuinely new,
  team-level pattern is adopted (not on routine diffs).
- **`arcus:design-pattern-discovery` skill (ARCUS-0005).** New evidence-only discovery skill (3-step
  flow, recurrence ≥3, `context-meta` header) that mirrors `arcus:test-pattern-discovery` and produces
  `.context/design-and-coding-patterns.md`. Wired into `arcus:repo-agentifier` as a parallel `heavy`
  **Stage 2c** subagent (alongside flow + test-pattern discovery), with a new
  `design-pattern-prompt.md` and an `AGENTS.md` navigation row.
- **Context Engineering documentation (ARCUS-0005).** New `site/concepts/context-engineering.md` Core
  Concepts page (scan-once / scope-per-story / sync-on-drift, the five `.context/` artifacts, role of
  `AGENTS.md`/`CLAUDE.md`, a Mermaid lifecycle, and re-agentify vs. trust-sync), mirrored as the
  `arcus:arcus-guide` `context-engineering.md` module, with cross-links from the introduction, pipeline,
  and artifacts guides.

### Changed

- **Planning, implementation, and review now consume `design-and-coding-patterns.md` (ARCUS-0005).**
  `arcus:context-pack-builder` reads it and templates a `## Design & Coding Patterns` section;
  `arcus:implementation-planner` and the blueprint template point pattern guidance at it; and
  `arcus:code-quality-reviewer` + `arcus:code-simplifier` add it to their runtime convention sources.
  `arcus:context-drift-sync` adds it to the drift scope with a static-doc drift trigger that fires only
  on newly-adopted patterns.

## [1.2.0] - 2026-06-21

### Added

- **Refactor gate in the task loop (ARCUS-0004).** `arcus:code-simplifier` is now an ARCUS-native,
  language-agnostic refactor gate wired into `arcus:subagent-task-dispatcher` between the TDD verify
  step and the spec-compliance check. It mutates changed files toward simplicity, re-runs the test
  suite, and returns `SIMPLIFIED` (green) or `REVERTED` (red — mutations rolled back). Skipped on
  `light`-complexity tasks. Completes the red-green-**refactor** cycle inside the ARCUS task loop.
- **`arcus:history-context-reviewer` specialist (ARCUS-0004).** New git blame/log reviewer added to
  the `arcus:code-reviewer` Stage 3 fan-out. Flags only on concrete git signal: prior fix/revert
  commits on touched lines, removed deliberate-marker annotations, or re-added previously-reverted
  code. Conditionally skipped on docs-only diffs and shallow history (< 3 commits on changed files).
  Pairs with the refactor gate as a guardrail against deleting load-bearing complexity.

### Changed

- **`arcus:subagent-task-dispatcher` step sequence (ARCUS-0004).** Steps renumbered: verify (5) →
  refactor gate (6, skipped on `light`) → spec-check (7) → commit (8). Retry Protocol updated to
  document the no-retry refactor gate; Success Criteria updated.
- **`arcus:implementation-runner` Step 5 narrative (ARCUS-0004).** Updated to reflect the new
  RED→GREEN→refactor→spec-check→commit order.
- **`arcus:code-reviewer` Step 3 fan-out and Step 4 consolidation (ARCUS-0004).** Added
  `history-context-reviewer` row to the fan-out table; added confidence filter (drop findings < 80)
  and an explicit false-positive drop-list (linter-catchable, lint-ignore'd, pre-existing) to the
  consolidation step; added `## History/Context` section to the review report template.
- **`arcus:code-quality-reviewer` Test Quality checklist (ARCUS-0004).** Added critical-path
  coverage framing: flag as `warning` missing tests for behaviors whose failure would produce a
  `critical`/`warning` finding; flag as `suggestion` gaps on purely internal helpers.

### Removed

- **`arcus:code-reviewer-claude` orphan skill (ARCUS-0004).** Deleted. Confidence scoring (0–100,
  drop < 80) and false-positive drop-list ideas harvested into `arcus:code-reviewer` Step 4.
- **`arcus:pr-test-analyzer` orphan skill (ARCUS-0004).** Deleted. Critical-path coverage criticality
  framing and DAMP-principles ideas harvested into `arcus:code-quality-reviewer` Section 4.

## [1.1.0] - 2026-06-19

### Added

- **New `context_sync` stage between Code Review and Closure (ARC-0003).** After Code Review
  approves, a new **`context-drift-sync`** skill (stage key `context_sync`) strictly assesses whether
  the approved branch diff materially changed any shared `.context/` artifact (business flows,
  `repo_map.md`, `repo_scope.md`, `testing-patterns.md`) and **surgically syncs only the affected
  ones** (refreshing their context-meta; updating `AGENTS.md` only when a flow file is added or
  removed). It is **facts-only and diff-driven** — no full rescan. The rationale is persisted in the
  sync commit body (no new artifact, no `plan.md` subsection). In the gated flow it shows a drift
  assessment plus a single consolidated yes/no; in AFK it auto-decides; it is also standalone-invocable
  via `sync context for <STORY_ID>` / `sync context`. Code Review's `approved` verdict now advances to
  Context Sync (resume phrase `sync context for <STORY>`), which then **auto-continues to Closure** (no
  user decision gate). The pipeline is now **six human-facing phases over ten ordered stages**.
  - **Branch-scoped baseline (ARC-0003 refinement).** A story-scope run diffs from
    `merge-base(HEAD, base_branch)` — it owns only the drift its own branch introduced, so the change
    set is bounded and never grows unbounded with stale hashes. It re-bumps `verification-commit` only
    on the artifacts it flags-and-edits; assessed-but-skipped artifacts keep their hash, so per-artifact
    `verification-commit` values legitimately diverge. The **standalone full sweep** (`sync context`)
    owns main-level / pre-fork drift and is the only run that re-levels every assessed artifact onto one
    common commit. Full-sweep cadence is intentionally deferred to operational policy.

### Changed

- **Updated ordered pipeline / stage keys:** `scaffold → context_pack → spec_finalizer → blueprint →
  test_plan → branch → task_1..N → code_review → context_sync → closure` (`context_sync` inserted
  between `code_review` and `closure`).

## [1.0.0] - 2026-06-19

### Changed

- **Pipeline reworked into two experiences: a gated self-handoff chain and an AFK-only controller
  (ARC-0002).** The default, user-driven flow is now a **chain of self-handing-off skills** with
  **no router and no shared pipeline file** — entry is the new **`solution-architect`** skill
  (`solution-architect <STORY>` / `plan <STORY>`), and each stage skill embeds a **Handoff Protocol**
  naming only its immediate successor (a same-session `yes` loads it; a cold resume uses the next
  stage's explicit phrase + the checkpoint). The fully-autonomous path is the **`arcus-controller`**
  meta-skill (name kept, version `4.0.0`), now **narrowed to AFK-only**: it activates solely on AFK
  phrases (`afk`, `--afk`, `forge`, `run afk on <STORY>`), runs stages as one-shot subagents with
  milestone output, and its body holds the **single canonical ordered stage list**.
- **New ordered pipeline / stage keys:** `scaffold → context_pack → spec_finalizer → blueprint →
  test_plan → branch → task_1..N → code_review → context_sync → closure`. The old standalone `init`
  stage is removed
  (`scaffold` is the new front), and `branch` is a **new** stage inserted between `test_plan` and the
  task loop.
- **Deferred branch creation.** A new **`scaffold.sh`** creates the spec folder, copies `story.md`,
  and inits the checkpoint recording the *planned* `branch_name` / `base_branch` — but **no git
  branch**. The branch is created later at the start of Implementation by **`branch.sh`** (driven by
  the new `implementation-runner` skill), which bumps the name on collision and calls
  `checkpoint.sh set-branch` if the realized name differs from the plan. A new shared
  **`scripts/lib/branch_name.sh`** defines the `arcus/<id>-N` naming convention once (sourced by both
  scripts). `checkpoint.sh` gains a **`set-branch`** action.
- **Planning deliberation consolidated into a single `plan.md`** (replacing the old split assumptions
  and clarifications files). The machine-parsed task list stays in `blueprint.md`. No runtime skill or
  doc reads those former planning files any more.
- **Recommendation-first gated interviews.** In the gated flow, both `spec-finalizer` and
  `implementation-planner` present every interview question with exactly one option marked
  **Recommended** (with a one-line rationale) plus an explicit custom-answer option; the
  `solution-architect` driver enforces this.

### Added

- **`solution-architect` skill (version `1.0.0`)** — the gated planning driver. Chains
  scaffold → context-pack → spec-finalizer (dialogue) → implementation-planner (dialogue) in the main
  thread, then hands off to the Test Plan. Activates on `solution-architect <STORY>` / `plan <STORY>`.
- **`implementation-runner` skill (version `1.0.0`)** — the single canonical Implementation loop
  driver, reused by both the gated chain and the AFK controller. Realizes the deferred git branch at
  entry (`branch.sh`), parses `blueprint.md` tasks, and drives each through the
  `subagent-task-dispatcher` protocol; owns the Code Review loopback.

> **Note:** `context: fork` adoption is **deferred** to a follow-up — skills are still dispatched
> imperatively (one skill reads and follows the next by name); ARCUS does **not** use `context: fork`
> today.

- **Test commands deduplicated to a single source of truth.** `testing-patterns.md` → Execution
  Patterns now solely owns test commands (incl. the Full Suite row the deterministic gate reads);
  `repo_map.md`'s Build & Run table drops its Test row and owns only non-test build/quality commands
  (build, run, lint, format, typecheck, static analysis). `test-pattern-discovery` (version `1.1.0`)
  declares the source-of-truth boundary and emphasises full-suite + CI-authoritative command extraction.
- **Per-task review collapsed from two passes to one.** The `subagent-task-dispatcher` (version `2.1.0`) Step 6 no longer
  runs a per-task `code-quality-reviewer` pass. Quality, security, and performance are now reviewed
  exclusively — and holistically — by the post-implementation `code-reviewer` stage over the full branch
  diff. Reviewing quality per task was redundant (isolated subagents never see prior tasks' code, so
  quality issues don't propagate between them) and its binary FAIL conflicted with the holistic stage's
  signal-over-noise threshold. The remaining per-task `spec-compliance-reviewer` check is reframed as an
  early, advisory correctness gate (single retry, then commit with `[spec: unresolved]` and carry the
  findings forward to the holistic reviewer) focused on gamed/missing tests and `[EXTRA]` scope creep.
- `code-quality-reviewer` (version `2.1.0`) is now a holistic-only skill (per-task mode and its binary
  `VERDICT` output removed). `subagent-task-dispatcher`, `spec-compliance-reviewer` (version `2.1.0`),
  and `arcus-controller` updated to match.
- **`code-reviewer` (version `1.1.0`) reworked into a two-tier stage** as the last quality gate before a PR is raised.
  - **Tier 1 — Deterministic Gate** runs the repo's *real* tooling (typecheck, **full** test suite,
    build + startup smoke, secret scan, lint, format, static analysis) over the integrated branch
    instead of having an LLM eyeball the diff for them. Commands resolve from the repo's CI/CD
    workflows first (the authoritative "what blocks a PR" set), then `.context/` tables. Lint/format
    issues with a fix mode are **auto-fixed and committed** so mechanical churn doesn't burn a loopback
    round; a hard failure (typecheck/tests/build/secret) short-circuits to `changes_requested`. This
    anticipates CI, cutting post-PR fix cycles.
  - **Tier 2 — Semantic Review** keeps the four specialist reviewers but scopes them to judgment-grade
    concerns only (they no longer re-litigate anything the gate settles).
  - **Reviewer persona** is now explicitly *zero-trust / brutal in the hunt, fair in the verdict*:
    distrust the implementer's claims and verify against source + tool output, while keeping the
    verdict calibrated for signal over noise so the pipeline still ships.
- `code-quality-reviewer` gained explicit **cognitive-complexity** judgment and a **test
  proportionality** dimension (flags excessive/over-engineered tests and slow wrong-layer integration
  tests that bloat the build).
- `repo_map.md` template's **Build & Run Commands** table extended with Lint-autofix, Format-check,
  Format-write, Typecheck, and Static-analysis rows so the deterministic gate has first-class command
  sources.
- **`repository-context-builder` (version `1.2.0`)** now actively extracts quality & build commands
  (build, full-suite test, run, lint/autofix, format check/write, typecheck, static analysis) into the
  Build & Run Commands table, preferring the command CI actually runs and recording evidence (or an
  explicit `Not found`). The output-spec and validation gates require the table to be populated, so the
  code-review deterministic gate reliably has real commands to run.

## [0.5.0] - 2026-06-17

### Added

- **`arcus-guide` skill (version `1.0.0`)** — Comprehensive help and onboarding assistant for ARCUS.
  Provides context-aware guidance through progressive disclosure with 8 curated content modules:
  welcome screen, getting started guide, command reference, pipeline explanation, mode selection
  guide, artifacts guide, troubleshooting, and FAQ. Activates on natural language triggers like
  "what is arcus?", "how do I use arcus?", "arcus help", "where am I?", "show me commands",
  "explain the pipeline", "gated or afk?", "explain artifacts", and "troubleshooting". Features
  intelligent context checking (setup status, pipeline position, active stories) to provide
  situation-specific help. Read-only utility that doesn't modify state or interfere with workflows.

## [0.4.0] - 2026-06-17

### Changed

- **Rebranded the plugin from `agent-forge` to ARCUS (Any Repository Can Use Spec-driven
  development).** The marketplace is named `arcus` and the plugin is published as `arcus-plugin`; the orchestrator
  meta-skill `afk-skill-router` is renamed `arcus-controller`. The per-repo workspace moved from
  `.aforge/` to `.arcus/` (with `ARCUS_HOME` / `.arcus/env`), the ignore file from `.aforge-ignore`
  to `.arcus-ignore`, and the story branch prefix from `agent-forge/<id>` to `arcus/<id>`. Install
  with `/plugin install arcus-plugin@arcus`. The **AFK (Away From Keyboard)** autonomous mode, its
  triggers (`--afk`, `run afk on …`), and the `[AFK]` milestone markers are unchanged. Existing
  `.aforge/` workspaces and `agent-forge/*` branches do not auto-migrate; in-flight stories restart
  cleanly under the new paths.
- **`arcus-controller` (version `3.0.0`) is now a human-gated, state-driven orchestrator.** The
  pipeline (Init → Brainstorm → Test Plan → Implementation → Code Review → Closure) runs one stage
  at a time and pauses at a handoff gate between stages; reply `yes` to proceed or `no` to pause and
  resume later (across sessions). Each stage is independently invocable
  (`brainstorm`/`generate tests`/`implement`/`review`/`fix`/`close <STORY>`). The original
  fully-autonomous behaviour is preserved as an opt-in **`--afk` mode** that auto-confirms all gates.
- **Stage 1 Brainstorm** now runs the `spec-finalizer` dialogue in the main thread: it asks the user
  the highest-impact open questions one at a time (gated mode) instead of only escalating blockers.
  `spec-finalizer` (version `2.2.0`) gained explicit **dialogue** vs **one-shot** modes.
- `session-checkpoint.json` upgraded to **schema v2**: each stage carries a status enum
  (`pending`/`in_progress`/`awaiting_handoff`/`complete`/`needs_rework`) plus `mode` and
  `review_round`. `checkpoint.sh` adds `set-status`, `reopen`, and `set-mode` actions and migrates
  legacy boolean checkpoints automatically.
- Per-task `spec-compliance-reviewer` and `code-quality-reviewer` gained a **holistic mode** and a
  unified `critical`/`warning`/`suggestion` severity taxonomy.

### Added

- **New Code Review stage** between Implementation and Closure. A `code-reviewer` coordinator reviews
  the full branch diff, fanning out to new `security-reviewer` and `performance-reviewer` specialists
  and reusing the spec-compliance and code-quality reviewers holistically. It deduplicates, filters
  noise, judges severity, and writes `review.md` with an `approved` / `changes_requested` verdict.
  On `changes_requested`, findings loop back into Implementation as fix-tasks (bounded to 3 rounds).
- TDD enforcement in the implementer prompt now requires explicit RED → GREEN → REFACTOR evidence.
- `checkpoint.sh` test harness at `scripts/tests/checkpoint.test.sh`.

## [0.2.0] - 2026-06-16

### Changed

- Renamed the `context-builder-orchestrator` meta-skill to **`repo-agentifier`**
  (version `2.0.0`). It now makes a repository agent-ready in one shot.

### Added

- **Stage 3 (Agentify)** in `repo-agentifier`: after building the `.context/`
  snapshot it generates an `AGENTS.md` navigation index at the repository root and
  a `CLAUDE.md` that imports it (`@AGENTS.md`), with an overwrite guardrail.
- `repository-context-builder` (version `1.1.0`) now scans a broader set of
  artifacts — interface contracts & specs (OpenAPI/AsyncAPI/proto/GraphQL),
  deployment manifests (k8s/Helm/Kustomize/Serverless), plus a catch-all for any
  other relevant non-ignored file. Ignore handling now honors nested `.gitignore`
  files and an optional `.contextignore` / `.aforge-ignore`.
- **Dual-mode Architect stage** in `afk-skill-router` (version `2.1.0`): autonomous
  by default, but Stage 1 can now pause to ask the user. `spec-finalizer`
  (version `2.1.0`) emits a `NEEDS_INPUT` escalation block distinguishing
  `zero-option` blockers (always escalated) from `low-confidence` items (escalated
  only in interactive mode, opt-in via "interactive"/"ask me"). User answers persist
  to a clarifications artifact and are reused on resume.

## [0.1.0] - 2025-06-09

### Added

- Initial release of the **agent-forge** plugin, distributed through the
  `krill-afk` marketplace (`.claude-plugin/marketplace.json`).
- Plugin manifest at `plugins/agent-forge/.claude-plugin/plugin.json` (semver
  `version` is the release authority).
- Two orchestrator meta-skills:
  - `afk-skill-router` — the Away-From-Keyboard Spec → Code → Pull Request pipeline.
  - `repo-agentifier` — one-time repository context generation.
- Supporting sub-skills: `spec-finalizer`, `flow-and-scope-discovery`,
  `test-pattern-discovery`, `repository-context-builder`, `context-pack-builder`,
  `implementation-planner`, `test-spec-compiler`, `subagent-task-dispatcher`, `spec-compliance-reviewer`, 
  `code-quality-reviewer`, `pull-request-builder`,
   and the `model-strategy` reference skill.
- `SessionStart` bootstrap hook (`hooks/hooks.json` → `scripts/bootstrap.sh`) that
  stages helper scripts into the target workspace at `.aforge/bin/` and exports
  `AFORGE_HOME` via `.aforge/env`.
- Cross-tool install support for GitHub Copilot CLI, Claude Code, and VS Code; plus
  IntelliJ/JetBrains usage via the Claude Code/CLI terminal path.

### Changed

- Refactored all skills to be plugin-cache safe: intra-skill resources use relative
  `./assets/...` and `./references/...` links, skill-to-skill references use the
  `agent-forge:<skill>` name form, and executed helper scripts resolve through
  `.aforge/bin/` (falling back to `AFORGE_HOME`).

[Unreleased]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.2.0...v0.4.0
[0.2.0]: https://github.com/piyushbhargava1412/arcus-plugin/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/piyushbhargava1412/arcus-plugin/releases/tag/v0.1.0
