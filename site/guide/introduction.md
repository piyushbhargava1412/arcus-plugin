# Introduction

**ARCUS (Any Repository Can Use Spec-driven development)** is an agentic SDLC factory that transforms written user stories into reviewed, test-backed pull requests. Delivered as an installable agent-skills plugin for GitHub Copilot, Claude Code, VS Code, and OpenCode, ARCUS orchestrates a Spec → Code → Pull Request pipeline through one stateful orchestrator. Its default **lean** profile is orthogonal to the three modes (gated, intelligent, and afk); the full 5.x pipeline remains available as the opt-in **thorough** profile.

## What is ARCUS?

ARCUS is your AI-powered software development lifecycle factory. By default it takes a markdown story
through `scaffold → plan → branch → task_1..N → code_review → context_sync → closure`, producing
tested, reviewed code and an opened pull request. Add `--thorough` to use the complete 5.x
Brainstorm/Test Plan pipeline and its specialist review ceremony.

The system is built around a repository-agentifier and a single stateful orchestrator with two
profiles (lean and thorough) and three modes:

### `repo-agentifier`

Prepares your repository for agent-driven development by scanning its structure and building a shared context snapshot. It produces:

- **`.context/` directory** — A token-efficient snapshot containing:
  - `repo_scope.md` — Overview of repository structure and tech stack
  - `repo_map.md` — Navigation map of key directories and files
  - `flows/*.md` — Discovered business flows and patterns
  - `testing-patterns.md` — Captured test conventions and frameworks
  - `design-and-coding-patterns.md` — Captured design patterns, coding conventions, and a curated "Avoid" list
- **`AGENTS.md`** — Navigation index for agent sessions
- **`CLAUDE.md`** — Import directive to activate the context

This is a one-time setup per repository, re-run only after major restructuring or tech stack changes.
See [Context Engineering](/concepts/context-engineering) for how these five artifacts are built once,
scoped per story, and synced on drift.

ARCUS is a **three-tier capability library** — atomic, plug-n-play capabilities; thin coordinators
that sequence them; and one stateful orchestrator (`arcus-controller`) that owns the pipeline.
See [The Capability Library](/concepts/capability-library) for how the pieces fit together. The
orchestrator runs the same pipeline in **three modes**:

### Gated (default) — `arcus-controller`

The default, user-driven mode. Start with `arcus <STORY>`. In lean, the default stop is after
`plan`; in thorough, it remains after `test_plan`, `implementation`, and `code_review`. You can:

- Answer the open questions in your own words, all in one go
- Configure phase-boundary gates via `.arcus/config.json`
- Invoke stages individually — `generate test plan for <STORY>`, `code <STORY>`,
  `review <STORY>`, `close <STORY>`
- Pause and resume — your session checkpoint persists across agent sessions; on a cold resume, type
  `resume <STORY>`
- Answer the batched open questions — raised all at once, each presenting one **Recommended**
  option with a rationale, and you can always answer in your own words

### Intelligent — `arcus-controller`

Surfaces only Brainstorm open questions; no phase-boundary gates ever fire. This is cloud's default
behavior — every ARCUS cloud/CI run is scaffolded with `--intelligent` explicitly. Trigger locally
with `arcus <STORY> --intelligent`.

### AFK (autonomous) — `arcus-controller`

The hands-off mode of the same orchestrator. Open questions are recorded but never surfaced, so
nothing ever stops. Trigger with `forge <STORY>`, `afk <STORY>`, `run afk on <STORY>`, or
`arcus <STORY> --afk`.

## Who is ARCUS for?

ARCUS is designed for development teams and individual engineers who want to:

- Maintain spec-driven development discipline without manual overhead
- Get AI assistance across the full SDLC, not just code generation
- Keep humans on the two decisions that matter: the open questions, and the pull request
- Produce consistently reviewed, tested, and documented changes
- Scale from small bug fixes to complex feature implementations

## Next Steps

Ready to start? See the [Quickstart](/guide/quickstart) guide to install ARCUS and run your first story.

Want to understand the pipeline stages in depth? Check out [Pipeline Concepts](/concepts/pipeline) for a detailed breakdown of how ARCUS works.
