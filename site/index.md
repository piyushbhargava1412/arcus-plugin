---
layout: home

hero:
  name: ARCUS
  text: Your repo writes the code. You hold the gate.
  tagline: ARCUS (Any Repository Can Use Spec-driven development) turns a written requirements into a tested, reviewed pull request. You approve the big moments; it sweats the rest. For simpler ones, it lets you sleep if you like ;)
  actions:
    - theme: brand
      text: Cut-the-chase
      link: /guide/quickstart
    - theme: alt
      text: Lets-take-it-Slow
      link: /guide/introduction
    - theme: alt
      text: Tell-me-Everything
      link: /concepts/pipeline
    - theme: alt
      text: How-the-Magic-Happens
      link: /guide/how-it-works
    - theme: alt
      text: What's Inside
      link: https://github.com/piyushbhargava1412/arcus-plugin
    - theme: alt
      text: Meet-the-Team
      link: /comic/

features:
  - title: "Spec-driven-development (SDD)"
    details: Provides orchestration of a lean Spec → Code → Pull Request flow through planning, implementation, deterministic gates, review, and closure; the full 5.x phases remain available with --thorough.
  - title: "Context Engineering - the Edge !"
    details: Scans your repository to build the context snapshot (one-time) to make it "AI Ready" and also helps refresh and keep the context always in sync with the evolving code during each SDD cycle.
  - title: "Three Modes (pick your pace)"
    details: One `arcus-controller` orchestrator, lean by default and thorough with `--thorough`, across three modes (gated, intelligent, afk). See [modes](/concepts/modes) for the comparison.
  - title: "Multi-tool (Copilot CLI / Claude Code / VS Code / OpenCode)"
    details: One plugin format serves GitHub Copilot CLI, Claude Code, VS Code, and OpenCode from the same marketplace. Install once, use everywhere.
---

## Install

Inside any Claude Code or Copilot CLI session:

```
/plugin marketplace add piyushbhargava1412/arcus-plugin
/plugin install arcus-plugin@arcus
```

For OpenCode, use the one-command global installer — see the [README](https://github.com/piyushbhargava1412/arcus-plugin#opencode) for details.
