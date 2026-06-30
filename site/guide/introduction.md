# Introduction

**ARCUS (Any Repository Can Use Spec-driven development)** is an agentic SDLC factory that transforms written user stories into reviewed, test-backed pull requests. Delivered as an installable agent-skills plugin for GitHub Copilot, Claude Code, VS Code, and OpenCode, ARCUS orchestrates a complete Spec → Code → Pull Request pipeline through human-gated stages, with a fully-autonomous Away From Keyboard (AFK) mode as an add-on orchestrator skill.

## What is ARCUS?

ARCUS is your AI-powered software development lifecycle factory. It takes a user story written in markdown and runs it through a six-phase pipeline (`Brainstorm → Test Plan → Implementation → Code Review → Context Sync → Closure`, spanning ten ordered stages) that produces production-ready code, complete with tests and code review, ending with an opened pull request.

The system is built around a repository-agentifier and **two modes** of one orchestrator over the same pipeline:

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
orchestrator runs the pipeline in **two modes**:

### Interactive mode (default) — `arcus-controller`

The **default, user-driven** mode. You enter with `implement <STORY>` or `plan <STORY>`; the
`arcus-controller` orchestrator runs the pipeline gated, pausing at each handoff gate. You can:

- Review and approve at each gate with "yes" to proceed
- Invoke stages individually — `generate test plan for <STORY>`, `implement <STORY>`,
  `review <STORY>`, `close <STORY>`
- Brainstorm only (context pack + finalized spec, no implementation) via the `kick-off` coordinator —
  `brainstorm <STORY>` / `kick off <STORY>` / `architect <STORY>`
- Pause and resume — your session checkpoint persists across agent sessions; on a cold resume, type
  the next stage's phrase
- Answer recommendation-first interviews — every question presents one **Recommended** option
  with a rationale, plus a custom-answer option

### Autonomous (AFK) mode — `arcus-controller`

The opt-in **autonomous** mode of the same `arcus-controller` orchestrator. It activates on AFK
phrases (`afk`, `--afk`, `forge`, `run afk on <STORY>`), runs every stage back-to-back as one-shot
subagents with milestone-only output, and never stops at a gate.

## Who is ARCUS for?

ARCUS is designed for development teams and individual engineers who want to:

- Maintain spec-driven development discipline without manual overhead
- Get AI assistance across the full SDLC, not just code generation
- Keep humans in control through explicit handoff gates
- Produce consistently reviewed, tested, and documented changes
- Scale from small bug fixes to complex feature implementations

## Next Steps

Ready to start? See the [Quickstart](/guide/quickstart) guide to install ARCUS and run your first story.

Want to understand the pipeline stages in depth? Check out [Pipeline Concepts](/concepts/pipeline) for a detailed breakdown of how ARCUS works.
