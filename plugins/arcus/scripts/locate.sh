#!/usr/bin/env bash
# ==============================================================================
# NAME: locate.sh
# DESCRIPTION: Finds the newest installed ARCUS plugin and runs its bootstrap,
#              staging fresh helper scripts into .arcus/bin/ and rewriting
#              .arcus/env. Prints the resolved ARCUS_HOME on success.
#
# WHY THIS EXISTS: .arcus/bin/ is a COPY of the plugin's scripts, and nothing
# invalidates it. A repo bootstrapped months ago by one host keeps serving
# those stale scripts to every later session, on every host. Worse, only
# Claude Code fires the plugin's SessionStart hook at all — Copilot CLI reads
# hooks from .github/hooks/ in a different schema — so on a Copilot-only
# machine .arcus/bin/ is never created and every helper-script call fails.
#
# This is the chicken-and-egg breaker: it cannot live in .arcus/bin/ (which may
# not exist yet), so ARCUS entry points invoke it from the plugin itself.
#
# USAGE: bash "$ARCUS_HOME"/scripts/locate.sh        # from the workspace root
# ==============================================================================

set -eu

# 1. An explicit ARCUS_HOME wins — covers `--plugin-dir`, CI, and dev checkouts.
if [ -n "${ARCUS_HOME:-}" ] && [ -f "$ARCUS_HOME/scripts/bootstrap.sh" ]; then
    bash "$ARCUS_HOME/scripts/bootstrap.sh" >/dev/null
    echo "$ARCUS_HOME"
    exit 0
fi

# 2. Otherwise probe the known install roots and take the HIGHEST version.
#    A given version's scripts are byte-identical whichever host installed them,
#    so the newest copy is always the right one — no host detection needed.
RESOLVED="$(node -e '
const fs = require("fs"), path = require("path"), os = require("os");
const roots = [
  path.join(os.homedir(), ".copilot/installed-plugins"), // <marketplace>/<plugin>
  path.join(os.homedir(), ".claude/plugins/cache"),      // <marketplace>/<plugin>/<version>
  path.join(os.homedir(), ".agents/plugins"),
];
const found = [];
const walk = (dir, depth) => {
  if (depth > 3) return;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    const manifest = path.join(p, ".claude-plugin/plugin.json");
    if (fs.existsSync(path.join(p, "scripts/bootstrap.sh")) && fs.existsSync(manifest)) {
      try { found.push([JSON.parse(fs.readFileSync(manifest, "utf8")).version || "0.0.0", p]); } catch {}
    } else {
      walk(p, depth + 1);
    }
  }
};
for (const r of roots) walk(r, 0);
const cmp = (a, b) => {
  const A = String(a).split(".").map(Number), B = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (B[i] || 0) - (A[i] || 0); if (d) return d; }
  return 0;
};
found.sort((a, b) => cmp(a[0], b[0]));
process.stdout.write(found.length ? found[0][1] : "");
' 2>/dev/null || true)"

# 3. Last resort: the home recorded by a previous bootstrap.
if [ -z "$RESOLVED" ] && [ -f ".arcus/env" ]; then
    RESOLVED="$(sed -n 's/^ARCUS_HOME=//p' .arcus/env | head -n 1)"
    [ -f "$RESOLVED/scripts/bootstrap.sh" ] || RESOLVED=""
fi

if [ -z "$RESOLVED" ]; then
    echo "[ERROR] Could not locate an ARCUS install. Set ARCUS_HOME to the plugin directory." >&2
    exit 1
fi

bash "$RESOLVED/scripts/bootstrap.sh" >/dev/null
echo "$RESOLVED"
