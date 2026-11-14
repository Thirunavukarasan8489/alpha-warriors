/**
 * Date and time helpers configured for Asia/Kolkata (Indian Standard Time).
 * All dates stored in DB are UTC timestamps.
 */

export const TIMEZONE = "Asia/Kolkata";

/**
 * Format a Date to Indian date string, e.g. "14 Nov 2026"
 */
export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format time to Indian 12-hour format, e.g. "09:30 AM"
 */
export function formatTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format full date and time, e.g. "14 Nov 2026, 09:30 AM"
 */
export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Get date string in YYYY-MM-DD format for HTML date inputs in Asia/Kolkata
 */
export function toInputDateString(dateInput: Date | string | number | null | undefined = new Date()): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Add days to a date. End Date = Start Date + Plan duration days
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get start of day in Asia/Kolkata as UTC Date
 */
export function getStartOfDay(dateInput: Date | string = new Date()): Date {
  const d = new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);

  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // IST is UTC+5:30 -> midnight IST is previous day 18:30 UTC
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
}

/**
 * Get end of day in Asia/Kolkata as UTC Date
 */
export function getEndOfDay(dateInput: Date | string = new Date()): Date {
  const start = getStartOfDay(dateInput);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Calculate difference in days between two dates
 */
export function diffInDays(dateA: Date | string, dateB: Date | string = new Date()): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  const diffTime = a - b;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const getDaysDifference = diffInDays;

/**
 * Get today's start and end timestamps in UTC corresponding to Asia/Kolkata
 */
export function getTodayStartEndUTC(): { start: Date; end: Date } {
  const start = getStartOfDay(new Date());
  const end = getEndOfDay(new Date());
  return { start, end };
}


