<!--
GROUNDED SPEC — owned solely by spec-finalizer.
This is `.arcus/specs/<STORY-ID>/grounded-spec.md`, a self-contained record of the grounded
story decisions. It is consumed downstream as an INPUT to implementation-planner (which writes
its own separate `plan.md`). Sections:
  - `# Grounded Spec: <STORY-ID>` (title)
  - `## Context Grounding`
  - `## Resolved Ambiguities`
  - `## Open Questions` (always present; empty list when nothing warrants asking)
  - `## Dialogue Answers` (resume pass only — populated once a user has answered)
  - `## Implementation Boundary`
  - `## Guardrail Check`
-->

# Grounded Spec: [STORY-ID]

## Context Grounding
- **Primary Flow**: [Flow name from context-pack]
- **Confidence Level**: [High/Medium/Low — based on how much context was available]

## Resolved Ambiguities

### 1. [Ambiguity Title]
**Gap**: [What was missing or unclear]

| Option | Description | Evidence |
|--------|-------------|----------|
| A | [Conservative choice] | [Pattern/flow reference from context-pack] |
| B | [Pragmatic choice] | [Simplicity rationale] |
| C | [Alternative — only if A/B have significant tradeoffs] | [Rationale] |

**Decision**: Option [X] — [1-sentence rationale]

---

### 2. [Next ambiguity...]
**Gap**: [...]

| Option | Description | Evidence |
|--------|-------------|----------|
| A | [...] | [...] |
| B | [...] | [...] |

**Decision**: Option [X] — [...]

---

*(Repeat for each ambiguity)*

## Open Questions

*(ALWAYS present. The `zero-option` / ⚠️ LOW CONFIDENCE decisions this spec resolved but would
prefer a human to confirm — max 7, ranked by blast radius, only mutually independent gaps. The
spec is fully resolved regardless; this is a confirmation request, not a blocker. Write an empty
list when nothing warrants asking. Answered-ness is derived from `## Dialogue Answers` — do NOT
add a `status` field here.)*

```yaml
- id: SF-1
  gap: [the gap, phrased as a question]
  reason: zero-option | low-confidence
  options:
    - {key: A, text: [option], recommended: true, rationale: [one line: why this one]}
    - {key: B, text: [option]}
  tentative: A
```

## Dialogue Answers

*(Resume pass only — populated when the caller re-invokes with an `answers` input. One `### Round N`
subsection per round, max 2 rounds. On a first pass there is no dialogue; leave empty or omit.)*

### Round 1

| Question | What the user said (verbatim) | Resolved to |
|----------|-------------------------------|-------------|
| SF-1 | "[the exact fragment of the user's reply matched to this question]" | [option key or custom answer] |
| SF-2 | "[…]" | […] |

*(Quoting the user verbatim is mandatory — it is what makes a mis-matched answer reviewable rather
than invisible. A question with no matching fragment is re-asked in round 2 or auto-resolved with an
explicit ⚠️ LOW CONFIDENCE note; it is never silently dropped. The user's answer is authoritative and
overrides the tentative pick.)*

## Implementation Boundary

### Included
- [Concrete deliverable 1]
- [Concrete deliverable 2]
- [...]

### Excluded
- [Item 1 — reason for deferral]
- [Item 2 — reason for deferral]

## Guardrail Check
- [ ] All decisions comply with `AGENTS.md` or `CLAUDE.md`
- [ ] All decisions align with patterns in `context-pack.md`
- [ ] No decision introduces a new dependency without justification
- [ ] No two decisions contradict each other (internal consistency)
