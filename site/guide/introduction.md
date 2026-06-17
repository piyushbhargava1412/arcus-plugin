# Introduction

**ARCUS (Any Repository Can Use Spec-driven development)** is an agentic SDLC factory that transforms written user stories into reviewed, test-backed pull requests. Delivered as an installable agent-skills plugin for GitHub Copilot, Claude Code, and VS Code, ARCUS orchestrates a complete Spec → Code → Pull Request pipeline through human-gated stages, with an opt-in fully-autonomous Away From Keyboard (AFK) mode.

## What is ARCUS?

ARCUS is your AI-powered software development lifecycle factory. It takes a user story written in markdown and runs it through a six-stage pipeline that produces production-ready code, complete with tests and code review, ending with an opened pull request.

The system is built around two orchestrator meta-skills:

### `repo-agentifier`

Prepares your repository for agent-driven development by scanning its structure and building a shared context snapshot. It produces:

- **`.context/` directory** — A token-efficient snapshot containing:
  - `repo_scope.md` — Overview of repository structure and tech stack
  - `repo_map.md` — Navigation map of key directories and files
  - `flows/*.md` — Discovered business flows and patterns
  - `testing-patterns.md` — Captured test conventions and frameworks
- **`AGENTS.md`** — Navigation index for agent sessions
- **`CLAUDE.md`** — Import directive to activate the context

This is a one-time setup per repository, re-run only after major restructuring or tech stack changes.

### `arcus-controller`

Orchestrates the Spec → Code → Pull Request pipeline as a sequence of human-gated stages. Each stage produces artifacts and pauses at handoff gates for your review and approval. You can:

- Run in **gated mode** (default) — Review and approve at each stage with "yes" to proceed
- Run in **AFK mode** (opt-in) — Fully autonomous end-to-end execution with `--afk` flag
- Invoke stages individually — Target specific steps like "brainstorm", "implement", or "review"
- Pause and resume — Your session checkpoint persists across agent sessions

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
