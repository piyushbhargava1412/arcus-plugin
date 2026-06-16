# Reference: Context Drift Indicators

Context drift occurs when the agent's changes accidentally violate the core architectural rules or assumptions established at the start of the story.

## Indicators of Drift

### 1. Breaking Architectural Boundaries
- **Symptom**: New code adds an import from a package that was explicitly marked as "Excluded" in the `context-pack.md`.
- **Check**: Compare imports in modified files against the `context-pack.md` (which contains the repo map).

### 2. Violating Safe Defaults
- **Symptom**: The agent implements an error-handler that differs from the one agreed upon in `assumptions.md` (e.g., throwing a raw Exception instead of a domain-specific one).
- **Check**: Scan new logic for deviation from `assumptions.md`.

### 3. Redundant Code
- **Symptom**: The agent creates a new utility function when a perfectly suitable one already exists and was documented in `.context/repo_scope.md`.
- **Check**: Verify if new utilities overlap with existing ones mentioned in the context pack.

### 4. Excessive File Modification
- **Symptom**: The agent is modifying files that were not in the "Impacted Files" list of the `blueprint.md` without updating the plan.
- **Check**: Audit the list of changed files against the blueprint.

## Resolution Strategies (Signals to Orchestrator)
- **Re-Ground**: Request permission to read `context-pack.md` and `assumptions.md` again to refresh context.
- **Rollback**: Signal that a task went completely off-track and suggest a `git checkout` to reset the file.
- **Update the Pack**: If drift occurred because the initial context pack was insufficient, **signal the orchestrator to re-invoke the `context-pack-builder`** to broaden the grounding.


