#!/bin/bash
#
# Update All Repos - Git Analytics
#
# Reads config/repos.json, clones/updates all repos, extracts data,
# and aggregates into dashboard/data.json
#
# Usage:
#   ./scripts/update-all.sh           # Update all repos
#   ./scripts/update-all.sh --fresh   # Remove cached repos and re-clone
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

echo "=========================================="
echo "Git Analytics - Update All Repos"
echo "=========================================="
echo ""

# Check for --fresh flag
if [[ "$1" == "--fresh" ]]; then
    echo -e "${YELLOW}Fresh mode: removing cached repos...${NC}"
    rm -rf "$CACHE_DIR"
    echo ""
fi

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

REPORT_PATHS=""
while IFS='|' read -r NAME URL; do
    REPO_PATH="$CACHE_DIR/$NAME"
    echo "  Extracting $NAME..."
    node "$SCRIPT_DIR/extract.js" "$REPO_PATH" --output="$REPORTS_DIR" 2>&1 | sed 's/^/    /'
    REPORT_PATHS="$REPORT_PATHS $REPORTS_DIR/$NAME"
done <<< "$REPOS"

echo ""

# Aggregate from processed data (with AI tags)
echo "Step 3: Aggregating processed data for dashboard"
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
