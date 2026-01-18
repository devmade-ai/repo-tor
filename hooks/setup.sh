#!/bin/bash
#
# Install git hooks for this repository
#
# Usage: ./hooks/setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "Installing git hooks..."

# Check if we're in a git repository
if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo "Error: Not a git repository or .git/hooks not found"
    exit 1
fi

# Install commit-msg hook
if [ -f "$SCRIPT_DIR/commit-msg" ]; then
    cp "$SCRIPT_DIR/commit-msg" "$GIT_HOOKS_DIR/commit-msg"
    chmod +x "$GIT_HOOKS_DIR/commit-msg"
    echo "  Installed: commit-msg hook"
else
    echo "  Skipped: commit-msg hook (not found)"
fi

# Configure commit template
if [ -f "$REPO_ROOT/.gitmessage" ]; then
    git config commit.template .gitmessage
    echo "  Configured: commit.template = .gitmessage"
else
    echo "  Skipped: commit template (not found)"
fi

echo ""
echo "Done! Git hooks installed."
echo ""
echo "The commit-msg hook will validate your commit messages."
echo "Use 'git commit' to see the commit template."
echo ""
echo "To bypass validation (not recommended):"
echo "  git commit --no-verify"
