#!/usr/bin/env node
// ==============================================================================
// build-bundle.mjs
//
// Derives the self-contained `bundled/` payload that ships inside the
// arcus-opencode npm package, from the authoring source of truth at
// `plugins/arcus/` (which also serves Claude Code / Copilot CLI).
//
// At publish/build time we BAKE the OpenCode-specific transforms so the plugin
// runtime stays trivial (copy bundled/ -> target .opencode/, run bootstrap.sh):
//   - skills:   copied verbatim, then `arcus:<name>` -> `<name>` in SKILL.md
//   - scripts:  copied verbatim (bootstrap.sh + helpers)
//   - agents:   Claude-dialect agents at plugins/arcus/agents/*.md have their
//               FRONTMATTER converted to OpenCode dialect at build time (body
//               preserved + `arcus:` transform). Single source of truth — no
//               parallel agents.opencode/ dir to drift.
//   - commands: none shipped (ARCUS uses natural-language triggers via skill
//               descriptions; the /arcus:<name> slash form was a Claude by-product).
//
// Source of truth stays in plugins/arcus/. `bundled/` is a derived build output
// (git-ignored).
// ==============================================================================

import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, "..") // plugins/arcus-opencode
const arcusSource = join(pkgRoot, "..", "arcus") // plugins/arcus (authoring source)
const bundled = join(pkgRoot, "bundled")

import {
  buildPermission,
  parseAgentFrontmatter,
  stripArcusNamespace,
  TIER_TO_MODEL,
  COLOR_TO_HEX,
  FRONTMATTER_RE,
} from "./lib/convert.mjs"

/** Render an OpenCode-dialect frontmatter + body for one ARCUS agent. */
function convertAgent(name, raw) {
  const fmMatch = FRONTMATTER_RE.exec(raw)
  if (!fmMatch) throw new Error(`agent ${name}: no frontmatter`)
  const fields = parseAgentFrontmatter(fmMatch[1])
  const body = stripArcusNamespace(fmMatch[2])

  const model = TIER_TO_MODEL[fields.model] || fields.model
  const perms = buildPermission(fields)
  const description = stripArcusNamespace(fields.description || "")

  const out = ["---"]
  out.push(`name: ${fields.name || name}`)
  // OpenCode requires description; keep on one line (already collapsed).
  out.push(`description: ${description}`)
  out.push("mode: subagent")
  out.push("hidden: true") // ARCUS agents are model-only, never user-facing.
  if (model) out.push(`model: ${model}`)
  // OpenCode color must be #hex or a theme name; map Claude words, else omit.
  // Hex MUST be quoted — bare `#...` after `:` is a YAML comment → null value.
  const color = fields.color
    ? COLOR_TO_HEX[fields.color.toLowerCase()] ||
      (/^#[0-9a-fA-F]{6}$/.test(fields.color) ? fields.color : null)
    : null
  if (color) out.push(`color: "${color}"`)
  if (fields.temperature) out.push(`temperature: ${fields.temperature}`)
  if (Object.keys(perms).length) {
    out.push("permission:")
    for (const [k, v] of Object.entries(perms)) out.push(`  ${k}: ${v}`)
  }
  out.push("---")
  out.push("")
  return out.join("\n") + body.replace(/^\n*/, "")
}

async function rebuildDir(dir) {
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
}

async function buildSkills() {
  const src = join(arcusSource, "skills")
  const dest = join(bundled, "skills")
  if (!existsSync(src)) return 0
  await rebuildDir(dest)

  const entries = await readdir(src, { withFileTypes: true })
  let n = 0
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const from = join(src, e.name)
    if (!existsSync(join(from, "SKILL.md"))) continue
    const to = join(dest, e.name)
    await cp(from, to, { recursive: true, force: true })

    // Bake the namespace transform into the bundled SKILL.md.
    const skillFile = join(to, "SKILL.md")
    const original = await readFile(skillFile, "utf8")
    const transformed = stripArcusNamespace(original)
    if (transformed !== original) await writeFile(skillFile, transformed)
    n++
  }
  return n
}

async function buildScripts() {
  const src = join(arcusSource, "scripts")
  const dest = join(bundled, "scripts")
  if (!existsSync(src)) return 0
  await rebuildDir(dest)
  await cp(src, dest, { recursive: true, force: true })
  return 1
}

async function buildAgentResources() {
  // Templates/references the agents read at runtime via ARCUS_HOME.
  const src = join(arcusSource, "agent-resources")
  const dest = join(bundled, "agent-resources")
  if (!existsSync(src)) return 0
  await rebuildDir(dest)
  await cp(src, dest, { recursive: true, force: true })
  return 1
}

async function buildSchemas() {
  const src = join(arcusSource, "schemas")
  const dest = join(bundled, "schemas")
  if (!existsSync(src)) return 0
  await rebuildDir(dest)
  await cp(src, dest, { recursive: true, force: true })
  return 1
}

// Convert the Claude-dialect agents (plugins/arcus/agents/*.md) to OpenCode
// dialect at build time: rewrite frontmatter, preserve + transform the body.
async function buildAgents() {
  const src = join(arcusSource, "agents")
  const dest = join(bundled, "agents")
  if (!existsSync(src)) return 0
  await rebuildDir(dest)
  const entries = await readdir(src, { withFileTypes: true })
  let n = 0
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue
    const name = e.name.replace(/\.md$/, "")
    const raw = await readFile(join(src, e.name), "utf8")
    await writeFile(join(dest, e.name), convertAgent(name, raw))
    n++
  }
  return n
}

async function main() {
  if (!existsSync(arcusSource)) {
    console.error(`[build] authoring source not found: ${arcusSource}`)
    process.exit(1)
  }
  await mkdir(bundled, { recursive: true })

  const skills = await buildSkills()
  await buildScripts()
  await buildAgentResources()
  await buildSchemas()
  const agents = await buildAgents()

  console.log(
    `[build] bundled: ${skills} skills, ${agents} agents ` +
      `(+ scripts, agent-resources, schemas) → ${bundled}`,
  )
}

main().catch((err) => {
  console.error("[build] failed:", err)
  process.exit(1)
})
