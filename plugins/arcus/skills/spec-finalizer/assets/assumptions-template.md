# Assumptions Template: [STORY-ID]

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
