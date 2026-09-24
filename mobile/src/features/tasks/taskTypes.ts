export type TaskStatus = 'active' | 'completed';
export type TaskCompletionSource = 'manual' | 'scheduled' | 'start_now';
export type TaskUiState = 'loading' | 'error' | 'empty' | 'ready';

export type TaskRecord = {
  id: string;
  userId: string;
  title: string;
  description: string;
  goalId: string | null;
  starter: string;
  order: number;
  dueDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  allDay: boolean;
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
  goalId?: string | null;
  starter?: string;
  order?: number;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  allDay?: boolean;
};

export type UpdateTaskInput = Partial<
  Pick<
    TaskRecord,
    | 'title'
    | 'description'
    | 'goalId'
    | 'starter'
    | 'order'
    | 'dueDate'
    | 'scheduledStart'
    | 'scheduledEnd'
    | 'allDay'
  >
>;

export type CompleteTaskInput = {
  completionSource: TaskCompletionSource;
  completedEventId?: string | null;
};
