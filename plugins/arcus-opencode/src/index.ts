import type { Plugin } from "@opencode-ai/plugin"
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * ARCUS OpenCode plugin (distribution model A: npm bundle-and-stage).
 *
 * Installed in a TARGET repo via its opencode.json:  { "plugin": ["arcus-opencode"] }
 * OpenCode installs this package into ~/.cache/opencode/node_modules/ and runs
 * this module. The package ships a self-contained `bundled/` payload (built from
 * the authoring source plugins/arcus/ at publish time — see scripts/build-bundle.mjs).
 *
 * At plugin load (factory time — BEFORE any session event, mirroring Claude
 * Code's pre-session SessionStart hook) the plugin:
 *   1. resolves its OWN install dir via import.meta (NOT the user's repo), then
 *   2. stages bundled/{skills,agents} into the target repo's .opencode/, and
 *   3. runs bundled/scripts/bootstrap.sh with the target repo as CWD to stage the
 *      deterministic helper scripts into .arcus/bin and write .arcus/env.
 * A presence-checked session.created handler re-stages the scripts only if they
 * are missing, as a safety net — it is NOT the primary trigger, so there is no
 * ordering race between skill availability and helper-script availability.
 *
 * It is intentionally SILENT in the TUI: no toast, no terminal output. The
 * bootstrap script's stdout is captured (so it cannot ghost the prompt) and the
 * outcome is recorded only via structured `client.app.log` entries. Successful
 * skill/agent discovery is its own confirmation.
 *
 * The `arcus:<name>` namespace transform and OpenCode agent-dialect conversion are
 * baked into `bundled/` at build time, so runtime is a plain copy.
 */

// Resolve the package's own root (…/arcus-opencode), independent of CWD.
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const BUNDLED = join(PKG_ROOT, "bundled")

// Content trees staged from bundled/ into the target repo's .opencode/.
// (ARCUS ships no commands; the tree is skipped gracefully if absent.)
const STAGED_TREES = ["skills", "agents"] as const

const LOG_SERVICE = "arcus-opencode"

async function stageTree(name: string, targetOpencode: string): Promise<number> {
  const src = join(BUNDLED, name)
  if (!existsSync(src)) return 0
  const dest = join(targetOpencode, name)
  // The staged tree is a generated mirror of bundled/<name>; copy fresh.
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  for (const e of entries) {
    await cp(join(src, e.name), join(dest, e.name), { recursive: true, force: true })
  }
  return entries.length
}

// Generated artifacts ARCUS stages into the target repo. The loader file
// (.opencode/plugins/) and any opencode.json are user-owned and NOT listed.
const IGNORE_ENTRIES = [".opencode/skills/", ".opencode/agents/", ".arcus/"]
const IGNORE_HEADER = "# --- ARCUS generated artifacts (managed by arcus-opencode) ---"

/**
 * Idempotently ensure the repo's .gitignore excludes ARCUS's generated staging
 * dirs, so they never dirty the working tree (ARCUS requires a clean tree). Adds
 * only the entries that are missing; never rewrites or reorders existing lines.
 * Matching ignores leading `/` and trailing `/` so `.arcus`, `.arcus/`, and
 * `/.arcus/` all count as already-present (no duplicates).
 */
async function ensureGitignore(repoRoot: string): Promise<void> {
  if (!existsSync(join(repoRoot, ".git"))) return // not a git repo; nothing to do
  const gitignorePath = join(repoRoot, ".gitignore")
  let current = ""
  try {
    current = await readFile(gitignorePath, "utf8")
  } catch {
    /* no .gitignore yet */
  }
  const norm = (s: string) => s.trim().replace(/^\//, "").replace(/\/$/, "")
  const present = new Set(current.split("\n").map(norm))
  const missing = IGNORE_ENTRIES.filter((e) => !present.has(norm(e)))
  if (missing.length === 0) return
  const prefix = current.length && !current.endsWith("\n") ? "\n" : ""
  await writeFile(gitignorePath, current + prefix + "\n" + IGNORE_HEADER + "\n" + missing.join("\n") + "\n")
}

export const ArcusOpencode: Plugin = async ({ directory, worktree, $, client }) => {
  const repoRoot = worktree || directory
  const targetOpencode = join(repoRoot, ".opencode")

  // Structured logging helper (visible in `opencode` logs, unlike console.*).
  const log = (level: "debug" | "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) =>
    client.app
      .log({ body: { service: LOG_SERVICE, level, message, ...(extra ? { extra } : {}) } })
      .catch(() => {})

  /**
   * Stage the deterministic helper scripts into the target repo's .arcus/bin and
   * write .arcus/env, by running the bundled bootstrap.sh with the repo as CWD.
   *
   * This is the OpenCode equivalent of the Claude Code `SessionStart` hook (see
   * plugins/arcus/hooks/hooks.json). It is idempotent — bootstrap.sh always
   * mkdir -p's and overwrites — so it is safe to call repeatedly. `.quiet()`
   * captures stdout/stderr so bootstrap.sh's status line does NOT leak onto the
   * TUI prompt (it would render as ghost text); the outcome is surfaced only via
   * structured logs.
   */
  const stageHelperScripts = async (): Promise<void> => {
    const script = join(BUNDLED, "scripts", "bootstrap.sh")
    if (!existsSync(script)) {
      await log("error", `bootstrap.sh missing at ${script}; run the package build`)
      return
    }
    try {
      const res = await $`bash ${script}`.cwd(repoRoot).quiet()
      const out = (res.stdout?.toString() || "").trim()
      await log("info", "bootstrap.sh staged .arcus/bin + .arcus/env", out ? { out } : undefined)
    } catch (err) {
      await log("error", "bootstrap.sh failed", { error: String(err) })
    }
  }

  // --- Factory-time staging from the package's bundled payload ---
  // Everything the pipeline depends on is staged here, at plugin load, BEFORE any
  // session event. This mirrors Claude Code's pre-session `SessionStart` hook and
  // removes the ordering race where skills/agents were visible but .arcus/bin was
  // not yet staged (helper scripts are a hard dependency of those very skills).
  try {
    if (existsSync(BUNDLED)) {
      await mkdir(targetOpencode, { recursive: true })
      const counts: Record<string, number> = {}
      for (const tree of STAGED_TREES) counts[tree] = await stageTree(tree, targetOpencode)
      await ensureGitignore(repoRoot)
      await log("info", "staged bundled content into target .opencode/", counts)
      // Stage .arcus/bin + .arcus/env at load time (awaited), not on a later event.
      await stageHelperScripts()
    } else {
      await log("error", `bundled payload missing at ${BUNDLED}; run the package build`)
    }
  } catch (err) {
    await log("error", "staging failed", { error: String(err) })
  }

  return {
    // Safety net only: re-stage on the first session in case the repo state
    // changed since load (e.g. .arcus was cleaned). Presence-checked so it is a
    // no-op when .arcus/bin is already in place — no reliance on in-memory state.
    event: async ({ event }) => {
      if (event.type !== "session.created") return
      if (existsSync(join(repoRoot, ".arcus", "bin", "scaffold.sh"))) return
      await stageHelperScripts()
    },
  }
}
