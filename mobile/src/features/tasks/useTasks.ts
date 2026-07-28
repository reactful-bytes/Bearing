import { useCallback, useEffect, useState } from 'react';

import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  completeTask as completeFirebaseTask,
  createTask as createFirebaseTask,
  deleteTask as deleteFirebaseTask,
  subscribeToTasks,
  updateTask as updateFirebaseTask,
} from '../../services/firebase/firebaseTasks';
import {
  CompleteTaskInput,
  CreateTaskInput,
  TaskRecord,
  TaskUiState,
  UpdateTaskInput,
} from './taskTypes';

export type UseTasksReturn = {
  tasks: TaskRecord[];
  uiState: TaskUiState;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (taskId: string, fields: UpdateTaskInput) => Promise<void>;
  completeTask: (taskId: string, input: CompleteTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [uiState, setUiState] = useState<TaskUiState>('loading');

  useEffect(() => {
    const userId = getFirebaseAuth().currentUser?.uid;

    if (!userId) {
      setUiState('error');
      return;
    }

    setUiState('loading');

    const unsubscribe = subscribeToTasks(
      userId,
      (fetchedTasks) => {
        setTasks(fetchedTasks);
        setUiState(fetchedTasks.length === 0 ? 'empty' : 'ready');
      },
      () => {
        setUiState('error');
      },
    );

    return unsubscribe;
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await createFirebaseTask(userId, input);
  }, []);

  const updateTask = useCallback(async (taskId: string, fields: UpdateTaskInput): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await updateFirebaseTask(userId, taskId, fields);
  }, []);

  const completeTask = useCallback(async (taskId: string, input: CompleteTaskInput): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await completeFirebaseTask(userId, taskId, input);
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await deleteFirebaseTask(userId, taskId);
  }, []);

  return { tasks, uiState, createTask, updateTask, completeTask, deleteTask };
}