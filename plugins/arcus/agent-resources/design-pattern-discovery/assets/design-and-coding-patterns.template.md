# Design & Coding Patterns

<!-- context-meta
verification-commit: [hash or unknown]
generated-at: [ISO-TIMESTAMP]
confidence: [high | medium | low]
-->

> **Static by design.** This artifact captures the repository's *settled* design & coding conventions.
> It is NOT regenerated on routine diffs — `context-drift-sync` updates it only when a genuinely new
> team-level pattern/convention/idiom is adopted. Every entry below is **evidence-grounded** (observed
> in ≥3 distinct places) — no aspirational or invented practices.

---

## Conventions Overview

<!-- Quick overview of which design/coding dimensions have a documented convention in this repo -->

| Dimension                       | Documented | Summary                                              |
|---------------------------------|------------|------------------------------------------------------|
| Design patterns in use          | ✅ / ❌    |                                                      |
| Layering & structure            | ✅ / ❌    |                                                      |
| Naming & idioms                 | ✅ / ❌    |                                                      |
| Error-handling & logging        | ✅ / ❌    |                                                      |
| Configuration & dependencies    | ✅ / ❌    |                                                      |

---

## Design Patterns In Use

<!-- Recurring structural/behavioral patterns actually present in the code (≥3 occurrences each). -->

- **[Pattern name]**: [What it is and how this repo applies it]. *Evidence*: [≥3 file/module references]
- **[Pattern name]**: [...]. *Evidence*: [...]

*(If none detected: "Not detected — checked: [paths]".)*

## Layering & Structure Conventions

<!-- How the codebase is organized; how a flow moves across layers; where shared code lives. -->

- **Layering**: [e.g. entry → service/orchestrator → adapter → output]. *Evidence*: [...]
- **Module granularity**: [e.g. one-concern-per-file; skill = SKILL.md + assets/ + references/]. *Evidence*: [...]
- **Shared / cross-cutting code**: [where it lives]. *Evidence*: [...]

## Naming & Idioms

- **File / module naming**: [casing, suffixes/prefixes, e.g. `*.test.sh`, `*-prompt.md`, `SKILL.md`]. *Evidence*: [...]
- **Symbol naming**: [functions, variables, constants conventions]. *Evidence*: [...]
- **Idiomatic constructs**: [recurring constructs, e.g. `set -eo pipefail` headers, `context-meta` blocks, table-driven docs]. *Evidence*: [...]

## Error-Handling & Logging Conventions

- **Error propagation**: [exception vs exit-code vs result/status string]. *Evidence*: [...]
- **Message / format conventions**: [e.g. `[ERROR] ...` prefixes, `STATUS:`/`VERDICT:` report lines]. *Evidence*: [...]
- **Defaults**: [fail-open vs fail-closed; retry/escalation conventions]. *Evidence*: [...]

## Configuration & Dependency Conventions

- **Configuration**: [where config lives and how it is read]. *Evidence*: [...]
- **Dependencies**: [dependency manager(s); the bar for adding a new dependency]. *Evidence*: [...]

---

## Canonical Examples

<!-- Real, existing files future agents should treat as gold-standard for the patterns above. -->

| Dimension / Pattern        | File Path                          | Why it's canonical                          |
|----------------------------|------------------------------------|---------------------------------------------|
| [e.g. Helper-script adapter] | [path/to/file]                   | [Clean, representative, central exemplar]   |
| [e.g. Skill-spec structure]  | [path/to/SKILL.md]               | [...]                                        |

---

## Anti-patterns to Avoid

<!-- PRESCRIPTIVE RULES ONLY — not a list of offending files. Each rule traces to an observed positive
     convention (its inverse) or an explicit project guardrail. State the anti-pattern + the preferred
     alternative in one line. -->

| Avoid (anti-pattern)                                  | Do instead (preferred convention)                       | Grounded in |
|-------------------------------------------------------|---------------------------------------------------------|-------------|
| [e.g. Hand-rolling raw git for branch/state/PR ops]   | [Call the deterministic helper scripts]                 | [convention / guardrail reference] |
| [e.g. Inferring behavior not present in the codebase] | [Ground every change in repository evidence]            | [AGENTS.md / CLAUDE.md] |
