import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Timestamp, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';

import { syncGoalRollup } from '../services/firebase/firebaseGoals';
import { uncompleteTask } from '../services/firebase/firebaseTasks';

jest.mock('firebase/firestore', () => ({
  Timestamp: { now: jest.fn() },
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getFirestore: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  runTransaction: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../services/firebase/firebaseApp', () => ({
  getFirebaseApp: jest.fn(),
}));

jest.mock('../services/firebase/firebaseGoals', () => ({
  syncGoalRollup: jest.fn(),
}));

describe('firebase task boundary', () => {
  const database = {} as ReturnType<typeof getFirestore>;
  const taskReference = {} as ReturnType<typeof doc>;
  const timestamp = {} as ReturnType<typeof Timestamp.now>;

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.MockedFunction<typeof getFirestore>).mockReturnValue(database);
    (doc as jest.MockedFunction<typeof doc>).mockReturnValue(taskReference);
    (Timestamp.now as jest.MockedFunction<typeof Timestamp.now>).mockReturnValue(timestamp);
    (getDoc as jest.MockedFunction<typeof getDoc>).mockResolvedValue({
      exists: () => true,
      data: () => ({ goalId: 'goal-1' }),
    } as never);
    (updateDoc as jest.MockedFunction<typeof updateDoc>).mockResolvedValue(undefined);
    (syncGoalRollup as jest.MockedFunction<typeof syncGoalRollup>).mockResolvedValue(undefined);
  });

  it('resets completion metadata, rolls up the goal, and leaves calendar events untouched', async () => {
    await uncompleteTask('user-1', 'task-1');

    expect(updateDoc).toHaveBeenCalledWith(taskReference, {
      status: 'active',
      completionSource: null,
      completedAt: null,
      completedEventId: null,
      updatedAt: timestamp,
    });
    expect(syncGoalRollup).toHaveBeenCalledWith('user-1', 'goal-1');
  });
});