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
#   GH_TOKEN=xxx ./scripts/setup-gh.sh       # Token via environment variable
#
# For CI/CD environments, use a GitHub Personal Access Token (PAT) with 'repo' scope.
#

set -e

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
for arg in "$@"; do
    case $arg in
        --token=*)
            TOKEN="${arg#*=}"
            ;;
        --token)
            shift
            TOKEN="$1"
            ;;
    esac
    shift 2>/dev/null || true
done

# Check for token in environment
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

if gh auth status &> /dev/null; then
    echo -e "${GREEN}Already authenticated with GitHub!${NC}"
    gh auth status
else
    echo -e "${YELLOW}Not authenticated. Setting up authentication...${NC}"
    echo ""

    if [[ -n "$TOKEN" ]]; then
        # Non-interactive: use provided token
        echo "Authenticating with provided token..."
        echo "$TOKEN" | gh auth login --with-token

        if gh auth status &> /dev/null; then
            echo -e "${GREEN}Authentication successful!${NC}"
        else
            echo -e "${RED}Authentication failed. Check your token.${NC}"
            echo ""
            echo "Token requirements:"
            echo "  - Must have 'repo' scope for private repos"
            echo "  - Must have 'public_repo' scope for public repos only"
            echo ""
            echo "Create a token at: https://github.com/settings/tokens"
            exit 1
        fi
    else
        # Interactive: guide user
        echo "Choose authentication method:"
        echo ""
        echo "  1. Browser login (recommended for interactive use)"
        echo "  2. Token login (for CI/CD or headless environments)"
        echo ""
        read -p "Enter choice (1 or 2): " choice
        echo ""

        case $choice in
            1)
                echo "Starting browser authentication..."
                echo "A browser window will open. Follow the prompts to authenticate."
                echo ""
                gh auth login --web
                ;;
            2)
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
    fi
fi

echo ""

# === Verify API Access ===
echo "Verifying GitHub API access..."
if gh api user --jq '.login' &> /dev/null; then
    USER=$(gh api user --jq '.login')
    echo -e "${GREEN}API access confirmed!${NC} Logged in as: $USER"
else
    echo -e "${YELLOW}Warning: Could not verify API access.${NC}"
    echo "This may be due to token scope limitations."
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup complete!${NC}"
echo "=========================================="
echo ""
echo "You can now use API-based extraction:"
echo ""
echo "  ./scripts/update-all.sh              # Extract via GitHub API"
echo "  node scripts/extract-api.js owner/repo   # Extract single repo"
echo ""
echo "Troubleshooting:"
echo "  gh auth status      # Check auth status"
echo "  gh auth refresh     # Refresh token"
echo "  gh auth logout      # Log out and re-authenticate"
echo ""
