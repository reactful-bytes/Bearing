import { describe, expect, it } from '@jest/globals';

import { buildTaskCreateFields, buildTaskUpdateFields } from './taskPersistence';

const timestampFactory = (date: Date): string => date.toISOString();

describe('task persistence fields', () => {
  it('writes linked and scheduled fields with timestamp values', () => {
    const dueDate = new Date('2026-09-07T00:00:00.000Z');
    const scheduledStart = new Date('2026-09-07T09:00:00.000Z');
    const scheduledEnd = new Date('2026-09-07T10:00:00.000Z');

    expect(
      buildTaskCreateFields(
        {
          goalId: 'goal-1',
          stepId: 'step-1',
          dueDate,
          scheduledStart,
          scheduledEnd,
          allDay: true,
        },
        timestampFactory,
      ),
    ).toEqual({
      goalId: 'goal-1',
      stepId: 'step-1',
      dueDate: dueDate.toISOString(),
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      allDay: true,
    });
  });

  it('writes safe defaults and preserves explicit null-clears', () => {
    expect(buildTaskCreateFields({}, timestampFactory)).toEqual({
      goalId: null,
      stepId: null,
      dueDate: null,
      scheduledStart: null,
      scheduledEnd: null,
      allDay: false,
    });

    expect(
      buildTaskUpdateFields(
        {
          goalId: null,
          stepId: null,
          dueDate: null,
          scheduledStart: null,
          scheduledEnd: null,
          allDay: false,
        },
        timestampFactory,
      ),
    ).toEqual({
      goalId: null,
      stepId: null,
      dueDate: null,
      scheduledStart: null,
      scheduledEnd: null,
      allDay: false,
    });
  });
});
