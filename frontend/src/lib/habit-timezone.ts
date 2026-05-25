const FALLBACK_TIME_ZONE = "UTC";
const MIN_GMT_OFFSET = -12;
const MAX_GMT_OFFSET = 14;

export interface HabitTimeZoneOption {
  label: string;
  value: string;
}

function clampGmtOffset(offset: number): number {
  return Math.min(MAX_GMT_OFFSET, Math.max(MIN_GMT_OFFSET, offset));
}

function formatGmtOffset(offset: number): string {
  return `GMT ${offset >= 0 ? "+" : ""}${String(offset)}`;
}

function getGmtOffsetTimeZone(offset: number): string {
  if (offset === 0) {
    return FALLBACK_TIME_ZONE;
  }

  return `Etc/GMT${offset > 0 ? "-" : "+"}${String(Math.abs(offset))}`;
}

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    ...options,
  });
}

export function getHabitTimeZone(timeZone?: string | null): string {
  return timeZone ?? FALLBACK_TIME_ZONE;
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
}

export function getBrowserGmtTimeZone(): string {
  const offset = clampGmtOffset(Math.round(-new Date().getTimezoneOffset() / 60));

  return getGmtOffsetTimeZone(offset);
}

export function getSupportedTimeZones(): HabitTimeZoneOption[] {
  return Array.from({ length: MAX_GMT_OFFSET - MIN_GMT_OFFSET + 1 }, (_, index) => {
    const offset = MAX_GMT_OFFSET - index;

    return {
      label: formatGmtOffset(offset),
      value: getGmtOffsetTimeZone(offset),
    };
  });
}

export function getGmtTimeZoneForValue(timeZone?: string | null): string {
  if (!timeZone) {
    return getBrowserGmtTimeZone();
  }

  try {
    const localDate = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(localDate);
    const year = Number(parts.find((part) => part.type === "year")?.value ?? 1970);
    const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
    const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    const zonedTimestamp = Date.UTC(year, month - 1, day, hour, minute);
    const roundedOffset = clampGmtOffset(
      Math.round((zonedTimestamp - localDate.getTime()) / 3_600_000),
    );

    return getGmtOffsetTimeZone(roundedOffset);
  } catch {
    return getBrowserGmtTimeZone();
  }
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
