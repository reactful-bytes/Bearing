import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { deleteGoal, setMilestoneManuallyCompleted } from '../services/firebase/firebaseGoals';

type Reference = { collectionName: string; id: string };
type Filter = { field: string; operator: '==' | 'in'; value: unknown };
type Query = { collectionName: string; filters: Filter[] };
type Write =
  | { kind: 'update'; ref: Reference; data: Record<string, unknown> }
  | { kind: 'delete'; ref: Reference };

const mockRecords = new Map<string, Record<string, unknown>>();
const mockBatches: Write[][] = [];
const mockCommit = jest.fn<() => Promise<void>>();
const mockNow = { toDate: () => new Date(2026, 9, 5) };

function mockKey(ref: Reference): string {
  return `${ref.collectionName}:${ref.id}`;
}

function mockSnapshot(ref: Reference) {
  const data = mockRecords.get(mockKey(ref));
  return { id: ref.id, ref, exists: () => Boolean(data), data: () => data };
}

const mockGetDocs = jest.fn(async (query: Query) => ({
  docs: [...mockRecords.entries()]
    .filter(([id, data]) => {
      return (
        id.startsWith(`${query.collectionName}:`) &&
        query.filters.every((filter) =>
          filter.operator === 'in'
            ? Array.isArray(filter.value) && filter.value.includes(data[filter.field])
            : data[filter.field] === filter.value,
        )
      );
    })
    .map(([id]) => mockSnapshot({ collectionName: query.collectionName, id: id.split(':')[1] })),
}));

jest.mock('../services/firebase/firebaseApp', () => ({ getFirebaseApp: () => ({}) }));
jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: (_db: unknown, collectionName: string, id: string) => ({ collectionName, id }),
  collection: (_db: unknown, collectionName: string) => ({ collectionName }),
  where: (field: string, operator: Filter['operator'], value: unknown) => ({
    field,
    operator,
    value,
  }),
  query: (collection: { collectionName: string }, ...filters: Filter[]) => ({
    ...collection,
    filters,
  }),
  getDocs: (query: Query) => mockGetDocs(query),
  runTransaction: async (
    _db: unknown,
    operation: (transaction: {
      get: (ref: Reference) => Promise<ReturnType<typeof mockSnapshot>>;
    }) => Promise<void>,
  ) => operation({ get: async (ref: Reference) => mockSnapshot(ref) }),
  Timestamp: { now: () => mockNow },
  writeBatch: () => {
    const writes: Write[] = [];
    mockBatches.push(writes);
    return {
      update: (ref: Reference, data: Record<string, unknown>) =>
        writes.push({ kind: 'update', ref, data }),
      delete: (ref: Reference) => writes.push({ kind: 'delete', ref }),
      commit: async () => {
        await mockCommit();
        for (const write of writes) {
          if (write.kind === 'delete') mockRecords.delete(mockKey(write.ref));
          else {
            const previous = mockRecords.get(mockKey(write.ref));
            if (!previous) throw new Error('Document not found.');
            mockRecords.set(mockKey(write.ref), { ...previous, ...write.data });
          }
        }
      },
    };
  },
}));

describe('goal deletion', () => {
  beforeEach(() => {
    mockRecords.clear();
    mockBatches.splice(0);
    mockGetDocs.mockClear();
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockRecords.set('goals:goal-1', { userId: 'user-1' });
  });

  it.each([false, true])(
    'rejects a legacy manual milestone update (%s) without reading or writing records',
    async (completed) => {
      const previous = [...mockRecords.entries()];
      await expect(
        setMilestoneManuallyCompleted('user-1', 'milestone-1', completed),
      ).rejects.toThrow(
        'Milestone completion is automatic. Complete or uncomplete its tasks instead.',
      );
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockBatches).toHaveLength(0);
      expect([...mockRecords.entries()]).toEqual(previous);
    },
  );

  it('deletes a goal without milestones while preserving its directly linked tasks and events', async () => {
    mockRecords.set('tasks:direct', { userId: 'user-1', goalId: 'goal-1', title: 'Keep task' });
    mockRecords.set('events:direct', { userId: 'user-1', goalId: 'goal-1', title: 'Keep event' });
    await deleteGoal('user-1', 'goal-1');
    expect(mockRecords.has('goals:goal-1')).toBe(false);
    expect(mockRecords.get('tasks:direct')).toEqual(
      expect.objectContaining({ title: 'Keep task', goalId: null, milestoneId: null }),
    );
    expect(mockRecords.get('events:direct')).toEqual(
      expect.objectContaining({ title: 'Keep event', goalId: null, milestoneId: null }),
    );
    expect(mockBatches.map((batch) => batch.length)).toEqual([3]);
  });

  it.each(['missing', 'foreign'])(
    'rejects a %s goal without reading or changing linked data',
    async (state) => {
      if (state === 'missing') mockRecords.delete('goals:goal-1');
      else mockRecords.set('goals:goal-1', { userId: 'other-user' });
      await expect(deleteGoal('user-1', 'goal-1')).rejects.toThrow('Goal not found.');
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockBatches).toHaveLength(0);
    },
  );

  it('deletes only the owned goal and milestones and preserves associated records without stale links', async () => {
    mockRecords.set('milestones:milestone-1', { userId: 'user-1', goalId: 'goal-1' });
    mockRecords.set('milestones:unrelated', { userId: 'user-1', goalId: 'goal-2' });
    mockRecords.set('tasks:linked', {
      userId: 'user-1',
      goalId: 'goal-1',
      milestoneId: 'milestone-1',
      title: 'Keep task',
      status: 'completed',
    });
    mockRecords.set('tasks:direct', { userId: 'user-1', goalId: 'goal-1', milestoneId: null });
    mockRecords.set('events:linked', {
      userId: 'user-1',
      goalId: 'goal-1',
      milestoneId: 'milestone-1',
      title: 'Keep event',
      publication: 'published',
    });
    mockRecords.set('events:milestone-only', {
      userId: 'user-1',
      goalId: 'goal-2',
      milestoneId: 'milestone-1',
    });
    mockRecords.set('notes:linked', {
      userId: 'user-1',
      sourceMilestoneId: 'milestone-1',
      sourceEventId: 'linked',
      body: 'Keep note',
    });
    const unrelated = { userId: 'user-1', goalId: 'goal-2', milestoneId: 'unrelated' };
    const foreign = { userId: 'other-user', goalId: 'goal-1', milestoneId: 'milestone-1' };
    mockRecords.set('tasks:unrelated', unrelated);
    mockRecords.set('tasks:foreign', foreign);
    mockRecords.set('events:foreign', foreign);
    mockRecords.set('notes:foreign', { userId: 'other-user', sourceMilestoneId: 'milestone-1' });

    await deleteGoal('user-1', 'goal-1');

    expect(mockRecords.has('goals:goal-1')).toBe(false);
    expect(mockRecords.has('milestones:milestone-1')).toBe(false);
    expect(mockRecords.has('milestones:unrelated')).toBe(true);
    expect(mockRecords.get('tasks:linked')).toEqual({
      userId: 'user-1',
      goalId: null,
      milestoneId: null,
      title: 'Keep task',
      status: 'completed',
      updatedAt: mockNow,
    });
    expect(mockRecords.get('tasks:direct')).toEqual(
      expect.objectContaining({ goalId: null, milestoneId: null }),
    );
    expect(mockRecords.get('events:linked')).toEqual(
      expect.objectContaining({
        goalId: null,
        milestoneId: null,
        title: 'Keep event',
        publication: 'published',
      }),
    );
    expect(mockRecords.get('events:milestone-only')).toEqual(
      expect.objectContaining({ goalId: 'goal-2', milestoneId: null }),
    );
    expect(mockRecords.get('notes:linked')).toEqual({
      userId: 'user-1',
      sourceMilestoneId: null,
      sourceEventId: 'linked',
      body: 'Keep note',
      updatedAt: mockNow,
    });
    expect(mockRecords.get('tasks:unrelated')).toEqual(unrelated);
    expect(mockRecords.get('tasks:foreign')).toEqual(foreign);
    expect(mockRecords.get('events:foreign')).toEqual(foreign);
    expect(mockRecords.get('notes:foreign')).toEqual({
      userId: 'other-user',
      sourceMilestoneId: 'milestone-1',
    });
    const taskWrites = mockBatches.flat().filter((write) => write.ref.collectionName === 'tasks');
    expect(taskWrites).toHaveLength(2);
  });

  it('limits milestone queries to 30 IDs and write batches to 450 operations, deleting the goal last', async () => {
    for (let index = 0; index < 31; index += 1) {
      mockRecords.set(`milestones:milestone-${index}`, { userId: 'user-1', goalId: 'goal-1' });
    }
    for (let index = 0; index < 451; index += 1) {
      mockRecords.set(`tasks:task-${index}`, {
        userId: 'user-1',
        goalId: 'goal-1',
        milestoneId: 'milestone-0',
      });
    }
    await deleteGoal('user-1', 'goal-1');
    expect(mockBatches.map((batch) => batch.length)).toEqual([450, 33]);
    expect(mockBatches.flat().at(-1)).toEqual({
      kind: 'delete',
      ref: { collectionName: 'goals', id: 'goal-1' },
    });
    const milestoneQueries = mockGetDocs.mock.calls
      .map(([query]) => query.filters.find((filter) => filter.operator === 'in'))
      .filter((filter) => filter !== undefined);
    milestoneQueries.forEach((filter, index) =>
      expect(filter.value).toHaveLength(index < 3 ? 30 : 1),
    );
    expect(milestoneQueries.map((filter) => filter.value)).toEqual([
      expect.arrayContaining(['milestone-0', 'milestone-29']),
      expect.arrayContaining(['milestone-0', 'milestone-29']),
      expect.arrayContaining(['milestone-0', 'milestone-29']),
      ['milestone-30'],
      ['milestone-30'],
      ['milestone-30'],
    ]);
    expect(mockRecords.size).toBe(451);
  });

  it('keeps the goal after a partial failure and allows the remaining cleanup to be retried', async () => {
    mockRecords.set('milestones:milestone-1', { userId: 'user-1', goalId: 'goal-1' });
    for (let index = 0; index < 451; index += 1) {
      mockRecords.set(`tasks:task-${index}`, {
        userId: 'user-1',
        goalId: 'goal-1',
        milestoneId: 'milestone-1',
      });
    }
    mockCommit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));
    await expect(deleteGoal('user-1', 'goal-1')).rejects.toThrow('offline');
    expect(mockRecords.has('goals:goal-1')).toBe(true);
    expect(mockRecords.has('milestones:milestone-1')).toBe(true);
    expect(mockRecords.get('tasks:task-0')?.goalId).toBeNull();
    expect(mockRecords.get('tasks:task-450')?.goalId).toBe('goal-1');

    await deleteGoal('user-1', 'goal-1');
    expect(mockRecords.has('goals:goal-1')).toBe(false);
    expect(mockRecords.has('milestones:milestone-1')).toBe(false);
    expect(mockRecords.size).toBe(451);
    expect(
      [...mockRecords.values()].every(
        (record) => record.goalId === null && record.milestoneId === null,
      ),
    ).toBe(true);
  });
});
