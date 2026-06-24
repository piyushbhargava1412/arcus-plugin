---
name: security-reviewer
description: >
  A planted violation fixture: this reviewer allows Write (missing from disallowed-tools).
layer: capability
user-invocable: false
disable-model-invocation: true
disallowed-tools: Edit, MultiEdit
---

# Write-Enabled Reviewer (Planted Violation)

This fixture simulates an advisory reviewer that incorrectly allows Write operations.
It should fail the L1-4 checkAdvisoryReadOnly check because Write is not in disallowed-tools.
