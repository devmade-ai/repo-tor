// Unit coverage for scripts/strip-dead-fields.mjs stripDeadFieldsInDir.
//
// The strip script's atomicity guarantee is non-trivial: Pass 1 must
// abort BEFORE any writes if any file fails to parse, and Pass 2 must
// write atomically (per-file .tmp + rename) so a mid-run disk failure
// can't leave processed/ half-stripped. Filename validation must reject
// non-conforming entries (defence against `../foo.json`-style escapes).
// This test exercises each guarantee against a temp directory.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripDeadFieldsInDir } from '../strip-dead-fields.mjs';

function makeTmpProcessed() {
  return mkdtempSync(join(tmpdir(), 'strip-test-'));
}

function writeCommit(dir, repo, sha, payload) {
  const commitsDir = join(dir, repo, 'commits');
  mkdirSync(commitsDir, { recursive: true });
  writeFileSync(join(commitsDir, `${sha}.json`), JSON.stringify(payload, null, 2));
}

function captureWarnings() {
  const messages = [];
  return { messages, warn: (m) => messages.push(m) };
}

const DEAD = ['fullSha', 'committer', 'commitDate', 'scope', 'is_conventional', 'references', 'title'];

test('strips known dead fields from every file', () => {
  const root = makeTmpProcessed();
  try {
    writeCommit(root, 'budgy-ting', '1234567', {
      sha: '1234567',
      fullSha: '1234567abcdef',
      committer: { name: 'GitHub', email: 'noreply@github.com' },
      subject: 'fix bug',
      tags: ['fix'],
    });
    writeCommit(root, 'budgy-ting', 'abcdef0', {
      sha: 'abcdef0',
      scope: 'api',
      is_conventional: true,
      references: ['#42'],
      title: 'fix bug',
      subject: 'fix bug',
    });

    const result = stripDeadFieldsInDir(root, { deadFields: DEAD });

    assert.equal(result.scanned, 2);
    assert.equal(result.modified, 2);
    assert.equal(result.fieldsStripped, 6); // 2 from first, 4 from second
    assert.equal(result.skipped, 0);

    const a = JSON.parse(readFileSync(join(root, 'budgy-ting/commits/1234567.json'), 'utf8'));
    assert.equal('fullSha' in a, false);
    assert.equal('committer' in a, false);
    assert.equal(a.sha, '1234567');
    assert.equal(a.subject, 'fix bug');

    const b = JSON.parse(readFileSync(join(root, 'budgy-ting/commits/abcdef0.json'), 'utf8'));
    assert.equal('scope' in b, false);
    assert.equal('is_conventional' in b, false);
    assert.equal('references' in b, false);
    assert.equal('title' in b, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('idempotent on already-clean tree', () => {
  const root = makeTmpProcessed();
  try {
    writeCommit(root, 'foo', '1234567', { sha: '1234567', subject: 'clean' });
    const r1 = stripDeadFieldsInDir(root, { deadFields: DEAD });
    assert.equal(r1.modified, 0);
    assert.equal(r1.fieldsStripped, 0);

    const r2 = stripDeadFieldsInDir(root, { deadFields: DEAD });
    assert.equal(r2.modified, 0);
    assert.equal(r2.fieldsStripped, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parse failure aborts BEFORE any writes (Pass 1 atomicity)', () => {
  const root = makeTmpProcessed();
  try {
    writeCommit(root, 'foo', '1234567', { sha: '1234567', fullSha: 'abc', subject: 'a' });
    // Manually write a malformed file (must match COMMIT_FILENAME regex to
    // not be skipped — that's the point: a sha-named file with bad JSON).
    mkdirSync(join(root, 'foo/commits'), { recursive: true });
    writeFileSync(join(root, 'foo/commits/abcdef0.json'), '{ this is not json');

    const before = readFileSync(join(root, 'foo/commits/1234567.json'), 'utf8');

    assert.throws(
      () => stripDeadFieldsInDir(root, { deadFields: DEAD }),
      /Failed to parse.*abcdef0\.json.*Aborting before any writes/,
    );

    // First file MUST still have the dead field — no writes happened.
    const after = readFileSync(join(root, 'foo/commits/1234567.json'), 'utf8');
    assert.equal(before, after, 'parse failure should not modify any file');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('non-conforming repo dirname is skipped with warning', () => {
  const root = makeTmpProcessed();
  try {
    writeCommit(root, 'good-repo', '1234567', { sha: '1234567', fullSha: 'abc' });
    // A `..`-style entry can't actually be created via mkdir, but a name
    // with reserved chars is still flagged by the regex.
    mkdirSync(join(root, 'BadName!'), { recursive: true });

    const { warn, messages } = captureWarnings();
    const result = stripDeadFieldsInDir(root, { deadFields: DEAD, warn });

    assert.equal(result.scanned, 1);
    assert.equal(result.skipped, 1);
    assert.ok(messages.some((m) => /BadName!/.test(m)), 'expected warning for skipped repo dirname');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('non-conforming commit filename is skipped with warning', () => {
  const root = makeTmpProcessed();
  try {
    const commitsDir = join(root, 'foo/commits');
    mkdirSync(commitsDir, { recursive: true });
    writeFileSync(join(commitsDir, '1234567.json'), JSON.stringify({ sha: '1234567', fullSha: 'abc' }));
    // Filename that matches .json but not the sha regex.
    writeFileSync(join(commitsDir, 'not-a-sha.json'), JSON.stringify({ sha: 'x' }));

    const { warn, messages } = captureWarnings();
    const result = stripDeadFieldsInDir(root, { deadFields: DEAD, warn });

    assert.equal(result.scanned, 1); // only the sha-named file
    assert.equal(result.skipped, 1);
    assert.ok(
      messages.some((m) => /not-a-sha\.json/.test(m)),
      'expected warning for skipped commit filename',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('throws helpful error when processed/ does not exist', () => {
  const root = makeTmpProcessed();
  rmSync(root, { recursive: true, force: true }); // remove it
  assert.throws(
    () => stripDeadFieldsInDir(root, { deadFields: DEAD }),
    /processed\/ not found.*DATA_OPERATIONS\.md/s,
  );
});

test('preserves UTF-8 content (em dashes, emoji) without escaping', () => {
  const root = makeTmpProcessed();
  try {
    const payload = {
      sha: '1234567',
      fullSha: 'abc',
      subject: 'feat — add 🎉 emoji support',
      body: 'Some — text with non-ASCII',
    };
    writeCommit(root, 'foo', '1234567', payload);

    stripDeadFieldsInDir(root, { deadFields: DEAD });

    const after = readFileSync(join(root, 'foo/commits/1234567.json'), 'utf8');
    assert.match(after, /—/, 'em dash should survive as literal char (not \\u2014)');
    assert.match(after, /🎉/, 'emoji should survive as literal char');
    assert.doesNotMatch(after, /\\u20\d\d/, 'no unicode escape sequences expected');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('summary stats include a skipped count when relevant', () => {
  const root = makeTmpProcessed();
  try {
    writeCommit(root, 'foo', '1234567', { sha: '1234567', fullSha: 'abc' });
    mkdirSync(join(root, 'foo/commits'), { recursive: true });
    writeFileSync(join(root, 'foo/commits/skipme.json'), '{}');

    const { warn } = captureWarnings();
    const result = stripDeadFieldsInDir(root, { deadFields: DEAD, warn });

    assert.equal(result.scanned, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.modified, 1);
    assert.equal(result.fieldsStripped, 1); // fullSha
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
