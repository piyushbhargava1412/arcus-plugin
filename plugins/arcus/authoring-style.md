# ARCUS Prompt Authoring Style

> The canonical style standard for ARCUS skill (`SKILL.md`) and agent (`agents/<name>.md`) bodies.
> These files are **context for an LLM at dispatch time**, not documentation for humans. Every token
> competes for the model's attention; text that does not change what the model *does* is not neutral,
> it is noise that dilutes the instructions that matter. Author accordingly.

> **Scope.** Applies to all skill/agent **bodies**. Two deliberate exceptions: `arcus-guide` (the one
> user-facing help skill — judge it by "useful and concise for a human asking for help") and
> `model-strategy` (a terse reference table consumed by other skills — reference density is correct).

## The five rules

### 1. Reference a callee's contract, never its internals

When you mention another skill/agent, state only what the **caller** depends on:

- **inputs** you pass it,
- **outputs / return tokens** you get back,
- **behavioral guarantees** that change *your own* control flow (e.g. "the consolidator can return
  `changes_requested`, which I gate on" — that is contract, keep it).

Do **not** narrate *how* the callee does its job — its algorithm, internal steps, ordering, or which
sub-agent it delegates to. That belongs in the callee's own file. If the callee changes its
implementation, a leaked copy silently goes stale and starts lying.

> Litmus test: *"If I delete this sentence, does any decision I make change?"* If no — it is the
> callee's business, cut it and link with `arcus:<name>`.

### 2. Say it once

State each rule, fact, or instruction **exactly once**, in the place the model will act on it. Do not
restate it in a trailing `Constraints` / `Key Principles` / `Layer Rules` / `Success Criteria` footer.
The single most common ARCUS bloat pattern is a footer that re-narrates the whole workflow already
given in the body — keep footers to *new* information (owned-state declaration, a cap not stated
elsewhere), or drop them.

Long resource paths (`"$ARCUS_HOME"/agent-resources/.../x.md`) follow the same rule: write the full
path **twice at most** — once at its point of use and once in a `Resources` list — and refer to it by
name ("the trigger catalog", "the template") everywhere else. Three+ full repetitions of one path is a
sign you should reference it instead.

### 3. Prose must earn its place

Cut motivational framing, persona flavor, and "why this matters" narration **unless it measurably
steers behavior**. A small amount of stance-setting is a legitimate instruction (e.g. "investigate
hard, but bias the verdict for signal over noise" genuinely shapes output). Decorative restatement of
a rule already given does not. Same litmus test as rule 1: does a decision change?

### 4. Be unambiguous

Prefer a directive an LLM can act on one way only. Replace vague verbs ("resolve", "handle",
"honor"), hedges ("where possible", "as needed"), and undefined terms ("judgment-grade") with the
concrete action or an explicit reference. If a term needs defining, define it once (rule 2) or link.

### 5. Be brief

If a sentence carries the same directive content at half the length, halve it. Drop redundant
adjectives and over-explanation. Brevity is not terseness for its own sake — it is removing words that
do not change what the model does.

### 6. Forbid only what's reachable

State a prohibition only when the forbidden action is **reachable from the item's inputs and
tempting**. "Read no story artifacts" earns its place — those files sit in the repo and reading them
is the natural instinct. "Never touch the checkpoint" does not, when no input leads there: it only
*introduces* the concept it forbids (the pink-elephant effect) and leaks that the prompt was carved
out of a stateful one. Convey a capability's statelessness through the **absence** of state inputs and
positively-specified behavior, not through warnings. Keep regression-guards ("don't re-add checkpoint
logic") here in this standard, not in the runtime prompt.

### 7. No tier-boilerplate footer

The `layer:` frontmatter already declares the tier; do **not** restate it in a `## Layer Rules` /
`## Contract` blockquote ("Layer: capability — atomic, stateless …"). And `Sequences:` / `Calls:` /
`Delegation:` bullets that re-walk the workflow are rule-2 duplication — cut them.

- **Capabilities & coordinators:** no `## Layer Rules` section. Stateless is the default; there is no
  ownership to declare.
- **Orchestrators only:** may keep a short **Owned state** note — but only for state, caps, or
  ownership boundaries **not already stated in the body** (e.g. a loopback-round cap, which checkpoint
  keys exist). If the body already says it, drop it here too.

## What is NOT noise (do not over-cut)

- **A skill/agent explaining its OWN workflow** — that is its entire job.
- **Domain specifics a capability needs** — a security reviewer enumerating vuln classes, a planner
  listing scoring axes. These are the payload, not framing.
- **Contract text** (rule 1) — inputs, outputs, and caller-affecting guarantees.
- **Deliberate cross-agent duplication in isolated subagents.** The reviewer agents run in isolation
  and cannot see a shared parent, so some shared framing (severity taxonomy, confidence threshold) is
  the lesser evil versus a fragile include. Duplication *within one file* is still a defect; identical
  boilerplate *across isolated siblings* is a documented, accepted trade-off — not a free-for-all.

## Authoring checklist

Before committing a skill/agent body, confirm:

- [ ] No sentence narrates *another* component's internal mechanics (rule 1).
- [ ] No rule/fact appears twice in the file (rule 2); footers carry only new information.
- [ ] Every prose/rationale line changes a decision (rule 3).
- [ ] No vague verbs, hedges, or undefined terms (rule 4).
- [ ] Nothing is twice as long as it needs to be (rule 5).

> **These files have behavioral eval coverage** (the L1–L4 suites and per-skill eval specs). Some
> "verbose" lines are load-bearing for a specific assertion — contractual tokens especially. Trim in
> small batches and re-run `node tests/unit/unit.mjs` plus the eval lint between them; never bulk-cut
> blind.
