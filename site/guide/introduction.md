# Introduction

**ARCUS (Any Repository Can Use Spec-driven development)** is an agentic SDLC factory that transforms written user stories into reviewed, test-backed pull requests. Delivered as an installable agent-skills plugin for GitHub Copilot, Claude Code, and VS Code, ARCUS orchestrates a complete Spec → Code → Pull Request pipeline through human-gated stages, with a fully-autonomous Away From Keyboard (AFK) mode as an add-on orchestrator skill.

## What is ARCUS?

ARCUS is your AI-powered software development lifecycle factory. It takes a user story written in markdown and runs it through a six-phase pipeline (`Brainstorm → Test Plan → Implementation → Code Review → Context Sync → Closure`, spanning ten ordered stages) that produces production-ready code, complete with tests and code review, ending with an opened pull request.

The system is built around a repository-agentifier and **two experiences** over the same pipeline:

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

### Gated experience — `solution-architect` + a self-handoff chain

The **default, user-driven** experience is a chain of self-handing-off stage skills with **no router
and no shared pipeline file**. You enter at `arcus:solution-architect` (`solution-architect <STORY>`
or `plan <STORY>`); each stage skill names only its immediate successor and pauses at a handoff gate.
You can:

- Review and approve at each gate with "yes" to proceed
- Invoke stages individually — `generate test plan for <STORY>`, `implement <STORY>`,
  `review <STORY>`, `close <STORY>`
- Pause and resume — your session checkpoint persists across agent sessions; on a cold resume, type
  the next stage's phrase
- Answer recommendation-first interviews — every gated question presents one **Recommended** option
  with a rationale, plus a custom-answer option

### AFK experience — `arcus-controller`

The opt-in **autonomous** experience is the `arcus-controller` meta-skill. It activates only on AFK
phrases (`afk`, `--afk`, `forge`, `run afk on <STORY>`), runs every stage back-to-back as one-shot
subagents with milestone-only output, and never stops at a gate. Its body holds the single canonical
ordered stage list for the pipeline.

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
