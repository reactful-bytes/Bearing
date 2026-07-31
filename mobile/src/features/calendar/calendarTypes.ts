export type EventStatus = 'scheduled' | 'completed' | 'canceled';

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  goalId: string | null;
  stepId: string | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEventInput = {
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  goalId?: string | null;
  stepId?: string | null;
};

export type UpdateEventInput = Partial<CreateEventInput & { status: EventStatus }>;

export type CalendarUiState = 'loading' | 'error' | 'empty' | 'ready';

export type ViewMode = 'day' | 'month';
