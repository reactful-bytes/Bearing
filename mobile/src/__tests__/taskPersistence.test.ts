import { describe, expect, it } from '@jest/globals';

import { buildTaskCreateFields, buildTaskUpdateFields } from '../features/tasks/taskPersistence';

const timestampFactory = (date: Date): string => date.toISOString();

describe('task persistence fields', () => {
  it('writes linked and scheduled fields with timestamp values', () => {
    const dueDate = new Date(2026, 8, 7);
    const scheduledStart = new Date('2026-09-07T09:00:00.000Z');
    const scheduledEnd = new Date('2026-09-07T10:00:00.000Z');

    expect(
      buildTaskCreateFields(
        {
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
          dueDate,
          scheduledStart,
          scheduledEnd,
          allDay: true,
        },
        timestampFactory,
      ),
    ).toEqual({
      goalId: 'goal-1',
      milestoneId: 'milestone-1',
      starter: '',
      dueDate: dueDate.toISOString(),
      dueDateKey: '2026-09-07',
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      allDay: true,
    });
  });

  it('writes safe defaults and preserves explicit null-clears', () => {
    expect(buildTaskCreateFields({}, timestampFactory)).toEqual({
      goalId: null,
      milestoneId: null,
      starter: '',
      dueDate: null,
      dueDateKey: null,
      scheduledStart: null,
      scheduledEnd: null,
      allDay: false,
    });

    expect(
      buildTaskUpdateFields(
        {
          goalId: null,
          milestoneId: null,
          dueDate: null,
          scheduledStart: null,
          scheduledEnd: null,
          allDay: false,
        },
        timestampFactory,
      ),
    ).toEqual({
      goalId: null,
      milestoneId: null,
      dueDate: null,
      dueDateKey: null,
      scheduledStart: null,
      scheduledEnd: null,
      allDay: false,
    });
  });
});
