/**
 * The selected tab in the query string.
 *
 * Requirement: Only the current tab is written and restored, as `?tab=`.
 *   Summary, the default, omits the parameter. Other parameters stay.
 *   An unknown value shows Summary and is left in the address until the
 *   user picks a tab. Filters and the detail list are not in the URL.
 * Approach: A pure read (`tabFromSearch`) and a pure write (`searchWithTab`)
 *   over URLSearchParams. The caller pushes history only when the written
 *   query differs from the canonical form of the current one, and listens
 *   for popstate to restore. Unknown ids fall back to Summary without
 *   rewriting the address.
 * Alternatives:
 *   - Also serialize filters and the detail list: Rejected — that sharing
 *     was removed on purpose and is not part of this change.
 *   - Replace the whole query: Rejected — embed, theme, and any other
 *     parameter must survive a tab click.
 *   - Rewrite an unknown `?tab=` on load: Rejected — a copied bad link
 *     should stay intact until the user chooses a tab.
 */

export const TAB_IDS = ['overview', 'activity', 'work', 'health', 'discover'];
export const DEFAULT_TAB = 'overview';

export function isKnownTab(value) {
    return TAB_IDS.includes(value);
}

export function tabFromSearch(search) {
    const params = new URLSearchParams(typeof search === 'string' ? search : '');
    const tab = params.get('tab');
    return isKnownTab(tab) ? tab : DEFAULT_TAB;
}

/** Query string URLSearchParams would emit, including a leading `?`. */
export function canonicalSearch(search) {
    const params = new URLSearchParams(typeof search === 'string' ? search : '');
    const query = params.toString();
    return query ? `?${query}` : '';
}

export function searchWithTab(search, tabId) {
    const params = new URLSearchParams(typeof search === 'string' ? search : '');
    if (!isKnownTab(tabId) || tabId === DEFAULT_TAB) params.delete('tab');
    else params.set('tab', tabId);
    const query = params.toString();
    return query ? `?${query}` : '';
}
