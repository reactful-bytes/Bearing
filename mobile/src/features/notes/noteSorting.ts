import { NoteRecord, NoteSortBy } from './noteTypes';

export function sortNotes(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((left, right) => {
    if (left.archived !== right.archived) return left.archived ? 1 : -1;
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;

    const updatedDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    return updatedDifference || left.id.localeCompare(right.id);
  });
}

export function sortNotesForView(notes: NoteRecord[], sortBy: NoteSortBy): NoteRecord[] {
  return [...notes].sort((left, right) => {
    let comparison: number;
    switch (sortBy) {
      case 'updated:asc':
        comparison = left.updatedAt.getTime() - right.updatedAt.getTime();
        break;
      case 'updated:desc':
        comparison = right.updatedAt.getTime() - left.updatedAt.getTime();
        break;
      case 'created:asc':
        comparison = left.createdAt.getTime() - right.createdAt.getTime();
        break;
      case 'created:desc':
        comparison = right.createdAt.getTime() - left.createdAt.getTime();
        break;
      case 'title:asc':
        comparison = left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
        break;
      case 'title:desc':
        comparison = right.title.localeCompare(left.title, undefined, { sensitivity: 'base' });
        break;
    }

    return comparison || left.id.localeCompare(right.id);
  });
}
