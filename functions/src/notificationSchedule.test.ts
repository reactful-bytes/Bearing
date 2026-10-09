import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReminderCandidates,
  DEFAULT_REMINDER_PREFERENCES,
  occurrenceNumber,
  readReminderPreferences,
  ReminderDevice,
  ReminderEvent,
  ReminderTask,
  morningWallTime,
  wallTime,
} from "./notificationSchedule";

const device: ReminderDevice = {
  id: "device-1",
  userId: "user-1",
  timezone: "America/Chicago",
  enabled: true,
  registeredAt: new Date("2026-01-01T00:00:00Z"),
};
const goals = new Map([["goal-1", "active"]]);
const preferences = { ...DEFAULT_REMINDER_PREFERENCES, dueDateEnabled: true };
function event(fields: Partial<ReminderEvent> = {}): ReminderEvent {
  return {
    id: "event-1",
    title: "Planning",
    startAt: new Date("2026-10-07T14:00:00Z"),
    endAt: new Date("2026-10-07T15:00:00Z"),
    timezone: "America/Chicago",
    allDay: false,
    status: "scheduled",
    sourceTaskId: null,
    goalId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    alarms: [
      { absoluteAt: null, relativeOffsetMinutes: -30 },
      { absoluteAt: null, relativeOffsetMinutes: -5 },
    ],
    recurrenceRule: null,
    excludedOccurrenceDates: [],
    recurrenceOverrides: {},
    ...fields,
  };
}
function task(fields: Partial<ReminderTask> = {}): ReminderTask {
  return {
    id: "task-1",
    status: "active",
    goalId: "goal-1",
    dueDate: new Date("2026-10-08T05:00:00Z"),
    dueDateKey: "2026-10-08",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...fields,
  };
}
function plan(
  events: ReminderEvent[],
  tasks: ReminderTask[] = [],
  from = "2026-10-07T13:00:00Z",
  until = "2026-10-07T14:00:00Z",
) {
  return buildReminderCandidates(
    device,
    preferences,
    events,
    tasks,
    goals,
    new Date(from),
    new Date(until),
  );
}

describe("server reminder schedule", () => {
  it("produces exactly two independent reminders with stable identities", () => {
    const candidates = plan([event()]);
    assert.deepEqual(
      candidates.map((item) => item.sendAt.toISOString()),
      ["2026-10-07T13:30:00.000Z", "2026-10-07T13:55:00.000Z"],
    );
    assert.notEqual(candidates[0].id, candidates[1].id);
    assert.deepEqual(candidates, plan([event()]));
  });
  it("does not duplicate task-linked event reminders", () => {
    assert.equal(plan([event({ sourceTaskId: "task-1" })], [task()]).length, 2);
  });
  it("suppresses canceled/completed/deleted sources and inactive goals", () => {
    assert.equal(plan([event({ status: "canceled" })]).length, 0);
    assert.equal(plan([event({ status: "completed" })]).length, 0);
    assert.equal(plan([event({ sourceTaskId: "missing" })]).length, 0);
    assert.equal(
      plan([event({ sourceTaskId: "task-1" })], [task({ status: "completed" })])
        .length,
      0,
    );
    assert.equal(plan([event({ goalId: "draft-goal" })]).length, 0);
    assert.equal(plan([]).length, 0);
  });
  it("changes event identity when rescheduled and respects removed alerts", () => {
    const original = plan([event()])[0];
    const shifted = plan([
      event({ startAt: new Date("2026-10-07T14:15:00Z") }),
    ])[0];
    assert.notEqual(original.id, shifted.id);
    assert.equal(plan([event({ alarms: [] })]).length, 0);
  });
  it("uses device-local 6 AM and groups goal-linked tasks once each morning", () => {
    const candidates = plan(
      [],
      [
        task(),
        task({ id: "task-2" }),
        task({ id: "standalone", goalId: null }),
      ],
      "2026-10-07T10:59:00Z",
      "2026-10-07T11:00:00Z",
    );
    assert.equal(candidates.length, 1);
    assert.equal(
      candidates[0].sendAt.toISOString(),
      "2026-10-07T11:00:00.000Z",
    );
    assert.deepEqual(candidates[0].taskIds, ["task-1", "task-2"]);
    assert.equal(candidates[0].body, "2 goal tasks due in 1 day.");
    assert.equal(
      plan(
        [],
        [task({ status: "completed" })],
        "2026-10-07T10:59:00Z",
        "2026-10-07T11:00:00Z",
      ).length,
      0,
    );
  });
  it("supports due-day reminders, custom times and opt-out", () => {
    const custom = {
      dueDateEnabled: true,
      daysBeforeDueDate: 0,
      morningTime: "08:15",
    };
    const args = [
      [],
      [task()],
      goals,
      new Date("2026-10-08T13:14:00Z"),
      new Date("2026-10-08T13:15:00Z"),
    ] as const;
    const candidates = buildReminderCandidates(device, custom, ...args);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].body, "1 goal task due today.");
    assert.equal(
      buildReminderCandidates(
        device,
        { ...custom, dueDateEnabled: false },
        ...args,
      ).length,
      0,
    );
  });
  it("keeps calendar-date due targets stable when devices travel", () => {
    const candidates = buildReminderCandidates(
      { ...device, timezone: "Pacific/Honolulu" },
      preferences,
      [],
      [task()],
      goals,
      new Date("2026-10-07T15:59:00Z"),
      new Date("2026-10-07T16:00:00Z"),
    );
    assert.equal(candidates.length, 1);
    assert.equal(
      candidates[0].sendAt.toISOString(),
      "2026-10-07T16:00:00.000Z",
    );
  });
  it("sends all-day reminders at the same device-local morning time on distinct days", () => {
    const allDay = event({
      allDay: true,
      startAt: new Date("2026-10-08T05:00:00Z"),
      endAt: new Date("2026-10-09T05:00:00Z"),
      alarms: [
        { absoluteAt: null, relativeOffsetMinutes: -1440 },
        { absoluteAt: null, relativeOffsetMinutes: 0 },
      ],
    });
    const first = plan(
      [allDay],
      [],
      "2026-10-07T10:59:00Z",
      "2026-10-07T11:00:00Z",
    );
    const second = plan(
      [allDay],
      [],
      "2026-10-08T10:59:00Z",
      "2026-10-08T11:00:00Z",
    );
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.notEqual(first[0].id, second[0].id);
    assert.equal(first[0].sendAt.toISOString(), "2026-10-07T11:00:00.000Z");
  });
  it("does not schedule for disabled devices or before permission enablement", () => {
    const args = [
      preferences,
      [event()],
      [],
      goals,
      new Date("2026-10-07T13:00:00Z"),
      new Date("2026-10-07T14:00:00Z"),
    ] as const;
    assert.equal(
      buildReminderCandidates({ ...device, enabled: false }, ...args).length,
      0,
    );
    assert.equal(
      buildReminderCandidates(
        { ...device, registeredAt: new Date("2026-10-07T14:01:00Z") },
        ...args,
      ).length,
      0,
    );
  });
  it("does not duplicate equal offsets and does not send after-start or invalid offsets", () => {
    assert.equal(
      plan([
        event({
          alarms: [
            { absoluteAt: null, relativeOffsetMinutes: -5 },
            { absoluteAt: null, relativeOffsetMinutes: -5 },
          ],
        }),
      ]).length,
      1,
    );
    assert.equal(
      plan([
        event({ alarms: [{ absoluteAt: null, relativeOffsetMinutes: 5 }] }),
      ]).length,
      0,
    );
  });
  it("projects recurring events with exclusions, occurrence limits and moved overrides", () => {
    const recurring = event({
      startAt: new Date("2026-10-05T14:00:00Z"),
      endAt: new Date("2026-10-05T15:00:00Z"),
      recurrenceRule: {
        frequency: "daily",
        interval: 1,
        occurrenceCount: 3,
        endAt: null,
        weekdays: [],
      },
    });
    assert.equal(plan([recurring]).length, 2);
    assert.equal(
      plan([{ ...recurring, excludedOccurrenceDates: ["2026-10-07"] }]).length,
      0,
    );
    assert.equal(
      plan([
        {
          ...recurring,
          recurrenceRule: { ...recurring.recurrenceRule!, occurrenceCount: 2 },
        },
      ]).length,
      0,
    );
    const moved = {
      ...recurring,
      recurrenceOverrides: {
        "2026-10-06": { startAt: new Date("2026-10-07T14:10:00Z") },
      },
      excludedOccurrenceDates: ["2026-10-07"],
    };
    assert.equal(plan([moved])[0].occurrenceDate, "2026-10-06");
    assert.equal(plan([moved])[0].startAtIso, "2026-10-07T14:10:00.000Z");
  });
  it("handles weekly selections, monthly skips, yearly leap dates and end boundaries", () => {
    const weekly = event({
      startAt: new Date("2026-10-05T14:00:00Z"),
      recurrenceRule: {
        frequency: "weekly",
        interval: 2,
        occurrenceCount: null,
        endAt: null,
        weekdays: ["monday", "wednesday"],
      },
    });
    assert.equal(occurrenceNumber(weekly, "2026-10-07"), 2);
    assert.equal(occurrenceNumber(weekly, "2026-10-12"), null);
    assert.equal(occurrenceNumber(weekly, "2026-10-19"), 3);
    const monthly = event({
      startAt: new Date("2026-01-31T15:00:00Z"),
      recurrenceRule: {
        frequency: "monthly",
        interval: 1,
        occurrenceCount: null,
        endAt: null,
        weekdays: [],
      },
    });
    assert.equal(occurrenceNumber(monthly, "2026-02-28"), null);
    assert.equal(occurrenceNumber(monthly, "2026-03-31"), 3);
    const yearly = event({
      startAt: new Date("2024-02-29T15:00:00Z"),
      recurrenceRule: {
        frequency: "yearly",
        interval: 1,
        occurrenceCount: null,
        endAt: null,
        weekdays: [],
      },
    });
    assert.equal(occurrenceNumber(yearly, "2028-02-29"), 5);
    assert.equal(
      plan([
        {
          ...weekly,
          recurrenceRule: {
            ...weekly.recurrenceRule!,
            endAt: new Date("2026-10-06T00:00:00Z"),
          },
        },
      ]).length,
      0,
    );
  });
  it("keeps recurring wall times through daylight saving", () => {
    assert.equal(
      wallTime("2026-03-07", "06:00", "America/Chicago")?.toISOString(),
      "2026-03-07T12:00:00.000Z",
    );
    assert.equal(
      wallTime("2026-03-08", "06:00", "America/Chicago")?.toISOString(),
      "2026-03-08T11:00:00.000Z",
    );
    assert.equal(wallTime("2026-03-08", "02:30", "America/Chicago"), null);
    assert.equal(
      morningWallTime("2026-03-08", "02:30", "America/Chicago")?.toISOString(),
      "2026-03-08T08:00:00.000Z",
    );
    assert.equal(
      wallTime("2026-11-01", "06:00", "America/Chicago")?.toISOString(),
      "2026-11-01T12:00:00.000Z",
    );
  });
  it("validates exact preference bounds and legacy defaults", () => {
    assert.deepEqual(
      readReminderPreferences(undefined),
      DEFAULT_REMINDER_PREFERENCES,
    );
    assert.equal(
      readReminderPreferences({ ...preferences, daysBeforeDueDate: 28 })
        .daysBeforeDueDate,
      28,
    );
    for (const value of [-1, 29, 1.5])
      assert.throws(() =>
        readReminderPreferences({ ...preferences, daysBeforeDueDate: value }),
      );
    for (const value of ["24:00", "6:00", "06:60"])
      assert.throws(() =>
        readReminderPreferences({ ...preferences, morningTime: value }),
      );
  });
});
