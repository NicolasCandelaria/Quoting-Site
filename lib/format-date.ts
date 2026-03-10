/**
 * Format a YYYY-MM-DD date string for display without timezone shift.
 * Parsing "YYYY-MM-DD" as new Date() treats it as UTC midnight, which can
 * show as the previous day in local time. Appending T12:00:00 avoids that.
 */
export function formatQuoteDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
