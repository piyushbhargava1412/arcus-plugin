# Test Plan: [STORY-ID] - [STORY-TITLE]

## Objective
[Brief description of the verification goals for this story.]

## Task-to-Test Mapping Matrix
| Task ID | Component / Code Reference | Test Scenario | Category | Complexity | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Task 1** | [e.g. EmailValidator] | Invalid format "user@com" | Edge Case | medium | Throw `InvalidEmailException` |
| **Task 1** | [e.g. EmailValidator] | Valid format "user@otto.com" | Happy Path | light | Return `true` |
| **Task 2** | [e.g. UserService] | Duplicate email registration | Error Case | medium | Return 409 Conflict |
| **All** | [e.g. HealthCheck] | System startup | Regression | light | Status "UP" |

## Detailed Test Matrix

One `### Task N: <title>` subsection per plan task, each with a case table below. This is the
deterministic anchor — the `### Task N:` subsection of `## Detailed Test Matrix` — that
`subagent-task-dispatcher` Step 1 extracts per task, rather than a grep over prose. Close with a
terminal `### All Tasks` subsection for cross-cutting regression cases that are not tied to a
single task.

### Task N: <title>
| Test Case | Category | Complexity | Expected Result |
| :--- | :--- | :--- | :--- |
| [Scenario description] | Happy Path / Edge Case / Error Case / Regression | light/medium/heavy | [Expected outcome] |

### All Tasks
| Test Case | Category | Complexity | Expected Result |
| :--- | :--- | :--- | :--- |
| [Existing flow that must remain green — from the flows linked in context-pack.md's Relevant Flows section] | Regression | light | [Expected outcome] |

## Test Implementation Assets
- **Test Framework**: [e.g. JUnit 5 / Mockito]
- **Base Test Classes**: [e.g. `BaseIntegrationTest.java`]
- **Mocking Strategy**: [e.g. Mock external Payment API]

---
*Next Step: Invoke `subagent-task-dispatcher` to begin iterative development.*



