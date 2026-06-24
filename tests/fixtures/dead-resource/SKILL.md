---
name: dead-resource
description: Test fixture with a reference to a non-existent asset file
layer: capability
---

# Dead Resource Fixture

This skill references a file that does not exist: `assets/missing-file.md`.

It should trigger a resource path validation error.

See also: `references/another-missing.json` for more details.
