import { NoteRecord } from './noteTypes';

export function sortNotes(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((left, right) => {
    if (left.archived !== right.archived) return left.archived ? 1 : -1;
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;

    const updatedDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    return updatedDifference || left.id.localeCompare(right.id);
  });
}
