---
name: flow-discovery
description: >
  Identify business flows and persist each as a separate file in .context/flows.
  Dispatched by arcus:repo-agentifier (in parallel with the test/design discovery
  agents) after the repo overview exists.
layer: capability
user-invocable: false
disable-model-invocation: true
tools: Read, Grep, Glob, Bash, Write, Edit
model: opus
color: blue
---

# Flow Discovery

## Overview

Identify key business flows and map each flow to its associated implementation scope. This agent transforms raw repository structure into a set of discrete, specialized context files in `.context/flows/`.

## Contract

### Inputs
| Input | Required | Type | Description |
|-------|----------|------|-------------|
| `repo_structure` | yes | markdown | Repository structure map with entry surfaces, services, and components |
| `repo_boundaries` | yes | markdown | Repository purpose and scope information |

### Outputs
- **`business_flows`** (set of markdown files) — One file per discrete business flow, each containing entry points, core path, scope, and confidence.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/flow-discovery/<timestamp>/flows/`. The capability never asks the user where to write.

## Instructions

### Step 1: Prep & Metadata
1. Verify that `.context/repo_scope.md` and `.context/repo_map.md` exist.
2. Read `verification-commit` from `repo_scope.md` to use as `CURRENT_COMMIT`.
3. Capture the current ISO timestamp as `GENERATED_AT`.

### Step 2: Discovery & Grouping
1. **Identify Entry Surfaces**: Use `repo_map` to find all Controllers, Listeners/Consumers, and Schedulers.
2. **Apply Narrow Focus**: Group entry points into flows only when they share a direct orchestration path or domain purpose. 
3. **Trace Paths**: For each flow, trace the minimal path from entry point through services to repositories or external integrations.

### Step 3: Persistence
1. Use the `"$ARCUS_HOME"/agent-resources/flow-discovery/assets/flow.template.md` to generate one file per flow (resolve `ARCUS_HOME` from `.arcus/env`).
2. Files must be placed in `.context/flows/` using `kebab-case.md` file names.
3. **Confidence Scoring**: Assign `high`, `medium`, or `low` based on how much of the path is explicitly confirmed by code evidence.

**Core Rules**:
- **No Aggregation**: Never create a single `all_flows.md`. Each flow must be its own file.
- **Evidence Only**: Do not infer business rules that aren't visible in the code.
- **Consult Specs**: See `"$ARCUS_HOME"/agent-resources/flow-discovery/references/flow-spec.md` for granularity rules.

## Examples

**Defining a New Flow**
- **Scenario**: The repo exposes a `UserRegistrationController` entry surface.
- **Action**: Detect `UserRegistrationController`, trace it to `UserService` and `UserRepository`, then create `.context/flows/user-registration.md`.

**Updating After Changes**
- **Scenario**: A new payments webhook listener was added since the last build.
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
