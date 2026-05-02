// UTC instant of "today" midnight in the given IANA timezone.
// Order numbers reset daily in business-local time, not UTC.
export function startOfBusinessDay(now: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const Y = get("year");
  const M = get("month");
  const D = get("day");
  let H = get("hour");
  if (H === 24) H = 0;
  const Min = get("minute");
  const S = get("second");
  const localAsUtc = Date.UTC(Y, M - 1, D, H, Min, S);
  const offsetMs = localAsUtc - now.getTime();
  return new Date(Date.UTC(Y, M - 1, D) - offsetMs);
}
