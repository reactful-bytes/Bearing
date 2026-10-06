export type NoteSource = 'manual' | 'idea_dump';
export type NoteSortBy =
  'updated:desc' | 'updated:asc' | 'created:desc' | 'created:asc' | 'title:asc' | 'title:desc';

export type NoteViewDraft = {
  archivedOnly: boolean;
  pinnedOnly: boolean;
  selectedLabels: string[];
  sortBy: NoteSortBy;
  noteSearch: string;
};

export type NoteUiState = 'loading' | 'error' | 'empty' | 'ready';

export type NoteRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  labels: string[];
  source: NoteSource;
  sourceEventId: string | null;
  sourceMilestoneId: string | null;
  pinned: boolean;
  processed: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNoteInput = {
  title?: string;
  body: string;
  labels?: string[];
  source: NoteSource;
  sourceEventId?: string | null;
  sourceMilestoneId?: string | null;
  pinned?: boolean;
};

export type UpdateNoteInput = {
  title: string;
  body: string;
  labels?: string[];
  pinned?: boolean;
  archived?: boolean;
};
