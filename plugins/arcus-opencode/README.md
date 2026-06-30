# arcus-opencode

[ARCUS](https://github.com/piyushbhargava1412/arcus-plugin) — a Spec → Code → Pull Request pipeline — as an [OpenCode](https://opencode.ai) plugin.

This package bundles the ARCUS **skills** and **agents** plus the deterministic helper scripts, and stages them into your repository at session start so OpenCode can drive the full ARCUS workflow.

## Install

ARCUS is distributed as a **GitHub Release tarball** (no npm registry / login required). One command:

```bash
# in your project (global: append  -s -- --global )
curl -fsSL https://github.com/piyushbhargava1412/arcus-plugin/releases/latest/download/install.sh | sh
```

The plugin auto-stages its skills/agents and auto-manages `.gitignore`, so there's nothing else to
configure. (Prefer the manual two-step `pnpm add` + loader? See **[INSTALL.md](./INSTALL.md)**, which
also covers the global install and how maintainers cut a release.)

## What it does

At session start the plugin:

1. Stages the ARCUS **skills** into `.opencode/skills/` and **agents** into `.opencode/agents/` (discovered by OpenCode).
2. Runs the ARCUS bootstrap to stage helper scripts into `.arcus/bin/` and write `.arcus/env`.
3. Appends the generated-artifact paths (`.opencode/skills/`, `.opencode/agents/`, `.arcus/`) to your `.gitignore` automatically (idempotent), keeping the working tree clean.

## Use it

ARCUS is invoked with **natural-language triggers** (no slash commands). Examples:

- `what is arcus` — onboarding / help
- `implement <STORY>` — run the full pipeline (interactive)
- `forge <STORY>` / `afk <STORY>` — autonomous mode
- `brainstorm <STORY>` — spec grounding
- `review <STORY>` — code review
- `sync context` — refresh the shared `.context/` snapshot

## Models

Agent model tiers resolve to GitHub Copilot models by default (`claude-opus-4.8` / `claude-sonnet-4.6` / `claude-haiku-4.5`). The canonical mapping lives in the bundled `model-strategy` skill; Amazon Bedrock is documented as an alternative provider.

## License

MIT
