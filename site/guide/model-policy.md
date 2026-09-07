# Model Policy

ARCUS 5.0 introduces a configurable **model policy** that controls which model each agent dispatch uses — without ever asking which host you are on. Out of the box, nothing is configured and every dispatch inherits the calling session's own model.

## Why `inherit` is the default

The default policy is `{ "mode": "inherit" }`. With this policy the resolver returns `"dispatch": false` for every call, which means the orchestrating model picks the model — each host uses its own session model with no override. This is deliberately conservative:

- **Zero configuration required.** A freshly scaffolded story runs without a `.arcus/config.json`.
- **Cross-host stories work automatically.** A story started on Claude Code, continued on Copilot CLI, and finished on OpenCode reads the same frozen policy and each host uses its own session model. No flag, no rescaffold.
- **The session model is a known quantity.** Inheriting avoids guessing a model string that may be wrong or stale for a given host.

To tier dispatches by complexity — or pin everything to one model — opt in by adding a `models` block to `.arcus/config.json`.

## The three modes

| Mode | Resolver output | When to use |
| --- | --- | --- |
| `inherit` | `"dispatch": false` — session model for every dispatch | Default; no configuration needed |
| `tiered` | A per-host model map keyed by `heavy` / `medium` / `light` | Cost / quality tiering without manual per-dispatch selection |
| `flat` | One specific model string for every dispatch | Quality sprints, cost-cap constraints, or environment overrides |

## Configuring via `.arcus/config.json`

Create or edit `.arcus/config.json` at the root of your repository and add a `models` key. The file is not created by ARCUS — create it when you want to customize.

```json
{
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  { "claude": "opus",   "copilot": "claude-opus-4.8",   "vscode": "Claude Opus 4.6 (copilot)",   "opencode": "github-copilot/claude-opus-4.8" },
      "medium": { "claude": "sonnet", "copilot": "claude-sonnet-4.6", "vscode": "Claude Sonnet 4.6 (copilot)", "opencode": "github-copilot/claude-sonnet-4.6" },
      "light":  { "claude": "haiku",  "copilot": "claude-haiku-4.5",  "vscode": "Claude Haiku 4.5 (copilot)",  "opencode": "github-copilot/claude-haiku-4.5" }
    }
  }
}
```

The `tiers` object is entirely yours to write: one row per complexity level, and within each row, one entry per host you actually use. `models.mjs` ships no built-in model identifiers of its own — which model backs `heavy`/`medium`/`light` on which host (GitHub Copilot, Amazon Bedrock, a direct Anthropic key, or a mix) is a deployment decision, and it goes stale the moment a provider ships a new version, so ARCUS does not bake in an opinion that would need chasing across every release. Look up the identifiers your own installation accepts — see [Finding your model identifiers](#finding-your-model-identifiers) below — and paste them in.

The `models` block sits alongside `stop_after` (the mode gate), which you may already have.

### Full config example

```json
{
  "stop_after": "plan",
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  { "claude": "opus",   "copilot": "claude-opus-4.8",   "vscode": "Claude Opus 4.6 (copilot)",   "opencode": "github-copilot/claude-opus-4.8" },
      "medium": { "claude": "sonnet", "copilot": "claude-sonnet-4.6", "vscode": "Claude Sonnet 4.6 (copilot)", "opencode": "github-copilot/claude-sonnet-4.6" },
      "light":  { "claude": "haiku",  "copilot": "claude-haiku-4.5",  "vscode": "Claude Haiku 4.5 (copilot)",  "opencode": "github-copilot/claude-haiku-4.5" }
    },
    "stages": {
      "spec-finalizer": "heavy",
      "pull-request-builder": "light"
    }
  }
}
```

This runs every stage through the configured tiers, with explicit overrides for two stages regardless of their default complexity.

## Only one model per host? Use a bare string

If every dispatch on a given host should use the exact same model regardless of tier, a tier row's value can be a bare string instead of a host-keyed object:

```json
{
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  "gpt-5",
      "medium": "gpt-5-mini",
      "light":  "gpt-5-nano"
    }
  }
}
```

Here every host reads the same literal string for a given tier — useful when you have a single backend and don't need per-host identifiers at all. Mixing forms is fine: some tiers can be host-keyed objects while others are bare strings.

## Stage overrides

The `stages` key pins individual pipeline stages to a specific tier or a literal model string, regardless of the mode:

```json
{
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  { "claude": "opus",   "copilot": "claude-opus-4.8",   "vscode": "Claude Opus 4.6 (copilot)",   "opencode": "github-copilot/claude-opus-4.8" },
      "medium": { "claude": "sonnet", "copilot": "claude-sonnet-4.6", "vscode": "Claude Sonnet 4.6 (copilot)", "opencode": "github-copilot/claude-sonnet-4.6" },
      "light":  { "claude": "haiku",  "copilot": "claude-haiku-4.5",  "vscode": "Claude Haiku 4.5 (copilot)",  "opencode": "github-copilot/claude-haiku-4.5" }
    },
    "stages": {
      "implementation-planner": "heavy",
      "pull-request-builder": "light",
      "spec-finalizer": "claude-opus-4-5-20251101"
    }
  }
}
```

Stage names match the static complexity assignments in `model-strategy/SKILL.md`. A stage value that is itself a tier word (`heavy`, `medium`, `light`) resolves through the effective `tiers` in any mode. Any other string is passed through verbatim as a literal model identifier.

### Incremental adoption

Start with `inherit` mode and pin just the one stage that matters most:

```json
{
  "models": {
    "mode": "inherit",
    "tiers": {
      "heavy": { "claude": "opus", "copilot": "claude-opus-4.8", "vscode": "Claude Opus 4.6 (copilot)", "opencode": "github-copilot/claude-opus-4.8" }
    },
    "stages": {
      "implementation-planner": "heavy"
    }
  }
}
```

This applies the `heavy` tier binding only to the `implementation-planner` stage and leaves every other dispatch on the session model. When you are ready to tier everything, change `mode` to `"tiered"` and fill in the rest of the `tiers` object — the `stages` block is already in place.

## The three resolver signals and the `models` map

The resolver is invoked before every agent dispatch:

```bash
node .arcus/bin/models.mjs resolve \
  --complexity heavy \
  --stage implementation-planner \
  --checkpoint .arcus/specs/<STORY_ID>/session-checkpoint.json
```

It prints exactly one line of JSON in one of three shapes. **No host is ever configured and no host argument exists.** The caller reads the shape and picks its own column:

| Signal | Example JSON | What the caller does |
| --- | --- | --- |
| Inherit | `{"dispatch":false,"mode":"inherit","model":null}` | Send the dispatch with **no model parameter at all** |
| Single model | `{"dispatch":true,"mode":"flat","model":"sonnet"}` | Use that string **verbatim** as the model parameter |
| Host map | `{"dispatch":true,"mode":"tiered","models":{"claude":"opus","copilot":"claude-sonnet-4.6","vscode":"Claude Sonnet 4.6 (copilot)","opencode":"github-copilot/claude-sonnet-4.6"}}` | Pick the key for the host you are running on; use that value **verbatim** |

Branch on the **shape** of the JSON — never on the `mode` field, which is provenance only. If `"models"` carries no key for your host, warn and omit the model parameter; the session model is a known quantity and omitting is the conservative choice.

This design — returning a column map rather than selecting a column — is what makes cross-host stories work. A Claude Code session, a Copilot CLI session, and an OpenCode session all read the same frozen policy and each picks its own column. No host detection, no config flag, no rescaffold required.

## A story is pinned to the policy it started with

At scaffold time, ARCUS snapshots the effective policy into the story's `session-checkpoint.json` as `model_policy`. Every dispatch for that story then resolves against the **frozen** copy, not the live file.

This is the same treatment `stop_after` gets, and for the same reason: a story is a unit of work, and its execution parameters should not shift underneath it. Without the freeze, editing `.arcus/config.json` halfway through a story would silently change models between stages — planning on one model, implementing on another, with nothing recording that it happened.

Precedence is therefore just two ranks, then a default:

| Rank | Source |
| --- | --- |
| 1 | The story's frozen `model_policy` (when a `--checkpoint` is in play) |
| 2 | `.arcus/config.json`'s `models` block |
| — | Built-in default: `{ "mode": "inherit" }` |

There are deliberately **no environment-variable overrides and no `--model` flag**. Every extra override is a place where the model you get stops matching a file you can read.

### Changing the policy mid-story

Editing `.arcus/config.json` will not affect a story already in flight — but it will not do nothing *quietly*. When the frozen policy and the live config disagree, the resolver warns on stderr and names the fix:

```bash
.arcus/bin/checkpoint.sh set-model-policy <STORY_ID> "$(node .arcus/bin/models.mjs show --policy-only)"
```

New stories pick up the new policy automatically; only in-flight ones need this.

Failures are **soft** throughout: a missing, malformed, or nonsensical `models` block warns on stderr and falls back to `{ "mode": "inherit" }`. `loadPolicy` never throws and never exits, so a typo in the config cannot kill a mid-story dispatch — it just returns you to the session model.

## Inspect the effective policy

```bash
node .arcus/bin/models.mjs show
```

This prints the effective mode, its source (`checkpoint`, `config`, or `default`), the current bindings for all four host columns, and per-host discovery hints for finding the model identifiers your installation accepts.

To get just the policy as a single JSON line (for scripting):

```bash
node .arcus/bin/models.mjs show --policy-only
```

## Finding your model identifiers

The table below is sourced from the `HOST_DISCOVERY_HINTS` constant in `models.mjs` — the same constant `models.mjs show` prints. Updating the constant updates both the CLI output and this page, so they cannot drift.

All four entries are currently **unverified** — the commands could not be confirmed in the implementation environment. They represent the documented surface for each host; the fallback in every case is the host's own documentation.

| Host | How to find model identifiers | Documentation |
| --- | --- | --- |
| Claude Code | Run `claude models` (or `claude models list`) to list available model identifiers. *(Unverified — CLI exits "Not logged in" in this environment rather than "unknown command", but the full listing format was not confirmed.)* | [Claude Code model settings](https://docs.anthropic.com/en/docs/claude-code/settings#model) |
| Copilot CLI | In the GitHub Copilot CLI or VS Code Copilot settings, look for the model slug identifiers accepted by the `task` tool's `model:` parameter. *(Unverified — no `gh copilot` binary was reachable in this environment.)* | [GitHub Copilot model selection](https://docs.github.com/en/copilot/using-github-copilot/ai-model-selection-for-copilot) |
| VS Code | Open the Command Palette (Cmd/Ctrl+Shift+P) and run **"GitHub Copilot: Change Model"** to see available model display names. *(Unverified — GUI host; no programmatic surface was reachable in this environment.)* | [VS Code Copilot model selection](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions#_change-your-ai-model) |
| OpenCode | Run `opencode models` (or check the opencode documentation) to list `provider/model-id` strings accepted by your backend. *(Unverified — no `opencode` binary was reachable in this environment.)* | [OpenCode documentation](https://opencode.ai/docs) |

## Restore 4.0.2 behaviour

In ARCUS 4.0.2, every agent was pinned to a specific model at build time via tier words in agent frontmatter. ARCUS 5.0 removes this automatic pinning — agents carry `model: inherit` and the policy drives all resolution.

To restore equivalent per-tier tiering under 5.0, set a tiered policy in `.arcus/config.json` with the model identifiers you were pinned to before:

```json
{
  "models": {
    "mode": "tiered",
    "tiers": {
      "heavy":  { "claude": "opus",   "copilot": "claude-opus-4.8",   "vscode": "Claude Opus 4.6 (copilot)",   "opencode": "github-copilot/claude-opus-4.8" },
      "medium": { "claude": "sonnet", "copilot": "claude-sonnet-4.6", "vscode": "Claude Sonnet 4.6 (copilot)", "opencode": "github-copilot/claude-sonnet-4.6" },
      "light":  { "claude": "haiku",  "copilot": "claude-haiku-4.5",  "vscode": "Claude Haiku 4.5 (copilot)",  "opencode": "github-copilot/claude-haiku-4.5" }
    }
  }
}
```

This makes the resolver return your configured per-host model string for every complexity level, exactly as 4.0.2 did — but now it works identically whether you scaffold on Claude Code, continue on Copilot CLI, or finish on OpenCode, because each host reads the map and picks its own column.

::: info OpenCode applies the policy at plugin load
OpenCode bakes an agent's model into its frontmatter, so it has no per-dispatch hook to resolve
through. The `arcus-opencode` plugin therefore reads this same policy **once per session, at plugin
load**, and writes the resolved `opencode` value into each staged agent under `.opencode/agents/`.
Edits to `.arcus/config.json` take effect on your next OpenCode session — no rebuild, no reinstall.
See [Cross-host behaviour](/concepts/cross-host#models-resolved-at-plugin-load-not-at-build-time).
:::

> **Note:** Verify the identifiers above still match what your provider currently accepts — model slugs and display names change with every release, and ARCUS does not track or ship them for you (see [Finding your model identifiers](#finding-your-model-identifiers)).

## Related

- [Three Modes, One Pipeline](/concepts/modes) — the `stop_after` gate that sits alongside `models` in `.arcus/config.json`
- [Running Across Hosts](/concepts/cross-host) — per-host dispatch mechanics, identifier formats, and the cross-host headline property
