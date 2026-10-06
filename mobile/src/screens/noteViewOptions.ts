import type { AppIconName } from '../design/icons';
import type { NoteSortBy, NoteViewDraft } from '../features/notes/noteTypes';

export const DEFAULT_NOTE_VIEW: NoteViewDraft = {
  archivedOnly: false,
  pinnedOnly: false,
  selectedLabels: [],
  sortBy: 'updated:desc',
  noteSearch: '',
};

export const NOTE_SORT_OPTIONS: {
  value: NoteSortBy;
  label: string;
  summary: string;
  icon: AppIconName;
}[] = [
  {
    value: 'updated:desc',
    label: 'Updated newest first',
    summary: 'Updated newest',
    icon: 'updatedDescending',
  },
  {
    value: 'updated:asc',
    label: 'Updated oldest first',
    summary: 'Updated oldest',
    icon: 'updatedAscending',
  },
  {
    value: 'created:desc',
    label: 'Created newest first',
    summary: 'Created newest',
    icon: 'dateDescending',
  },
  {
    value: 'created:asc',
    label: 'Created oldest first',
    summary: 'Created oldest',
    icon: 'dateAscending',
  },
  { value: 'title:asc', label: 'Title A to Z', summary: 'Title A-Z', icon: 'textAscending' },
  { value: 'title:desc', label: 'Title Z to A', summary: 'Title Z-A', icon: 'textDescending' },
];

export function isDefaultNoteView(draft: NoteViewDraft): boolean {
  return (
    !draft.archivedOnly &&
    !draft.pinnedOnly &&
    draft.selectedLabels.length === 0 &&
    draft.sortBy === DEFAULT_NOTE_VIEW.sortBy
  );
}
