/**
 * Detect breaking-change markers in a commit message.
 * Returns true if either:
 *   - The subject uses the conventional-commit `!` marker (`type!:` or `type(scope)!:`)
 *   - The body contains `BREAKING CHANGE` (case-insensitive) or `BREAKING:` at line start
 *
 * History: this module previously also exported `parseCommitMessage` (returning
 * tags/scope/title/is_conventional) and `extractReferences`. Those outputs were
 * never consumed by the dashboard; both were removed 2026-04-29 as part of the
 * data-pipeline cleanup. Only the breaking-change detection survived because
 * `has_breaking_change` is a real commit field.
 */
export function extractBreakingChange(subject, body) {
    // Conventional-commit breaking marker: `type!:` or `type(scope)!:`
    if (/^\w+(?:\([^)]+\))?!:/.test(subject)) {
        return true;
    }
    // Body markers
    if (/\bBREAKING\s*CHANGE\b/i.test(body) || /^BREAKING:/im.test(body)) {
        return true;
    }
    return false;
}
