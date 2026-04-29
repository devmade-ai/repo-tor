// Unit coverage for scripts/lib/commit-parsing.js extractBreakingChange.
//
// This function runs on every extracted commit and gates the
// has_breaking_change field across all 4,183+ commits in processed/.
// The 2026-04-29 rewrite folded the conventional-commit `!:` marker
// detection (previously routed through parseCommitMessage's `breaking`
// field) into extractBreakingChange directly. This test catches
// regressions in either the body-marker check or the new subject `!:`
// check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBreakingChange } from '../lib/commit-parsing.js';

test('non-breaking conventional commit returns false', () => {
  assert.equal(extractBreakingChange('feat: add foo', ''), false);
  assert.equal(extractBreakingChange('fix(scope): bar', ''), false);
  assert.equal(extractBreakingChange('chore: bump deps', 'just version bumps'), false);
});

test('plain non-conventional subject returns false when body is clean', () => {
  assert.equal(extractBreakingChange('Update README', ''), false);
  assert.equal(extractBreakingChange('Merge pull request #42', 'Improve thing'), false);
});

test('conventional `!` marker after type signals breaking', () => {
  assert.equal(extractBreakingChange('feat!: drop legacy API', ''), true);
  assert.equal(extractBreakingChange('fix!: remove deprecated flag', ''), true);
});

test('conventional `!` marker after `(scope)` signals breaking', () => {
  assert.equal(extractBreakingChange('feat(api)!: remove v1 endpoints', ''), true);
  assert.equal(extractBreakingChange('refactor(core)!: rewire init', 'body unrelated'), true);
});

test('`!:` inside parens is NOT a breaking marker', () => {
  // Parens contain the literal scope name; `!:` only counts when it
  // follows the closing paren.
  assert.equal(extractBreakingChange('feat(scope!:foo): bar', ''), false);
});

test('body containing `BREAKING CHANGE` signals breaking (case-insensitive)', () => {
  assert.equal(extractBreakingChange('fix: tweak', 'BREAKING CHANGE: removes the old API'), true);
  assert.equal(extractBreakingChange('fix: tweak', 'breaking change: lowercase variant'), true);
  assert.equal(extractBreakingChange('fix: tweak', 'BREAKING  CHANGE: with extra space'), true);
});

test('body containing `BREAKING:` at line start signals breaking', () => {
  assert.equal(extractBreakingChange('fix: tweak', 'BREAKING: shorthand variant'), true);
  assert.equal(
    extractBreakingChange('fix: tweak', 'Some context.\n\nBREAKING: at start of later line'),
    true,
  );
});

test('body containing `BREAKING:` mid-line does NOT match', () => {
  // /^BREAKING:/im requires line-start (multiline mode).
  assert.equal(
    extractBreakingChange('fix: tweak', 'Note that BREAKING: this is mid-line text'),
    false,
  );
});

test('both subject `!:` AND body marker present return true', () => {
  assert.equal(
    extractBreakingChange('feat!: drop API', 'BREAKING CHANGE: full removal'),
    true,
  );
});

test('empty subject and body return false', () => {
  assert.equal(extractBreakingChange('', ''), false);
});

test('handles undefined inputs without crashing', () => {
  // Defensive: regex.test() coerces to string — undefined becomes 'undefined'.
  // Neither pattern matches that literal, so result is false.
  assert.equal(extractBreakingChange(undefined, undefined), false);
  assert.equal(extractBreakingChange('feat: x', undefined), false);
  assert.equal(extractBreakingChange(undefined, 'BREAKING CHANGE: x'), true);
});
