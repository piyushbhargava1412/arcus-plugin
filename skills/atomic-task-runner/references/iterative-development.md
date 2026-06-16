# Reference: Iterative Development Loop

The **Atomic Task Runner** follows a strict, verification-driven development loop. For every single task in the blueprint, follow these steps:

## 1. Task Isolation
- Focus ONLY on the current task. **Do not look ahead** or try to optimize future tasks.
- Identify the specific files and tests mentioned in the `blueprint.md` and `test-plan.md` for this task.

## 2. Red: Write the Test First
- Create the test case defined in the `test-plan.md`.
- Run the test suite. It **MUST fail** at this stage (either compilation error or assertion failure). This ensures your test is actually testing the new functionality.

## 3. Green: Implement the Logic
- Write the minimal code required to make the test pass.
- Adhere strictly to the `assumptions.md` and `context-pack.md` (Design patterns, naming conventions).

## 4. Refactor: Clean Code
- Once the test passes, review the code for readability and adherence to the project's style guide.
- Run the test suite again to ensure no regressions.

## 5. Verify Definition of Done (DoD)
- Check off every requirement in the task's DoD.
- Use the `get_errors` tool to ensure no linting or compilation issues in the modified files.

## 6. Record Progress
- Mark the task as `COMPLETED` in your internal state before moving to the next task.
- If a task fails or reveals a hidden complexity, STOP and raise a flag for the `context-drift-verifier`.

