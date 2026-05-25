const FALLBACK_TIME_ZONE = "UTC";

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    ...options,
  });
}

export function getHabitTimeZone(timeZone?: string | null): string {
  return timeZone || FALLBACK_TIME_ZONE;
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
}

export function getSupportedTimeZones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }

  return Array.from(new Set([getBrowserTimeZone(), FALLBACK_TIME_ZONE]));
}

export function getHabitDateKey(date: Date, timeZone?: string | null): string {
  const parts = getFormatter(getHabitTimeZone(timeZone), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function dateFromHabitDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}
