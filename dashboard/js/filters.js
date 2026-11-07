/**
 * Filter presets and a copy helper that does not share nested arrays.
 *
 * Requirement: The first visit hides merge commits. Clear All removes every
 *   filter, including that exclusion and any dates. The sidebar count says
 *   "1 filter" for one and "N filters" otherwise.
 * Approach: Two presets. DEFAULT is the first visit. EMPTY is what Clear
 *   All writes. cloneFilters copies each values array so a later edit cannot
 *   mutate the preset.
 * Alternatives:
 *   - Clear All restores DEFAULT: Rejected — the approved behaviour is a
 *     genuine empty set, so the full change count comes back.
 *   - A shallow `{ ...DEFAULT_FILTERS }` copy: Rejected — the nested values
 *     arrays would still be the preset's arrays.
 */

const LIST_KEYS = ['tag', 'author', 'repo', 'urgency', 'impact'];

export const DEFAULT_FILTERS = {
    tag: { values: ['merge'], mode: 'exclude' },
    author: { values: [], mode: 'include' },
    repo: { values: [], mode: 'include' },
    urgency: { values: [], mode: 'include' },
    impact: { values: [], mode: 'include' },
    dateFrom: '',
    dateTo: '',
};

export const EMPTY_FILTERS = {
    tag: { values: [], mode: 'include' },
    author: { values: [], mode: 'include' },
    repo: { values: [], mode: 'include' },
    urgency: { values: [], mode: 'include' },
    impact: { values: [], mode: 'include' },
    dateFrom: '',
    dateTo: '',
};

export function cloneFilters(source) {
    const next = {
        dateFrom: source?.dateFrom || '',
        dateTo: source?.dateTo || '',
    };
    for (const key of LIST_KEYS) {
        const group = source?.[key];
        next[key] = {
            values: [...(group?.values || [])],
            mode: group?.mode === 'exclude' ? 'exclude' : 'include',
        };
    }
    return next;
}

export function filterCountPhrase(count) {
    return count === 1 ? '1 filter active' : `${count} filters active`;
}
