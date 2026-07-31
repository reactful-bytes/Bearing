import { CreateEventInput, EventAvailability, EventRecurrenceFrequency } from './calendarTypes';

export type EventFormRecurrenceFrequency = 'none' | EventRecurrenceFrequency;

export type CalendarEventFormValues = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  timezone: string;
  location: string;
  recurrenceFrequency: EventFormRecurrenceFrequency;
  recurrenceInterval: string;
  recurrenceEndDate: string;
  recurrenceOccurrenceCount: string;
  alarmOffsets: string;
  availability: EventAvailability;
  url: string;
};

export type CalendarEventValidationResult =
  { input: CreateEventInput; errors: [] } | { input: null; errors: string[] };

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const MAX_RECURRENCE_INTERVAL = 999;
const MAX_RECURRENCE_OCCURRENCES = 9999;
const MAX_ALARM_OFFSET_MINUTES = 40_320;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateString(date: Date, timezone?: string): string {
  if (timezone && isValidTimeZone(timezone)) {
    const parts = getPartsInTimeZone(date, timezone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeString(date: Date, timezone?: string): string {
  if (timezone && isValidTimeZone(timezone)) {
    const parts = getPartsInTimeZone(date, timezone);
    return `${pad(parts.hour)}:${pad(parts.minute)}`;
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDate(value: string): Omit<DateParts, 'hour' | 'minute'> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseTime(value: string): Pick<DateParts, 'hour' | 'minute'> | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function getPartsInTimeZone(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function sameParts(left: DateParts, right: DateParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function dateFromWallTime(parts: DateParts, timezone: string): Date | null {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getPartsInTimeZone(new Date(candidate), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    candidate += target - actualAsUtc;
  }

  const result = new Date(candidate);
  return sameParts(getPartsInTimeZone(result, timezone), parts) ? result : null;
}

function parseWallTime(dateValue: string, timeValue: string, timezone: string): Date | null {
  const date = parseDate(dateValue);
  const time = parseTime(timeValue);
  if (!date || !time) return null;
  return dateFromWallTime({ ...date, ...time }, timezone);
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function roundUpToNextHour(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  result.setHours(result.getHours() + 1);
  return result;
}

export function buildCalendarEventFormValues(
  initialDate: Date,
  initialValues?: Partial<CreateEventInput>,
): CalendarEventFormValues {
  const startAt = initialValues?.startAt ?? roundUpToNextHour(initialDate);
  const endAt = initialValues?.endAt ?? new Date(startAt.getTime() + 3_600_000);
  const timezone =
    initialValues?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

  return {
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    startDate: toDateString(startAt, timezone),
    startTime: toTimeString(startAt, timezone),
    endDate: toDateString(endAt, timezone),
    endTime: toTimeString(endAt, timezone),
    allDay: initialValues?.allDay ?? false,
    timezone,
    location: initialValues?.location ?? '',
    recurrenceFrequency: initialValues?.recurrenceRule?.frequency ?? 'none',
    recurrenceInterval: String(initialValues?.recurrenceRule?.interval ?? 1),
    recurrenceEndDate: initialValues?.recurrenceRule?.endAt
      ? toDateString(initialValues.recurrenceRule.endAt, timezone)
      : '',
    recurrenceOccurrenceCount: initialValues?.recurrenceRule?.occurrenceCount
      ? String(initialValues.recurrenceRule.occurrenceCount)
      : '',
    alarmOffsets: (initialValues?.alarms ?? [])
      .flatMap((alarm) =>
        alarm.relativeOffsetMinutes === null ? [] : [String(alarm.relativeOffsetMinutes)],
      )
      .join(', '),
    availability: initialValues?.availability ?? 'busy',
    url: initialValues?.url ?? '',
  };
}

export function parseCalendarEventForm(
  values: CalendarEventFormValues,
  linkedFields: Pick<CreateEventInput, 'goalId' | 'stepId'> = {
    goalId: null,
    stepId: null,
  },
): CalendarEventValidationResult {
  const errors: string[] = [];
  const timezone = values.timezone.trim();
  const timezoneValid = isValidTimeZone(timezone);
  if (!values.title.trim()) errors.push('Title is required.');
  if (!timezoneValid) errors.push('Timezone is invalid.');

  const startAt = timezoneValid
    ? parseWallTime(values.startDate, values.allDay ? '00:00' : values.startTime, timezone)
    : null;
  const endAt = timezoneValid
    ? parseWallTime(values.endDate, values.allDay ? '00:00' : values.endTime, timezone)
    : null;

  if (!startAt) errors.push('Start date or time is invalid for this timezone.');
  if (!endAt) errors.push('End date or time is invalid for this timezone.');
  if (startAt && endAt && endAt <= startAt) {
    errors.push(
      values.allDay
        ? 'All-day end date must be after the start date.'
        : 'End time must be after start time.',
    );
  }

  let recurrenceRule: CreateEventInput['recurrenceRule'] = null;
  if (values.recurrenceFrequency !== 'none') {
    const interval = parsePositiveInteger(values.recurrenceInterval);
    if (!interval || interval > MAX_RECURRENCE_INTERVAL) {
      errors.push(`Recurrence interval must be between 1 and ${MAX_RECURRENCE_INTERVAL}.`);
    }

    const occurrenceCount = values.recurrenceOccurrenceCount.trim()
      ? parsePositiveInteger(values.recurrenceOccurrenceCount.trim())
      : null;
    if (
      values.recurrenceOccurrenceCount.trim() &&
      (!occurrenceCount || occurrenceCount > MAX_RECURRENCE_OCCURRENCES)
    ) {
      errors.push(`Recurrence occurrences must be between 1 and ${MAX_RECURRENCE_OCCURRENCES}.`);
    }

    const recurrenceEndAt =
      values.recurrenceEndDate.trim() && timezoneValid
        ? parseWallTime(values.recurrenceEndDate.trim(), '23:59', timezone)
        : null;
    if (values.recurrenceEndDate.trim() && !recurrenceEndAt) {
      errors.push('Recurrence end date is invalid.');
    }
    if (recurrenceEndAt && startAt && recurrenceEndAt <= startAt) {
      errors.push('Recurrence end date must be after the event starts.');
    }
    if (values.recurrenceEndDate.trim() && values.recurrenceOccurrenceCount.trim()) {
      errors.push('Choose either a recurrence end date or occurrence count, not both.');
    }

    if (interval) {
      recurrenceRule = {
        frequency: values.recurrenceFrequency,
        interval,
        endAt: recurrenceEndAt,
        occurrenceCount,
      };
    }
  }

  const alarms = values.alarmOffsets.trim()
    ? values.alarmOffsets.split(',').map((value) => {
        const trimmed = value.trim();
        if (!/^-?\d+$/.test(trimmed)) return null;
        const offset = Number(trimmed);
        if (!Number.isSafeInteger(offset) || Math.abs(offset) > MAX_ALARM_OFFSET_MINUTES) {
          return null;
        }
        return { absoluteAt: null, relativeOffsetMinutes: offset };
      })
    : [];
  if (alarms.some((alarm) => alarm === null)) {
    errors.push(
      `Alarm offsets must be whole minutes between -${MAX_ALARM_OFFSET_MINUTES} and ${MAX_ALARM_OFFSET_MINUTES}.`,
    );
  }

  const url = values.url.trim();
  if (url && !validateUrl(url)) errors.push('URL must start with http:// or https://.');

  if (errors.length > 0 || !startAt || !endAt) return { input: null, errors };

  return {
    input: {
      title: values.title.trim(),
      description: values.description.trim(),
      startAt,
      endAt,
      timezone,
      allDay: values.allDay,
      location: values.location.trim(),
      recurrenceRule,
      alarms: alarms.flatMap((alarm) => (alarm ? [alarm] : [])),
      availability: values.availability,
      url: url || null,
      goalId: linkedFields.goalId ?? null,
      stepId: linkedFields.stepId ?? null,
    },
    errors: [],
  };
}
