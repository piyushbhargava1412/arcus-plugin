<!--
GROUNDED SPEC — owned solely by spec-finalizer.
This is `.arcus/specs/<STORY-ID>/grounded-spec.md`, a self-contained record of the grounded
story decisions. It is consumed downstream as an INPUT to implementation-planner (which writes
its own separate `plan.md`). Sections:
  - `# Grounded Spec: <STORY-ID>` (title)
  - `## Context Grounding`
  - `## Resolved Ambiguities`
  - `## Dialogue Answers` (dialogue mode only)
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

## Dialogue Answers

*(Gated/dialogue mode only. One block per question actually asked of the user — the
`zero-option` / ⚠️ LOW CONFIDENCE items. In one-shot/afk mode there is no dialogue; leave
this section empty or omit it.)*

### Q1: [The question asked]
**Options presented:**
- A — [option] **(Recommended)** — *[one-line rationale for why this is recommended]*
- B — [option]
- C — [option]
- Custom — [user may provide their own answer]

**Chosen answer**: [Recommended option / custom answer the user gave]
**Rationale**: [Why this answer was chosen — user direction is authoritative]

---

*(Repeat for each question asked)*

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
