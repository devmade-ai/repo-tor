// Clear All is a genuine empty set. The first visit still hides merge
// commits. Opening one overlay closes the ones that would sit under it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FILTERS, EMPTY_FILTERS, cloneFilters, filterCountPhrase } from '../../dashboard/js/filters.js';
import { openFilterSidebar, openSettingsPane, openDetailPaneState } from '../../dashboard/js/overlayState.js';

test('first visit excludes merge commits and Clear All does not', () => {
    assert.deepEqual(DEFAULT_FILTERS.tag, { values: ['merge'], mode: 'exclude' });
    assert.equal(DEFAULT_FILTERS.dateFrom, '');
    assert.deepEqual(EMPTY_FILTERS.tag.values, []);
    assert.equal(EMPTY_FILTERS.tag.mode, 'include');
    assert.equal(EMPTY_FILTERS.dateFrom, '');
    assert.equal(EMPTY_FILTERS.dateTo, '');

    const cleared = cloneFilters(EMPTY_FILTERS);
    cleared.tag.values.push('feature');
    cleared.dateFrom = '2026-01-01';
    assert.deepEqual(EMPTY_FILTERS.tag.values, []);
    assert.equal(EMPTY_FILTERS.dateFrom, '');

    const first = cloneFilters(DEFAULT_FILTERS);
    first.tag.values.push('feature');
    assert.deepEqual(DEFAULT_FILTERS.tag.values, ['merge']);
});

test('the filter count is singular for one and plural otherwise', () => {
    assert.equal(filterCountPhrase(1), '1 filter active');
    assert.equal(filterCountPhrase(0), '0 filters active');
    assert.equal(filterCountPhrase(2), '2 filters active');
});

test('opening the filter drawer closes settings and detail', () => {
    const state = {
        filterSidebarOpen: false,
        settingsPaneOpen: true,
        detailPane: { open: true, title: 'Feature Commits', subtitle: '4', commits: [1], filterInfo: { type: 'tag' } },
    };
    const next = openFilterSidebar(state);
    assert.equal(next.filterSidebarOpen, true);
    assert.equal(next.settingsPaneOpen, false);
    assert.equal(next.detailPane.open, false);
    assert.equal(next.detailPane.title, 'Feature Commits');
    assert.equal(state.detailPane.open, true);
});

test('opening settings or detail closes the filter drawer', () => {
    const state = {
        filterSidebarOpen: true,
        settingsPaneOpen: false,
        detailPane: { open: false, title: '', subtitle: '', commits: [], filterInfo: null },
    };
    const settings = openSettingsPane(state);
    assert.equal(settings.settingsPaneOpen, true);
    assert.equal(settings.filterSidebarOpen, false);

    const detail = openDetailPaneState(state, {
        title: 'All',
        subtitle: '1',
        commits: [],
        filterInfo: null,
    });
    assert.equal(detail.detailPane.open, true);
    assert.equal(detail.filterSidebarOpen, false);
    assert.equal(detail.detailPane.title, 'All');
});
