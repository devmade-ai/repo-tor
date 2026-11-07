// `?tab=` is the only dashboard view stored in the address.
// Summary omits it. Unknown values read as Summary and are not rewritten
// by these helpers. Other parameters stay, in their original order.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tabFromSearch, searchWithTab, canonicalSearch, DEFAULT_TAB } from '../../dashboard/js/tabUrl.js';

test('Summary is the default and an unknown tab reads as Summary', () => {
    assert.equal(tabFromSearch(''), DEFAULT_TAB);
    assert.equal(tabFromSearch('?foo=1'), 'overview');
    assert.equal(tabFromSearch('?tab=health'), 'health');
    assert.equal(tabFromSearch('?tab=overview'), 'overview');
    assert.equal(tabFromSearch('?tab=nope'), 'overview');
    assert.equal(tabFromSearch('?tab='), 'overview');
    assert.equal(tabFromSearch('?foo=1&tab=work'), 'work');
});

test('writing a tab keeps unrelated parameters and omits Summary', () => {
    assert.equal(searchWithTab('', 'overview'), '');
    assert.equal(searchWithTab('?foo=1', 'overview'), '?foo=1');
    assert.equal(searchWithTab('?foo=1', 'health'), '?foo=1&tab=health');
    assert.equal(searchWithTab('?tab=health&foo=1', 'overview'), '?foo=1');
    assert.equal(searchWithTab('?tab=health&foo=1', 'health'), '?tab=health&foo=1');
    assert.equal(searchWithTab('?b=2&a=1', 'activity'), '?b=2&a=1&tab=activity');

    const data = '?data=https%3A%2F%2Fexample.com%2Fa.json&theme=nord';
    const next = searchWithTab(data, 'discover');
    assert.match(next, /tab=discover/);
    assert.match(next, /data=https%3A%2F%2Fexample.com%2Fa.json/);
    assert.match(next, /theme=nord/);
    assert.doesNotMatch(next, /tag=/);
});

test('an unknown tab is removed only when a real tab is written', () => {
    assert.equal(searchWithTab('?tab=nope&foo=keep', 'overview'), '?foo=keep');
    // An existing `tab` key keeps its place; only the value changes.
    assert.equal(searchWithTab('?tab=nope&foo=keep', 'activity'), '?tab=activity&foo=keep');
    assert.equal(canonicalSearch('?tab=nope&foo=keep'), '?tab=nope&foo=keep');
    assert.notEqual(
        searchWithTab('?tab=nope&foo=keep', 'overview'),
        canonicalSearch('?tab=nope&foo=keep'),
    );
});
