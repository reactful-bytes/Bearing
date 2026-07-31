export type NoteSource = 'manual' | 'idea_dump';

export type NoteUiState = 'loading' | 'error' | 'empty' | 'ready';

export type NoteRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  source: NoteSource;
  sourceEventId: string | null;
  sourceStepId: string | null;
  processed: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNoteInput = {
  title?: string;
  body: string;
  source: NoteSource;
  sourceEventId?: string | null;
  sourceStepId?: string | null;
};

export type UpdateNoteInput = {
  title: string;
  body: string;
};
