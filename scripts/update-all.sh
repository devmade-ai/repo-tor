#!/bin/bash
#
# Update All Repos - Git Analytics
#
# Reads config/repos.json and extracts git data from all repos.
# By default uses GitHub API (no cloning required).
#
# Usage:
#   ./scripts/update-all.sh           # Extract via GitHub API (default, fast)
#   ./scripts/update-all.sh --clone   # Clone repos and extract locally
#   ./scripts/update-all.sh --fresh   # Remove cached repos and re-clone (implies --clone)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$ROOT_DIR/config/repos.json"
CACHE_DIR="$ROOT_DIR/.repo-cache"
REPORTS_DIR="$ROOT_DIR/reports"
DASHBOARD_DIR="$ROOT_DIR/dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to API mode
USE_API=true

echo "=========================================="
echo "Git Analytics - Update All Repos"
echo "=========================================="
echo ""

# Parse flags
for arg in "$@"; do
    case $arg in
        --clone)
            USE_API=false
            ;;
        --fresh)
            USE_API=false
            echo -e "${YELLOW}Fresh mode: removing cached repos...${NC}"
            rm -rf "$CACHE_DIR"
            echo ""
            ;;
    esac
done

if [ "$USE_API" = true ]; then
    echo -e "${GREEN}Mode: GitHub API (no cloning)${NC}"
else
    echo -e "${YELLOW}Mode: Clone-based extraction${NC}"
fi
echo ""

# Check config exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
    echo ""
    echo "Create config/repos.json with your repositories:"
    echo '{'
    echo '  "repos": ['
    echo '    { "name": "my-repo", "url": "https://github.com/user/my-repo.git" }'
    echo '  ]'
    echo '}'
    exit 1
fi

# Create cache directory
mkdir -p "$CACHE_DIR"

# Parse repos from JSON (simple parsing without jq dependency)
REPOS=$(node -e "
const config = require('$CONFIG_FILE');
config.repos.forEach(r => console.log(r.name + '|' + r.url));
")

if [[ -z "$REPOS" ]]; then
    echo -e "${RED}Error: No repos found in config${NC}"
    exit 1
fi

REPO_COUNT=$(echo "$REPOS" | wc -l)
echo "Found $REPO_COUNT repositories in config"
echo ""

if [ "$USE_API" = true ]; then
    # === API-based extraction (no cloning) ===
    echo "Step 1: Extracting via GitHub API"
    echo "-------------------------------------------"

    # Check gh CLI is available and authenticated
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: gh CLI not found. Install from https://cli.github.com/${NC}"
        echo "Or use --clone flag to extract via cloning instead."
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        echo -e "${RED}Error: Not authenticated with GitHub. Run: gh auth login${NC}"
        echo "Or use --clone flag to extract via cloning instead."
        exit 1
    fi

    while IFS='|' read -r NAME URL; do
        # Extract owner/repo from URL (handles both .git and non-.git URLs)
        REPO_FULL=$(echo "$URL" | sed -E 's|https://github.com/||; s|\.git$||')
        echo "  Extracting $REPO_FULL..."
        node "$SCRIPT_DIR/extract-api.js" "$REPO_FULL" --output="$REPORTS_DIR" 2>&1 | sed 's/^/    /'
    done <<< "$REPOS"

else
    # === Clone-based extraction ===

    # Create cache directory
    mkdir -p "$CACHE_DIR"

    # Clone or update each repo
    echo "Step 1: Fetching repositories"
    echo "-------------------------------------------"

    while IFS='|' read -r NAME URL; do
        REPO_PATH="$CACHE_DIR/$NAME"

        if [[ -d "$REPO_PATH/.git" ]]; then
            echo -e "  ${GREEN}↻${NC} Updating $NAME..."
            (cd "$REPO_PATH" && git fetch --all --quiet && git pull --quiet 2>/dev/null || true)
        else
            echo -e "  ${GREEN}↓${NC} Cloning $NAME..."
            git clone --quiet "$URL" "$REPO_PATH"
        fi
    done <<< "$REPOS"

    echo ""

    # Extract data from each repo
    echo "Step 2: Extracting git data"
    echo "-------------------------------------------"

    while IFS='|' read -r NAME URL; do
        REPO_PATH="$CACHE_DIR/$NAME"
        echo "  Extracting $NAME..."
        node "$SCRIPT_DIR/extract.js" "$REPO_PATH" --output="$REPORTS_DIR" 2>&1 | sed 's/^/    /'
    done <<< "$REPOS"
fi

echo ""

echo ""

# Aggregate from processed data (with AI tags)
echo "Step 2: Aggregating processed data for dashboard"
echo "-------------------------------------------"

node "$SCRIPT_DIR/aggregate-processed.js" 2>&1 | sed 's/^/  /'

echo ""
echo "=========================================="
echo -e "${GREEN}Update complete!${NC}"
echo "=========================================="
echo ""
echo "Dashboard data: $DASHBOARD_DIR/data.json"
echo ""
echo "Next steps:"
echo "  1. Run: node scripts/pending.js  (to see new commits)"
echo "  2. Process pending commits with @data feed the chicken"
echo "  3. Re-aggregate: node scripts/aggregate-processed.js"
echo ""
