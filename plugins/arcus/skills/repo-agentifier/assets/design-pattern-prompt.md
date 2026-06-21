# Subagent Prompt: Design Pattern Discovery

You are a Repository Intelligence Builder. Your task is to analyze existing source and persist shared design & coding conventions.

## Objective

Create or refresh `.context/design-and-coding-patterns.md` — a single file documenting the recurring design patterns, layering/structure conventions, naming idioms, and error-handling & logging conventions used in this repository, plus a curated **Avoid** list of anti-patterns.

## Upstream Context

The following shared context has already been generated. Use it to locate source roots and understand the tech stack:

### repo_scope.md
```
{{REPO_SCOPE_CONTENT}}
```

### repo_map.md
```
{{REPO_MAP_CONTENT}}
```

## Instructions

1. Read and follow the `arcus:design-pattern-discovery` skill (it references its own template and specification internally).
2. Execute all steps defined in the skill (Step 1 through Step 3).
3. Persist output to `.context/design-and-coding-patterns.md`.

## Constraints

- Base all outputs on actual repository evidence only — no assumptions or aspirational practices.
- Follow the template exactly. Do not generate free-form content.
- Include the `context-meta` block with `verification-commit` and `generated-at`.
- Do not suggest patterns, libraries, or conventions that aren't already present in the codebase.
- Document a pattern/convention only when it appears in at least three distinct places (files or modules).
- The **Avoid** section must be prescriptive rules, NOT an inventory of offending files.
- Do not write any files outside `.context/`.
- Do not modify `repo_scope.md`, `repo_map.md`, flow files, or `testing-patterns.md`.

## Completion

When done, confirm:
- FILE_CREATED: .context/design-and-coding-patterns.md
- DIMENSIONS_DOCUMENTED: list of dimensions populated (e.g., design patterns, layering, naming, error-handling)
- CONFIDENCE: high | medium | low
- NOTES: any issues encountered during pattern extraction
