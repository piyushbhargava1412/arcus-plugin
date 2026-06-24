---
name: inline-model
description: Test fixture with hardcoded model routing decision
layer: capability
---

# Inline Model Fixture

This skill incorrectly hardcodes a model routing decision.

For heavy tasks, we dispatch with model `claude-opus-4-8` directly.
For light work, use `claude-haiku-3-5` instead.

This violates the single-resolution-point invariant.
