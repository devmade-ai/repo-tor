/**
 * Calendar-day bounds for the dashboard date filter.
 *
 * Requirement: A backwards range stays as the user typed it and matches
 *   nothing, with an explanation elsewhere. Both ends of a range are the
 *   same kind of calendar day — local, or UTC when Settings "Use UTC" is
 *   on — including the whole first day and the whole last day.
 * Approach: Parse YYYY-MM-DD ourselves and build the start (00:00:00.000)
 *   and end (23:59:59.999) in the chosen timezone. The end is the last
 *   millisecond of that calendar day, so a daylight-saving day is 23 or
 *   25 hours rather than a forced 24. Invalid dates return null and the
 *   caller skips that bound instead of filtering everything out.
 * Alternatives:
 *   - `new Date('YYYY-MM-DD')` for the start: Rejected — that is UTC
 *     midnight, while `setHours(23, 59, 59, 999)` is local, so the two
 *     bounds were different timezones.
 *   - Swap the dates when the start is after the end: Rejected — the
 *     entered values must stay put so the user can see what to fix.
 *   - Start plus 24h minus 1ms: Rejected — that spills into the next
 *     calendar day on a 23-hour daylight-saving day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value) {
    if (typeof value !== 'string') return null;
    const match = ISO_DATE.exec(value);
    if (!match) return null;
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function partsMatch(date, parts, useUTC) {
    if (useUTC) {
        return date.getUTCFullYear() === parts.y
            && date.getUTCMonth() === parts.m - 1
            && date.getUTCDate() === parts.d;
    }
    return date.getFullYear() === parts.y
        && date.getMonth() === parts.m - 1
        && date.getDate() === parts.d;
}

/** Midnight at the start of the calendar day, or null when the date is not real. */
export function calendarDayStartMs(isoDate, useUTC) {
    const parts = parseIsoDate(isoDate);
    if (!parts) return null;
    const date = useUTC
        ? new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0))
        : new Date(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0);
    if (!partsMatch(date, parts, useUTC)) return null;
    return date.getTime();
}

/** Last millisecond of the calendar day, or null when the date is not real. */
export function calendarDayEndMs(isoDate, useUTC) {
    const parts = parseIsoDate(isoDate);
    if (!parts) return null;
    const date = useUTC
        ? new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 23, 59, 59, 999))
        : new Date(parts.y, parts.m - 1, parts.d, 23, 59, 59, 999);
    if (!partsMatch(date, parts, useUTC)) return null;
    return date.getTime();
}

/** True only when both ends are real calendar days and the start is later. */
export function isInvertedDateRange(dateFrom, dateTo) {
    if (!dateFrom || !dateTo) return false;
    if (calendarDayStartMs(dateFrom, true) == null) return false;
    if (calendarDayStartMs(dateTo, true) == null) return false;
    return dateFrom > dateTo;
}

export const DATE_RANGE_ERROR = 'The start date is after the end date, so no changes match. Choose an end date on the start date or after it.';

export function dateRangeErrorMessage(dateFrom, dateTo) {
    return isInvertedDateRange(dateFrom, dateTo) ? DATE_RANGE_ERROR : '';
}

/**
 * Bounds hoisted once per filter pass.
 * An inverted range matches nothing. A blank or invalid side is skipped.
 */
export function dateRangeBounds(dateFrom, dateTo, useUTC) {
    if (isInvertedDateRange(dateFrom, dateTo)) {
        return { inverted: true, from: null, to: null };
    }
    return {
        inverted: false,
        from: dateFrom ? calendarDayStartMs(dateFrom, useUTC) : null,
        to: dateTo ? calendarDayEndMs(dateTo, useUTC) : null,
    };
}
