#!/bin/sh
# ==============================================================================
# arcus-opencode installer
#
# One-command install of the ARCUS OpenCode plugin. Performs both setup steps:
#   1. installs arcus-opencode (from a GitHub Release tarball) via pnpm
#   2. writes the one-line OpenCode plugin loader
#
# The plugin itself then auto-stages its skills/agents and manages .gitignore.
#
# USAGE
#   # project install (current repo):
#   curl -fsSL <RELEASE_URL>/install.sh | sh
#
#   # global install (all repos):
#   curl -fsSL <RELEASE_URL>/install.sh | sh -s -- --global
#
#   # pin a version:
#   curl -fsSL <RELEASE_URL>/install.sh | sh -s -- --version 2.0.0
#
# ENV OVERRIDES
#   ARCUS_OPENCODE_TARBALL_URL   full URL to the .tgz (skips release lookup;
#                                use for private mirrors / air-gapped installs)
#   ARCUS_OPENCODE_REPO          owner/repo for release lookup
#                                (default: piyushbhargava1412/arcus-plugin)
# ==============================================================================
set -eu

REPO="${ARCUS_OPENCODE_REPO:-piyushbhargava1412/arcus-plugin}"
SCOPE="project"
VERSION=""
TARBALL_URL="${ARCUS_OPENCODE_TARBALL_URL:-}"

# ---- parse args --------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --global) SCOPE="global" ;;
    --project) SCOPE="project" ;;
    --version) VERSION="${2:-}"; shift ;;
    --version=*) VERSION="${1#*=}" ;;
    -h|--help)
      sed -n '2,30p' "$0" 2>/dev/null || echo "see install.sh header for usage"
      exit 0 ;;
    *) echo "arcus-opencode: unknown option '$1'" >&2; exit 2 ;;
  esac
  shift
done

err() { echo "arcus-opencode: $*" >&2; exit 1; }
info() { echo "[arcus-opencode] $*"; }

# ---- preconditions -----------------------------------------------------------
command -v pnpm >/dev/null 2>&1 || err "pnpm is required (https://pnpm.io/installation)"
command -v node >/dev/null 2>&1 || err "node is required (>=18)"
DL=""
if command -v curl >/dev/null 2>&1; then DL="curl"; elif command -v wget >/dev/null 2>&1; then DL="wget"; else
  err "need curl or wget to download the release"
fi

fetch() { # fetch <url> -> stdout
  if [ "$DL" = "curl" ]; then curl -fsSL "$1"; else wget -qO- "$1"; fi
}

# ---- resolve the tarball URL -------------------------------------------------
if [ -z "$TARBALL_URL" ]; then
  if [ -n "$VERSION" ]; then
    API="https://api.github.com/repos/$REPO/releases/tags/arcus-opencode-v$VERSION"
  else
    API="https://api.github.com/repos/$REPO/releases/latest"
  fi
  info "resolving release from $REPO ..."
  # Pick the browser_download_url of the first asset ending in .tgz.
  TARBALL_URL="$(fetch "$API" \
    | grep -o '"browser_download_url"[^,]*\.tgz"' \
    | head -n 1 \
    | sed 's/.*"\(https[^"]*\.tgz\)"/\1/')" || true
  [ -n "$TARBALL_URL" ] || err "could not find a .tgz asset in the release (set ARCUS_OPENCODE_TARBALL_URL to override)"
fi
info "tarball: $TARBALL_URL"

# ---- choose install dir ------------------------------------------------------
if [ "$SCOPE" = "global" ]; then
  TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  mkdir -p "$TARGET"
  [ -f "$TARGET/package.json" ] || echo '{}' > "$TARGET/package.json"
  PNPM_FLAGS=""
  # The global config dir IS the opencode dir; loader goes directly in plugins/.
  LOADER_DIR="$TARGET/plugins"
  info "installing GLOBALLY into $TARGET"
else
  TARGET="$(pwd)"
  [ -d "$TARGET/.git" ] || err "not a git repository (run inside your project, or use --global)"
  [ -f "$TARGET/package.json" ] || (cd "$TARGET" && pnpm init >/dev/null 2>&1)
  PNPM_FLAGS="-D"
  # Project repos use the .opencode/ subdir that OpenCode scans.
  LOADER_DIR="$TARGET/.opencode/plugins"
  info "installing into project $TARGET"
fi

# ---- step 1: install the package --------------------------------------------
( cd "$TARGET" && pnpm add $PNPM_FLAGS "$TARBALL_URL" )

# ---- step 2: write the loader ------------------------------------------------
mkdir -p "$LOADER_DIR"
cat > "$LOADER_DIR/arcus.ts" <<'LOADER'
// Installed by the arcus-opencode installer. Loads the plugin from node_modules.
export { ArcusOpencode } from "arcus-opencode"
LOADER
info "wrote loader $LOADER_DIR/arcus.ts"

# ---- done --------------------------------------------------------------------
echo
info "done. Open OpenCode here and try:  what is arcus"
if [ "$SCOPE" = "global" ]; then
  info "ARCUS is now available in every repo you open with OpenCode."
fi
