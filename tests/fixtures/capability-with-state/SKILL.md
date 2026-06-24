---
name: capability-with-state
description: >
  A planted violation fixture: a capability that references orchestration state.
layer: capability
---

# Capability With State (Planted Violation)

This fixture simulates a capability that incorrectly references orchestration state.

## Workflow

1. First, run `checkpoint.sh set-status <STORY_ID> in_progress` to mark the stage as started.
2. Then proceed to the next stage by updating the checkpoint.
3. Finally, call `branch.sh` to create the branch.

This should fail the L1-5 checkCapabilityNoState check because it references checkpoint.sh and branch.sh.
