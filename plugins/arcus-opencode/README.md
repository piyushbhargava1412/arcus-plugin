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

**By default, ARCUS runs entirely on your OpenCode session's default model.** The bundled agents ship
with no `model:` key and nothing needs configuring.

To run different pipeline stages on different models, add a `models` block to `.arcus/config.json` in
your repo — the same policy file every ARCUS host reads:

```json
{
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  { "opencode": "github-copilot/claude-opus-4.8" },
      "medium": { "opencode": "github-copilot/claude-sonnet-4.6" },
      "light":  { "opencode": "github-copilot/claude-haiku-4.5" }
    }
  }
}
```

The plugin resolves this at load and writes the matching model into each staged agent under
`.opencode/agents/`, so a policy edit takes effect on your next session. Resolution is fail-open: a
malformed policy, or one with no `opencode` entry, logs a warning and leaves the agents on the
session default. The model identifiers are yours to supply — ARCUS ships no presets for any provider.

See the [model policy guide](https://arcus.opsimplify.com/guide/model-policy) for the full precedence
ladder and config shape.

## License

Apache-2.0 © Piyush Bhargava. See the bundled `LICENSE` and `NOTICE`, and the
[trademark policy](https://github.com/piyushbhargava1412/arcus-plugin/blob/main/TRADEMARK.md)
for use of the **ARCUS** name and logo.
