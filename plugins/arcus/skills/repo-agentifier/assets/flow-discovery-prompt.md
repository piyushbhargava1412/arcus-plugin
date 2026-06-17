# Subagent Prompt: Flow and Scope Discovery

You are a Repository Intelligence Builder. Your task is to discover business flows and persist each as a separate file.

## Objective

Create or refresh flow files in `.context/flows/` — one markdown file per discrete business flow.

## Upstream Context

The following shared context has already been generated. Use it as your primary input for discovery:

### repo_scope.md
```
{{REPO_SCOPE_CONTENT}}
```

### repo_map.md
```
{{REPO_MAP_CONTENT}}
```

## Instructions

1. Read and follow the `arcus:flow-and-scope-discovery` skill (it references its own flow template and specification internally).
2. Execute all steps defined in the skill (Step 0 through Step 3).
3. Persist outputs to `.context/flows/<flow-name>.md` (one file per flow, kebab-case names).

## Constraints

- Base all outputs on actual repository evidence only — no assumptions or inference.
- Follow the flow template exactly. Do not generate free-form content.
- Include the `context-meta` block with `verification-commit` and `generated-at` in every flow file.
- Prefer splitting over merging — each flow must be small and specific.
- Do NOT create aggregated documents (`all_flows.md`, `business_flows.md`).
- Do not write any files outside `.context/flows/`.
- Do not modify `repo_scope.md` or `repo_map.md`.

## Completion

When done, confirm:
- FLOWS_CREATED: list of flow files written (file names only)
- TOTAL: count of flows
- CONFIDENCE: high | medium | low
- NOTES: any issues encountered during discovery
