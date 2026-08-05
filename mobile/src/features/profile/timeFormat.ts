export type TimeFormat = '12-hour' | '24-hour';

export const DEFAULT_TIME_FORMAT: TimeFormat = '12-hour';

export const TIME_FORMAT_OPTIONS = [
  { value: '12-hour', label: '12 hour' },
  { value: '24-hour', label: '24 hour' },
] as const;

export function isTimeFormat(value: unknown): value is TimeFormat {
  return value === '12-hour' || value === '24-hour';
}

export function formatClockTime(
  date: Date,
  timeFormat: TimeFormat = DEFAULT_TIME_FORMAT,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(timeFormat === '24-hour' ? { hourCycle: 'h23' as const } : { hour12: true }),
  }).format(date);
}

export function timeFormatOptions(
  timeFormat: TimeFormat = DEFAULT_TIME_FORMAT,
): Intl.DateTimeFormatOptions {
  return timeFormat === '24-hour' ? { hourCycle: 'h23' } : { hour12: true };
}
