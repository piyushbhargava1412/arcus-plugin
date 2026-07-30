// ==============================================================================
// Pure conversion helpers for the OpenCode adapter.
//
// These live in their own module so `build-bundle.mjs` can keep an unconditional
// `main()` call. An `import.meta.url`-vs-`process.argv[1]` entrypoint guard is
// NOT safe here: Node's ESM loader resolves symlinks while `process.argv[1]`
// does not, so under any symlinked path (CI workspace links, pnpm store links, a
// symlinked publish dir) the guard evaluates false, `main()` never runs, and the
// build exits 0 having produced nothing — shipping an empty `bundled/` payload
// via `prepack` with a green log. That is exactly the silent-no-op failure this
// repository's gates exist to eliminate.
// ==============================================================================

// `arcus:<name>` -> `<name>` for OpenCode's flat skill/agent addressing.
const ARCUS_TOKEN = /\barcus:([a-z0-9][a-z0-9-]*)/g
const stripArcusNamespace = (s) => s.replace(ARCUS_TOKEN, "$1")

// Tier word -> OpenCode provider/model-id (default provider: GitHub Copilot).
// Canonical mapping is documented in plugins/arcus/skills/model-strategy.
const TIER_TO_MODEL = {
  opus: "github-copilot/claude-opus-4.8",
  sonnet: "github-copilot/claude-sonnet-4.6",
  haiku: "github-copilot/claude-haiku-4.5",
}

// ARCUS uses Claude color words; OpenCode `color` accepts only a #hex value or a
// theme name (primary|secondary|accent|success|warning|error|info). Map the
// Claude words to hex to preserve the authored intent.
const COLOR_TO_HEX = {
  red: "#e5484d",
  green: "#30a46c",
  blue: "#3e63dd",
  yellow: "#f5d90a",
  orange: "#f76b15",
  purple: "#8e4ec6",
  magenta: "#d6409f",
  cyan: "#05a2c2",
  teal: "#12a594",
  gray: "#8b8d98",
  grey: "#8b8d98",
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

/**
 * Parse the simple, regular ARCUS agent frontmatter (no nested YAML except the
 * known `metadata:` block) into a flat field map. `description` may be a folded
 * (`>`) multi-line block; it is collapsed to a single spaced string.
 */
function parseAgentFrontmatter(fm) {
  const fields = {}
  const lines = fm.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    let val = m[2]

    if (key === "description" && (val === ">" || val === "|" || val === "")) {
      // Gather the indented continuation lines.
      const buf = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        buf.push(lines[++i].trim())
      }
      fields.description = buf.join(" ").replace(/\s+/g, " ").trim()
      continue
    }
    if (key === "metadata") {
      // Skip the nested metadata block entirely (OpenCode metadata is
      // string->string only; ARCUS's version/team/type is not load-bearing).
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i++
      continue
    }
    fields[key] = val.trim()
  }
  return fields
}

/**
 * Build the OpenCode `permission:` block from Claude `tools:` / `disallowedTools:`.
 *
 * The allowlist is AUTHORITATIVE and this block is deny-by-default, because an
 * OpenCode permission key that is simply absent defaults to allowed. Emitting only
 * the granted keys therefore reproduces, on OpenCode, the exact hole that
 * `tools:` closes on Claude Code and Copilot CLI: an advisory reviewer declaring
 * `tools: Read, Grep, Glob` would bundle to `{read, grep, glob: allow}` with `bash`
 * unspecified — and a shell writes by redirection, so the read-only guarantee
 * would evaporate on the one host where nothing else enforces it.
 *
 * So: every key ARCUS knows about is emitted explicitly, allow or deny. An
 * explicit `disallowedTools` entry always wins, so the two can never contradict.
 */
function buildPermission(fields) {
  // Accept either spelling and either shape: this script's own parser yields
  // comma-separated strings, while the test harness's parser yields arrays.
  const toList = (v) =>
    (Array.isArray(v) ? v : String(v ?? "").split(",")).map((t) => t.trim()).filter(Boolean)

  const tools = toList(fields.tools)
  const declaresTools = tools.length > 0
  const disallowed = toList(fields["disallowedTools"] ?? fields["disallowed-tools"])

  const perms = {}

  // Read-only quartet. With an allowlist present, absence means deny.
  const toolMap = { Read: "read", Grep: "grep", Glob: "glob", Bash: "bash" }
  for (const [claude, oc] of Object.entries(toolMap)) {
    if (tools.includes(claude)) perms[oc] = "allow"
    else if (declaresTools) perms[oc] = "deny"
  }

  // Write capability: allow only when the agent explicitly lists Write/Edit.
  const canWrite = tools.includes("Write") || tools.includes("Edit")
  if (canWrite) perms.edit = "allow"
  else if (declaresTools) perms.edit = "deny"

  // An explicit denylist entry always wins over anything inferred above.
  if (disallowed.some((d) => ["Edit", "Write", "MultiEdit"].includes(d))) {
    perms.edit = "deny"
  }
  if (disallowed.includes("Bash")) perms.bash = "deny"

  // AskUserQuestion has no OpenCode tool; the analog is the `question` permission.
  if (disallowed.includes("AskUserQuestion")) perms.question = "deny"

  return perms
}

export { buildPermission, parseAgentFrontmatter, stripArcusNamespace, TIER_TO_MODEL, COLOR_TO_HEX, FRONTMATTER_RE }
