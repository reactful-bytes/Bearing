export type TaskStatus = 'active' | 'completed';
export type TaskCompletionSource = 'manual' | 'scheduled' | 'start_now';
export type TaskUiState = 'loading' | 'error' | 'empty' | 'ready';

export type TaskRecord = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  completionSource: TaskCompletionSource | null;
  completedAt: Date | null;
  completedEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskInput = {
  title: string;
  description: string;
};

export type UpdateTaskInput = Partial<Pick<TaskRecord, 'title' | 'description'>>;

export type CompleteTaskInput = {
  completionSource: TaskCompletionSource;
  completedEventId?: string | null;
};