# 📁 Artifacts Guide

Understanding what ARCUS creates and why

---

## Directory Overview

ARCUS creates two main directory structures:

### `.context/` — Shared Repository Snapshot ✅ Committed to Git

**Purpose:** Persistent knowledge base about your repository

**Created by:** `repo-agentifier` skill (run once, refresh as needed)

**Shared across:** All stories, all team members (checked into git)

### `.arcus/` — Session Workspace ⚠️ Git-Ignored

**Purpose:** Per-story working data and pipeline state

**Created by:** Pipeline during story execution

**Private to:** Your local machine (not checked into git)

---

## Directory Tree

```
.context/                              # Shared repository snapshot (committed)
├── repo_scope.md                      # Repository boundaries, tech stack
├── repo_map.md                        # Navigation index (controllers, services, etc.)
├── flows/                             # Business flow documentation
│   ├── user-registration.md
│   ├── payment-processing.md
│   └── ...
└── testing-patterns.md                # Test framework conventions

.arcus/                                # Session workspace (git-ignored)
├── bin/                               # Helper scripts
│   ├── checkpoint.sh                  # State management
│   ├── branch.sh                      # Git operations
│   ├── commit.sh                      # Commit automation
│   ├── extract_story_id.sh            # Story ID parsing
│   └── pr.sh                          # PR creation
├── env                                # Environment variables (ARCUS_HOME)
├── session-checkpoint.json            # Pipeline state tracker
└── specs/                             # Story workspaces
    └── [STORY-ID]/
        ├── story.md                   # Original story (copy)
        ├── context-pack.md            # Story-specific context
        ├── assumptions.md             # Technical decisions
        ├── clarifications.md          # User answers (gated mode)
        ├── blueprint.md               # Implementation plan
        ├── test-plan.md               # Test matrix
        ├── review.md                  # Review findings
        └── PR_DESCRIPTION.md          # Final PR body
```

---

## `.context/` Files (Shared Repository Context)

### `repo_scope.md`

**Created by:** `repository-context-builder` (via `repo-agentifier`)

**Purpose:** Define repository boundaries and technical scope

**When to refresh:** After major codebase refactoring or tech stack changes

**Safe to edit:** ✅ Yes, manually tune scope if needed

**Contains:**
- Tech stack list (languages, frameworks, databases)
- Repository boundaries (what's included, what's excluded)
- Ignored patterns (build artifacts, dependencies, generated code)
- Verification commit hash (for staleness detection)

**Example excerpt:**
```markdown
## Tech Stack
- Node.js 18+
- TypeScript 5.0
- Express.js
- PostgreSQL 14
- Jest (testing)

## Excluded
- node_modules/
- dist/
- coverage/
```

---

### `repo_map.md`

**Created by:** `repository-context-builder` (via `repo-agentifier`)

**Purpose:** Navigation index for common architectural patterns

**When to refresh:** Same as repo_scope.md

**Safe to edit:** ✅ Yes, add custom navigation aids

**Contains:**
- File paths organized by architectural layer
- Controllers, services, repositories, utilities
- Test locations by layer (unit, integration, e2e)
- Configuration files
- Entry points

**Example excerpt:**
```markdown
## Controllers
- src/api/controllers/UserController.ts
- src/api/controllers/AuthController.ts

## Services
- src/services/UserService.ts
- src/services/EmailService.ts

## Repositories
- src/data/UserRepository.ts
```

---

### `flows/*.md`

**Created by:** `flow-and-scope-discovery` (via `repo-agentifier`)

**Purpose:** Document business flows with entry points and data touchpoints

**When to refresh:** When business logic changes significantly

**Safe to edit:** ✅ Yes, improve flow descriptions as needed

**Contains (per flow file):**
- **Entry Points:** Where the flow starts (API endpoints, CLI commands, events)
- **Core Path:** Step-by-step description of the flow
- **Data Touchpoints:** What data is read/written
- **Integrations:** External services, databases, message queues
- **Related Tests:** Where this flow is tested

**Example:** `flows/user-registration.md`
```markdown
## Entry Points
- POST /api/auth/register
- CLI: `user create`

## Core Path
1. Validate email and password
2. Check for existing user
3. Hash password
4. Create user record
5. Send welcome email
6. Return auth token

## Data Touchpoints
- Reads: users table (duplicate check)
- Writes: users table (new record)

## Integrations
- SendGrid (welcome email)
- Redis (session storage)

## Related Tests
- tests/integration/auth/registration.test.ts
- tests/e2e/user-flows.test.ts
```

---

### `testing-patterns.md`

**Created by:** `test-pattern-discovery` (via `repo-agentifier`)

**Purpose:** Capture testing conventions across all layers

**When to refresh:** After test framework changes

**Safe to edit:** ✅ Yes, document new patterns

**Contains:**
- Unit test framework (Jest, Vitest, pytest, JUnit, etc.)
- Integration test approach
- E2E test framework (Playwright, Cypress, Selenium, etc.)
- Mocking style (jest.mock, sinon, unittest.mock)
- Assertion patterns (expect, assert, should)
- Test execution commands per layer
- Coverage expectations

**Example excerpt:**
```markdown
## Unit Tests
- Framework: Jest
- Location: src/**/__tests__/*.test.ts
- Mocking: jest.mock for dependencies
- Run: `npm test`

## Integration Tests
- Framework: Jest with Supertest
- Location: tests/integration/**/*.test.ts
- Database: In-memory PostgreSQL (pg-mem)
- Run: `npm run test:integration`

## E2E Tests
- Framework: Playwright
- Location: tests/e2e/**/*.spec.ts
- Run: `npm run test:e2e`
```

---

## `.arcus/` Files (Session Workspace)

### `session-checkpoint.json`

**Created by:** `arcus-controller` (Stage 0)

**Purpose:** Track pipeline state for resumability across sessions

**Safe to edit:** ⚠️ Rarely (can manually reset stage status if needed)

**Schema:**
```json
{
  "version": 2,
  "story_id": "STORY-123",
  "mode": "gated",
  "current_stage": 2,
  "stages": {
    "0": {"status": "complete"},
    "1": {"status": "complete"},
    "2": {"status": "in_progress"},
    "3": {"status": "pending"},
    "4": {"status": "pending"},
    "5": {"status": "pending"}
  },
  "review_round": 0,
  "last_updated": "2026-06-17T10:30:00Z"
}
```

**Status values:**
- `pending` — Not started
- `in_progress` — Currently running
- `awaiting_handoff` — Paused at gate, waiting for user
- `complete` — Finished
- `needs_rework` — Review failed, requires fixes

---

### `specs/[STORY-ID]/story.md`

**Created by:** `arcus-controller` (Stage 0)

**Purpose:** Canonical copy of original story for reference

**Safe to edit:** ⚠️ Not recommended (use original file instead)

**Contains:** Exact copy of your input story file

---

### `specs/[STORY-ID]/context-pack.md`

**Created by:** `context-pack-builder` (Stage 1, optional)

**Purpose:** Story-specific context bundle (relevant flows and patterns)

**Safe to edit:** ✅ Yes, add missing context before planning

**Contains:**
- Links to relevant `.context/flows/*.md` files
- Likely working areas (files to modify)
- Related patterns or conventions

---

### `specs/[STORY-ID]/assumptions.md`

**Created by:** `spec-finalizer` (Stage 1)

**Purpose:** Document technical decisions and constraints

**Safe to edit:** ✅ Yes, refine decisions before proceeding to Stage 2

**Contains:**
- Architecture decisions (layering, patterns to use)
- Validation rules and error handling approach
- Performance constraints
- Security considerations
- Integration decisions

**Example excerpt:**
```markdown
## Architecture Decisions
- Follow existing Controller → Service → Repository pattern
- Use UserService for business logic
- Validation at controller layer

## Error Handling
- Return 400 for validation errors
- Return 409 for duplicate email
- Use centralized error handler

## Validation
- Email format: RFC 5322
- Password: min 8 chars, require uppercase, number, special char
```

---

### `specs/[STORY-ID]/clarifications.md`

**Created by:** `spec-finalizer` (Stage 1, gated mode only)

**Purpose:** Record user answers to clarifying questions

**Safe to edit:** ✅ Yes, correct answers before planning

**Contains:** Q&A pairs from interactive dialogue

---

### `specs/[STORY-ID]/blueprint.md`

**Created by:** `implementation-planner` (Stage 3)

**Purpose:** Break story into atomic tasks with Definition of Done

**Safe to edit:** ✅ Yes, refine tasks before `subagent-task-dispatcher` runs

**Contains:**
- Task list with IDs
- Complexity per task (heavy/medium/light) for model selection
- Affected files per task
- Definition of Done (how to verify completion)
- Success criteria

**Example excerpt:**
```markdown
## Task 1: Add email validation [MEDIUM]

**Affected files:**
- src/api/controllers/AuthController.ts
- src/validators/EmailValidator.ts

**Definition of Done:**
- Email validation function created
- RFC 5322 compliant
- Unit tests pass
- Invalid emails rejected with clear message

**Success Criteria:**
- `npm test src/validators/__tests__/EmailValidator.test.ts` passes
```

---

### `specs/[STORY-ID]/test-plan.md`

**Created by:** `test-spec-compiler` (Stage 2)

**Purpose:** Design test matrix before code is written (TDD)

**Safe to edit:** ✅ Yes, add missing test cases before Stage 3

**Contains:**
- **Functional tests:** Happy path verification
- **Edge case tests:** Boundary conditions, null handling
- **Error handling tests:** Validation failures, exceptions
- Each test mapped to blueprint task ID

**Example excerpt:**
```markdown
## Functional Tests

### F1: Valid email acceptance [Task 1]
- Input: user@example.com
- Expected: Validation passes

### F2: Valid email with subdomain [Task 1]
- Input: user@mail.example.com
- Expected: Validation passes

## Edge Cases

### E1: Email with plus addressing [Task 1]
- Input: user+tag@example.com
- Expected: Validation passes

### E2: Single character local part [Task 1]
- Input: a@example.com
- Expected: Validation passes

## Error Handling

### R1: Missing @ symbol [Task 1]
- Input: userexample.com
- Expected: Error "Invalid email format"
```

---

### `specs/[STORY-ID]/review.md`

**Created by:** `code-reviewer` (Stage 4)

**Purpose:** Consolidated review findings with verdict

**Safe to edit:** ❌ No (regenerated each review round)

**Contains:**
- Spec compliance issues
- Code quality issues
- Security vulnerabilities
- Performance concerns
- Severity per finding (critical/warning/suggestion)
- **Verdict:** `approved` or `changes_requested`

**Severity taxonomy:**
- **critical** — Blocks merge (outage, data loss, security breach)
- **warning** — Concrete issue (performance hit, maintainability)
- **suggestion** — Minor nit (non-blocking)

---

### `specs/[STORY-ID]/PR_DESCRIPTION.md`

**Created by:** `pull-request-builder` (Stage 5)

**Purpose:** Final PR body synthesized from all artifacts

**Safe to edit:** ⚠️ After Stage 5 completes (for manual tweaks)

**Contains:**
- Story summary
- Key assumptions
- Implementation approach
- Test coverage
- Review status
- Breaking changes (if any)

---

## Editing Guidelines

### ✅ Safe to Edit (Before Next Stage)

**These files are meant to be reviewed and improved:**

- **All `.context/` files** — Improve documentation quality anytime
- **`assumptions.md`** — Refine decisions before planning (Gate A)
- **`blueprint.md`** — Adjust task breakdown before implementation (Gate B)
- **`test-plan.md`** — Add missing test cases before coding (Gate B)
- **`context-pack.md`** — Add missing context before planning

**Best practice:** Edit at handoff gates before saying "yes" to proceed

---

### ⚠️ Edit with Caution

**These files have specific schemas or workflows:**

- **`session-checkpoint.json`** — Only edit if you understand state schema
- **`story.md`** — Edit original file instead (this is a copy)
- **`PR_DESCRIPTION.md`** — Edit after Stage 5 if needed, but regeneration overwrites

---

### ❌ Do Not Edit

**These files are regenerated and your changes will be lost:**

- **`review.md`** — Regenerated each review round
- **Scripts in `.arcus/bin/`** — Managed by bootstrap process

---

## File Lifecycle

### Shared Context (`.context/`)

```mermaid
graph LR
    A[Run: agentify this repo] --> B[.context/ created]
    B --> C[Committed to git]
    C --> D[Shared across team]
    D --> E{Codebase changes?}
    E -->|Major refactor| F[Re-run agentify]
    E -->|Minor changes| D
    F --> B
```

### Story Workspace (`.arcus/specs/[ID]/`)

```mermaid
graph LR
    A[Run: implement story.md] --> B[Stage 0: workspace created]
    B --> C[Stage 1: assumptions.md]
    C --> D[Stage 2: test-plan.md]
    D --> E[Stage 3: blueprint.md + code]
    E --> F[Stage 4: review.md]
    F -->|approved| G[Stage 5: PR_DESCRIPTION.md]
    F -->|changes_requested| E
    G --> H[PR created]
    H --> I[.arcus/ can be deleted]
```

---

## Common Questions

**Q: Can I commit `.arcus/` to git?**  
A: Not recommended. It's git-ignored by design (workspace data, not source).

**Q: What if I accidentally delete `.arcus/`?**  
A: You lose pipeline state and will need to restart from Stage 0. Artifacts in `.context/` are safe (committed to git).

**Q: Should I commit `.context/` to git?**  
A: ✅ Yes! It's shared knowledge for your team.

**Q: How do I refresh stale context?**  
A: Re-run `agentify this repo` to regenerate `.context/`.

**Q: Where do I find my PR description after Stage 5?**  
A: `.arcus/specs/[STORY-ID]/PR_DESCRIPTION.md`

**Q: Can I reuse artifacts across stories?**  
A: `.context/` is reused automatically. `.arcus/specs/` is per-story.

---

## What's Next?

- **Understand the pipeline:** Ask "explain the pipeline"
- **See all commands:** Ask "command reference"
- **Choose a mode:** Ask "gated or afk?"
- **Get help:** Ask "troubleshooting"
