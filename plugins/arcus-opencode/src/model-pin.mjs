// ==============================================================================
// model-pin.mjs — resolve and apply per-agent model pins at plugin load time.
//
// WHY THIS EXISTS AT RUNTIME AND NOT AT BUILD TIME
//
// OpenCode bakes an agent's model into its markdown frontmatter: there is no
// per-dispatch hook to consult, the way Claude Code and Copilot CLI have. The
// tempting alternative — resolving the pin at BUILD time, into the agents baked
// into the published tarball — is wrong, because one published artifact serves
// every consumer: it would pin them all to the PUBLISHER's account and provider
// slugs, and a consumer could only change it by rebuilding the package.
//
// Plugin load in the target repo is the correct moment instead. It runs once per
// session, in the consumer's repo, before any agent is read — so the pin comes
// from that repo's OWN model policy (`.arcus/config.json` `models`, plus the
// `ARCUS_MODEL_*` env vars above it in the ladder), read through the exact same
// host-agnostic resolver every other ARCUS host uses. OpenCode thereby reaches
// parity with the other hosts instead of being a special case.
//
// Reading the `opencode` key out of a host-keyed policy value here is NOT the
// runtime host detection ARCUS prohibits: this module is part of the OpenCode
// adapter and can only ever execute on OpenCode. The resolver it calls stays
// entirely host-free.
//
// FAIL-OPEN, like the resolver it wraps. Every failure path returns "no pin",
// which writes no `model:` line, which leaves the agent on OpenCode's own
// session default model. That is the bundle's baseline promise: with no policy
// configured, ARCUS runs on the session model, everywhere, with no build config.
//
// Lives in a plain `.mjs` sibling of index.ts (rather than inside it) so the
// zero-token unit suite can import and exercise it directly; esbuild inlines it
// into dist/index.js at build time, so the shipped artifact is still one file.
// ==============================================================================

import { existsSync } from "node:fs"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/

/**
 * Return `md` with its frontmatter carrying exactly one `model:` line.
 *
 * Any pre-existing `model:` line is REPLACED, not appended to — re-staging is
 * idempotent, and a policy edited between two loads can never leave a stale pin
 * behind a fresh one (duplicate YAML keys would silently resolve to the last).
 * Markdown with no frontmatter is returned untouched.
 */
export function withModelPin(md, model) {
  const match = FRONTMATTER_RE.exec(md)
  if (!match) return md
  const lines = match[1].split("\n").filter((line) => !/^model:\s/.test(line))
  lines.push(`model: ${model}`)
  return `---\n${lines.join("\n")}\n---\n` + md.slice(match[0].length)
}

/**
 * Build the agent-name -> `provider/model-id` resolver from an already-loaded
 * policy and the models.mjs module object.
 *
 * @param {object}   opts
 * @param {object}   opts.models  The loaded models.mjs module namespace.
 * @param {object}   opts.policy  Effective policy from `models.loadPolicy`.
 * @param {string}   opts.source  `loadPolicy`'s rank label (unlocks the escape hatch).
 * @param {Function} opts.log     `(level, message, extra?) => void`.
 * @param {{write:Function}} opts.stderr  Warning sink handed to `resolveModel`.
 * @param {Function} opts.flush   Drains `stderr` into the log, given a context label.
 * @returns {(agentName: string) => string|null}
 */
export function makeModelPinner({ models, policy, source, log, stderr, flush }) {
  return (agentName) => {
    // A missing STAGE_COMPLEXITY row must not silently MIS-pin: tierForComplexity
    // maps an unknown complexity to 'medium', so a heavy agent would quietly run
    // on the medium model — the exact class of silent misconfiguration ARCUS's
    // gates exist to eliminate. The build used to abort here; at runtime aborting
    // the session is not an option, so leave the agent on the session default and
    // say so out loud instead.
    const complexity = models.STAGE_COMPLEXITY[agentName]
    if (complexity === undefined) {
      log("warn", `agent '${agentName}' has no STAGE_COMPLEXITY row; leaving it on the session default model`)
      return null
    }

    const resolved = models.resolveModel({ policy, complexity, stage: agentName, source, stderr })
    flush(`agent '${agentName}'`)

    if (!resolved.dispatch) return null
    if (typeof resolved.model === "string" && resolved.model !== "") return resolved.model

    // Host-keyed value (shape 3): this adapter's key is `opencode`. A value that
    // names other hosts but not this one is a real gap in the user's policy, so
    // it is reported rather than silently resolved through some other host's slug.
    const perHost = resolved.models && resolved.models.opencode
    if (typeof perHost === "string" && perHost !== "") return perHost

    log("warn", `agent '${agentName}': policy value has no 'opencode' entry; leaving it on the session default model`)
    return null
  }
}

/**
 * Load the target repo's model policy via the bundled resolver and return a
 * pinner, or `null` when no pinning can or should happen.
 *
 * `modelsPath` points at the resolver shipped INSIDE this package
 * (`bundled/scripts/models.mjs`), deliberately not at the target repo's
 * `.arcus/bin/models.mjs`: that copy only exists after bootstrap.sh has run, and
 * model resolution must not acquire an ordering dependency on staging.
 *
 * @param {string}   modelsPath  Absolute path to the bundled models.mjs.
 * @param {string}   repoRoot    Target repo root (holds `.arcus/config.json`).
 * @param {Function} log         `(level, message, extra?) => void`.
 * @returns {Promise<((agentName: string) => string|null)|null>}
 */
export async function loadModelPinner(modelsPath, repoRoot, log) {
  if (!existsSync(modelsPath)) {
    log("warn", `models.mjs missing at ${modelsPath}; agents stay on the session default model`)
    return null
  }

  // models.mjs warns to a stderr-SHAPED sink. It is given this buffer rather
  // than the real process.stderr because anything the plugin writes to the
  // terminal at load time ghost-renders onto the OpenCode TUI prompt; the
  // warnings are surfaced through structured logging instead, matching the rest
  // of this plugin's deliberate TUI silence.
  const buffered = []
  const stderr = {
    write: (chunk) => {
      buffered.push(String(chunk))
      return true
    },
  }
  const flush = (context) => {
    if (buffered.length === 0) return
    log("warn", `model policy: ${context}`, { warnings: buffered.splice(0).map((w) => w.trim()) })
  }

  try {
    const models = await import(pathToFileURL(modelsPath).href)
    const { policy, source } = models.loadPolicy({ cwd: repoRoot, stderr })
    flush("policy load")
    return makeModelPinner({ models, policy, source, log, stderr, flush })
  } catch (err) {
    log("error", "model policy resolution failed; agents stay on the session default model", { error: String(err) })
    return null
  }
}

/**
 * Rewrite the staged agents in place, pinning each to the model its complexity
 * resolves to under the target repo's policy.
 *
 * Under the default `inherit` policy every agent resolves to `null`, no file is
 * touched, and the staged agents keep the bundle's baseline promise.
 *
 * @param {string}   agentsDir  The staged `.opencode/agents` directory.
 * @param {Function} pin        Resolver from `loadModelPinner`.
 * @param {Function} log        `(level, message, extra?) => void`.
 * @returns {Promise<number>} how many agents received a pin.
 */
export async function pinStagedAgents(agentsDir, pin, log) {
  if (!existsSync(agentsDir)) return 0
  let pinned = 0
  for (const entry of await readdir(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const model = pin(entry.name.replace(/\.md$/, ""))
    if (!model) continue
    const path = join(agentsDir, entry.name)
    const original = await readFile(path, "utf8")
    const updated = withModelPin(original, model)
    if (updated !== original) await writeFile(path, updated)
    pinned++
  }
  if (pinned > 0) log("info", `pinned ${pinned} staged agent(s) from the target repo's model policy`)
  return pinned
}
