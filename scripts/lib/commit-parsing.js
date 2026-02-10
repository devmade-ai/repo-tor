/**
 * Parse a commit subject line for conventional commit format.
 * Returns structured metadata including scope, breaking flag, and title.
 */
export function parseCommitMessage(subject) {
    const result = {
        tags: [],           // Empty - AI will populate
        scope: null,
        breaking: false,
        title: subject,
        is_conventional: false
    };

    // Check for conventional commit format: type(scope): subject
    const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);

    if (conventionalMatch) {
        const [, type, scope, breaking, title] = conventionalMatch;
        result.scope = scope || null;
        result.breaking = !!breaking;
        result.title = title;
        result.is_conventional = true;
    }

    return result;
}

/**
 * Check for breaking change indicators in the subject and body.
 */
export function extractBreakingChange(subject, body) {
    if (/\bBREAKING\s*CHANGE\b/i.test(body) || /^BREAKING:/im.test(body)) {
        return true;
    }
    return false;
}

/**
 * Extract issue/PR references from subject and body text.
 * Supports GitHub/GitLab (#123), Jira (PROJ-123), and explicit refs lines.
 */
export function extractReferences(subject, body) {
    const text = [subject, body].filter(Boolean).join('\n');
    const refs = [];

    // GitHub/GitLab style: #123
    const hashRefs = text.match(/#\d+/g) || [];
    refs.push(...hashRefs);

    // Jira style: PROJ-123
    const jiraRefs = text.match(/[A-Z]+-\d+/g) || [];
    refs.push(...jiraRefs);

    // Explicit refs line
    const refsMatch = text.match(/^refs?:\s*(.+)$/im);
    if (refsMatch) {
        const lineRefs = refsMatch[1].match(/(#\d+|[A-Z]+-\d+)/g) || [];
        refs.push(...lineRefs);
    }

    return [...new Set(refs)]; // Deduplicate
}
