import type { AppIconName } from '../design/icons';
import type { TaskSortBy } from '../navigation/navigationTypes';

export const TASK_SORT_OPTIONS: {
  value: TaskSortBy;
  label: string;
  summary: string;
  icon: AppIconName;
}[] = [
  { value: 'dueDate:asc', label: 'Due date ascending', summary: 'Due ↑', icon: 'dateAscending' },
  { value: 'dueDate:desc', label: 'Due date descending', summary: 'Due ↓', icon: 'dateDescending' },
  {
    value: 'updated:asc',
    label: 'Updated ascending',
    summary: 'Updated ↑',
    icon: 'updatedAscending',
  },
  {
    value: 'updated:desc',
    label: 'Updated descending',
    summary: 'Updated ↓',
    icon: 'updatedDescending',
  },
  { value: 'title:asc', label: 'Title A to Z', summary: 'Title A-Z', icon: 'textAscending' },
  { value: 'title:desc', label: 'Title Z to A', summary: 'Title Z-A', icon: 'textDescending' },
];
