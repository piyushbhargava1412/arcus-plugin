# krill_agent-forge
A proof-of-concept (PoC) for an "Away From Keyboard" (AFK) agenting SDLC factory. The project provides a set of agents, skills, prompts you can install into a target repository to run an autonomous Spec → Code + Pull Request workflow.

This README focuses on installation and usage of the AFK flow in a target repository. For design decisions and project rationale see the `docs/decisions/` folder.

## Quick links
- `scripts/install.sh` — install the forge into a target repository
- `skills/afk-skill-router/SKILL.md` — the meta-skill that orchestrates the AFK pipeline (for Copilot CLI / Claude Code)
- Design decisions: `docs/decisions/` — rationale behind PoC choices (brownfield testing, thin-slice scope, testing framework, and harness selection).
- Agent descriptions: `agents/` — see `context-builder.agent.md` for expected behavior and outputs.
- Skills: `skills/` — each skill contains `SKILL.md`, `scripts`, `assets`, and `references` describing tasks the orchestrator will execute.

## Prerequisites
- macOS / Linux (zsh or bash)
- Git and a working checkout of the target repository
- A terminal with permission to copy files into the target repo
- (Optional but recommended) `gh` (GitHub CLI) configured with a token if you want automatic PR creation

## Installation into a target repository
1. Open a terminal and run the installer with the absolute or relative path to the target repository root:

```zsh
./scripts/install.sh /path/to/target-repo
```

What `install.sh` does
- Creates a working area for story processing under the target repo: `.aforge/specs/`
- Copies the agents, skills, scripts and prompts into the target repo under `.github/agents`, `.github/skills`, `.github/scripts` and `.github/prompts` so they live with the project
- Creates a soft link of .github/skills to .claude/skills in the target repo

## Preparing the target repository (recommended steps)
1. Make the target repository "AI Ready" — the PoC assumes the repo has a reasonable structure and basic tests. The exact definition of "AI Ready" is part of the PoC scope and should be documented in the target repo.
2. Build the repository context once before running stories. The project includes a `context-builder-orchestrator` meta skill that explains what to generate. To bootstrap the shared repository context either:
   - [Recommended] Type "generate context" and the meta skill will be invoked on Claude or Copilot CLI
      - same could be done from the IDE chat by typing "/context-builder-orchestrator generate context"
   - [Not Recommended] Manually create the `.context/` files the agent expects: `.context/repo_scope.md`, `.context/repo_map.md`, `.context/flows/*.md`, `.context/testing-patterns.md`
3. (Optional) Add a short `copilot-instructions.md` (or `AGENTS.md`) at the repo root describing the repository context and the forge workflow for future users. You could also soft link the `copilot-instructions.md` to `AGENTS.md` and `CLAUDE.md`

## Running the AFK (execute a story)

### Agentic via Copilot/Claude CLI (recommended)

The `afk-skill-router` skill is installed as part of the installation. When you start a Copilot/Claude CLI session in the target repo, it's automatically available. Just say "implement [STORY File]":

```zsh
# Interactive
copilot
> implement path/to/story.md

# Programmatic (fully unattended)
copilot -p "implement path/to/story.md" --yolo
claude --dangerously-skip-permissions "implement path/to/story.md"
```

The skill-router orchestrates the full pipeline (Init → Architect → TestGen → Code → Closure) autonomously, calling helper scripts at `.github/scripts/` for deterministic git operations.

### Notes
- It runs a multi-stage AFK workflow (Init → Architect → Test → Code → Closure). See `skills/afk-skill-router/SKILL.md` for the stage definitions
- The orchestrator will attempt to create a pull request using `gh pr create` when closure completes; ensure `GH_TOKEN` / `GITHUB_TOKEN` or `gh auth` is configured if you want that behavior.
- Helper scripts (branch, commit, PR, checkpoint) are installed at `.github/scripts/` in the target repo.

## Where to find outputs and monitoring
- The orchestration produces a working space per story under `.aforge/specs/[STORY-ID]/` in the target repo. This folder contains all artifacts and logs for traceability.

Key artifacts created (per story, created in this order)
- `session-checkpoint.md` — resumable execution checkpoints
- `story.md` — canonical copy of the input story
- `context-pack.md` — compact context bundle used for token-efficient planning
- `assumptions.md` — explicit assumptions used to resolve ambiguity
- `blueprint.md` — implementation plan and task list
- `test-plan.md` — generated verification matrix and test cases
- `PR_DESCRIPTION.md` — final PR body used by the `pull-request-builder` skill

## Best practices and guidance
- Always run the `context-builder` once (or refresh it after major repo restructuring). The AFK orchestrator expects a `.context/` snapshot when performing the Architect stage.
- Keep user stories small and well-groomed for the PoC thin-slice approach — a single story should represent a slice that can complete in an iterative TDD loop.
- Treat the `.aforge/specs/` workspace as ephemeral/working data for each story — it contains the execution log and artifacts and is safe to inspect, commit, or discard depending on your workflow.

## Troubleshooting
- If the orchestrator fails to create a PR: verify `gh` installation and that a valid token is available via `GITHUB_TOKEN` / `GH_TOKEN`, or run `gh auth login`.
- If the `context-pack.md` is missing: run the `context-builder` agent steps described in `agents/context-builder.agent.md` to regenerate `.context/` and re-run the story.

## License / Notes
- This is a proof-of-concept. Treat deployed behavior and automatic PR creation with caution until you have validated results in a sandbox environment.


