---
name: flow-and-scope-discovery
description: Identify business flows and persist each as a separate file in .context/flows. Use when user says "discover and persist flows", "generate context flows", or "what does this repo actually do".
metadata: 
  version: "1.0.0"
  team: krill
  type:
    - agents
  inputs:
    - repo_scope
    - repo_map
  outputs:
    - flow_files in .context/flows/
---

# Flow and Scope Discovery

## Overview

Identify key business flows and map each flow to its associated implementation scope. This skill transforms raw repository structure into a set of discrete, specialized context files in `.context/flows/`.

## Instructions

### Step 0:
Identify the skills folder (typically `.github/skills/` or `.agent/skills/`). Store this in an internal variable called `skills_folder`. In the below steps, resolve ${skills_folder} to the actual identified path.

### Step 1: Prep & Metadata
1. Verify that `.context/repo_scope.md` and `.context/repo_map.md` exist.
2. Read `verification-commit` from `repo_scope.md` to use as `CURRENT_COMMIT`.
3. Capture the current ISO timestamp as `GENERATED_AT`.

### Step 2: Discovery & Grouping
1. **Identify Entry Surfaces**: Use `repo_map` to find all Controllers, Listeners/Consumers, and Schedulers.
2. **Apply Narrow Focus**: Group entry points into flows only when they share a direct orchestration path or domain purpose. 
3. **Trace Paths**: For each flow, trace the minimal path from entry point through services to repositories or external integrations.

### Step 3: Persistence
1. Use the `${skills_folder}/flow-and-scope-discovery/assets/flow.template.md` to generate one file per flow.
2. Files must be placed in `.context/flows/` using `kebab-case.md` file names.
3. **Confidence Scoring**: Assign `high`, `medium`, or `low` based on how much of the path is explicitly confirmed by code evidence.

**Core Rules**:
- **No Aggregation**: Never create a single `all_flows.md`. Each flow must be its own file.
- **Evidence Only**: Do not infer business rules that aren't visible in the code.
- **Consult Specs**: See `${skills_folder}/flow-and-scope-discovery/references/flow-spec.md` for granularity rules.

## Examples

**Defining a New Flow**
- **User says**: "Generate a flow on how we handle user registration."
- **Action**: Detect `UserRegistrationController`, trace it to `UserService` and `UserRepository`, then create `.context/flows/user-registration.md`.

**Updating After Changes**
- **User says**: "I added a new webhook for payments, update the flows."
- **Action**: Identify the new listener, trace the handoff, and generate `.context/flows/payment-webhook-handling.md`.

## Troubleshooting

- **Error: `NO_ENTRY_SURFACES`**: No controllers or entry points found in `repo_map`. Ensure the repository is correctly mapped first.
- **Error: `OVER_GENERALIZATION`**: A flow covers too many unrelated entry points. Split them into specialized flow files.
- **Error: `INSUFFICIENT_TRACE`**: Code is too abstract (e.g., heavy reflection) to trace. Document only the confirmed entry point and mark confidence as `low`.

## Validation Gates

- [ ] One file created per discrete business flow in `.context/flows/`.
- [ ] Every file starts with the `context-meta` block.
- [ ] `Core Path` and `Scope` are populated with real file paths.
- [ ] No aggregated "summary" documents created.
