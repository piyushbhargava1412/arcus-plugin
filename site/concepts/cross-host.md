# Running Across Hosts

What ARCUS actually relies on from Claude Code, GitHub Copilot CLI, VS Code Copilot Chat, and OpenCode — and how each one differs

---

::: tip The mindset shift
Host-agnostic does not mean "write it once and hope". Every field in an ARCUS agent's frontmatter is
either **enforced**, **ignored**, or **destructive** on a given host — and when a host ignores a
field, it does so *silently*. The rules on this page are all **measured**, not read from docs,
because the docs were wrong about ARCUS and ARCUS was wrong about itself.
:::

## The one failure mode that matters

Almost every cross-host bug ARCUS has had is the same shape:

> **A field or instruction that reads as a guarantee and does nothing, with no error anywhere.**

Not a crash. Not a warning. The agent runs, produces plausible output, and a safety property you
believed in was never in effect. Some real examples, all found by measurement:

| What it looked like | What actually happened |
|---|---|
| `disable-model-invocation: true` | Copilot CLI dropped every agent from its registry — **0 of 16** dispatchable |
| `disallowed-tools: Edit, Write` | kebab-case is silently ignored; the denylist **never fired once** |
| `disallowedTools` + `tools: …, Bash` | honoured, and still cosmetic — `printf x > f` writes |
| no `tools:` at all | inherited the full session toolset, including `edit` |
| "call `get_errors` to verify" | a VS Code-only tool; other hosts **skip the step** rather than erroring |
| OpenCode `permission:` listing only grants | an **absent** key means *allowed* — the shell leaked back in |
| "consult the `arcus:model-strategy` skill" | no `Skill` in `tools:`; the agent says it can't, then answers anyway |

Each of these now has a static gate in `tests/lib/checks.mjs`, because on the host ARCUS is
developed against, **none of them were visible**.

## What each host enforces

`layer:` is inert on every host — it drives ARCUS's own CI gates, not runtime behaviour.

| Frontmatter field | Claude Code | GitHub Copilot CLI | OpenCode | VS Code Copilot Chat |
|---|---|---|---|---|
| `name` | enforced | enforced | rewritten flat at build time | via `.agent.md` conversion |
| `description` | used for selection | used for selection | used for selection | used for selection |
| `tools:` (allowlist) | **enforced** | **enforced** | translated to `permission:` | enforced |
| `disallowedTools:` | honoured (camelCase **only**) | inferred inert (unmeasured) | translated to `permission: deny` | — |
| `disallowed-tools:` (kebab) | **silently ignored** | silently ignored | read with fallback by the adapter | — |
| `model:` tier word | **enforced** | **silently ignored** — falls back to the session model | pinned per agent at build time | via `runSubagent` `model` param |
| `disable-model-invocation:` | ignored on agents, **honoured on skills** | **honoured on both** — removes the item entirely | — | — |
| `layer:` | inert | inert | inert | inert |

::: danger Never set `disable-model-invocation`
Orchestrated dispatch **is** model invocation — the identical tool call from the identical caller —
so the flag cannot mean "orchestrator-only". Setting it made all 16 ARCUS agents undispatchable on
Copilot CLI and made `model-strategy` unloadable on *both* hosts. Express the intent with
`user-invocable: false` plus an orchestration-scoped `description:` instead.
:::

## Addressing an agent

Both registry hosts namespace plugin agents by **plugin name**, so an agent has one literal that
works on both:

| Reference | Claude Code | GitHub Copilot CLI |
|---|---|---|
| **Agent** (`agents/<name>.md`) | `arcus-plugin:<name>` | `arcus-plugin:<name>` |
| **Skill** (`skills/<name>/SKILL.md`) | `arcus-plugin:<name>` | `<name>` (bare) |

A **skill has no single literal that is correct on both** — `arcus-plugin:model-strategy` is an
*error* on Copilot CLI. This is why ARCUS prose writes `arcus:<name>`: a host-neutral reference
token that lets the test harness validate every cross-reference against one spelling.

::: info How a model actually resolves `arcus:<name>`
Measured on both hosts: the model **never parses the prefix**. It strips it, takes the bare name,
and matches it against the host's live registry enum — the *host* supplies the namespace. Both hosts
resolved `arcus:model-strategy` correctly on the first try, to two different literals. So the right
instruction is "match the name against your registry", never "rewrite the prefix".
:::

## Tool names

| Authored | Claude Code | Copilot CLI |
|---|---|---|
| `Read` | `Read` | `view` |
| `Grep` | `Grep` | `grep` |
| `Glob` | `Glob` | `glob` |
| `Bash` | `Bash` | `bash`, `read_bash`, `stop_bash`, `list_bash` |
| `Edit` / `Write` | `Edit` / `Write` | `edit` |
| `Task` / `Agent` | `Agent` | `task` |
| `Skill` | `Skill` | `skill` |

Two traps worth authoring around:

- **Unknown names are dropped silently.** A misspelled or host-specific name narrows the agent's real
  toolset with no error anywhere.
- **Listing `Bash` alongside `Grep`/`Glob` costs you those two on Claude Code.** `Read, Grep, Glob`
  yields all three; `Read, Grep, Glob, Bash` yields only `Read, Bash`. The shorter list is the more
  capable one there.

::: warning `Bash` is a write tool
A denylist over `Edit`/`Write`/`MultiEdit` does not make an agent read-only if the allowlist contains
a shell — `printf x > f` writes, `git commit` rewrites history, `rm` deletes. A dispatch tool is the
same hole one level out, since it can spawn a writer. ARCUS's advisory reviewers therefore allowlist
`Read, Grep, Glob` and nothing else, and receive what they need as prompt input.
:::

## When there is no registry entry

ARCUS resolves a dispatch target in two routes, using the first that works:

1. **A registered subagent type ending in `<name>`.** Preferred, because the host then **enforces the
   agent's `tools:` allowlist** — this is what keeps the advisory reviewers read-only.
2. **A generic subagent** whose prompt opens with *"Read and follow the agent spec at
   `$ARCUS_HOME/agents/<name>.md`."*

Route 2 is needed when no registry entry exists — which is **not a per-host property, it is per
name**:

- an ARCUS checkout **not installed as a plugin** (no registry at all);
- **VS Code Copilot Chat**, where ARCUS agents are not registered unless converted to `.agent.md`;
- a **restricted-tools subagent** whose own allowlist omits `Skill` and the dispatch tools — it can
  resolve nothing, even on a registry host. ARCUS prevents this by construction: gate L1-17 requires
  `Skill` in the allowlist of any agent told to consult a skill;
- a **single name missing from an otherwise healthy registry** — that one item failed to load.

OpenCode is **not** in this list. Its bundle registers agents as `mode: subagent` and rewrites
`arcus:<name>` to the flat name at build time.

::: danger Route 2 restrictions are advisory only
Measured on Copilot CLI: a route-2 generic subagent given a spec declaring `tools: Read, Grep, Glob`
reported having `bash`, `apply_patch`, `task`, `skill` and twenty more. **The spec's `tools:` is not
enforced at all** — nothing is sandboxing it. Route 2 is a graceful degradation for reachability, not
a security boundary. Prefer route 1 wherever a registry entry exists, and treat a fleet that has
silently fallen back to route 2 as having lost its read-only guarantees.
:::

## OpenCode is a build-time translation

OpenCode does not read ARCUS's authoring format directly. `plugins/arcus-opencode` bundles a
converted copy: `arcus:` prefixes are stripped, tier words are resolved to `provider/model-id` and
pinned per agent, and `tools:` / `disallowedTools:` become a `permission:` block.

::: warning An absent permission key means *allowed*
This is the OpenCode-shaped version of the same silent failure. The adapter therefore emits the
permission block **deny-by-default**: the allowlist is authoritative, every key ARCUS knows about is
written explicitly `allow` or `deny`, and a `disallowedTools` entry always wins. Emitting only the
granted keys would have left `bash` unspecified — and therefore allowed — on agents whose entire
purpose is to be unable to write.
:::

## Hooks

Every ARCUS entry point runs `scripts/locate.sh` as its first step, so **ARCUS never depends on a
hook firing anywhere**. Claude Code additionally fires the bundled `SessionStart` hook automatically.
ARCUS's hooks are not observed firing on Copilot CLI; the cause is still unexplained and is **not** a
schema difference — Copilot CLI does auto-discover a plugin's `hooks/hooks.json` and does normalize
Claude's PascalCase event names.

## Related

- [The Capability Library](/concepts/capability-library) — the surface × tier model these fields hang off
- [How ARCUS Works](/guide/how-it-works) — location independence and the bootstrap chain
