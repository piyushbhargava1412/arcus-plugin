#!/usr/bin/env node
// ==============================================================================
// build-plugin.mjs
//
// Compiles the plugin entry src/index.ts -> dist/index.js (ESM) so the package
// ships compiled JS, matching the published-OpenCode-plugin convention
// (opencode-wakatime, opencode-helicone-session). The npm-name install path
// (OpenCode fetching the package into ~/.cache/opencode/node_modules/) loads
// this dist entry.
//
// Node built-ins stay external; @opencode-ai/plugin is type-only (erased).
// ==============================================================================

import { build } from "esbuild"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, "..")

await build({
  entryPoints: [join(pkgRoot, "src", "index.ts")],
  outfile: join(pkgRoot, "dist", "index.js"),
  platform: "node",
  format: "esm",
  target: "node18",
  bundle: true,
  // Keep the plugin SDK + node builtins external; we ship a thin module.
  packages: "external",
})

console.log("[build] compiled src/index.ts → dist/index.js")
