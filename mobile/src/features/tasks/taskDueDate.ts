export function taskDueDateKey(date: Date | null | undefined, key?: string | null): string | null {
  if (!date) {
    if (key) throw new Error('A task due date is required alongside its date key.');
    return null;
  }
  if (!Number.isFinite(date.getTime())) throw new Error('Task due date is invalid.');
  if (key !== undefined && key !== null) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(key) ||
      new Date(`${key}T00:00:00Z`).toISOString().slice(0, 10) !== key
    ) {
      throw new Error('Task due date is invalid.');
    }
    return key;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function taskDateFromKey(key: string): Date {
  const date = new Date(`${key}T12:00:00`);
  taskDueDateKey(date, key);
  return date;
}
