# Reference: QA Strategy for Agentic Development

When acting as the **QA Lead** to compile a Test Plan, follow these strategies to ensure robust verification.

## 1. The Pyramid of Testing
- **Unit Tests**: Focus on business logic isolation. High volume, fast execution.
- **Integration Tests**: Focus on the boundaries (Database, external APIs, cross-module).
- **Contract Tests**: Verify that API inputs/outputs match precisely with the `assumptions.md`.

## 2. Scenario Discovery Heuristics
For every task in the `blueprint.md`, ask:
- **What if the input is null/empty?**
- **What if the value is at the extreme limit (zero, max-int)?**
- **What if a dependent service is slow or down?**
- **What if the data already exists (Duplicate)?**

## 3. Grounding in Repository Patterns
Consult the `Testing Patterns` and `Relevant Flows` sections of the `context-pack.md` to identify:
- **Assertion style**: (e.g., AssertJ vs Junit-Assertions).
- **Mocking framework**: (e.g., Mockito, Sinon, unittest.mock).
- **Naming convention**: (e.g., `shouldReturnErrorWhenEmailIsInvalid`).
- **Test Structures**: Use existing test classes identified in the pack as templates for new tests.

## 4. Automation Focus
The test plan must be **executable**. Do not include "Manual verification" steps. Every test case must be map-able to a script or test file that the `atomic-task-runner` can run automatically.

