#!/bin/bash
# Git Analytics Extraction Script
#
# Usage: ./extract.sh [repo-path] [output-dir]
#
# Examples:
#   ./extract.sh                    # Extract current repo to ./reports/
#   ./extract.sh /path/to/repo      # Extract specific repo
#   ./extract.sh . ./my-reports     # Custom output directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="${1:-.}"
OUTPUT_DIR="${2:-reports}"

# Resolve to absolute paths
REPO_PATH="$(cd "$REPO_PATH" 2>/dev/null && pwd)"
if [ -z "$REPO_PATH" ]; then
    echo "Error: Repository path not found: $1"
    exit 1
fi

# Check if it's a git repository
if ! git -C "$REPO_PATH" rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not a git repository: $REPO_PATH"
    exit 1
fi

# Run the Node.js extraction script
node "$SCRIPT_DIR/extract.js" "$REPO_PATH" --output="$OUTPUT_DIR"
