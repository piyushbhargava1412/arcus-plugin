#!/usr/bin/env node
// ==============================================================================
// sync-version.mjs
//
// The ARCUS plugin version is owned by the canonical source
// plugins/arcus/.claude-plugin/plugin.json (per AGENTS.md). The OpenCode package
// is just another harness wrapper around the SAME skills/agents, so it must NOT
// carry an independent version — it derives its version from plugin.json.
//
// This runs first in the build chain so `package.json` (and therefore the packed
// tarball + its filename) always matches the canonical plugin version.
// ==============================================================================

import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, "..") // plugins/arcus-opencode
const pluginManifest = join(pkgRoot, "..", "arcus", ".claude-plugin", "plugin.json")
const pkgJsonPath = join(pkgRoot, "package.json")

const manifest = JSON.parse(await readFile(pluginManifest, "utf8"))
const pkg = JSON.parse(await readFile(pkgJsonPath, "utf8"))

const canonical = manifest.version
if (!canonical) {
  console.error(`[version] no version in ${pluginManifest}`)
  process.exit(1)
}

if (pkg.version !== canonical) {
  pkg.version = canonical
  await writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n")
  console.log(`[version] synced arcus-opencode → ${canonical} (from plugin.json)`)
} else {
  console.log(`[version] arcus-opencode already at ${canonical}`)
}
