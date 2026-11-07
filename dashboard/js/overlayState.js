/**
 * Which overlays may be open together.
 *
 * Requirement: The mobile filter drawer is a scrimmed overlay (z-50) above
 *   the header and the tabs. Settings and the detail list are z-40 inside
 *   the page, so leaving one open under the drawer traps its controls.
 *   Opening settings or the detail list while the drawer is open has the
 *   same problem the other way: the drawer would cover the header button
 *   that opened them.
 * Approach: Each "open" transition closes the surfaces that would compete,
 *   in the same state update. Close actions change only their own flag, so
 *   Escape on one surface does not clear a surface the user already closed.
 * Alternatives:
 *   - Raise settings and detail above the drawer: Rejected — the fleet
 *     stacking scale keeps scrimmed drawers at 50, and these panes are not
 *     a second scrimmed drawer.
 *   - Let the user close one before opening the other: Rejected — once a
 *     pane is covered, its close button is not hittable.
 */

export function openFilterSidebar(state) {
    return {
        ...state,
        filterSidebarOpen: true,
        settingsPaneOpen: false,
        detailPane: state.detailPane.open
            ? { ...state.detailPane, open: false }
            : state.detailPane,
    };
}

export function openSettingsPane(state) {
    return {
        ...state,
        settingsPaneOpen: true,
        filterSidebarOpen: false,
    };
}

export function openDetailPaneState(state, payload) {
    return {
        ...state,
        filterSidebarOpen: false,
        detailPane: {
            open: true,
            title: payload.title,
            subtitle: payload.subtitle,
            commits: payload.commits,
            filterInfo: payload.filterInfo || null,
        },
    };
}
