# Reference: Task Decomposition Patterns

When acting as the **Tech Lead** to break down a story into an implementation plan, follow these task decomposition patterns.

## Goal: Atomic Tasks
Each task should ideally target a single concern. If a task takes more than 5-10 minutes of manual human-equivalent coding, it should probably be split.

## Patterns

### 1. Data-First (The Model)
1. Define/Modify Entities/DTOs.
2. Update repository interfaces/mappers.
3. Verify data persistence with a test.

### 2. Logic-First (The Service)
1. Implement the core business logic in a service class.
2. Mock dependencies.
3. Verify logic with unit tests.

### 3. Edge-In (The Controller/Entry Point)
1. Define the API endpoint or CLI command.
2. Map input to service calls.
3. Verify with an integration test.

## Slicing Principles
- **Functional Slicing**: Don't split by "write code" then "write test". Every task MUST include the tests required for its own DoD.
- **Dependency Awareness**: Order tasks so that dependencies are met. If Service A depends on DTO B, define DTO B first.
- **Risk Mitigation**: Implement high-risk or complex logic first.

## Definition of Done (DoD) Requirements
Every task's DoD MUST include:
1. Functional correctness (the logic works).
2. Test coverage (unit or integration).
3. Adherence to repository patterns (matching `context-pack.md`).
4. Proper error handling (as defined in `.arcus/specs/[STORY-ID]/plan.md`).

