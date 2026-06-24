---
name: flow-and-scope-discovery
description: Identify business flows and persist each as a separate file in .context/flows. Use when user says "discover and persist flows", "generate context flows", or "what does this repo actually do".
layer: capability
standalone: true
---

# Flow and Scope Discovery

## Overview

Identify key business flows and map each flow to its associated implementation scope. This skill transforms raw repository structure into a set of discrete, specialized context files in `.context/flows/`.

## Contract

> Layer: **capability** — atomic, stateless, given declared inputs → produce one output. No checkpoint reads/writes, no branch ops, no ARCUS path construction.

### Inputs
| Input | Type | Description | Typical source |
|-------|------|-------------|----------------|
| `repo_structure` | markdown | Repository structure map with entry surfaces, services, and components | orchestrator passes repo_map / standalone user supplies it |
| `repo_boundaries` | markdown | Repository purpose and scope information | orchestrator passes repo_scope / standalone user supplies it |

### Outputs
- **`business_flows`** (set of markdown files) — One file per discrete business flow, each containing entry points, core path, scope, and confidence.
  Output convention: pipeline caller sets the path; standalone default `.arcus/outputs/flow-and-scope-discovery/<story-id-or-timestamp>/flows/`. The capability never asks the user where to write.

### Clarification Policy
1. **Output path** — never ask. Default to `.arcus/outputs/flow-and-scope-discovery/<story-id-or-timestamp>/flows/`; orchestrators override with an explicit path (typically `.context/flows/`).
2. **Optional inputs** — never ask. Proceed without them; note the omission in the output.
3. **Required inputs with no sensible default** — ask once, clearly. Cannot proceed without these.

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
1. Use the `./assets/flow.template.md` to generate one file per flow.
2. Files must be placed in `.context/flows/` using `kebab-case.md` file names.
3. **Confidence Scoring**: Assign `high`, `medium`, or `low` based on how much of the path is explicitly confirmed by code evidence.

**Core Rules**:
- **No Aggregation**: Never create a single `all_flows.md`. Each flow must be its own file.
- **Evidence Only**: Do not infer business rules that aren't visible in the code.
- **Consult Specs**: See `./references/flow-spec.md` for granularity rules.

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
