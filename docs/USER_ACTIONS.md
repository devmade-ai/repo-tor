# User Actions

Manual steps that require user action (external dashboards, credentials, configurations, etc.).

## Pending Actions

### Set Up GitHub CLI for API Extraction

**Why:** The API-based extraction (`extract-api.js`) requires GitHub authentication. This enables faster extraction without cloning repositories.

---

#### Option A: Interactive Setup (Human Users)

1. Run the setup script:
   ```bash
   ./scripts/setup-gh.sh
   ```

2. The script will:
   - Install `gh` CLI if not present (requires sudo on Linux)
   - Guide you through GitHub authentication
   - Verify API access is working

3. After setup, test the API extraction:
   ```bash
   node scripts/extract-api.js devmade-ai/repo-tor --output=reports/
   ```

---

#### Option B: .env File Setup (AI Sessions / Non-Interactive)

For AI assistants that can't use interactive authentication:

1. **Create a Personal Access Token** at https://github.com/settings/tokens/new
   - Select scopes: `repo` (for private repos) or `public_repo` (public only)
   - Copy the token (starts with `ghp_`)

2. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env** and set your token:
   ```
   GH_TOKEN=ghp_your_token_here
   ```

4. **Test extraction:**
   ```bash
   node scripts/extract-api.js devmade-ai/repo-tor --output=reports/
   ```

The scripts automatically load `.env` from the project root.

---

#### Option C: One-liner with Token

```bash
# Save token to .env for future sessions
./scripts/setup-gh.sh --token=ghp_xxxx --save-env

# Or just set it for this run
GH_TOKEN=ghp_xxxx node scripts/extract-api.js owner/repo
```

---

**Verification:**
```bash
# Check if .env has token
cat .env | grep GH_TOKEN

# Test API access
GH_TOKEN=$(grep GH_TOKEN .env | cut -d= -f2) gh api user --jq '.login'
```

**If this fails:** Use `--clone` flag for clone-based extraction instead:
```bash
./scripts/update-all.sh --clone
```

## Completed Actions

None yet.

---

*When AI assistants encounter tasks requiring manual user intervention, detailed instructions should be added here.*
