import { eventFormValueToDate, toEventDateString, toEventTimeString } from '../calendar/eventEditor';
import type { TaskRecord } from './taskTypes';

export type TaskScheduleFormValues = {
  scheduleVisible: boolean;
  dueDate: string;
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
  allDay: boolean;
};

export type TaskScheduleFields = {
  dueDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  allDay: boolean;
};

export type TaskScheduleParseResult =
  | { fields: TaskScheduleFields; error: null }
  | { fields: null; error: string };

export function taskScheduleFormValuesFromTask(
  task: Pick<TaskRecord, 'dueDate' | 'scheduledStart' | 'scheduledEnd' | 'allDay'>,
  timezone: string,
): TaskScheduleFormValues {
  return {
    scheduleVisible: Boolean(task.dueDate || task.scheduledStart || task.scheduledEnd || task.allDay),
    dueDate: task.dueDate ? toEventDateString(task.dueDate, timezone) : '',
    scheduledStartDate: task.scheduledStart ? toEventDateString(task.scheduledStart, timezone) : '',
    scheduledStartTime: task.scheduledStart ? toEventTimeString(task.scheduledStart, timezone) : '',
    scheduledEndDate: task.scheduledEnd ? toEventDateString(task.scheduledEnd, timezone) : '',
    scheduledEndTime: task.scheduledEnd ? toEventTimeString(task.scheduledEnd, timezone) : '',
    allDay: task.allDay,
  };
}

export function parseTaskScheduleForm(
  values: TaskScheduleFormValues,
  timezone: string,
): TaskScheduleParseResult {
  if (!values.scheduleVisible) {
    return {
      fields: { dueDate: null, scheduledStart: null, scheduledEnd: null, allDay: false },
      error: null,
    };
  }

  const dueDate = values.dueDate ? eventFormValueToDate(values.dueDate, '12:00', timezone) : null;
  const scheduledStart = values.scheduledStartDate
    ? eventFormValueToDate(
        values.scheduledStartDate,
        values.allDay ? '00:00' : values.scheduledStartTime || '',
        timezone,
      )
    : null;
  const scheduledEnd = values.scheduledEndDate
    ? eventFormValueToDate(
        values.scheduledEndDate,
        values.allDay ? '23:59' : values.scheduledEndTime || '',
        timezone,
      )
    : null;

  if (values.dueDate && !dueDate) {
    return { fields: null, error: 'Due date must be valid.' };
  }
  if (
    (values.scheduledStartDate && !scheduledStart) ||
    (values.scheduledEndDate && !scheduledEnd)
  ) {
    return { fields: null, error: 'Schedule dates and times must be valid.' };
  }
  if (scheduledStart && !scheduledEnd) {
    return { fields: null, error: 'Add an end date and time for a scheduled task.' };
  }
  if (!scheduledStart && scheduledEnd) {
    return { fields: null, error: 'Add a start date and time for a scheduled task.' };
  }
  if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
    return { fields: null, error: 'Task end must be after task start.' };
  }

  return {
    fields: {
      dueDate,
      scheduledStart,
      scheduledEnd,
      allDay: values.allDay,
    },
    error: null,
  };
}