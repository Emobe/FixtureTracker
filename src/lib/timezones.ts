/**
 * Converts a wall-clock date/time in a given IANA timezone to a UTC `Date`.
 *
 * Used for sources (e.g. Wikipedia fixture tables) that publish local
 * kickoff time with no UTC offset, where the offset varies across the
 * season (e.g. Europe/London: GMT in winter, BST in summer).
 */
export function zonedWallTimeToUtc(
  parts: {
    year: number;
    month: number; // 1-12
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
): Date {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offsetMinutes * 60_000);
}

/**
 * The offset (in minutes) that `timeZone`'s wall clock reads ahead of true
 * UTC at the instant `date` represents.
 */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}
