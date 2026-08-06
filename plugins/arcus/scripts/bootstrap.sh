#!/usr/bin/env bash
# ==============================================================================
# NAME: bootstrap.sh
# DESCRIPTION: SessionStart hook for the ARCUS plugin.
#              Stages the deterministic helper scripts into the active workspace
#              at .arcus/bin/ and records the plugin home (ARCUS_HOME) and
#              version in .arcus/env so skills can resolve bundled scripts and
#              agent specs regardless of where the plugin is cached on disk.
#
# It is idempotent and MUST be run at the start of every ARCUS entry point
# rather than relied upon as a host hook — but as a plugin-contributed
# SessionStart hook it now works on BOTH Claude Code and Copilot CLI. Confirmed
# live 2026-08-06: Copilot CLI DOES fire this hook and DOES set
# CLAUDE_PLUGIN_ROOT correctly, but it invokes the hook's COMMAND with cwd
# defaulting to the PLUGIN'S OWN install directory, not the actual session's
# working directory. That install directory is not a git repo, so the
# "not a git repository" check below silently exited 0 having staged nothing —
# the true cause of the original bug, not a schema or firing difference.
# Copilot CLI does deliver the session's real cwd as JSON on the hook's own
# stdin, though (`{"cwd": "...", ...}`, true for both the native camelCase and
# the "VS Code compatible"/Claude-format payload shapes), so hooks.json now
# passes `--from-hook` and this script reads that payload and cd's there
# before doing anything else.
# It also re-stages .arcus/bin after a plugin upgrade — the staged copy is
# otherwise a snapshot that never expires, and a repo bootstrapped by one host
# keeps serving that host's older scripts to every other host.
#
# FAILS LOUDLY. Every caller reads exit 0 as "the toolbox is ready", so the only
# silent exit is the deliberate "not a git repository" one. An unresolvable
# ARCUS_HOME or an empty staging result is an error, not a no-op.
# ==============================================================================

set -eu

# A candidate plugin root is only usable if it carries BOTH the scripts we stage
# and the manifest we read the version from. Anything else is a lookalike.
is_valid_home() {
    [ -n "${1:-}" ] && [ -d "$1/scripts" ] && [ -f "$1/.claude-plugin/plugin.json" ]
}

# Resolve the plugin root from this script's own location. This works in every
# host (VS Code, Copilot CLI, Claude Code) and does not depend on a plugin-root
# token being defined. Resolve this BEFORE any hook-driven cd below: BASH_SOURCE
# is only reliably absolute-safe relative to the ORIGINAL invocation directory.
ENV_ARCUS_HOME="${ARCUS_HOME:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ARCUS_HOME="$(cd "$SCRIPT_DIR/.." && pwd)"

# VALIDATE the derived root before staging anything. Deriving from BASH_SOURCE is
# right whenever this script sits in a real install, but a COPY run from anywhere
# else (say /tmp/bootstrap.sh) resolves ARCUS_HOME to that copy's parent — "/" in
# the reported case — and the staging loop below then silently produces an EMPTY
# .arcus/bin plus an .arcus/env pointing at nothing. Fall back to an explicitly
# exported ARCUS_HOME, and refuse to run rather than stage nothing.
if ! is_valid_home "$ARCUS_HOME"; then
    if is_valid_home "$ENV_ARCUS_HOME"; then
        ARCUS_HOME="$ENV_ARCUS_HOME"
    else
        echo "[ERROR] bootstrap.sh: cannot resolve a valid ARCUS install." >&2
        echo "        Derived from this script: $ARCUS_HOME (no scripts/ + .claude-plugin/plugin.json)" >&2
        echo "        Run the bootstrap from inside a real install, or export ARCUS_HOME to one." >&2
        exit 1
    fi
fi

# When invoked as a plugin-contributed hook (hooks.json passes --from-hook),
# the host's own working directory for the command is NOT reliable — Copilot
# CLI runs it from the plugin's own install dir. The hook's stdin JSON payload
# carries the real session cwd, though, so read it and cd there before the git
# checks below ever run. Never block waiting on stdin outside this explicit,
# hook-only path: every other caller (locate.sh, CI, a developer's shell) never
# passes --from-hook, so this block never runs for them.
if [ "${1:-}" = "--from-hook" ]; then
    HOOK_PAYLOAD="$(cat 2>/dev/null || true)"
    HOOK_CWD="$(printf '%s' "$HOOK_PAYLOAD" | node -e '
        let d = "";
        process.stdin.on("data", (c) => { d += c; });
        process.stdin.on("end", () => {
            try {
                const j = JSON.parse(d);
                if (j && typeof j.cwd === "string" && j.cwd) process.stdout.write(j.cwd);
            } catch (e) { /* no usable payload — fall back to the process cwd */ }
        });
    ' 2>/dev/null)" || true
    if [ -n "$HOOK_CWD" ] && [ -d "$HOOK_CWD" ]; then
        cd "$HOOK_CWD"
    fi
fi

# Only bootstrap inside a git repository (the ARCUS pipeline requires git).
#
# Ask git rather than testing for a .git DIRECTORY. In a git worktree .git is a
# FILE containing `gitdir: <path>`, so a `-d` test is false and the bootstrap
# exits 0 having staged nothing — the silent failure that blocked every
# worktree-backed session. `rev-parse` covers worktrees, submodules and $GIT_DIR
# overrides in one check.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    exit 0
fi

# Stage at the REPOSITORY ROOT, not the current directory: being invoked from a
# subdirectory would otherwise scatter a second, unused .arcus/ tree there.
WORKSPACE_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

BIN_DIR="$WORKSPACE_ROOT/.arcus/bin"
mkdir -p "$BIN_DIR"

# Stage every helper script except this bootstrapper.
for script in "$ARCUS_HOME"/scripts/*.sh; do
    [ -e "$script" ] || continue
    name="$(basename "$script")"
    [ "$name" = "bootstrap.sh" ] && continue
    cp "$script" "$BIN_DIR/$name"
    chmod +x "$BIN_DIR/$name"
done

# Stage sourced libraries (the top-level glob above does not recurse into lib/).
if [ -d "$ARCUS_HOME/scripts/lib" ]; then
    LIB_DIR="$BIN_DIR/lib"
    mkdir -p "$LIB_DIR"
    for lib in "$ARCUS_HOME"/scripts/lib/*.sh; do
        [ -e "$lib" ] || continue
        name="$(basename "$lib")"
        cp "$lib" "$LIB_DIR/$name"
        chmod +x "$LIB_DIR/$name"
    done
fi

# POST-CONDITION: staging must actually have produced the helper scripts. Every
# ARCUS entry point treats a zero exit here as "the toolbox is ready", so
# reporting success over an empty .arcus/bin just relocates the failure to the
# first helper-script call, where it surfaces as an unexplained
# "No such file or directory".
if [ ! -f "$BIN_DIR/checkpoint.sh" ]; then
    echo "[ERROR] bootstrap.sh: staging produced no helper scripts in $BIN_DIR." >&2
    echo "        ARCUS_HOME=$ARCUS_HOME — check that its scripts/ directory is populated." >&2
    exit 1
fi

# Record the plugin home so skills can locate bundled resources (templates,
# references, agent specs) if they ever need an absolute path. The version is
# stamped too: `.arcus/bin` is a COPY, so without it there is no way to tell a
# freshly-staged workspace from one carrying months-old scripts.
ARCUS_VERSION="$(node -p "require('$ARCUS_HOME/.claude-plugin/plugin.json').version" 2>/dev/null || echo unknown)"
cat > "$WORKSPACE_ROOT/.arcus/env" <<ENV
# Generated by the ARCUS bootstrap. Do not edit by hand.
ARCUS_HOME=$ARCUS_HOME
ARCUS_VERSION=$ARCUS_VERSION
ENV

# Make sure the working area is ignored by git.
if ! grep -q "^\.arcus" "$WORKSPACE_ROOT/.gitignore" 2>/dev/null; then
    printf "\n# --- ARCUS Artifacts ---\n.arcus/\n" >> "$WORKSPACE_ROOT/.gitignore"
fi

echo "[ARCUS] Ready. Helper scripts staged at .arcus/bin/ (ARCUS_HOME=$ARCUS_HOME)."
