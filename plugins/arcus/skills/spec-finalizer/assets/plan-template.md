<!--
SHARED FILE — SECTION OWNERSHIP CONTRACT.
This is `.arcus/specs/<STORY-ID>/plan.md`, a single shared deliberation record.
spec-finalizer OWNS and writes ONLY the sections in THIS template (the requirements half):
  - `# Plan: <STORY-ID>` (title)
  - `## Context Grounding`
  - `## Resolved Ambiguities`
  - `## Dialogue Answers` (gated mode only)
  - `## Implementation Boundary`
  - `## Guardrail Check`
implementation-planner LATER APPENDS its own design sections to the SAME file
(`## Approach Evaluation`, `## Chosen Approach & Reasoning`, `## Design / Impacted Files`,
`## Design Dialogue Answers`). spec-finalizer must NOT clobber those: create plan.md if
absent, otherwise replace ONLY its owned sections in place and leave everything else intact.
-->

# Plan: [STORY-ID]

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
