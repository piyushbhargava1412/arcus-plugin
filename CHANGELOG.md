# Changelog

All notable changes to the **ARCUS** plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **The `SessionStart` hook silently no-oped on Copilot CLI — root cause found and fixed.**
  Previously documented as "unexplained," this was neither a schema difference nor a
  hook-not-firing issue. Confirmed live 2026-08-06: Copilot CLI's plugin-contributed `SessionStart`
  hook **does** fire and **does** set `CLAUDE_PLUGIN_ROOT` correctly, but it invokes the hook's
  command with cwd defaulting to the **plugin's own install directory**, not the session's actual
  working directory. Since that install directory is never a git repo, `bootstrap.sh`'s own
  "not a git repository" guard silently exited 0 having staged nothing — the toolbox never got
  created on a Copilot-only machine with zero visible error.

  The fix needs no hardcoded paths, no duplicate hook blocks, and no SDK extension mechanism:
  Copilot CLI delivers the session's real cwd as JSON on the hook's own stdin (`{"cwd": "...", ...}`,
  true for both the native camelCase and the "VS Code compatible"/Claude-format payload shapes).
  `plugins/arcus/hooks/hooks.json`'s command now passes `--from-hook`, and `bootstrap.sh` reads that
  flag to parse the stdin payload and `cd` into its `cwd` before doing anything else — a no-op on
  Claude Code, where the cwd was already correct. Every non-hook caller (`locate.sh`, CI, a
  developer's shell) never passes `--from-hook`, so nothing about their invocation changes.
  `plugins/arcus/scripts/tests/bootstrap.test.sh` covers the regression directly: the hook path
  staging at the stdin-provided cwd rather than the process cwd, and falling back gracefully to the
  process cwd when no usable payload is present.

  A new opt-in tier, `tests/e2e/plugin-load/run-plugin-load-test.mjs` (`pnpm test:plugin-load`),
  proves the same fix end-to-end against a **real** Copilot CLI session — not a simulated stdin
  payload: it copies the plugin tree to a throwaway temp directory, launches
  `copilot -p ... --plugin-dir <copy>` in a disposable repo, and asserts `.arcus/bin/` was actually
  staged by the live hook. It never touches a real `~/.copilot/installed-plugins/`, needs an
  authenticated `copilot` binary, and costs real AI credits — same reasoning as `pnpm test:evals`,
  it is intentionally excluded from `pnpm test`/CI.

### Changed

- **`review.md`'s findings were unreadable paragraphs — reformatted into a table, and the report
  template moved to match every other output-writing agent's convention.** The `## Critical` /
  `## Warnings` / `## Suggestions` / `## History/Context` sections in `review-consolidator`'s output
  were each a bullet list of full-prose paragraphs, several sentences long per finding, with no
  visual separation between the issue and any proposed fix. `plugins/arcus/agents/review-consolidator.md`
  now writes one `## Findings` table (columns: Severity | Issue / Observation | Proposed Solution,
  ordered critical → warning → suggestion) merging all four former sections — a git-history finding
  is a finding, categorised by severity like any other, not by which specialist reported it — and
  caps each cell at 1-3 sentences / one concrete fix instead of a full investigation narrative. The
  `## Notes` section is now short bullets instead of one summary paragraph. Nothing that other
  skills depend on changed: the `VERDICT:` line and `**Counts:**` line are untouched, and nothing in
  the repo parsed the old section headers programmatically.

  Separately, the report structure itself moved out of `review-consolidator.md`'s prose into
  `plugins/arcus/agent-resources/review-consolidator/assets/review-report-template.md` — every other
  output-writing agent (`context-pack-builder`, `spec-finalizer`, `test-spec-compiler`,
  `pull-request-builder`, and the four discovery agents) already keeps its template as a bundled
  asset referenced from a `## Resources` section; `review-consolidator` was the only one inlining the
  whole template as a fenced block in the agent body. Pure convention fix, no functional change.

### Added

- **`implementation-runner`'s per-task loop now seeds a host-provided task-list tool, when one is
  exposed, alongside the existing `checkpoint.sh` calls.** Previously the only user-visible
  per-task-loop progress was the checkpoint file and one milestone line at the very end of
  Implementation, so live progress required reading `session-checkpoint.json` directly; whether a
  host happened to surface a todo list on top of that was purely incidental model behavior, not an
  ARCUS instruction. Step 5 of `plugins/arcus/skills/implementation-runner/SKILL.md` now seeds one
  entry per parsed task before the loop starts and mirrors each `in_progress`/`complete` transition
  (and Loopback Protocol fix-tasks) onto it. This is explicitly best-effort and host-agnostic — no
  tool name is hard-coded, since task-list-tool support is inconsistent across hosts today (notably,
  headless GitHub Copilot CLI sessions currently drop their documented `todo` tool per an open
  upstream bug). `checkpoint.sh` remains the single source of truth; the task list only mirrors it
  for the human watching the terminal, and the call is skipped silently wherever no such tool exists.

- **New shared docs-only predicate reference doc, a coordinator fast path, per-specialist Skip
  Criteria, and a `dispatched_reviewers` field — cutting `code-reviewer` cost on docs-only and
  low-risk diffs.** `plugins/arcus/schemas/docs-only-predicate.md` is a new shared, plain reference
  document (no skill frontmatter, not registered in the skill/agent roster) defining the docs-only
  classification that any skill or agent can read directly instead of re-deriving diff intent from
  scratch. `code-reviewer`'s Step 1.5 now runs a docs-only fast path against it before fanning out to
  specialists, and `security-reviewer.md` / `performance-reviewer.md` each gained a Skip Criteria
  section so a specialist can decline low-relevance diffs instead of always running.
  `review-consolidator` takes a new `dispatched_reviewers` input recording which specialists actually
  ran, and `history-context-reviewer.md`'s Condition 1 now reads the same reference doc for
  consistency. `model-strategy/SKILL.md`'s Static Stage Assignments table also gained the
  previously-missing `history-context-reviewer` row (`medium` complexity). Purely additive: existing
  callers that don't pass `dispatched_reviewers` or reference the predicate doc are unaffected.

### Fixed

- **`.context/` snapshot left inconsistent after the `diff-classification` skill was converted to
  a plain reference doc.** `.context/repo_map.md` still counted 9 skills and listed
  `diff-classification` in the skill roster, and `.context/design-and-coding-patterns.md`'s
  "Shared-predicate skip gating" pattern still cited the removed `plugins/arcus/skills/diff-classification/SKILL.md`
  path and described it as a `substrate`-tier skill. Both now correctly reflect the 8-skill roster
  and the plain-reference-doc shape (`plugins/arcus/schemas/docs-only-predicate.md`). Also fixed the
  Secret-Pattern Carve-Out's generic key/token regex in `docs-only-predicate.md`, which was
  case-sensitive and missed common camelCase forms (e.g. `apiToken`) despite the doc claiming full
  determinism; patterns are now explicitly documented and matched case-insensitively.

- **`subagent-task-dispatcher` could return control to its caller with a nested dispatch still
  pending.** Observed live during the `SKILL-SURFACE-CONSOLIDATION` story: the dispatcher spawned its
  own implementer, refactor-gate, or spec-check subagent and then ended its own turn before that
  child completed, forcing the orchestrator one level up to catch the child's result out-of-band and
  manually re-resume the dispatcher — four separate times across ten tasks. `plugins/arcus/agents/subagent-task-dispatcher.md`
  now carries an explicit **"Block on every dispatch"** rule: every subagent this protocol spawns
  (Step 3's implementer, Step 6's refactor gate, Step 7's spec-compliance check) must be invoked
  synchronously and awaited before the protocol proceeds. Prompt-only change; no other file touched.

- **Test Plan and Closure dispatched the wrapper skill instead of the sibling agent, so the agent's
  narrower `tools:` allowlist never bound — and the gate meant to catch this couldn't see it either.**
  `arcus-controller/SKILL.md`'s Test Plan (`:229`) and Closure (`:278`) stages read "Read and follow
  the `arcus:<name>` skill…", routing through `test-spec-compiler`/`pull-request-builder`'s wrapper
  instead of the registered agent, so the agent's declared `tools: Read, Grep, Glob, Write, Skill`
  never took effect and the stage ran with the parent's full toolset. Both stages now use the
  `**Agent**: <name>, resolved per **Agent Resolution** in `arcus:model-strategy`` form already
  correct at Context Sync (`:266`); the wrapper skills' own bodies (`skills/test-spec-compiler/SKILL.md`,
  `skills/pull-request-builder/SKILL.md`) stop contradicting themselves — "read and follow the
  `arcus:<name>` agent" now dispatches by bare name, mirroring `context-drift-sync`'s correct wording.
  The wrappers stay organically invocable; `corpus.json`'s five positive trigger cases are untouched.

  Separately, **L1-14/L1-15 missed exactly this class of dispatch for the three dual-surface wrapper
  agents** (`test-spec-compiler`, `pull-request-builder`, `context-drift-sync`): `pureAgentNames`
  excluded them so a **skill** reference stayed legal, but the same filter also hid an **imperative
  agent dispatch** of the twin as `arcus:<name>`. The input set passed to `checkAgentRefQualified` /
  `checkAgentDispatchPortable` is now the full `walkAgents()` name set (both checks fire only on an
  imperative lead-in, so prose stays unflagged), derived once in a new `tests/lib/skills.mjs` helper
  and consumed by `unit.mjs` and the two previously-duplicated sites in `integration.mjs`.

- **`$ARCUS_HOME` was unresolved wherever a dispatched subagent's prompt cited it, and nothing caught
  it.** Three agent bodies and four skills referenced `"$ARCUS_HOME"/…` with no resolution
  instruction, and the shared "Dispatching an ARCUS agent" block told the *parent* to embed the
  literal variable in a *child* prompt — a spawned subagent has no such variable and no `.arcus/env`
  instruction, which is exactly how an agent ends up improvising a filesystem-wide `find /`. The
  canonical `.arcus/env` resolution clause is now added to
  `agents/{test-spec-compiler,pull-request-builder,subagent-task-dispatcher}.md` and
  `skills/{code-reviewer,kick-off,context-drift-sync,repo-agentifier}/SKILL.md`, and the shared
  dispatch block now requires expanding `$ARCUS_HOME` to an absolute path before it reaches a child
  prompt.

  New **L1-19 `checkArcusHomeResolvable`** makes the omission structural rather than reliant on the
  next author remembering it, flagging any body mentioning `$ARCUS_HOME` without the resolution
  clause. Wired with the repo's two-assertion pattern (planted-bad fixture plus live-tree sweep) and
  folds into the planted-violation coverage map, now `L1-1`..`L1-19`.

- **OpenCode's converter silently dropped `Task`/`Skill` grants instead of failing.** `buildPermission`
  mapped only `{Read, Grep, Glob, Bash, Write, Edit}`; `subagent-task-dispatcher.md` declares `Task,
  Skill` too, and those two grants vanished from the bundled `permission:` block with no warning.
  Verified against the exact pinned `@opencode-ai/sdk@1.17.11`: both `Config.permission` and
  `AgentConfig.permission` are a closed five-key schema (`edit`, `bash`, `webfetch`, `doom_loop`,
  `external_directory`) with no `task`/`skill` key at all — a **confirmed-absent** equivalent, not
  merely an unverified one. `buildPermission` now throws on any declared tool with no known mapping,
  and a new `NO_PERMISSION_EQUIVALENT` set names `Task`/`Skill` as the one evidence-backed, deliberate
  omission. First dedicated unit coverage added for `buildPermission`.

- **`authoring-style.md` claimed the dispatch tree "stays depth-1", which the hot path already
  contradicts** — `implementation-runner` dispatches `subagent-task-dispatcher`, itself an
  orchestrator holding `Task`. Corrected to "depth ≤ 2, with `subagent-task-dispatcher` as the single
  sanctioned second level", and swept into `.context/design-and-coding-patterns.md` so the claim
  isn't split across files (`AGENTS.md` carries no depth claim, so nothing there needed changing).
  The surrounding anti-pattern guidance against nesting further is unchanged.

- **`agents/spec-compliance-reviewer.md` cited "the dispatcher's Step 6" for the per-task spec check;
  the per-task check is Step 7 (Step 6 is the Refactor Gate).** Corrected the off-by-one reference.

### Changed

- **`code-reviewer`'s branch diff now reaches its five specialists by value, with an explicit paging
  rule for large diffs.** Step 1 additionally writes the noise-filtered unified diff to
  `<STORY_DIR>/change.diff` (after the existing noise-drop rules, never dropping migrations); Step 3
  inlines it in each specialist's prompt when ≤ 1500 lines, else passes the path plus the changed-file
  list with an instruction to page it in ≤ 1500-line `Read` chunks until EOF — a deliberate margin
  under `Read`'s 2000-line truncation. This is not the previously-dropped "diff by reference":
  reviewers still receive the diff itself, never a bare filename list. Each of the five reviewer agent
  bodies gains an additive `change_set` Inputs line documenting the by-value contract; no
  `tools:`/`disallowedTools:` changed.

- **Deleted `## Architecture & Safety` from the plan template.** Its three bullets (Design Patterns,
  Security Considerations, Cleanup/Technical Debt) duplicated `.context/design-and-coding-patterns.md`
  and were never a required section per `tests/schemas/artifacts.json` (`checkArtifactSections` is
  unaffected). `implementation-planner/SKILL.md:67`'s dangling cross-reference to the section is
  reworded to stand on its own four scoring axes; security coverage is unchanged —
  `security-reviewer` already reviews the branch diff at Code Review.

- **`test-plan.md`'s Detailed Test Matrix is now task-keyed instead of category-keyed.** The four
  category subsections (`### 1. Functional (Happy Path)` … `### 4. Regression / Integration`) are
  replaced by one `### Task N: <title>` subsection per plan task (plus a closing `### All Tasks` for
  cross-cutting regression), each carrying a case table with a `Category` column (`Happy Path` /
  `Edge Case` / `Error Case` / `Regression`) so no coverage class is lost. `## Objective`,
  `## Task-to-Test Mapping Matrix` and `## Test Implementation Assets` keep their names and roles —
  `artifacts.json` is unchanged. `subagent-task-dispatcher.md`'s per-task test extraction is repointed
  at this deterministic `### Task N:` anchor instead of grepping prose for a `Mapped to **Task N**:`
  format the model had invented; `test-spec-compiler/SKILL.md` and `agents/test-spec-compiler.md` are
  updated in lockstep so producer and consumer name the same anchor.

### Added

- **`model-strategy` gains an Effort Resolution subsection, and `code-reviewer`'s fan-out now states a
  reviewer effort explicitly instead of inheriting the session default.** Only Copilot CLI's `task`
  tool has a real per-dispatch `reasoning_effort` parameter; Claude Code and VS Code carry the intent
  as a brevity/thinking-budget directive in the dispatch prompt instead (naming the host on the same
  line, keeping L1-16 satisfied), and OpenCode cannot set it per dispatch at all.
  `code-reviewer/SKILL.md`'s Step 3 table gains an `Effort` column: `low` for
  `spec-compliance-reviewer`, `code-quality-reviewer`, `performance-reviewer` and
  `history-context-reviewer` (grounded in the measured run where `spec-compliance-reviewer` spent
  $0.815 of output for the worst chars-per-dollar ratio), `medium` for `security-reviewer` (a missed
  vulnerability is not symmetric with a missed style nit). Model tier (`medium` for all five) is
  unchanged — effort and tier are kept as separate, independently measurable levers.

- **Cache-TTL thrash spike closed with a no-go verdict — no plugin file changed.** Investigated
  whether any supported host (Claude Code, Copilot CLI, VS Code Copilot Chat, OpenCode) exposes a
  cache-TTL or context-shedding control that ARCUS could set from a skill/agent body or a dispatch
  parameter, targeting the $1.93/14% idle-cache-write line item from the JOI-101 dogfooding run. None
  does: the only such control anywhere in the stack (`cache_control.ttl` on the raw Messages API) is
  owned by the host's own client runtime, one layer below anything a skill, agent body, or the
  `Agent`/`task`/`runSubagent` dispatch call can reach. `@opencode-ai/sdk@1.17.11`'s permission schema
  was separately confirmed closed with five keys and no `task`/`skill` key either (see the
  `buildPermission` fix above) — reinforcing that no host exposes a plugin-settable knob at this
  layer. Findings, evidence, and the one open thread (Copilot CLI's undocumented `context_tier`
  parameter, unverified against upstream docs) are recorded in
  `.arcus/specs/ARC-0308/cache-ttl-findings.md`. Per the binding exit criterion, the $1.93 line item
  is accepted as a structural host-runtime cost rather than an ARCUS defect, and `arcus-controller` is
  not redesigned for context-shedding as part of this story.

- **Eval specs added for the five highest dispatch-authority items that had none**:
  `subagent-task-dispatcher`, `arcus-controller`, `code-reviewer`, `implementation-runner`, `kick-off`
  (`tests/e2e/evals/specs/<name>/evals.json`). L1-12 (`checkCapabilityHasEvalSpec`) gates
  `layer: capability` only and stays unchanged — these five are orchestrators/coordinators, exempt
  from the gate but not from coverage. The new specs pass the zero-token eval-spec lint; the live
  evals themselves remain manual and excluded from `pnpm test`.

- **Opportunistic hardening (not part of this story's planned scope, called out explicitly per code
  review): a drift guard for `model-strategy`'s per-host model-identifier table.** Cross-checks
  `model-strategy/SKILL.md`'s Tier-to-Platform table against `convert.mjs`'s `TIER_TO_MODEL` so the
  two can't silently diverge. Test-only; touches no runtime file; not tied to any L1 check number.

### Changed

- **Copyright and trademark ownership corrected to Piyush Bhargava.** The `LICENSE` appendix,
  `NOTICE`, `TRADEMARK.md`, the docs footer, and the `author`/`owner` fields surfaced in plugin
  UIs all carried a stale attribution naming a party unrelated to this project. That is exactly
  the attribution the Apache-2.0 §6 trademark reservation depends on being correct, so it is
  fixed everywhere it appears. Also removed vestigial `metadata.team` frontmatter from
  `simplify-and-verify` and `review-consolidator` (read by nothing; only 2 of 16 agents carried
  it) and stale cross-project references in two `site/` theme source comments.

- **Split the README in two.** `README.md` and the public repo's README were the same file, so
  the private source repo shipped install instructions and told its own maintainer that "this
  repository is generated" — false where it was being read. `README.dist.md` is now the source
  of the public `README.md` (install, usage, uninstall, contributing), and `README.md` is
  private and dev-facing: the split, the dist pipeline, the deploy key, the versioning contract,
  and why the prompts cannot be withheld. Same `to:` relocation mechanism `dist-workflows/`
  already uses, for the same reason — whoever opens `README.md` in either repo gets the one
  written for that repo.

- **The public `arcus-plugin` repo is now a generated distribution**, built from a private source
  repo and pushed by CI. `README.md` gained a **Contributing** section saying so plainly, because
  the repo is public and Apache-2.0 — silently overwriting a stranger's pull request on the next
  publish would be a hostile way to find that out. Issues are the route in. The Local-development
  and Versioning sections were corrected to describe the flow that actually runs; they still
  described editing and releasing straight from this repo.
  The withheld half is development scaffolding only (test suite, eval specs, trigger corpus,
  internal notes) — every skill prompt, agent, and helper script the plugin *runs* still ships.

- **Relicensed from MIT to Apache-2.0.** MIT granted anyone the right to fork, rebrand, and resell
  ARCUS with no obligation and — critically — said nothing about the name. Apache-2.0 keeps ARCUS
  fully open and OSI-approved (so enterprise legal and curated marketplaces still clear it) while
  adding an express patent grant, a patent-retaliation clause, mandatory `NOTICE` propagation, and
  §6, which explicitly withholds trademark rights. The `license` field is now `Apache-2.0` in
  `plugins/arcus/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and
  `plugins/arcus-opencode/package.json`.
  Releases up to and including **v2.9.1 remain MIT** on their original terms; Apache-2.0 applies
  from v2.9.2 onward.

### Fixed

- **A docs-only change could deadlock the release pipeline.** The publish-time version guard
  required a bump whenever *any* dist content differed from what was published, but the PR-time
  guard only fires on `plugins/arcus/**`. A `site/`-only pull request therefore merged green and
  then failed at publish, blocking `main` until someone pushed an unrelated bump. The publish
  guard is now scoped to the **installed** surface (`plugins/`), which is what `version` actually
  governs — `site/`, `README.md`, `CHANGELOG.md`, and `LICENSE` live at the dist root and are
  never copied into a plugin cache, and the docs deploy from the public repo's own Pages workflow
  independently of `version`. Bumping is still mandatory for anything users install, and a
  backwards version is still rejected either way.

### Added

- **`NOTICE`** — the Apache-2.0 §4(d) attribution notice that downstream redistributions must carry,
  recording the copyright, the trademark reservation, and the MIT status of prior releases.
- **`TRADEMARK.md`** — policy for the **ARCUS** name and logo. Nominative use, compatibility claims
  ("works with ARCUS"), and unmodified redistribution are all explicitly permitted; naming a fork or
  a modified build "ARCUS" is not. Forking and commercial use stay unrestricted — under your own name.
- **The `arcus-opencode` tarball now ships `LICENSE` and `NOTICE`.** `build-bundle.mjs` stages both
  from the repo root into the package root (git-ignored derived output, listed in `files`), so the
  OpenCode redistribution satisfies Apache-2.0 §4(a) and §4(d) instead of shipping bare.
- **Docs-site footer** (`site/.vitepress/config.ts`) now states the Apache-2.0 license, the copyright,
  and links the trademark policy, so the licensing terms are visible where users actually read.

### Fixed

- **`model-strategy/SKILL.md` falsely claimed Copilot CLI silently ignores the `model:` frontmatter
  field (C2).** Copilot CLI does not silently ignore it — it warns visibly and falls back when a tier
  word is used instead of a valid slug. The narrower, accurate rule is now documented: tier words
  fail loudly; a valid slug is honoured. Corrected in `plugins/arcus/skills/model-strategy/SKILL.md`,
  `site/concepts/cross-host.md`, `plugins/arcus/agents.md`, and the `tests/lib/checks.mjs` L1-17
  comment.

- **`model-strategy/SKILL.md` carried authoring-time guidance about Copilot CLI `Skill`/`sql` auto-grants (C3).** While this guidance is accurate, it belongs in authoring-time documentation, not in a runtime substrate skill. The correction relocates it to its canonical home, `site/concepts/cross-host.md`, and updates the `tests/lib/checks.mjs` comment to match.

- **`model-strategy/SKILL.md` was 221 lines of mixed authoring-time and runtime content.** The file
  is now 94 lines, focused on the runtime decision a model needs to make. Authoring-time tables,
  platform-specific traps, and cross-host tool-name mappings were relocated to their canonical homes
  (`site/concepts/cross-host.md`, `plugins/arcus/agents.md`) — nothing was deleted outright.

- **Worktree-backed sessions could not bootstrap at all, and reported success while doing it.**
  `bootstrap.sh` gated staging on `[ ! -d "$WORKSPACE_ROOT/.git" ]`. In a git **worktree** `.git` is
  a *file* containing a `gitdir:` pointer, not a directory — so the guard was true, the bootstrap
  exited `0` having staged nothing, and every subsequent `.arcus/bin/*` call died with
  `No such file or directory` with nothing pointing back at the cause. This blocked the entire
  pipeline on every worktree session, which is the default workspace shape for several agent hosts.
  The guard is now `git rev-parse --git-dir`, which covers worktrees, submodules and `$GIT_DIR`
  overrides uniformly.

  Three related silent-failure paths closed at the same time:
  - `locate.sh` discarded bootstrap's result and only checked that the script existed, so it printed
    a valid `ARCUS_HOME` and exited `0` over a workspace that was never staged. It now verifies the
    **post-condition** — `.arcus/bin/checkpoint.sh` and `.arcus/env` must exist — and fails loudly
    otherwise.
  - `bootstrap.sh` derived `ARCUS_HOME` from `BASH_SOURCE` without validating it, so a copy run from
    elsewhere resolved it to that copy's parent (`/` in the reported case) and produced an **empty**
    `.arcus/bin/` plus an `.arcus/env` pointing at nothing. It now validates the derived root, falls
    back to an exported `ARCUS_HOME`, and refuses to run rather than stage nothing.
  - Staging now targets `git rev-parse --show-toplevel` instead of the raw cwd, so invoking the
    bootstrap from a subdirectory no longer scatters an unused `.arcus/` tree there.

- **`checkpoint.sh set-tasks` left `current_stage` naming a stage later than the work it had just
  spliced in.** Task slots are seeded only after the plan is compiled, so a `branch` stage completed
  before then advanced `current_stage` straight to `code_review` — the checkpoint claimed the
  pipeline was at review while every task was still pending. `set-tasks` now re-points
  `current_stage` at the first incomplete stage. Cosmetic before this release; load-bearing now that
  branch adoption completes `branch` during scaffold.

- **The post-GREEN refactor gate could modify code the grounded spec explicitly excluded.**
  `simplify-and-verify`'s scope boundary was the *file* — but almost every changed file also contains
  code that predates the task. With green tests as its only safety check, the gate simplified a
  pre-existing, spec-`Excluded` method and the change rode into a task commit scoped to something
  else. The boundary is now the **mutable region**: in-scope files *intersected with* the code the
  task actually added or modified, minus anything named in `excluded_scope`. Out-of-region
  opportunities are reported as `Deferred:` notes instead of applied. `subagent-task-dispatcher` now
  passes `task_diff` and `excluded_scope` so the gate can compute that region.

- **`pull-request-builder` produced PR descriptions roughly 1:1 with their own diff** (364 lines /
  20 KB for a 311-line change), restating every acceptance criterion, all 19 test cases in a table,
  per-file line ranges, and every spec decision with rationale — unusable without a manual rewrite.
  It now works to an explicit **≤ 80 line / ≤ 4 KB budget** and a "what a reviewer needs, not what
  the pipeline did" framing, referencing `plan.md` / `test-plan.md` / `review.md` rather than
  duplicating them. The PR template drops the `Implementation Stats` / agent-metrics section
  entirely.

### Added

- **`scaffold.sh` adopts the session branch in a linked git worktree** instead of planning a fresh
  `arcus/<STORY_ID>-N` off it. Agent-session hosts check the workspace out on a dedicated branch and
  bind PR tracking to it; branching off that branch stranded the story from the PR. On adoption the
  current branch is recorded as `branch_name`, `base_branch` resolves to the repository default
  (`origin/HEAD` → `main` → `master` — an adopted branch cannot be its own base without producing a
  self-targeting PR), and the `branch` stage is pre-completed so Implementation skips branch
  creation. `branch.sh` no-ops if called anyway.

  Detection is narrow — a *linked worktree* on a *non-default* branch. A normal checkout that merely
  sits on a feature branch is **not** adopted and keeps basing the story on the current working
  branch, so deliberate stacking is unaffected. New overrides: `--use-current-branch` (or
  `ARCUS_USE_CURRENT_BRANCH=1`) to adopt anywhere, `--new-branch` (or `ARCUS_USE_CURRENT_BRANCH=0`)
  to always plan. `scaffold.sh` and `branch.sh` now echo `BRANCH_MODE: new|adopted|existing`.

- **`scripts/lib/git_context.sh`** — a source-safe shared library defining `is_linked_worktree`,
  `repo_default_branch` and `current_branch`, following the same resolution convention as
  `lib/branch_name.sh`. `repo_default_branch` reports **unknown** (empty, non-zero) rather than
  falling back to the current branch: callers ask it precisely in order to compare against — or
  avoid — the current branch, so answering "the current branch" makes them silently wrong instead of
  visibly unknown.

- **`scripts/tests/bootstrap.test.sh` and `scripts/tests/scaffold.test.sh`** — 75 new bash
  assertions covering worktree staging, the stray-`ARCUS_HOME` trap, subdirectory invocation,
  loud-failure paths, both branch modes, every override flag, the default-branch fallback chain, and
  the invariant that an adopted branch is never its own base.

### Fixed

- **Every ARCUS agent is now dispatchable on GitHub Copilot CLI — previously none were, and the
  `model-strategy` skill was unloadable on _every_ host.**
  All 16 agents (and the `model-strategy` skill) carried `disable-model-invocation: true`. Copilot
  CLI **honours** that field on **both** surfaces by removing the item from its registry outright, so
  `task(agent_type="arcus-plugin:security-reviewer")` had nothing to resolve. Claude Code ignores it
  on **agents** — which is why the agent bug stayed invisible — but **honours it on skills**, so
  `model-strategy`, the substrate that owns tier→model resolution and the Agent Resolution rule and
  which 30 references point at, failed to load on Claude Code too. Measured before the fix: **0 of
  16** agents present in Copilot CLI's `agent_type` enum, `arcus:model-strategy` returning
  `CANNOT-LOAD` on Copilot CLI and absent from Claude Code's skill list (12 of 13 visible); after:
  **16 of 16**, and the skill loads on both.

  The intent behind the flag — *these agents are dispatched by an orchestrator, never picked
  organically* — is sound, but the flag cannot express it: **orchestrated dispatch _is_ model
  invocation**, the identical tool call from the identical caller, so opting out of one opts out of
  both. That property is instead carried by `user-invocable: false` (kept), membership in the
  `DISPATCHED_ONLY` roster, and orchestration-scoped `description:` text — all of which already
  existed and are enforced by L4-1.

  **This also restores the read-only guarantee on the advisory reviewers.** Undispatchable agents
  had to be run as generic subagents, which carry no frontmatter and therefore no `tools:`
  restriction — so `security-reviewer` silently inherited the full session toolset including `edit`.
  Verified after the fix: a dispatched `arcus-plugin:security-reviewer` reports exactly
  `bash, read_bash, stop_bash, list_bash, view, grep, glob` — no write tool of any kind.

  **Supersedes the earlier claim that "GitHub Copilot CLI has no agent registry".** It does, it
  namespaces plugin agents `<plugin>:<agent>` exactly as Claude Code does, and it enforces `tools:`
  frontmatter. ARCUS had misdiagnosed its own frontmatter bug as a host limitation. Remaining
  genuine gap: Copilot CLI ignores tier words in frontmatter `model:`, silently falling back to the
  session model.

- **Two agents were told to consult a skill they had no tool to load.** `test-spec-compiler`
  ("use the guardrail heuristics in the `arcus:model-strategy` skill") and
  `subagent-task-dispatcher` ("look up the complexity-to-model mapping in the `arcus:model-strategy`
  skill" — the Implementation loop's entire model resolution) both declared allowlists without
  `Skill`. `tools:` is an allowlist, so neither could reach it. Measured on Copilot CLI with a
  purpose-built probe: `tools: Read, Skill` yields `view, skill` and loads the skill correctly;
  `tools: Read, Grep, Glob` yields `view, grep, glob` and the agent replies that it has no tool for
  loading skills — then answers from whatever is already in its prompt rather than failing. Both
  agents now declare `Skill`, and **L1-17** (`checkSkillLoadCapability`) keeps it true. It flags only
  load-shaped references (`... in the arcus:x skill`), not the provenance prose ARCUS bodies are full
  of (`runs as part of the arcus:code-reviewer fan-out`), so it stays useful rather than noisy.

- **`arcus:` references in `description:` were never checked.** L1-7 scanned bodies only, while nine
  agents carry their provenance ref in the description (`Dispatched by arcus:code-reviewer`) — a
  field that is not part of the body, and that hosts read for autonomous selection. A rename would
  have left every one of them dangling with nothing to notice. L1-7 now scans both.

- **Route 2 (registry-less dispatch) was never measured — now it is, and its tool restrictions are
  confirmed advisory only.** Measured on Copilot CLI: the fallback resolves and runs correctly, but a
  generic subagent handed a spec declaring `tools: Read, Grep, Glob` reported having `bash`,
  `apply_patch`, `task`, `skill` and twenty more. **The spec's `tools:` is not enforced at all.**
  Route 2 is a graceful degradation for reachability, not a security boundary — which makes route 1
  (a real registry entry, where the host enforces the allowlist) the only place the read-only
  reviewer guarantee actually holds. Documented as such.

- **`Skill` added to the measured tool-name mapping table**, and route 2's restricted-tools case now
  records that ARCUS prevents it by construction via L1-17 rather than leaving it as a live hazard.

- **The OpenCode bundler no longer silently ships an empty tarball when the repo is reached through
  a symlink.** `build-bundle.mjs` guarded its `main()` call with an `isMain` check comparing
  `import.meta.url` against `process.argv[1]`; those two strings disagree whenever any path segment
  is a symlink (a `/tmp` build, a pnpm store, a macOS `/var` path), so `prepack` ran the module,
  built nothing, and **exited 0**. Fixed structurally rather than patched: the pure converters moved
  to `plugins/arcus-opencode/scripts/lib/convert.mjs` so the unit tests can import them without
  triggering a build, and the entrypoint now calls `main()` unconditionally with no guard to get
  wrong. Verified from both a normal and a symlinked path.

- **L1-17 no longer misses the exact phrasing it was written to catch.** The gate only fired when a
  skill reference was followed by the literal word "skill", but ARCUS's own dispatch boilerplate ends
  with a section pointer — `` `arcus:model-strategy` § Agent Resolution`` — and so slipped through,
  as did "consult", "see" and "refer to". It also mis-read the hyphen in `built-in` as the
  introducer "in". The gate now recognises all four shapes, is anchored so `built-in` cannot match,
  and accepts an optional skill-name set so *agent* references (L1-15's job, which needs a dispatch
  tool rather than `Skill`) are no longer swept in.

- **The L1-16 negative control was vacuous.** Its fixture contained no host-specific tool name at
  all, so it passed for the wrong reason and would have kept passing if the backtick anchor were
  deleted. The fixture now carries the bare token `get_errors` in prose, making the anchor
  load-bearing; verified by mutation — removing the anchor now fails exactly that assertion.

### Changed

- **The `Bash` / `Grep` / `Glob` interaction is now measured on both hosts, not just one.** A review
  flagged the five agents that pair `Bash` with `Grep`/`Glob` as carrying dead allowlist entries,
  since Claude Code resolves `Read, Grep, Glob, Bash` to only `Read, Bash`. Probing Copilot CLI with
  the identical frontmatter returned `bash, read_bash, stop_bash, list_bash, view, grep, glob` — all
  of them. The entries are therefore **live on Copilot CLI and inert only on Claude Code**, and
  removing them would have stripped real capability on one host to tidy a no-op on the other. Kept,
  with the host asymmetry now documented in `model-strategy`, `agents.md` and the cross-host page.

- **New docs page: `site/concepts/cross-host.md` ("Running Across Hosts").** Collects the measured
  cross-host record in one place: the per-field × per-host enforcement table, agent/skill namespacing,
  the tool-name mapping and its two traps, the two dispatch routes and when route 2 applies, the
  OpenCode build-time translation, and the hooks situation. It opens with the failure mode that
  produced every bug in this cycle — *a field that reads as a guarantee and does nothing, with no
  error anywhere* — and the table of seven real instances. Linked from the sidebar, from
  `how-it-works`, and from `AGENTS.md`, which now tells contributors to read it **before** changing
  agent frontmatter.

- **Corrected a stale comic quiz answer and hook panel.** The quiz asserted that "Copilot CLI reads
  hooks from `.github/hooks/` in a different schema" — disproven earlier in this cycle: Copilot CLI
  does auto-discover a plugin's `hooks/hooks.json` and does normalize PascalCase event names, and why
  ARCUS's hooks do not fire there remains unexplained. Exhibit E's "other hosts wire hooks
  differently" was corrected to match. No other comic content was invalidated — it makes no
  read-only or registry claims.

- **The OpenCode adapter no longer leaks a shell to the read-only reviewers — the same hole, on the
  third host.** OpenCode treats an **absent** `permission:` key as *allowed*, and the bundler emitted
  only the keys an agent was granted. So `tools: Read, Grep, Glob` bundled to
  `{read, glob, grep: allow}` with `bash` unspecified — allowed — and a shell writes by redirection.
  `security-reviewer` even declared `disallowedTools: …, Bash` in source and the bundler dropped it
  on the floor. The permission block is now **deny-by-default**: the allowlist is authoritative, every
  key ARCUS knows about is emitted explicitly `allow` or `deny`, and a `disallowedTools` entry always
  wins so the two can never contradict. Measured after: all four advisory reviewers bundle to
  `bash: deny, edit: deny`; `subagent-task-dispatcher` keeps `bash: allow` because it must run
  verification. When an agent declares no `tools:` at all nothing is inferred, rather than guessing
  it into uselessness.

  The adapter had **zero test coverage**, which is why this survived. `build-bundle.mjs` now guards
  its own entry point and exports its pure converters, and the harness asserts the deny-by-default
  behaviour, the denylist override, every advisory reviewer's bundled permissions, and that
  `TIER_TO_MODEL` still matches the OpenCode column of the `model-strategy` table — a silent drift
  there would repoint every bundled agent's model.

- **Prompts no longer instruct tools that only one host provides — and a gate (L1-16) keeps it that
  way.** `subagent-task-dispatcher` and its dispatch template both hard-instructed `get_errors`, a
  **VS Code Copilot Chat** tool that exists on neither Claude Code nor Copilot CLI. The failure mode
  is the dangerous one: the model does not error on an unknown tool, it skips the step — so a
  verification instruction quietly became a no-op on the two hosts ARCUS actually runs on. Both now
  instruct the **capability** ("run the repository's own lint and type-check commands"), which every
  host resolves against whatever tooling it has.

  L1-16 flags backtick-quoted host-specific tool names (`get_errors`, `runSubagent`,
  `run_in_terminal`, `insert_edit_into_file`, `semantic_search`) in skill, agent **and
  `agent-resources/` template** bodies — the original offender lived in a template, which no
  previous gate walked, even though templates are dispatched verbatim as subagent prompts. An
  occurrence that names its owning host on the same line is documentation, not an instruction, so
  the cross-host matrix rows still pass.

  This is the third member of the same silent-degradation family found in this cycle, after
  `disable-model-invocation` (a flag that read as a guarantee and removed the agent) and kebab-case
  `disallowed-tools` (a denylist that never fired). In all three, nothing happened and nothing said
  so.

- **`subagent-task-dispatcher` regained a shell.** The tool-restriction pass above gave it
  `tools: Read, Grep, Glob` while its Step 5 still says "run the test suite" — an instruction it had
  no way to carry out. Corrected to `Read, Grep, Glob, Bash, Task`: it is an orchestrator that must
  both spawn workers and run verification, not an advisory reviewer.

- **The advisory reviewers are now actually read-only.** They carried
  `disallowed-tools: Edit, Write, MultiEdit` alongside `tools: Read, Grep, Glob, Bash`, which
  guaranteed nothing twice over. Measured on Claude Code: (1) the kebab-case spelling is **silently
  ignored** — only `disallowedTools` is honoured, so the denylist never fired in ARCUS's entire
  history; (2) even honoured, it is cosmetic next to `Bash`, because an agent with no `Write` tool
  still created a file with `printf x > f`. A shell writes by redirection, rewrites history with
  `git commit`, and deletes with `rm`.

  `Bash` is dropped from `security-reviewer`, `performance-reviewer`, `code-quality-reviewer` and
  `spec-compliance-reviewer`, and every denylist is renamed to `disallowedTools`. This costs those
  reviewers nothing: `change_set` was already a declared **input** the `code-reviewer` coordinator
  assembles and passes. Verified after the change on Copilot CLI — a dispatched agent with
  `tools: Read, Grep, Glob` reports exactly `view, grep, glob` and cannot produce a file by any
  means.

  It also makes them **more** capable on Claude Code, not less: with `Bash` present that host drops
  `Grep`/`Glob` from the agent, so `Read, Grep, Glob` yields all three where
  `Read, Grep, Glob, Bash` yielded only `Read, Bash`.

  `history-context-reviewer` keeps `Bash` as the one documented exception — its `git log` / `git
  blame` archaeology is chosen per changed file as it reads and cannot be pre-supplied as an input.
  It is recorded in `SHELL_EXEMPT` with that rationale; its read-only-ness is trusted, not enforced.
- **All 16 agents now declare a `tools:` allowlist.** Seven had none
  (`context-pack-builder`, `pull-request-builder`, `review-consolidator`, `simplify-and-verify`,
  `test-spec-compiler`, `context-drift-sync`, `subagent-task-dispatcher`) and so inherited the full
  session toolset — including `Edit` and `Write` — on every host.
- **L1-4 now rejects indirect writes and the inert spelling.** `INDIRECT_WRITE_TOOLS` covers shells
  and dispatch tools (a dispatcher can spawn a writer); kebab-case `disallowed-tools` is a hard
  fail with a pointer to the camelCase form.
- **`model-strategy` documents the measured `tools:` name mapping** across Claude Code and Copilot
  CLI, plus the two authoring traps: unknown names are dropped silently, and listing `Bash`
  suppresses `Grep`/`Glob` on Claude Code.
- The OpenCode bundle builder reads `disallowedTools`, still falling back to the kebab spelling.

- **L1-4 (advisory reviewers are read-only) is now allowlist-first.** It no longer requires
  `disable-model-invocation`; it requires a `tools:` allowlist naming no write-capable tool — the
  half every host actually enforces — while still requiring `disallowed-tools ⊇ [Edit, Write,
  MultiEdit]` as defence-in-depth on Claude Code.
- **L1-13 now rejects `disable-model-invocation` on any agent**, so the regression cannot return
  silently on the host where it is inert.
- `parseFrontmatter` parses `tools:` into an array, consistent with `allowed-tools` /
  `disallowed-tools`.
- **The `arcus:<name>` warning is stated once instead of seven times.** The seven duplicated
  "Dispatching an ARCUS agent" blockquotes now carry only the positive instruction and point at
  `arcus:model-strategy` § Agent Resolution; the prohibition itself lives there alone. The
  duplication existed because a probe told to read `model-strategy` got "not found" — a direct
  consequence of the `disable-model-invocation` bug fixed above, so its justification is void.
- **`model-strategy` § Agent Resolution now states the namespace positively**, as a measured
  Claude Code × Copilot CLI table for agents and skills, replacing the bare prohibition. It records
  the asymmetry that motivates the token at all: agents resolve as `arcus-plugin:<name>` on both
  hosts, but skills are `arcus-plugin:<name>` on Claude Code and **bare `<name>`** on Copilot CLI —
  so no single literal is correct for a skill on both, which is why ARCUS prose uses the
  host-neutral `arcus:<name>` and converts at dispatch.
- **`agents.md` canonical frontmatter no longer tells authors to set `disable-model-invocation`**,
  which L1-13 now rejects, and its packaging note no longer implies Copilot CLI needs a separate
  agent dialect.

- **A repository that forbids Actions from opening pull requests no longer strands a finished story.**
  `Allow GitHub Actions to create and approve pull requests` is off by default, so `gh pr create`
  fails at `closure` with a GraphQL permission error — after the branch is pushed and the PR body is
  written. The work was complete; only the button was unpressable, and the run reported a bare
  "closure failed".

  `pr.sh` now recognises that specific error and exits `3` with a **prefilled compare link**
  (`PR_MANUAL_URL`), and the status comment renders it as a one-click call to action alongside the
  setting to change so ARCUS can do it itself next time. Any other `gh` failure still exits `1`.

### Fixed

- **The story branch is pushed while a run is in flight, not only at `closure`.** Nothing reached the
  remote until the very end: `branch.sh` creates the branch locally, `commit.sh` commits to it
  locally, and `pr.sh` performs the *first* push. So a timeout or cancel during Implementation threw
  away every generated commit — an hour of code, not just bookkeeping — and there was nowhere to look
  at the work while it ran. The background pusher now pushes the branch each tick (and a final
  `always()` step catches a failed run). It uses `GITHUB_TOKEN`, which triggers no workflows, so an
  in-progress branch cannot spam the target repo's CI.

- **State is checkpointed to `arcus-state` while a run is in flight, not only at the end.** A single
  push at job end meant a timeout, cancel or OOM discarded every artifact, and the next run redid
  finished work — per-task commits survive on the story branch, but the checkpoint recording *what*
  finished did not. With the timeout now at 90 minutes and Implementation running unattended, that is
  an hour of work on one interruption. A background pusher checkpoints every 45s when the workspace
  has changed, hashing the directory so an idle tick costs nothing, and is stopped before the final
  push so it cannot race over the shared `.arcus/.state-wt` worktree. Long runs are now observable
  from the branch as they go.

- **`version-guard` covers the reusable workflow.** `arcus-pipeline.yml` is consumed by target repos
  via `uses: …@v2`, and that tag only moves when `plugin.json` does — so a workflow-only change was
  invisible to every caller until some unrelated bump happened to ship it. The guard now requires a
  version bump when the workflow changes too.

### Added

- **The cloud pipeline runs a labelled issue all the way to a pull request.** It stops only when a
  stage records open questions; answering them on the issue resumes it, and it continues through
  test plan, branch, tasks, review, context sync and closure without further input.

  `brainstorm-prompt.md` is renamed `fresh-prompt.md` and both CI prompts now name the three stopping
  conditions explicitly — open questions recorded, `closure` reached, or a stage failed twice — rather
  than capping the pipeline at a phase group. Job timeout 45 → 90 minutes.

  A **status comment** is posted when a run ends without questions, carrying the checkpoint status,
  the stage, and the PR link. Without it the only signal was the Actions tab.

  Known limitation: the PR is created with `GITHUB_TOKEN`, which by design does not trigger further
  workflows — so it arrives with **no CI checks**. Closing and reopening it (as yourself) runs them.
  The optional `ARCUS_APP_ID`/`ARCUS_APP_PRIVATE_KEY` seam remains the way to get checks
  automatically.

### Changed

- **Skills and docs describe the current design, not its history.** Several passages explained what
  ARCUS *used to* do and why it changed — "the gates were removed", "no longer asks first", "parked
  at a gate that no longer exists". Skills are prompts: archaeology spends tokens on something the
  model cannot act on, and naming a removed concept keeps it in context where it can be
  reintroduced. It also reads as a puzzle to anyone who never saw the old behaviour. Rewritten to
  state what is, dropping ~35 lines. The changelog is where the history belongs.

### Fixed

- **`implementation-runner` still halted before Code Review.** Removing the phase-group gates was a
  two-part job — delete the emission *and* delete the instruction that causes the stop — and the
  first pass only did the first half here: an Execution Modes table still read *"Run the loop, then
  **STOP** at the Handoff gate"*. Caught by a real run that implemented every task and then parked.
  A new static check now fails the build on the removed gate vocabulary (`[Handoff]`,
  `Proceed? Reply`, `STOP at the Handoff`), so a leftover cannot silently reintroduce a gate.

- **`set-status <stage> complete` now advances `current_stage` like `complete <stage>` does.** Two
  paths reached the same state and disagreed: `complete` moved to the next unfinished stage while
  `set-status` left `current_stage` naming the stage just finished — the exact confusion `complete`
  was changed to avoid. Observed live as `current_stage: task_3` with every task complete.

### Changed

- **The phase-group handoff gates are gone. Both modes now run straight through to the pull request.**
  Interactive mode stops in exactly one place: the Brainstorm open questions. Answer them and the
  pipeline runs test plan → branch → tasks → review → context sync → PR without stopping again. If a
  story raises no questions, an interactive run never stops at all — which is correct, because there
  was nothing to decide.

  The gates after Test Plan, Implementation, Code Review and Closure each followed **mechanically
  from a decision the human had already approved**, so they bought no real review and trained people
  to type "yes" without reading — worse than no gate, because it manufactures confidence. The genuine
  decision points are the spec, the approach, and the finished diff: the first two are the
  Open-Questions Protocol, the third is the PR.

  Consequences worth knowing:
  - The two modes now differ in **one** thing — whether Brainstorm surfaces its open questions or
    merely records them.
  - The Code Review loopback runs **automatically in both modes**; it no longer asks first. The
    findings are the reviewer's, the fix-tasks are mechanical, and a human who disagrees reviews the
    result at the PR.
  - **The tradeoff, stated plainly:** a subtly wrong plan now costs a full implementation before you
    see anything. The Brainstorm questions are the mitigation, so the approved plan carries more
    weight than it used to.
  - `awaiting_handoff` keeps its meaning (a stage waiting on a human) but now has exactly one cause.
    A story parked at an old phase gate is **migrated on resume**: with nothing unanswered, the
    status is cleared and the pipeline continues.
  - `implementation-runner` and `code-reviewer` emit milestones instead of handoff blocks; the
    controller still acts on `code-reviewer`'s `VERDICT:` line.

  Locally this loses nothing that stopping the session does not already give you, which is why
  gate-at-every-stage was dropped outright rather than kept as an opt-in mode.

### Added

- **ARCUS cloud, phase 2: replying on the issue resumes the pipeline.** A comment on a labelled issue
  now folds the reply back into the stage that was waiting, records the mapping, and continues.

  **No slash command.** The plan originally specified an explicit `/arcus continue`, but the first
  real cloud run showed the obvious behaviour is to just answer the questions — so any comment from
  a write-access user is treated as the answer. `issue_ingest.sh` exits `3` when there is nothing new,
  and the workflow gates on that **before installing Copilot**, so a "thanks!" or a side discussion
  costs nothing.

  **The workflow is now state-driven**, exactly like `arcus-controller`: it pulls state first and lets
  `current_status` decide between fresh / resume / skip. A label, a comment and a manual dispatch all
  take the same path — no event-kind branching to keep in sync.

  New `issue_ingest.sh` collects comments **since a cursor**, not just the one that triggered the run.
  That matters because GitHub keeps only one pending run per concurrency group: three comments during
  a long run collapse into a single queued run, so the event payload is not the only unprocessed
  comment. It skips bot comments and anything carrying the `arcus:v1` marker — ingesting our own
  question comment would have the pipeline answer itself. Edits are ignored (first read wins);
  honouring them would let a write-access user retroactively change an answer already acted on.

  `checkpoint.sh` gains `set-cursor` and `set-issue`. The cursor advances **at ingest**, not after the
  agent run: `inbox.md` is pushed with the state either way, so the replies are durable, and a failing
  run cannot re-ingest the same comments forever.

### Added

- **ARCUS cloud, phase 1: a labelled GitHub issue runs Brainstorm and posts its open questions back
  as an issue comment.** New reusable workflow `.github/workflows/arcus-pipeline.yml`
  (`on: workflow_call`); a target repo vendors a ~25-line caller. Scope is deliberately narrow —
  scaffold → context_pack → spec_finalizer → plan, then halt. No implementation, no PR, no resume.

  It needed **no new skill and no `channel` field**, because the Brainstorm capabilities already
  write their `## Open Questions` as a machine-readable YAML block at a fixed path. The workflow
  reads that file directly. This is the PR-2 decision to put questions in the artifact rather than
  the return message paying off exactly as argued: *a return-message block cannot survive the cold
  resumes the cloud surface requires.* Transport is therefore fully deterministic — no scraping of
  model prose.

  Three new helper scripts, staged by `bootstrap.sh` like every other:
  - `issue_story.sh` — materializes an issue into `story.md`. **The story id is `ISSUE-<n>`, derived
    from the issue number and never the title**: that value becomes a filesystem path, a git branch
    name, and a `node` argument, so a title-derived id would be a path-traversal and argument-
    injection surface fed by untrusted text. Title and body are rendered via `node`, never through a
    shell.
  - `state_sync.sh` — `pull`/`push` a story workspace to the `arcus-state` **orphan** branch, since
    `.arcus/` is gitignored and runners are ephemeral. Deliberately not the story branch: artifacts
    keep changing after the PR opens, which would push commits onto a branch under review.
    **Never force-pushes** — a non-fast-forward means a concurrent run holds newer state, so it
    aborts rather than clobbering.
  - `questions_comment.sh` — renders unanswered questions as an issue comment. A question is
    unanswered iff its id is absent from `## Dialogue Answers`, keeping one source of truth for
    answered-ness.

  Security posture: the trust boundary is **authorship, not repo visibility** — both the issue author
  and the triggering actor must hold `write`/`admin`, checked against the collaborators API rather
  than the derivable `author_association`. Plus a fork guard, a per-issue `concurrency` group with
  `cancel-in-progress: false` (cancelling mid-stage would leave a half-written artifact
  indistinguishable from a crash), and the issue body reaching the model only by path, framed as data.

- **`version-tags.yml`** — publishes an immutable `v<x.y.z>` tag and moves a floating `v<major>`, so
  callers can pin `uses: …/arcus-pipeline.yml@v2`. Kept separate from `release-opencode-plugin.yml`,
  which early-exits once its own release exists and would otherwise skip tagging too.

- **The Bash test suites now run in CI.** `plugins/arcus/scripts/tests/*.test.sh` were runnable only
  by hand, so 64 checkpoint assertions — including the `mutate_json` injection proof — had never
  been gated by a build. `run-tests.mjs` now discovers and runs them as additional tiers, joined by
  22 new assertions for the cloud scripts (orphan-branch lifecycle, fresh-runner restore,
  answered-question suppression, path-traversal rejection).

### Fixed

- **Agent dispatch now works on GitHub Copilot CLI, and stops wasting a failed tool call on Claude
  Code.** ARCUS instructed dispatching its 13 pure agents as `arcus:<name>` — a form **no host
  resolves**. Verified empirically against both surfaces: Claude Code registers plugin agents under
  the **plugin** name (`arcus-plugin:<name>`), so `arcus:<name>` fails and the model only recovers by
  guessing again; GitHub Copilot CLI has **no agent registry at all** (it exposes `skill(...)` and
  `task(...)` only), so a named agent is unresolvable there outright — the origin of the reported
  `Unknown skill: arcus-plugin:context-pack-builder`.

  Dispatch sites now name agents **bare** and resolve them through a new **Agent Resolution** section
  in `arcus:model-strategy`: prefer the host's registered subagent type, else spawn a generic
  subagent pointed at `$ARCUS_HOME/agents/<name>.md`. Deliberately *not* path-only — the registered
  form is preferred because the host enforces the agent's `tools:`/`disallowed-tools:` frontmatter,
  which is what keeps the advisory reviewers genuinely read-only. `arcus:<name>` remains valid in
  ownership **prose** (it is the token `walkAll()` validates); only imperative dispatch changed.

- **Helper scripts self-heal instead of going stale forever.** The resolution rule preferred
  `.arcus/bin/` unconditionally, and nothing ever invalidated it — so a workspace bootstrapped once
  kept serving those scripts to every later session, on every host. Compounding it, only Claude Code
  fires the plugin's `SessionStart` hook: Copilot CLI reads hooks from `.github/hooks/` in a
  different schema (`sessionStart`, no `CLAUDE_PLUGIN_ROOT`), so the bundled hook never executes
  there and on a Copilot-only machine `.arcus/bin/` is **never created** — every helper-script call
  fails. Observed in practice: a repo ran June-vintage `checkpoint.sh` while reporting version 2.2.0.

  New `scripts/locate.sh` finds the newest install (explicit `$ARCUS_HOME` → probe the known install
  roots, highest semver → last-known `.arcus/env`), runs the bootstrap, and prints the resolved home.
  Entry points call it as **step 0 of every run, including resumes**. Because a given version's
  scripts are byte-identical whichever host installed them, "newest wins" needs no host detection.
  `bootstrap.sh` now also stamps `ARCUS_VERSION` into `.arcus/env`, so a stale staging is diagnosable
  rather than invisible.

- **`agents.md`: removed the `/arcus:<name>` slash-command claim.** The plugin ships no `commands/`
  directory, so no slash form has ever worked on any host — invoking one returns `Unknown command`.
  Skills are invoked by **bare name**, which is now stated instead.

### Added

- **L1-15 (`checkAgentDispatchPortable`)** — static check failing any skill/agent that dispatches a
  pure agent as `arcus:<name>`, with the host-correct form named in the error. Prose mentions are
  deliberately not flagged. Brings the planted-violation coverage map to 15 checks.

### Removed

- **Three skills removed from the user-facing API.** `pull-request-builder`, `test-spec-compiler`, and
  `kick-off` are no longer independently triggerable skills. `pull-request-builder` and
  `test-spec-compiler` survive as dispatched agents (`plugins/arcus/agents/{pull-request-builder,test-spec-compiler}.md`),
  invoked by the pipeline at Closure and Test Plan stages respectively — they are callable only through
  agent dispatch, not by user slash command. `kick-off`'s two-step sequencing logic (context-pack-builder
  → spec-finalizer) was folded into `arcus-controller`'s Brainstorm stage group, which now runs as the
  pipeline's entry point whenever a story is submitted.

- **Standalone brainstorm-only entry point is removed.** The slash commands `brainstorm <STORY>`,
  `kick off <STORY>`, and `architect <STORY>` no longer exist. To obtain a context pack and grounded
  specification without proceeding to implementation, use the full pipeline entry points (`implement <STORY>`
  or `forge <STORY>`), which run Brainstorm as the first stage group and — in INTERACTIVE mode — pause at
  the Open-Questions gate exactly as before. AUTONOMOUS mode runs Brainstorm straight through to Test Plan.

### Changed

- **Two skills converted to pure agents.** `implementation-planner` and `spec-finalizer` are now
  dispatched agents (`plugins/arcus/agents/{implementation-planner,spec-finalizer}.md`), no longer
  independently triggerable skills. Their supporting assets (reference documents, templates) moved from
  `plugins/arcus/skills/<name>/` to `plugins/arcus/agent-resources/<name>/`. In the pipeline, both are
  invoked by agent dispatch through `arcus-controller` within the Brainstorm stage (spec-finalizer first at
  stage key 3, then implementation-planner at stage key 4), never by user slash command. The entry points that used to invoke them directly (`implement <STORY>`, `forge <STORY>`) still
  run the same logic — they now route through the orchestrator instead of invoking the skill.

- **`arcus-controller` restructured: orchestration logic separated from stage bodies.** The four stage
  bodies — Brainstorm, Test Plan, Context Sync, Closure — were extracted from `plugins/arcus/skills/arcus-controller/SKILL.md`
  into `plugins/arcus/skills/arcus-controller/references/{brainstorm,test-plan,context-sync,closure}.md`. SKILL.md retains
  Stage 0 (Scaffold), the Implementation stage, the Code Review stage, and the cross-cutting Resumption/Open-Questions/Loopback
  protocols inline, plus a new stage-index table linking to the four extracted files. Each reference file
  is read on demand, only when its stage is the one actually executing that turn — a resume that lands
  at Closure no longer pays for Brainstorm's, Test Plan's, or Context Sync's content. A new `bundledBodies()`
  test helper (`tests/lib/skills.mjs`) keeps the static cross-reference gates (L1-7, L1-14) scanning these
  extracted files the same way they scan `SKILL.md`, so a dangling `arcus:` token or an unqualified agent
  dispatch inside a reference file still fails the build. No runtime or dispatch behavior changed — this
  is purely a maintainability refactoring to split logic from orchestration.

- **Removed standalone output-path fallback for `implementation-planner` and `spec-finalizer`.** Both
  agents now require `output_path` as a mandatory input (the filesystem path where their artifact is
  written). Previously they fell back to a default `.arcus/outputs/<name>/<timestamp>.md` if no path
  was supplied — a convenience for manual skill invocation. Since they are now pure agents invoked only
  by orchestrators, and orchestrators always supply an explicit path, the fallback was dead code.
  Orchestrator callers must now provide `output_path` in every dispatch.

- **Roster change: 8 skills / 18 agents (down from 13 skills / 16 agents).** Five skills left the Skill
  surface: `pull-request-builder` and `test-spec-compiler` were deleted outright — their agent twins
  already existed and are now the only dispatch target; `kick-off` was deleted outright, its two-step
  sequencing folded into `arcus-controller`; `implementation-planner` and `spec-finalizer` were converted
  to new pure agents rather than deleted. Net: skills −5 (13 → 8), agents +2 (16 → 18, from the two
  conversions). The 8 remaining user-triggerable skills are: `arcus-controller`, `arcus-guide`,
  `code-reviewer`, `context-drift-sync`, `implementation-runner`, `model-strategy`, `repo-agentifier`,
  and `write-evals`. See `plugins/arcus/agents.md` for the full roster.

## [2.2.1] - 2026-07-27

### Changed

- **Batched clarification questions replace the one-at-a-time interview — in every mode.**
  `spec-finalizer` and `implementation-planner` **no longer take a `mode` parameter** and never
  converse. Each always produces a **fully resolved** artifact *and* records the decisions it was
  least confident about in a new `## Open Questions` YAML block inside that same artifact. Whether a
  human ever sees those questions is now purely the orchestrator's concern: `afk` ignores them,
  gated surfaces them. This generalizes the path `spec-finalizer` already took in autonomous mode
  (resolve everything, emit an escalation list) and deletes the dialogue path, rather than adding a
  third behavior.

  The old interview asked one question at a time so an early answer could dissolve a later question.
  Batching removes that protection, so two rules replace it: only **mutually independent** gaps may
  be surfaced together (dependent ones are held for round 2), and the batch is **capped at 7**,
  ranked by blast radius, with the tail auto-resolved and flagged `⚠️ LOW CONFIDENCE`. Rounds are
  capped at **2**, counted from `### Round N` subsections under `## Dialogue Answers` so the cap
  survives a cold resume with no checkpoint change.

  Consequences worth noting:
  - **`kick-off`'s "dialogue MUST run in the MAIN THREAD" rule is deleted.** It existed only because
    the skill conversed. Both capabilities are now always **spawned as isolated subagents**,
    restoring the depth-1 execution rule that dialogue mode had been violating, and collapsing the
    controller's two-branch Brainstorm dispatch into one.
  - **Answers round-trip as a skill input, not an orchestrator write.** The controller passes the
    user's raw reply as a new optional `answers` input; the re-invoked skill maps it to question ids
    and writes `## Dialogue Answers` itself. Each artifact keeps exactly one writer.
  - **The mapping is recorded and echoed back** — id → *verbatim user wording* → resolved choice — so
    a mis-parsed free-form answer is visible rather than silent. No question is ever dropped without
    an explicit note.
  - **Strengthened idempotency guard.** The old guard suppressed re-*asking* but not re-*analysis*,
    so a resume re-derived the ambiguity list non-deterministically and `SF-3` could stop denoting
    the gap the user answered. Now: if every id in `## Open Questions` is answered, Steps 1–3 are
    skipped outright.
  - **`NEEDS_INPUT:` is removed.** It was defined, documented, and consumed by nothing. The
    `## Open Questions` artifact section replaces it — a return-message block cannot survive the cold
    resumes the cloud surface will require. A one-line `OPEN_QUESTIONS: <n>|none` token remains for
    cheap orchestrator branching.
  - New `arcus-controller` **Open-Questions Protocol**; `AWAITING_HANDOFF` now distinguishes
    "questions pending" from "phase gate pending" by inspecting the stage's artifact on resume.

- **Version policy: every merged PR touching `plugins/arcus/**` now bumps at least a patch.**
  Previously AGENTS.md said to bump "once per accumulated release", which is wrong for this project
  because `main` **is** the distribution channel — consumers install a copied snapshot and refresh by
  comparing their cached `version` against the source's. Letting several merged PRs share one version
  number makes `/plugin update` a silent no-op and strands installed users on whatever content
  shipped first under that number, with no error anywhere. This actually happened: the checkpoint
  hardening below merged under an unchanged `2.1.0` and could not reach anyone. Now enforced by CI.

### Fixed (from first-run testing of the above)

- **`current_stage` now means "the stage the pipeline is AT", not "the last stage that finished".**
  `complete <stage>` set `current_stage` to the stage it had just completed, so every reader — and
  every human opening the file — saw a finished stage where they expected the active one. It now
  advances to the next stage still to be done, skipping any already complete, and holds at the
  terminal stage (where `current_status` becomes `COMPLETE`). The field name is now accurate rather
  than needing a rename.

- **`set-tasks` spliced `task_1..N` in at their canonical pipeline position.** Regression from
  removing the pre-seeded task slots: because the keys no longer existed at init, `set-tasks`
  appended them at the **end** of `stages`, i.e. after `closure`. Key order *is* the pipeline order,
  so the sequence was misrepresented to every reader (and to `complete`'s next-stage lookup). They
  are now spliced between `branch` and `code_review`, preserving the status of any task already
  started.

- **A stage with unanswered open questions is no longer marked `complete`.** The controller ran the
  Open-Questions Protocol and then marked `spec_finalizer` complete in the same breath — so a
  checkpoint written while the human was still deciding claimed the stage was done. Any later resume
  would then skip the stage, silently dropping the questions and shipping the tentative picks
  unreviewed. `complete` for these stages now happens only after answers are folded in;
  `awaiting_handoff` is the terminal state until then.

- **Stage completion is recorded per-stage against its own artifact, not batched after the fact.**
  `context_pack` sat `pending` while `spec_finalizer` was already running, because both completions
  fired only once `kick-off` returned as a unit. Each stage is now marked as soon as its own artifact
  exists.

- **The Resumption Protocol reconciles against artifacts before walking the stage list.** A run that
  dies between writing an artifact and recording it left the stage `pending` with its output already
  on disk, so the next run redid finished work. Existing artifacts now heal the checkpoint first —
  except for `spec_finalizer`/`plan` with unanswered `## Open Questions`, where the file existing
  proves the skill ran, not that the human replied.

- **`kick-off` dispatch shape corrected.** "Dispatch the `arcus:context-pack-builder` **agent**" led
  the model to invoke it as a named skill (`Unknown skill: arcus-plugin:context-pack-builder`) —
  `context-pack-builder` is an agent with no skill surface, and neither capability is addressable
  that way. Both steps now use the explicit **Prompt / Description / Model** one-shot-subagent shape
  `arcus-controller` already uses successfully for every other stage.

### Added

- **CI: `version-guard.yml`.** Fails a PR that changes `plugins/arcus/**` without bumping
  `plugin.json`'s `version`, and rejects a backwards move. Turns the distribution rule above from a
  discipline note into a hard gate.

### Fixed

- **`checkpoint.sh`: `mutate_json` no longer interpolates shell variables into `node -e` source.**
  Every mutation now dispatches on a fixed literal op chosen by the `case` statement, and all dynamic
  values (stage names, statuses, branch names, failure reasons) reach node via `process.argv` instead
  of being spliced into the JavaScript text. Previously a stage or branch name containing a quote,
  backtick, or `${...}` could break the JS or inject code. Latent while every value was
  developer-supplied; a live injection surface the moment those values become issue-derived. Covered
  by a new harness assertion that feeds `$(touch pwned)'; process.exit(1); //` through `set-branch`
  and asserts it round-trips as inert string data.

- **`checkpoint.sh init` no longer pre-seeds `task_1..task_8`.** A plan with three tasks previously
  left five phantom `pending` task stages that the Resumption Protocol's "run the first `pending`
  stage" rule would try to execute. Task slots are now created on demand by the new
  `set-tasks <N>` action, which `arcus-controller` calls once the plan is compiled and the real task
  count is known. `set-tasks` seeds only missing keys and prunes still-`pending` `task_N` above `N` —
  never touching a task already `in_progress` or `complete` — which doubles as the in-place migration
  for checkpoints written by earlier versions.

- **`current_status` is now maintained rather than frozen at `IN_PROGRESS`.** It was written once at
  init and never updated, so nothing could distinguish a finished story from an in-flight one. It now
  tracks `IN_PROGRESS | AWAITING_HANDOFF | COMPLETE | FAILED` and is the single field the Resumption
  Protocol checks *first*, before walking per-stage statuses.

- **Handoff gates are now durably recorded.** `awaiting_handoff` was a documented, validated status
  that **no code path ever wrote** — the controller emitted the gate text and stopped, so a resumed
  session could not tell "gated, waiting for the user" from "crashed mid-stage" and would walk
  straight past the gate. Every interactive gate in `arcus-controller` now calls the new
  `checkpoint.sh await-handoff` first, and the Resumption Protocol re-emits the gate instead of
  advancing. A matching `fail` action records `{stage, reason}` and sets `current_status` to `FAILED`
  so a failed stage is not silently retried on resume.

- **`pr.sh` no longer fails when a PR already exists for the branch.** `gh pr create` errors out on a
  second invocation, which broke any resumed or re-run `closure` stage. It now detects an existing PR
  via `gh pr view` and updates its body with `gh pr edit` instead.

- **`extract_story_id.sh`: the `copilot --yolo` LLM fallback is disabled under CI.** Gated off when
  `$CI` or `$ARCUS_ISSUE_NUMBER` is set — shelling out to an all-tools-allowed agent with raw story
  text is a prompt-injection surface once that text is attacker-controlled issue content.

- **`session-checkpoint.schema.json` now validates what it claimed to.** `stages` was declared as
  bare `{"type": "object"}`, validating nothing inside it — which is precisely why "`awaiting_handoff`
  is never written" went unnoticed for so long. It now constrains every stage value to the status
  enum via `patternProperties`, and `current_status` to its own enum. The dependency-free draft-07
  validator in `tests/lib/checks.mjs` gained `patternProperties` support to make this enforceable.

- **`artifacts-guide.md`: corrected the session-checkpoint schema example.** The previous "illustrative"
  block was wrong in every structural detail — nested `{"status": ...}` objects instead of plain
  strings, `"mode": "interactive"` instead of `gated`, a nonexistent `last_updated` field, a branch
  name missing its `-N` suffix, and no `current_status`. Replaced with the real shape plus the
  `current_status` value table.

### Added

- **`repo-agentifier`: commit-convention detection + explicit managed-block markers.**
  `repo-overview-discovery` now detects the repo's commit convention during Metadata Harvesting — a
  pointer to the owning file (commitlint config, CONTRIBUTING commit section, `.gitmessage`) when one
  exists, an "observed, not enforced" pattern inferred from `git log --no-merges` otherwise, or an
  explicit "No commit convention detected" — and records it in `repo_map.md`'s new **Commit
  Convention** section. Never fabricates a default ruleset (e.g. Conventional Commits). `AGENTS.md`'s
  Navigation Index gains one pointer row to it, consistent with every other row: point at the
  `.context/` file that owns the fact, never restate it. Separately, the three managed sections
  (Project Context, Navigation Index, Business Flows) are now wrapped in explicit
  `<!-- repo-agentifier:managed:start/end -->` markers so `update` mode can refresh them without
  heading-name guesswork; pre-marker files are migrated in place on the next `update` run.

- **Docs: "Meet the ARCUS Team" comic-strip onboarding manual.** A standalone, illustrated page at
  `site/comic/` that teaches the plugin through a named persona cast — Lucie (Lead), Angelina
  (Architect), Quinn (QA), Diana (Developer), Steffi (Staff Engineer), Benny (Build Bot), and Genie
  (Guide/narrator) — opening with a "meet the team" roster before covering the toolkit
  (`.context/` + `AGENTS.md`/`CLAUDE.md`, skills vs agents, hooks, the plugin/marketplace) and the
  full pipeline in their voices — Angelina's day-one scan → the brainstorm interview → Lucie's
  interactive/AFK mode split → Quinn's test matrix → Diana dispatched in parallel per ticket →
  Benny's deterministic gate and Steffi's five-lens review → Angelina's wrap-up and Lucie's PR —
  plus standalone teammate usage, a trigger-phrase cheat sheet, and a randomized 15-question exam
  dealt from a 34-question pool (flip-card facts, shuffled answers, no two visits identical).
  Deliberately teaches skill-vs-agent (a practical, user-facing distinction) but not the underlying
  capability/coordinator/orchestrator tier vocabulary, in favor of a plain-language team hierarchy
  ("who hands back one result vs. who holds the whole roadmap"). Superseded an initial Tom &
  Jerry-themed pass after user feedback that the chase metaphor obscured more than it clarified.
  Built as VitePress components (`site/.vitepress/theme/components/comic/`) in a warm studio
  palette of its own. Linked from the site nav, sidebar, and homepage hero.

### Changed

- **AGENTS.md: added a docs-sync working agreement.** Alongside the existing per-session version-bump
  check, agents must now also evaluate whether `site/` docs (including the comic) need updating when
  a session changes a pipeline stage, gate, mode, skill/agent, trigger phrase, or artifact name — and
  state which pages were touched (or why none needed touching) in the same turn.

## [2.0.1] - 2026-07-18

### Fixed

- **OpenCode adapter: deterministic `.arcus/bin` + `.arcus/env` staging (no skill change).** The
  `arcus-opencode` plugin previously staged skills/agents at plugin load (factory time) but deferred
  helper-script staging (`bootstrap.sh` → `.arcus/bin` + `.arcus/env`) to a `session.created` event
  gated by an in-memory `bootstrapped` boolean, with failures swallowed. This created an ordering race
  where skills were visible but their hard-dependency helper scripts were absent, and the in-memory
  guard could skip re-staging without verifying on-disk presence — leaving `.arcus/bin` unstaged in the
  session where work actually happened (observed in `bigfin_communication-service`). Bootstrap now runs
  **awaited at factory time**, alongside skill/agent staging and before any session event — mirroring
  Claude Code's pre-session `SessionStart` hook. The `session.created` handler is now a
  **presence-checked** safety net (re-stages only when `.arcus/bin/scaffold.sh` is missing), removing
  the reliance on in-memory state. Fix is confined to `plugins/arcus-opencode/src/index.ts`; the
  cross-harness `arcus-controller` skill is unchanged (it already resolves `.arcus/bin/` → `$ARCUS_HOME`
  and makes no assumption about *when* staging occurs).

## [2.0.0] - 2026-06-30

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

- **Documentation updated to reflect four supported platforms.** All user-facing docs (`README.md`,
  `site/index.md`, `site/guide/introduction.md`, `site/guide/quickstart.md`,
  `site/guide/how-it-works.md`, `plugins/arcus/skills/arcus-guide/assets/faq.md`, `AGENTS.md`,
  `.context/repo_scope.md`) now list GitHub Copilot CLI, Claude Code, VS Code, **and OpenCode** as
  supported tools. `README.md` gains an OpenCode install section (ToC entry, install table row, and
  dedicated subsection with the one-command installer) and an OpenCode updating subsection.

 Cut the `Key Principles`
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
- **`test-spec-compiler` and `pull-request-builder` split** into a thin `layer: coordinator`
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

- Initial release of the **agent-forge** plugin, distributed through its
  marketplace (`.claude-plugin/marketplace.json`).
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
