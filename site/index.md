---
layout: home

hero:
  name: ARCUS
  text: Any Repository Can Use Spec-driven development
  tagline: Turn a written user story into a reviewed, test-backed pull request through human-gated SDLC stages, with an opt-in fully-autonomous AFK mode.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: Concepts
      link: /concepts/pipeline
    - theme: alt
      text: GitHub
      link: https://github.com/piyushbhargava1412/arcus-plugin

features:
  - title: Spec-driven pipeline
    details: Orchestrates a Spec → Code → Pull Request flow through human-gated SDLC stages (Init, Brainstorm, Test Plan, Implementation, Code Review, Closure). The pipeline pauses at handoff gates between major stages for your review before proceeding.
  - title: "Repo agentifier (`.context/` + AGENTS.md)"
    details: Scans your repository to build the `.context/` snapshot with repo scope, map, flows, and testing patterns, then generates `AGENTS.md` and `CLAUDE.md` to make it agent-ready.
  - title: Human-gated with AFK opt-in
    details: Runs one stage at a time by default, pausing at each handoff for your review. An opt-in `--afk` mode runs the entire pipeline end-to-end unattended.
  - title: "Multi-tool (Copilot CLI / Claude Code / VS Code)"
    details: One plugin format serves GitHub Copilot CLI, Claude Code, and VS Code from the same marketplace. Install once, use everywhere.
---

## Install

Inside any Claude Code or Copilot CLI session:

```
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```
