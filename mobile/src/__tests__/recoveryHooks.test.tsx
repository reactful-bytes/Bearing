import { act, renderHook, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TaskRecord } from '../features/tasks/taskTypes';
import { useTasks } from '../features/tasks/useTasks';
import { subscribeToTasks } from '../services/firebase/firebaseTasks';

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'user-1' } })),
}));

jest.mock('../services/firebase/firebaseTasks', () => ({
  completeTask: jest.fn(),
  convertTaskToEvent: jest.fn(),
  createTask: jest.fn(),
  deleteTask: jest.fn(),
  subscribeToTasks: jest.fn(),
  updateTask: jest.fn(),
}));

describe('subscription recovery hooks', () => {
  it('re-subscribes to tasks after an error and retry', async () => {
    const unsubscribeFirst = jest.fn();
    const unsubscribeSecond = jest.fn();
    let reportFirstError: ((error: Error) => void) | null = null;
    let publishSecondResult: ((tasks: TaskRecord[]) => void) | null = null;
    const mockedSubscribeToTasks = subscribeToTasks as jest.MockedFunction<typeof subscribeToTasks>;

    mockedSubscribeToTasks
      .mockImplementationOnce((_userId, _onNext, onError) => {
        reportFirstError = onError;
        return unsubscribeFirst;
      })
      .mockImplementationOnce((_userId, onNext) => {
        publishSecondResult = onNext;
        return unsubscribeSecond;
      });

    const { result, unmount } = renderHook(() => useTasks());
    expect(mockedSubscribeToTasks).toHaveBeenCalledTimes(1);

    act(() => reportFirstError?.(new Error('Network unavailable.')));
    expect(result.current.uiState).toBe('error');

    act(() => result.current.retry());
    await waitFor(() => expect(mockedSubscribeToTasks).toHaveBeenCalledTimes(2));
    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);

    act(() => publishSecondResult?.([]));
    expect(result.current.uiState).toBe('empty');

    unmount();
    expect(unsubscribeSecond).toHaveBeenCalledTimes(1);
  });
});
