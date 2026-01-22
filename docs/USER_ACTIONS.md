# User Actions

Manual steps that require user action (external dashboards, credentials, configurations, etc.).

## Pending Actions

### Set Up GitHub CLI for API Extraction

**Why:** The API-based extraction (`extract-api.js`) requires GitHub CLI to be installed and authenticated. This enables faster extraction without cloning repositories.

**Steps:**

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

**Alternative (CI/CD):**

For automated environments, use a Personal Access Token:
```bash
GH_TOKEN=ghp_xxxx ./scripts/setup-gh.sh
```

**Verification:**
```bash
gh auth status
gh api user --jq '.login'
```

**If this fails:** Use `--clone` flag for clone-based extraction instead:
```bash
./scripts/update-all.sh --clone
```

## Completed Actions

None yet.

---

*When AI assistants encounter tasks requiring manual user intervention, detailed instructions should be added here.*
