import { describe, expect, it } from '@jest/globals';

import {
  parseTaskScheduleForm,
  taskScheduleFormValuesFromTask,
} from '../features/tasks/taskScheduling';

const timezone = 'America/Chicago';

describe('task scheduling form helpers', () => {
  it('emits explicit null schedule fields when schedule details are hidden', () => {
    expect(
      parseTaskScheduleForm(
        {
          scheduleVisible: false,
          dueDate: '',
          scheduledStartDate: '',
          scheduledStartTime: '',
          scheduledEndDate: '',
          scheduledEndTime: '',
          allDay: true,
        },
        timezone,
      ),
    ).toEqual({
      fields: { dueDate: null, scheduledStart: null, scheduledEnd: null, allDay: false },
      error: null,
    });
  });

  it('rejects a scheduled task without a paired end', () => {
    const result = parseTaskScheduleForm(
      {
        scheduleVisible: true,
        dueDate: '',
        scheduledStartDate: '2026-09-24',
        scheduledStartTime: '09:00',
        scheduledEndDate: '',
        scheduledEndTime: '',
        allDay: false,
      },
      timezone,
    );

    expect(result).toEqual({ fields: null, error: 'Add an end date and time for a scheduled task.' });
  });

  it('hydrates date and time fields in the profile timezone', () => {
    const values = taskScheduleFormValuesFromTask(
      {
        dueDate: new Date('2026-09-24T17:00:00.000Z'),
        scheduledStart: new Date('2026-09-25T14:00:00.000Z'),
        scheduledEnd: new Date('2026-09-25T15:30:00.000Z'),
        allDay: false,
      },
      timezone,
    );

    expect(values).toMatchObject({
      scheduleVisible: true,
      dueDate: '2026-09-24',
      scheduledStartDate: '2026-09-25',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:30',
    });
  });
});