// ─────────────────────────────────────────────────────────────────────────────
// Date helpers — all LOCAL-time based, so "today" matches the mother's calendar
// day (not UTC). Fixes duplicate/missing same-day records near midnight.
// ─────────────────────────────────────────────────────────────────────────────

/** Local calendar date as `YYYY-MM-DD` (NOT UTC). */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO bounds for the local day [start, end) — for querying timestamptz columns. */
export function localDayRange(d: Date = new Date()): { start: string; end: string } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Safe display formatter for a `YYYY-MM-DD` (or ISO) date string.
 * Returns `fallback` instead of throwing on null/invalid input (date-fns/`new
 * Date` throw on bad values, which — without an ErrorBoundary — white-screened
 * several screens). Parses `YYYY-MM-DD` as a LOCAL date to avoid off-by-one.
 */
export function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  // Plain calendar date → construct in local time (avoid UTC parsing shift).
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
