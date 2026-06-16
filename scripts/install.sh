#!/usr/bin/env bash
# ==============================================================================
# NAME: install.sh
# DESCRIPTION: Installs the AFK Agent-Forge framework into a target repository.
# ==============================================================================

set -e

# Detect the source directory of the forge framework
FORGE_DIR=$(cd "$(dirname "$0")/.." && pwd)
PLUGIN_DIR="$FORGE_DIR/plugins/agent-forge"

if [ -z "$1" ]; then
    echo "[ERROR] Missing target repository path."
    echo "Usage: ./install.sh <target-repo-path>"
    exit 1
fi

TARGET_REPO=$(cd "$1" && pwd)

if [ ! -d "$TARGET_REPO/.git" ]; then
    echo "[ERROR] $TARGET_REPO does not appear to be a git repository."
    exit 1
fi

echo "🚀 Installing Agent-Forge into: $TARGET_REPO"

# 1. Create directory structure
mkdir -p "$TARGET_REPO/.github/skills"
mkdir -p "$TARGET_REPO/.github/scripts"
mkdir -p "$TARGET_REPO/.aforge/specs"

# 2. Sync Skills
echo "📦 Syncing declarative skills..."
cp -R "$PLUGIN_DIR/skills/"* "$TARGET_REPO/.github/skills/"

# 2a. Create .claude/skills as a symlink to .github/skills (supports Claude harness)
echo "🔗 Linking .github/skills -> .claude/skills..."
mkdir -p "$TARGET_REPO/.claude"
ln -sfn "../.github/skills" "$TARGET_REPO/.claude/skills"
echo "   Symlink created: .github/skills -> .claude/skills"

# 3. Install helper scripts (used by afk-skill-router)
echo "⚙️ Installing helper scripts (.github/scripts/)..."
HELPER_SCRIPTS="extract_story_id.sh branch.sh commit.sh pr.sh checkpoint.sh"
for script in $HELPER_SCRIPTS; do
    if [ -f "$PLUGIN_DIR/scripts/$script" ]; then
        cp "$PLUGIN_DIR/scripts/$script" "$TARGET_REPO/.github/scripts/$script"
        chmod +x "$TARGET_REPO/.github/scripts/$script"
        echo "   Installed $script"
    else
        echo "   Warning: $script not found in source. Skipping."
    fi
done

# 4. Update .gitignore
echo "📝 Updating .gitignore..."
if ! grep -q ".aforge" "$TARGET_REPO/.gitignore" 2>/dev/null; then
    cat <<GITIGNORE >> "$TARGET_REPO/.gitignore"

# --- Agent-Forge ---
.aforge/
.claude/
.github/skills/
.github/scripts/
GITIGNORE
    echo "   Added agent-forge paths to .gitignore"
else
    echo "   .aforge already present in .gitignore"
fi

echo "=============================================================================="
echo "✅ Installation Complete."
echo "=============================================================================="
echo ""
echo "💡 Usage:"
echo "   cd $TARGET_REPO"
echo ""
echo "   # Agentic (skill-router via Copilot CLI)"
echo "   copilot                                 # Start Copilot CLI session"
echo "   /yolo on                                # Grant full permissions to Copilot agent"
echo "   > implement path/to/story.md            # Triggers AFK pipeline"
echo ""
echo "   # Agentic (skill-router via Claude CLI)"
echo "   claude                                  # Start Claude CLI session"
echo "   enable bypass all permissions           # Grant full permissions to Claude agent"
echo "   > implement path/to/story.md            # Triggers AFK pipeline"
echo ""
echo "=============================================================================="
