import { describe, expect, it } from '@jest/globals';

import { decodeTaskData } from '../features/tasks/taskDecoder';

function timestamp(date: Date) {
  return { toDate: () => date };
}

const createdAt = new Date('2026-09-06T08:00:00.000Z');
const updatedAt = new Date('2026-09-06T08:15:00.000Z');

describe('decodeTaskData', () => {
  it('defaults scheduling fields for legacy task documents', () => {
    const task = decodeTaskData('task-legacy', {
      userId: 'user-1',
      title: 'Legacy task',
      description: 'Existing task data.',
      status: 'active',
      createdAt: timestamp(createdAt),
      updatedAt: timestamp(updatedAt),
    });

    expect(task).toMatchObject({
      id: 'task-legacy',
      goalId: null,
      stepId: null,
      dueDate: null,
      scheduledStart: null,
      scheduledEnd: null,
      allDay: false,
      completionSource: null,
      completedAt: null,
      completedEventId: null,
    });
  });

  it('decodes linked and scheduled task fields', () => {
    const dueDate = new Date('2026-09-07T00:00:00.000Z');
    const scheduledStart = new Date('2026-09-07T09:00:00.000Z');
    const scheduledEnd = new Date('2026-09-07T10:00:00.000Z');

    const task = decodeTaskData('task-scheduled', {
      userId: 'user-1',
      title: 'Scheduled task',
      description: 'Task with context.',
      goalId: 'goal-1',
      stepId: 'step-1',
      dueDate: timestamp(dueDate),
      scheduledStart: timestamp(scheduledStart),
      scheduledEnd: timestamp(scheduledEnd),
      allDay: true,
      status: 'active',
      completionSource: null,
      completedAt: null,
      completedEventId: null,
      createdAt: timestamp(createdAt),
      updatedAt: timestamp(updatedAt),
    });

    expect(task.goalId).toBe('goal-1');
    expect(task.stepId).toBe('step-1');
    expect(task.dueDate).toEqual(dueDate);
    expect(task.scheduledStart).toEqual(scheduledStart);
    expect(task.scheduledEnd).toEqual(scheduledEnd);
    expect(task.allDay).toBe(true);
  });
});
