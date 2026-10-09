import { createHash } from "node:crypto";

export type ReminderPreferences = {
  dueDateEnabled: boolean;
  daysBeforeDueDate: number;
  morningTime: string;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  dueDateEnabled: false,
  daysBeforeDueDate: 1,
  morningTime: "06:00",
};

export const REMINDER_SOUNDS = [
  "summit-chime",
  "signal-pulse",
  "steady-bell",
  "dawn-glow",
  "ember-drop",
] as const;

export type ReminderDevice = {
  id: string;
  userId: string;
  timezone: string;
  enabled: boolean;
  registeredAt: Date;
};

export type ReminderEvent = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  allDay: boolean;
  status: string;
  sourceTaskId: string | null;
  goalId: string | null;
  createdAt: Date;
  alarms: { absoluteAt: Date | null; relativeOffsetMinutes: number | null }[];
  recurrenceRule: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    occurrenceCount: number | null;
    endAt: Date | null;
    weekdays: string[];
  } | null;
  excludedOccurrenceDates: string[];
  recurrenceOverrides: Record<string, Partial<ReminderEvent>>;
};

export type ReminderTask = {
  id: string;
  goalId: string | null;
  status: string;
  dueDate: Date | null;
  dueDateKey?: string | null;
  createdAt: Date;
};

export type ReminderCandidate = {
  id: string;
  userId: string;
  deviceId: string;
  kind: "event" | "due";
  eventId?: string;
  occurrenceDate?: string;
  startAtIso?: string;
  taskIds?: string[];
  sendAt: Date;
  expiresAt: Date;
  title: string;
  body: string;
};

const DAY = 86_400_000;
const MINUTE = 60_000;
const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function reminderId(parts: string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function dateInZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

export function timeInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function wallTime(
  date: string,
  time: string,
  timezone: string,
): Date | null {
  const target = Date.parse(`${date}T${time}:00Z`);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = Date.parse(
      `${dateInZone(new Date(candidate), timezone)}T${timeInZone(new Date(candidate), timezone)}:00Z`,
    );
    candidate += target - actual;
  }

  const result = new Date(candidate);
  return dateInZone(result, timezone) === date &&
    timeInZone(result, timezone) === time
    ? result
    : null;
}

export function morningWallTime(
  date: string,
  time: string,
  timezone: string,
): Date | null {
  const exact = wallTime(date, time, timezone);
  if (exact) return exact;
  const [hour, minute] = time.split(":").map(Number);
  for (
    let minutes = hour * 60 + minute + 1;
    minutes < Math.min(1440, hour * 60 + minute + 181);
    minutes += 1
  ) {
    const adjusted = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const candidate = wallTime(date, adjusted, timezone);
    if (candidate) return candidate;
  }
  return null;
}

export function readReminderPreferences(value: unknown): ReminderPreferences {
  if (value === undefined) return DEFAULT_REMINDER_PREFERENCES;
  if (!value || typeof value !== "object")
    throw new Error("Invalid notification preferences.");
  const fields = value as Record<string, unknown>;
  if (
    typeof fields.dueDateEnabled !== "boolean" ||
    typeof fields.daysBeforeDueDate !== "number" ||
    !Number.isInteger(fields.daysBeforeDueDate) ||
    fields.daysBeforeDueDate < 0 ||
    fields.daysBeforeDueDate > 28 ||
    typeof fields.morningTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.morningTime)
  )
    throw new Error("Invalid notification preferences.");
  return {
    dueDateEnabled: fields.dueDateEnabled,
    daysBeforeDueDate: fields.daysBeforeDueDate,
    morningTime: fields.morningTime,
  };
}

// Keep occurrence numbering aligned with Calendar's DTSTART/count semantics.
export function occurrenceNumber(
  event: ReminderEvent,
  date: string,
): number | null {
  const rule = event.recurrenceRule;
  if (!rule)
    return date === dateInZone(event.startAt, event.timezone) ? 1 : null;
  const startDate = dateInZone(event.startAt, event.timezone);
  const start = Date.parse(`${startDate}T00:00:00Z`) / DAY;
  const current = Date.parse(`${date}T00:00:00Z`) / DAY;
  const difference = current - start;
  if (difference < 0) return null;
  const interval = rule.interval;
  if (!Number.isInteger(interval) || interval < 1)
    throw new Error("Invalid recurrence interval.");
  if (rule.frequency === "daily")
    return difference % interval === 0 ? difference / interval + 1 : null;
  if (rule.frequency === "weekly" && rule.weekdays.length === 0) {
    return difference % (interval * 7) === 0
      ? difference / (interval * 7) + 1
      : null;
  }
  if (rule.frequency === "weekly") {
    if (difference === 0) return 1;
    const startWeek = start - new Date(start * DAY).getUTCDay();
    const currentWeek = current - new Date(current * DAY).getUTCDay();
    const weeks = (currentWeek - startWeek) / 7;
    if (
      weeks % interval !== 0 ||
      !rule.weekdays.includes(WEEKDAYS[new Date(current * DAY).getUTCDay()])
    )
      return null;
    let count = 1;
    for (const weekday of new Set(rule.weekdays)) {
      let first = startWeek + WEEKDAYS.indexOf(weekday);
      if (first < start) first += interval * 7;
      if (first <= current)
        count += Math.floor((current - first) / (interval * 7)) + 1;
    }
    return (
      count -
      (rule.weekdays.includes(WEEKDAYS[new Date(start * DAY).getUTCDay()])
        ? 1
        : 0)
    );
  }
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [cy, cm, cd] = date.split("-").map(Number);
  if (rule.frequency === "monthly") {
    const months = (cy - sy) * 12 + cm - sm;
    return months >= 0 && months % interval === 0 && cd === sd
      ? months / interval + 1
      : null;
  }
  const years = cy - sy;
  return years >= 0 && years % interval === 0 && cm === sm && cd === sd
    ? years / interval + 1
    : null;
}

export function buildReminderCandidates(
  device: ReminderDevice,
  preferences: ReminderPreferences,
  events: readonly ReminderEvent[],
  tasks: readonly ReminderTask[],
  goalStatuses: Map<string, string>,
  from: Date,
  until: Date,
): ReminderCandidate[] {
  if (!device.enabled) return [];
  const candidates: ReminderCandidate[] = [];
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const eligibleGoal = (id: string | null) =>
    !id || goalStatuses.get(id) === "active";
  const inWindow = (time: Date, createdAt: Date) =>
    time > from &&
    time <= until &&
    time >= createdAt &&
    time >= device.registeredAt;

  for (const event of events) {
    if (event.status !== "scheduled" || !eligibleGoal(event.goalId)) continue;
    if (event.sourceTaskId) {
      const task = tasksById.get(event.sourceTaskId);
      if (!task || task.status !== "active" || !eligibleGoal(task.goalId))
        continue;
    }
    const dates = new Set<string>();
    if (!event.recurrenceRule)
      dates.add(dateInZone(event.startAt, event.timezone));
    else {
      // Alerts support up to 28 days before start. Scan only this bounded horizon.
      const last = shiftDate(dateInZone(until, event.timezone), 29);
      for (
        let date = shiftDate(dateInZone(from, event.timezone), -2);
        date <= last;
        date = shiftDate(date, 1)
      ) {
        dates.add(date);
      }
      Object.keys(event.recurrenceOverrides).forEach((date) => dates.add(date));
    }
    for (const date of dates) {
      if (event.excludedOccurrenceDates.includes(date)) continue;
      const number = occurrenceNumber(event, date);
      if (number === null) continue;
      const rule = event.recurrenceRule;
      if (
        rule?.occurrenceCount !== null &&
        rule?.occurrenceCount !== undefined &&
        number > rule.occurrenceCount
      )
        continue;
      const originalStart = event.recurrenceRule
        ? wallTime(
            date,
            timeInZone(event.startAt, event.timezone),
            event.timezone,
          )
        : event.startAt;
      if (!originalStart || (rule?.endAt && originalStart > rule.endAt))
        continue;
      const occurrence = { ...event, ...event.recurrenceOverrides[date] };
      const startAt = event.recurrenceOverrides[date]?.startAt ?? originalStart;
      if (occurrence.status !== "scheduled" || !eligibleGoal(occurrence.goalId))
        continue;
      const seen = new Set<number>();
      for (const alarm of occurrence.alarms.slice(0, 2)) {
        const offset = alarm.relativeOffsetMinutes;
        if (
          offset === null ||
          !Number.isInteger(offset) ||
          offset > 0 ||
          offset < -40_320 ||
          seen.has(offset)
        )
          continue;
        seen.add(offset);
        let sendAt: Date | null;
        if (occurrence.allDay) {
          if (offset % 1440 !== 0) continue;
          sendAt = morningWallTime(
            shiftDate(dateInZone(startAt, occurrence.timezone), offset / 1440),
            preferences.morningTime,
            device.timezone,
          );
        } else sendAt = new Date(startAt.getTime() + offset * MINUTE);
        if (!sendAt || !inWindow(sendAt, event.createdAt)) continue;
        const expiresAt = new Date(
          Math.min(
            sendAt.getTime() + 10 * MINUTE,
            occurrence.allDay ? Infinity : startAt.getTime() + MINUTE,
          ),
        );
        candidates.push({
          id: reminderId([
            device.id,
            "event",
            event.id,
            date,
            String(offset),
            sendAt.toISOString(),
          ]),
          userId: device.userId,
          deviceId: device.id,
          kind: "event",
          eventId: event.id,
          occurrenceDate: date,
          startAtIso: startAt.toISOString(),
          sendAt,
          expiresAt,
          title: occurrence.title,
          body: occurrence.allDay
            ? "All-day event reminder."
            : offset === 0
              ? "Your scheduled event is starting."
              : `Starts in ${-offset} minutes.`,
        });
      }
    }
  }

  if (preferences.dueDateEnabled) {
    for (
      let date = dateInZone(from, device.timezone);
      date <= dateInZone(until, device.timezone);
      date = shiftDate(date, 1)
    ) {
      const sendAt = morningWallTime(
        date,
        preferences.morningTime,
        device.timezone,
      );
      if (!sendAt || !inWindow(sendAt, device.registeredAt)) continue;
      const targetDate = shiftDate(date, preferences.daysBeforeDueDate);
      const dueTasks = tasks.filter(
        (task) =>
          task.goalId &&
          eligibleGoal(task.goalId) &&
          task.status === "active" &&
          task.createdAt <= sendAt &&
          task.dueDate &&
          (task.dueDateKey ?? dateInZone(task.dueDate, device.timezone)) ===
            targetDate,
      );
      if (!dueTasks.length) continue;
      candidates.push({
        id: reminderId([device.id, "due", date]),
        userId: device.userId,
        deviceId: device.id,
        kind: "due",
        taskIds: dueTasks.map((task) => task.id).sort(),
        sendAt,
        expiresAt: new Date(sendAt.getTime() + 10 * MINUTE),
        title: "Upcoming goal tasks",
        body: `${dueTasks.length} goal task${dueTasks.length === 1 ? "" : "s"} due ${preferences.daysBeforeDueDate === 0 ? "today" : `in ${preferences.daysBeforeDueDate} day${preferences.daysBeforeDueDate === 1 ? "" : "s"}`}.`,
      });
    }
  }
  return candidates;
}
