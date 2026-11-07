// Calendar-day bounds for the dashboard date filter.
// Both ends use one timezone. A backwards range is reported, not swapped.
// Daylight-saving length is checked in America/New_York because the test
// process itself may be UTC, where every day is 24 hours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    calendarDayStartMs,
    calendarDayEndMs,
    isInvertedDateRange,
    dateRangeErrorMessage,
    dateRangeBounds,
    DATE_RANGE_ERROR,
} from '../../dashboard/js/filterDates.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const MODULE_URL = pathToFileURL(join(REPO, 'dashboard/js/filterDates.js')).href;

test('a real calendar day includes its first and last millisecond and nothing outside', () => {
    const start = calendarDayStartMs('2026-04-15', true);
    const end = calendarDayEndMs('2026-04-15', true);
    assert.equal(start, Date.UTC(2026, 3, 15, 0, 0, 0, 0));
    assert.equal(end, Date.UTC(2026, 3, 15, 23, 59, 59, 999));
    assert.equal(end - start, 24 * 60 * 60 * 1000 - 1);

    const bounds = dateRangeBounds('2026-04-15', '2026-04-15', true);
    assert.equal(bounds.inverted, false);
    assert.equal(bounds.from, start);
    assert.equal(bounds.to, end);
});

test('blank and impossible dates do not become a range', () => {
    assert.equal(calendarDayStartMs('', true), null);
    assert.equal(calendarDayStartMs('2026-02-31', true), null);
    assert.equal(calendarDayStartMs('2026-13-01', true), null);
    assert.equal(calendarDayStartMs('04/15/2026', true), null);
    assert.equal(calendarDayEndMs('2026-02-31', false), null);
    assert.equal(isInvertedDateRange('', '2026-01-01'), false);
    assert.equal(isInvertedDateRange('2026-02-31', '2026-01-01'), false);
    assert.equal(dateRangeErrorMessage('2026-02-31', '2026-01-01'), '');

    const bounds = dateRangeBounds('2026-02-31', '', false);
    assert.equal(bounds.inverted, false);
    assert.equal(bounds.from, null);
    assert.equal(bounds.to, null);
});

test('a backwards range is kept as inverted and explained, not swapped', () => {
    assert.equal(isInvertedDateRange('2026-10-01', '2020-01-01'), true);
    assert.equal(isInvertedDateRange('2026-04-15', '2026-04-15'), false);
    assert.equal(isInvertedDateRange('2020-01-01', '2026-10-01'), false);
    assert.equal(dateRangeErrorMessage('2026-10-01', '2020-01-01'), DATE_RANGE_ERROR);
    assert.match(DATE_RANGE_ERROR, /start date is after the end date/);
    assert.match(DATE_RANGE_ERROR, /on the start date or after it/);

    const bounds = dateRangeBounds('2026-10-01', '2020-01-01', false);
    assert.equal(bounds.inverted, true);
    assert.equal(bounds.from, null);
    assert.equal(bounds.to, null);
});

test('local and UTC calendar days differ, including daylight-saving length', () => {
    const script = `
      import {
        calendarDayStartMs,
        calendarDayEndMs,
      } from ${JSON.stringify(MODULE_URL)};
      const day = '2026-03-08';
      const fall = '2026-11-01';
      const start = calendarDayStartMs(day, false);
      const end = calendarDayEndMs(day, false);
      const utcStart = calendarDayStartMs(day, true);
      const utcEnd = calendarDayEndMs(day, true);
      const fallStart = calendarDayStartMs(fall, false);
      const fallEnd = calendarDayEndMs(fall, false);
      const localStart = new Date(start);
      const localEnd = new Date(end);
      const result = {
        localIsMidnight: localStart.getHours() === 0 && localStart.getMinutes() === 0 && localStart.getDate() === 8,
        localIsEnd: localEnd.getHours() === 23 && localEnd.getMinutes() === 59 && localEnd.getSeconds() === 59 && localEnd.getMilliseconds() === 999 && localEnd.getDate() === 8,
        springHours: end - start,
        fallHours: fallEnd - fallStart,
        utcHours: utcEnd - utcStart,
        localDiffersFromUtcParse: start !== Date.parse(day),
        utcMatchesParse: utcStart === Date.parse(day),
      };
      process.stdout.write(JSON.stringify(result));
    `;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: REPO,
        env: { ...process.env, TZ: 'America/New_York' },
        encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout);
    assert.equal(result.localIsMidnight, true);
    assert.equal(result.localIsEnd, true);
    // 2026-03-08 springs forward (23h). 2026-11-01 falls back (25h).
    assert.equal(result.springHours, 23 * 60 * 60 * 1000 - 1);
    assert.equal(result.fallHours, 25 * 60 * 60 * 1000 - 1);
    assert.equal(result.utcHours, 24 * 60 * 60 * 1000 - 1);
    assert.equal(result.localDiffersFromUtcParse, true);
    assert.equal(result.utcMatchesParse, true);
});
