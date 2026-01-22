#!/bin/bash
#
# GitHub CLI Setup Script
#
# Installs GitHub CLI (gh) and configures authentication for API-based extraction.
# Works on Linux, macOS, and WSL.
#
# Usage:
#   ./scripts/setup-gh.sh                    # Interactive setup
#   ./scripts/setup-gh.sh --token <TOKEN>    # Non-interactive with token
#   ./scripts/setup-gh.sh --save-env         # Save token to .env file
#   GH_TOKEN=xxx ./scripts/setup-gh.sh       # Token via environment variable
#
# For CI/CD or AI sessions, use a GitHub Personal Access Token (PAT) with 'repo' scope.
#

set -e

# Get script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "GitHub CLI Setup for Git Analytics"
echo "=========================================="
echo ""

# === Parse Arguments ===
TOKEN=""
SAVE_ENV=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --token=*)
            TOKEN="${1#*=}"
            shift
            ;;
        --token)
            TOKEN="$2"
            shift 2
            ;;
        --save-env)
            SAVE_ENV=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# === Load .env file if present ===
ENV_FILE="$PROJECT_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
    echo -e "Loading environment from: ${BLUE}$ENV_FILE${NC}"
    # Source .env file (only export lines starting with valid var names)
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        # Only process valid KEY=VALUE lines
        if [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]]; then
            export "$line"
        fi
    done < "$ENV_FILE"
fi

# Check for token (priority: arg > env > .env file)
if [[ -z "$TOKEN" && -n "$GH_TOKEN" ]]; then
    TOKEN="$GH_TOKEN"
fi

# === Detect OS ===
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    elif [[ -f /etc/arch-release ]]; then
        echo "arch"
    elif [[ -f /etc/alpine-release ]]; then
        echo "alpine"
    elif grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
    else
        echo "linux"
    fi
}

OS=$(detect_os)
echo -e "Detected OS: ${BLUE}$OS${NC}"
echo ""

# === Check if gh is already installed ===
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -n1)
    echo -e "${GREEN}GitHub CLI already installed:${NC} $GH_VERSION"
elif [[ "$SKIP_INSTALL" == true ]]; then
    echo -e "${YELLOW}GitHub CLI not installed (skipped by --skip-install)${NC}"
else
    echo -e "${YELLOW}GitHub CLI not found. Installing...${NC}"
    echo ""

    case $OS in
        macos)
            if command -v brew &> /dev/null; then
                echo "Installing via Homebrew..."
                brew install gh
            else
                echo -e "${RED}Error: Homebrew not found.${NC}"
                echo "Install Homebrew first: https://brew.sh"
                echo "Or install gh manually: https://cli.github.com/"
                exit 1
            fi
            ;;
        debian|wsl)
            echo "Installing via apt (Debian/Ubuntu)..."
            # Add GitHub CLI repository
            (type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y))
            sudo mkdir -p -m 755 /etc/apt/keyrings
            out=$(mktemp)
            wget -nv -O "$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg
            cat "$out" | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
            sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt update
            sudo apt install gh -y
            ;;
        redhat)
            echo "Installing via dnf/yum (RHEL/Fedora/CentOS)..."
            sudo dnf install 'dnf-command(config-manager)' -y 2>/dev/null || true
            sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
            sudo dnf install gh -y
            ;;
        arch)
            echo "Installing via pacman (Arch Linux)..."
            sudo pacman -S github-cli --noconfirm
            ;;
        alpine)
            echo "Installing via apk (Alpine Linux)..."
            apk add github-cli
            ;;
        *)
            echo -e "${YELLOW}Unknown Linux distribution.${NC}"
            echo "Attempting to install via conda (if available)..."
            if command -v conda &> /dev/null; then
                conda install -c conda-forge gh -y
            else
                echo ""
                echo -e "${RED}Could not auto-install gh CLI.${NC}"
                echo "Please install manually: https://cli.github.com/"
                exit 1
            fi
            ;;
    esac

    echo ""
    if command -v gh &> /dev/null; then
        GH_VERSION=$(gh --version | head -n1)
        echo -e "${GREEN}GitHub CLI installed successfully:${NC} $GH_VERSION"
    else
        echo -e "${RED}Installation failed. Please install manually: https://cli.github.com/${NC}"
        exit 1
    fi
fi

echo ""

# === Check/Setup Authentication ===
echo "Checking authentication status..."
echo ""

# If we have a token, we can use it directly (gh CLI respects GH_TOKEN env var)
if [[ -n "$TOKEN" ]]; then
    echo -e "${GREEN}Token available${NC} (GH_TOKEN environment variable)"

    # Export for this session
    export GH_TOKEN="$TOKEN"

    # Optionally save to .env file
    if [[ "$SAVE_ENV" == true ]]; then
        if [[ -f "$ENV_FILE" ]]; then
            # Update existing .env file
            if grep -q "^GH_TOKEN=" "$ENV_FILE" 2>/dev/null; then
                # Replace existing GH_TOKEN line
                sed -i.bak "s|^GH_TOKEN=.*|GH_TOKEN=$TOKEN|" "$ENV_FILE"
                rm -f "$ENV_FILE.bak"
                echo -e "${GREEN}Updated GH_TOKEN in $ENV_FILE${NC}"
            else
                # Append GH_TOKEN
                echo "" >> "$ENV_FILE"
                echo "GH_TOKEN=$TOKEN" >> "$ENV_FILE"
                echo -e "${GREEN}Added GH_TOKEN to $ENV_FILE${NC}"
            fi
        else
            # Create new .env file from example
            if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
                cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
                sed -i.bak "s|^GH_TOKEN=.*|GH_TOKEN=$TOKEN|" "$ENV_FILE"
                rm -f "$ENV_FILE.bak"
            else
                echo "GH_TOKEN=$TOKEN" > "$ENV_FILE"
            fi
            echo -e "${GREEN}Created $ENV_FILE with GH_TOKEN${NC}"
        fi
    fi

    # Test the token
    echo ""
    echo "Verifying token access..."
    if gh api user --jq '.login' &> /dev/null; then
        USER=$(gh api user --jq '.login')
        echo -e "${GREEN}API access confirmed!${NC} Logged in as: $USER"
    else
        echo -e "${RED}Token verification failed.${NC}"
        echo ""
        echo "Token requirements:"
        echo "  - Must have 'repo' scope for private repos"
        echo "  - Must have 'public_repo' scope for public repos only"
        echo ""
        echo "Create a new token at: https://github.com/settings/tokens/new"
        exit 1
    fi

elif gh auth status &> /dev/null; then
    echo -e "${GREEN}Already authenticated with GitHub!${NC}"
    gh auth status
else
    echo -e "${YELLOW}Not authenticated. Setting up authentication...${NC}"
    echo ""

    # Check if we're in an interactive terminal
    if [[ -t 0 ]]; then
        # Interactive: guide user
        echo "Choose authentication method:"
        echo ""
        echo "  1. Browser login (recommended for interactive use)"
        echo "  2. Token login (for CI/CD or headless environments)"
        echo "  3. Token login + save to .env file (for AI sessions)"
        echo ""
        read -p "Enter choice (1, 2, or 3): " choice
        echo ""

        case $choice in
            1)
                echo "Starting browser authentication..."
                echo "A browser window will open. Follow the prompts to authenticate."
                echo ""
                gh auth login --web
                ;;
            2|3)
                echo "Token authentication selected."
                echo ""
                echo "Create a Personal Access Token (PAT) at:"
                echo "  https://github.com/settings/tokens/new"
                echo ""
                echo "Required scopes:"
                echo "  - 'repo' (for private repositories)"
                echo "  - 'public_repo' (for public repositories only)"
                echo ""
                read -sp "Paste your token (hidden): " user_token
                echo ""
                echo ""
                echo "$user_token" | gh auth login --with-token

                if [[ "$choice" == "3" && $? -eq 0 ]]; then
                    # Save to .env
                    if [[ -f "$PROJECT_ROOT/.env.example" && ! -f "$ENV_FILE" ]]; then
                        cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
                        sed -i.bak "s|^GH_TOKEN=.*|GH_TOKEN=$user_token|" "$ENV_FILE"
                        rm -f "$ENV_FILE.bak"
                    else
                        if [[ -f "$ENV_FILE" ]] && grep -q "^GH_TOKEN=" "$ENV_FILE" 2>/dev/null; then
                            sed -i.bak "s|^GH_TOKEN=.*|GH_TOKEN=$user_token|" "$ENV_FILE"
                            rm -f "$ENV_FILE.bak"
                        else
                            echo "GH_TOKEN=$user_token" >> "$ENV_FILE"
                        fi
                    fi
                    echo -e "${GREEN}Token saved to $ENV_FILE${NC}"
                fi
                ;;
            *)
                echo -e "${RED}Invalid choice. Exiting.${NC}"
                exit 1
                ;;
        esac

        if gh auth status &> /dev/null; then
            echo -e "${GREEN}Authentication successful!${NC}"
        else
            echo -e "${RED}Authentication failed.${NC}"
            exit 1
        fi
    else
        # Non-interactive: show instructions
        echo -e "${RED}No token provided and not in interactive terminal.${NC}"
        echo ""
        echo "For non-interactive setup, use one of:"
        echo ""
        echo "  1. Set GH_TOKEN environment variable:"
        echo "     GH_TOKEN=ghp_xxx ./scripts/setup-gh.sh"
        echo ""
        echo "  2. Pass token as argument:"
        echo "     ./scripts/setup-gh.sh --token=ghp_xxx"
        echo ""
        echo "  3. Create .env file:"
        echo "     cp .env.example .env"
        echo "     # Edit .env and set GH_TOKEN=ghp_xxx"
        echo "     ./scripts/setup-gh.sh"
        echo ""
        echo "Create a token at: https://github.com/settings/tokens/new"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup complete!${NC}"
echo "=========================================="
echo ""
echo "You can now use API-based extraction:"
echo ""
echo "  ./scripts/update-all.sh                  # Extract via GitHub API"
echo "  node scripts/extract-api.js owner/repo   # Extract single repo"
echo ""
if [[ -f "$ENV_FILE" ]]; then
    echo "Environment file: $ENV_FILE"
    echo ""
fi
echo "Troubleshooting:"
echo "  gh auth status      # Check auth status"
echo "  gh auth refresh     # Refresh token"
echo "  gh auth logout      # Log out and re-authenticate"
echo ""
