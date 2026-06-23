---
name: design-pattern-discovery
description: Analyze existing source and persist shared repository design & coding patterns — conventions, idioms, layering/structure, naming, error-handling & logging, plus a curated "Avoid" list. Use when user says "what are our coding conventions?", "discover and persist design patterns", or "baseline the coding style".
layer: capability
standalone: true
---

# Design Pattern Discovery

## Overview

Identify how code is actually written in the repository — the recurring design patterns, layering and
structural conventions, naming idioms, error-handling & logging conventions, and configuration &
dependency conventions — and persist them to
`.context/design-and-coding-patterns.md`, together with a curated **Avoid** list of anti-patterns. This
ensures downstream planning, implementation, and review agents write code that is indistinguishable
from the existing codebase and steer clear of patterns the team has decided against.

This skill parallels `test-pattern-discovery`: same prep → inspect → persist shape, same evidence-only
discipline, same recurrence threshold. Where `test-pattern-discovery` baselines *testing* style, this
skill baselines *design & coding* style. The artifact it produces is **static by design** — it is
maintained thereafter only by `context-drift-sync` when a genuinely new team-level pattern is adopted,
not regenerated on routine diffs.

## Instructions

### Step 1: Prep & Metadata
1. Verify that `.context/repo_scope.md` and `.context/repo_map.md` exist.
2. Read `verification-commit` from `repo_scope.md` to use as `CURRENT_COMMIT`.
3. Capture the current ISO timestamp as `GENERATED_AT`.

### Step 2: Identification & Inspection
1. **Locate Source Roots**: Use `repo_map` (Top-Level Structure, Key Packages / Modules, Source roots)
   and `repo_scope` (Source/Test/Config/Scripts Roots) to find the primary source directories for every
   language detected. Exclude generated, vendored, and ignored trees (`node_modules`, `dist`, build
   output, `.context/`, `.arcus/`).

2. **Scan Representative Source**: Read a representative sample from **each layer / module** the repo
   map identifies (e.g. entry points, services/orchestrators, adapters, data/models, shared utilities).
   Favor recently-touched, central files over leaf/one-off files.

3. **Analyze Style per Dimension** — extract recurring, evidence-backed conventions for each:
   - **Design patterns in use**: recurring structural/behavioral patterns actually present (e.g.
     Strategy, Factory, Adapter, Repository, Command, dispatcher/handler, deferred/lazy init,
     template-method-via-markdown). Document only patterns you can point to in ≥3 places.
   - **Layering & structure conventions**: how the codebase is organized (e.g. entry → service →
     adapter; skill-spec + assets + references; one-file-per-concern), boundaries between layers, and
     where cross-cutting helpers live.
   - **Naming & idioms**: file/module/symbol naming conventions, casing, suffix/prefix conventions,
     idiomatic constructs the repo reaches for repeatedly.
   - **Error-handling & logging conventions**: how errors are raised/propagated/reported, exit-code vs
     exception vs result conventions, log/format/message conventions, fail-open vs fail-closed defaults.
   - **Configuration & dependency conventions**: where configuration lives and how it is read, and the
     dependency-management conventions / the bar for adding a new dependency (per `repo_scope` /
     guardrails). Document only conventions that recur (≥3 places).

4. **Build the curated Avoid list**: capture **prescriptive rules** the codebase's own conventions
   imply teams should NOT do (anti-patterns). These are *rules*, not an inventory of offending files —
   e.g. "Do not hand-construct branch names / checkpoint JSON; call the helper scripts" rather than
   "file X violates Y". Ground every Avoid rule in an observed positive convention or an explicit
   project guardrail (`AGENTS.md` / `CLAUDE.md` / `repo_scope` boundaries).

### Step 3: Persistence
1. Use `./assets/design-and-coding-patterns.template.md` to generate the baseline.
2. Persist the output exactly to `.context/design-and-coding-patterns.md`.
3. Canonical Examples: select a few specific real files that future agents should treat as
   gold-standard examples for the documented patterns.

**Core Rules**:
- **Evidence-Only**: Document only patterns and conventions that actually appear in the repository. Do
  NOT invent best practices, recommend libraries that aren't present, or aspire to patterns the code
  does not use.
- **Recurrence ≥ 3**: Only document a pattern/convention/idiom that appears in **at least three**
  distinct places (files or modules). One-off occurrences are not conventions.
- **Static by design**: This artifact is not regenerated on routine changes. It is updated only by
  `context-drift-sync` when a genuinely new team-level pattern/convention is adopted.
- **Avoid = rules, not inventory**: The Avoid section holds prescriptive anti-pattern rules, never a
  list of specific offending files.
- **Consult Specs**: See `./references/design-spec.md` for detailed extraction logic per dimension.

## Examples

**Initial Baseline**
- **User says**: "Baseline our coding conventions."
- **Action**: Scan each source layer the repo map identifies, detect recurring patterns (e.g. helper-script
  adapters, skill-spec + assets/references structure, deferred-branch idiom), naming/idioms, and
  error-handling conventions, then build the full pattern map plus an Avoid list.

**Convention Refresh**
- **User says**: "We've adopted the Result type for error returns, capture it."
- **Action**: Confirm the pattern now recurs (≥3 uses), then update the Error-Handling section and, if
  it supersedes a prior convention, add an Avoid rule against the old style.

**Avoid-list grounding**
- **User says**: "Make sure agents stop hand-rolling git commands."
- **Action**: Observe that git/state operations are centralized in `plugins/arcus/scripts/*.sh`, document
  that positive convention, and add a prescriptive Avoid rule: "Do not invoke raw git for state/branch
  operations — call the helper scripts."

## Troubleshooting

- **Error: `NO_SOURCE_DETECTED`**: No first-party source found (only docs/config). Note the absence in
  the file so downstream agents know there is no code-level pattern baseline yet.
- **Error: `INSUFFICIENT_PATTERN_EVIDENCE`**: Candidate patterns appear fewer than 3 times or are too
  inconsistent. Document only the common denominators and mark confidence as `medium`.
- **Error: `SPECS_ONLY`**: Repository is primarily specifications/markdown (e.g. a skill/plugin repo)
  rather than application code. Document the spec-authoring and helper-script conventions that DO recur,
  and mark code-runtime dimensions "Not detected — checked: [paths]".

## Validation Gates

- [ ] `design-and-coding-patterns.md` created in `.context/`.
- [ ] Every section of the template is populated or explicitly marked "Not detected — checked: [paths]".
- [ ] Every documented pattern/convention recurs in **≥3** distinct places (evidence cited).
- [ ] The **Anti-patterns to Avoid** table is populated with prescriptive rules (not a file inventory).
- [ ] Canonical example files point to real, existing paths.
- [ ] `context-meta` block is present and accurate.
