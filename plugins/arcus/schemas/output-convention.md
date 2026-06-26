# ARCUS Output Path Convention

This document defines the hybrid output path convention for ARCUS capabilities.

## Overview

ARCUS capabilities produce outputs that must be written to predictable locations. The convention
balances three execution contexts: pipeline orchestration, standalone invocation, and explicit
caller override.

## Rules

### 1. Pipeline Context (Orchestrator/Coordinator Caller, STORY_ID Known)

When a capability is invoked by an orchestrator or coordinator skill that has already established
the ARCUS story workspace:

- **The caller sets the output path** to the per-story spec directory (typically `.arcus/specs/<STORY_ID>/`).
- The capability **never constructs this path itself**. It receives the path as a parameter or via
  environment context.
- This ensures all artifacts for a story remain co-located under the same workspace.

### 2. Standalone Context (No STORY_ID)

When a capability is invoked directly without orchestration context:

- **Default output path**: `.arcus/outputs/<capability-name>/<timestamp>.md`
- The capability resolves `<capability-name>` from its own metadata (skill name) and generates a
  timestamp (ISO 8601, e.g. `YYYY-MM-DDTHH-MM-SS`)
- Example: `.arcus/outputs/spec-finalizer/2026-06-23T14-30-00.md`

### 3. Explicit Caller Override

- An explicit `output_path` parameter from the caller **always takes precedence** over both
  pipeline-inferred and standalone default paths.
- Capabilities must honor this parameter without modification.

### 4. Capability Self-Resolution

- **Capabilities never ask the user about output location.**
- They self-resolve the path using the rules above, in order of precedence:
  1. Explicit `output_path` parameter
  2. Pipeline context path (if orchestrator/caller provided)
  3. Standalone default path

## Examples

| Context                          | Output Path                                      |
|----------------------------------|--------------------------------------------------|
| Pipeline (spec-finalizer)        | `.arcus/specs/ARCUS-0006/grounded-spec.md`      |
| Standalone (spec-finalizer)      | `.arcus/outputs/spec-finalizer/2026-06-23T14-30-00.md` |
| Explicit override                | `/tmp/custom-output.md` (caller-specified)       |

## Implementation Notes

- Capabilities should create parent directories as needed (mkdir -p behavior).
- Git-ignored paths (e.g., `.arcus/`) are appropriate for transient outputs; committed artifacts
  (e.g., `plugins/arcus/schemas/`) belong in versioned plugin directories.
