---
name: security-reviewer
description: >
  A planted violation fixture: this reviewer allows Write (missing from disallowedTools).
layer: capability
user-invocable: false
tools: Read, Grep, Glob
disallowedTools: Edit, MultiEdit
---

# Write-Enabled Reviewer (Planted Violation)

This fixture simulates an advisory reviewer that incorrectly allows Write operations.
It should fail the L1-4 checkAdvisoryReadOnly check because Write is not in disallowedTools.
The `tools:` allowlist is deliberately valid so the denylist gap is the ONLY violation.
