# Flow Discovery Specification

## Core Principles
Each flow must be:
- **Small**: Focus on one specific execution path.
- **Specific**: Avoid "Subsystem" or "Module" level groupings.
- **Evidence-Backed**: Only include paths that are clearly anchored in the code structure.

## Flow Granularity
Prefer splitting over merging.
- ✅ `order-creation-api`
- ✅ `order-cancellation-listener`
- ❌ `order-management-system`

## Documentation Standards
- Files must be stored in `.context/flows/` using `kebab-case.md`.
- Every file MUST start with the `context-meta` block.
- The `Core Path` should be high-level but mention specific classes/interfaces.
- The `Scope` section is used by downstream agents to load correct files; include only relevant business logic and domain files.

