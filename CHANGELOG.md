# Changelog

All notable changes to the **ARCUS** plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  `copilot-conversation-search`, and the `model-strategy` reference skill.
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
