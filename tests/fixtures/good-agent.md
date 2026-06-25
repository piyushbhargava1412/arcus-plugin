---
name: good-agent
description: >
  A well-formed example agent used as the GOOD fixture for checkAgentFrontmatter.
  Use when an orchestrator needs to dispatch the canonical agent shape. Dispatched
  by name — not invoked directly by users.
layer: capability
user-invocable: false
disable-model-invocation: true
tools: Read, Grep, Glob
disallowed-tools: Edit, Write, MultiEdit
model: sonnet
color: cyan
---

# Good Agent

This fixture is a valid agent file: kebab-case name matching the basename, a
description, a valid `layer`, and a tier-word `model`. checkAgentFrontmatter must
return ok:true for it.
