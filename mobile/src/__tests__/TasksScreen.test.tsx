import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { CreateEventInput } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { GoalWithMilestones } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useTasks } from '../features/tasks/useTasks';
import { TasksScreen } from '../screens/TasksScreen';
import type { TaskFilter, TaskGroupBy, TaskSortBy } from '../navigation/navigationTypes';
import { spacing } from '../design/tokens';
import { TASK_SORT_OPTIONS } from '../screens/taskViewOptions';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    profile: { locale: 'en-US', timezone: 'America/Chicago', timeFormat: '12-hour' },
  })),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
  })),
}));

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));
jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));

jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  createEvent: jest.fn(),
  subscribeToEventsByDateRange: jest.fn(() => jest.fn()),
  subscribeToCalendarEvents: jest.fn(() => jest.fn()),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: { uid: 'test-user' } })),
}));

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    userId: 'user-1',
    title: 'Inbox zero',
    description: 'Clear the remaining work messages.',
    starter: '',
    goalId: null,
    milestoneId: null,
    dueDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    allDay: false,
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: new Date(2026, 6, 28, 8, 0, 0),
    updatedAt: new Date(2026, 6, 28, 8, 15, 0),
    ...overrides,
  };
}

function mockGoals(goals: GoalWithMilestones[] = []): void {
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals,
  } as ReturnType<typeof useGoals>);
}

function applyTaskFilter(taskFilter: TaskFilter): void {
  fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
  const label = taskFilter === 'all' ? 'All' : taskFilter === 'active' ? 'Active' : 'Completed';
  const options = screen.getAllByRole('button', { name: label });
  fireEvent.press(options[0]);
  fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
}

function applyTaskGroup(groupBy: TaskGroupBy): void {
  fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
  const label = groupBy === 'goal' ? 'Goal' : groupBy === 'unlinked' ? 'Unlinked' : 'All';
  const options = screen.getAllByRole('button', { name: label });
  fireEvent.press(label === 'All' ? options[1] : options[0]);
  fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
}

function applyTaskSort(sortBy: TaskSortBy): void {
  const option = TASK_SORT_OPTIONS.find((candidate) => candidate.value === sortBy)!;
  fireEvent.press(screen.getByRole('button', { name: 'Sort tasks' }));
  fireEvent.press(screen.getByRole('radio', { name: `Sort tasks by ${option.label}` }));
  fireEvent.press(screen.getByRole('button', { name: 'Apply sort tasks' }));
}

describe('TasksScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoals();
    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: null,
      createEvent: jest.fn(async () => 'event-new'),
      publishEvent: jest.fn(async () => undefined),
    });
  });

  it('retries after the tasks subscription fails', () => {
    const retry = jest.fn();
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
    mockedUseTasks.mockReturnValue({
      tasks: [],
      uiState: 'error',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'task-task-1',
        eventInput: {
          title: 'Inbox zero',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry,
    });

    render(<TasksScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('applies active, completed, and all task filters from the filter sheet', () => {
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

    mockedUseTasks.mockReturnValue({
      tasks: [
        makeTask(),
        makeTask({
          id: 'task-2',
          title: 'Archived planning note',
          status: 'completed',
          completionSource: 'scheduled',
          completedAt: new Date(2026, 6, 28, 9, 0, 0),
        }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'task-task-1',
        eventInput: {
          title: 'Inbox zero',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    expect(screen.getByText('Inbox zero')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('flat-task-list').props.style).gap).toBe(4);
    expect(screen.queryByText('Archived planning note')).toBeNull();

    applyTaskFilter('completed');

    expect(screen.getByText('Archived planning note')).toBeTruthy();
    expect(screen.queryByText('Inbox zero')).toBeNull();

    applyTaskFilter('all');

    expect(screen.getByText('Inbox zero')).toBeTruthy();
    expect(screen.getByText('Archived planning note')).toBeTruthy();
  });

  it('excludes tasks linked to draft goals from every task filter', () => {
    mockGoals([{ id: 'draft-goal', status: 'draft' } as GoalWithMilestones]);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({ goalId: 'draft-goal', title: 'Draft-only task' }),
        makeTask({ id: 'task-2', title: 'Active task' }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: 'Active task',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);

    expect(screen.getByText('Active task')).toBeTruthy();
    expect(screen.queryByText('Draft-only task')).toBeNull();
    expect(screen.getByTestId('task-filter-sort-toolbar-filter')).toBeTruthy();
    expect(screen.getByTestId('task-filter-sort-toolbar-sort')).toBeTruthy();
  });

  it('defaults to unlinked tasks and groups all tasks by goal without milestone rows', () => {
    mockGoals([
      {
        id: 'goal-1',
        title: 'Build a routine',
        status: 'active',
        milestones: [
          { id: 'milestone-1', title: 'Plan the week' },
          { id: 'milestone-2', title: 'Review progress' },
        ],
      } as unknown as GoalWithMilestones,
    ]);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({
          id: 'task-1',
          title: 'Choose a day',
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
        }),
        makeTask({
          id: 'task-2',
          title: 'Track habits',
          goalId: 'goal-1',
          milestoneId: 'milestone-2',
        }),
        makeTask({ id: 'task-3', title: 'Buy a notebook' }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    expect(screen.getByLabelText('Open task Buy a notebook')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Choose a day')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    expect(screen.queryByLabelText(/^Filter tasks by /)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    applyTaskGroup('goal');

    expect(screen.getByRole('button', { name: 'Build a routine, 2 tasks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlinked tasks, 1 task' })).toBeTruthy();
    expect(screen.getAllByLabelText('Open task Choose a day')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Track habits')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Buy a notebook')).toHaveLength(1);
    expect(screen.getAllByRole('header', { name: 'TASKS' })).toHaveLength(1);
    expect(screen.queryByLabelText('Page number')).toBeNull();
    const taskTitleStyle = StyleSheet.flatten(screen.getByText('Choose a day').props.style);
    expect(taskTitleStyle.fontSize).toBe(14);
    expect(taskTitleStyle.fontWeight).toBe('600');

    fireEvent.press(screen.getByLabelText('Collapse all groups'));
    expect(
      screen.getByRole('button', { name: 'Build a routine, 2 tasks', expanded: false }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Open task Choose a day')).toBeNull();
    fireEvent.press(screen.getByLabelText('Expand all groups'));
    expect(
      screen.getByRole('button', { name: 'Build a routine, 2 tasks', expanded: true }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();

    applyTaskGroup('all');
    expect(screen.getByTestId('flat-task-list')).toBeTruthy();
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
    expect(screen.getByLabelText('Open task Track habits')).toBeTruthy();
    expect(screen.getByLabelText('Open task Buy a notebook')).toBeTruthy();
  });

  it('opens separate draggable filter and sort sheets', () => {
    mockGoals([
      {
        id: 'goal-1',
        title: 'Build a routine',
        status: 'active',
        milestones: [],
      } as unknown as GoalWithMilestones,
    ]);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [makeTask({ goalId: 'goal-1' })],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    expect(screen.getByRole('header', { name: 'Filter tasks' })).toBeTruthy();
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Past due' }).props.style)
        .flexDirection,
    ).toBe('row');

    fireEvent.press(screen.getByRole('button', { name: 'Dismiss Filter tasks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sort tasks' }));
    expect(screen.getByRole('header', { name: 'Sort tasks' })).toBeTruthy();
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Sort tasks by Title Z to A' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply sort tasks' }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Sort: Title Z-A')).toBeTruthy();
  });

  it('filters by local due-date ranges and keeps search and sort when filters reset', () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (todayStart.getDay() + 6) % 7;
    const weekStart = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      todayStart.getDate() - mondayOffset,
    );
    const nextWeek = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7,
    );
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const nextMonth = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({
          id: 'overdue',
          title: 'Focus overdue',
          dueDate: new Date(todayStart.getTime() - 86_400_000),
        }),
        makeTask({ id: 'week', title: 'Focus week start', dueDate: weekStart }),
        makeTask({ id: 'next-week', title: 'Focus next week', dueDate: nextWeek }),
        makeTask({ id: 'month', title: 'Focus month start', dueDate: monthStart }),
        makeTask({ id: 'next-month', title: 'Focus next month', dueDate: nextMonth }),
        makeTask({ id: 'scheduled', title: 'Focus scheduled only', scheduledStart: todayStart }),
        makeTask({
          id: 'completed-overdue',
          title: 'Focus completed overdue',
          status: 'completed',
          dueDate: new Date(todayStart.getTime() - 86_400_000),
        }),
        makeTask({ id: 'other', title: 'Another item' }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Focus');
    fireEvent.press(screen.getByRole('button', { name: 'Sort tasks' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Sort tasks by Title Z to A' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply sort tasks' }));

    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'All' })[0]);
    fireEvent.press(screen.getByRole('button', { name: 'Past due' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    expect(screen.getByLabelText('Open task Focus overdue')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Focus completed overdue')).toBeNull();
    expect(screen.queryByLabelText('Open task Focus scheduled only')).toBeNull();
    expect(screen.queryByLabelText('Open task Another item')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    fireEvent.press(screen.getByRole('button', { name: 'This week' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    expect(screen.getByLabelText('Open task Focus week start')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Focus next week')).toBeNull();
    expect(screen.queryByLabelText('Open task Focus scheduled only')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    fireEvent.press(screen.getByRole('button', { name: 'This month' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    expect(screen.getByLabelText('Open task Focus month start')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Focus next month')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reset task filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    expect(screen.getByLabelText('Open task Focus overdue')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Another item')).toBeNull();
    expect(screen.getByText('Sort: Title Z-A')).toBeTruthy();
    const renderedTitles = screen
      .getAllByLabelText(/^Open task Focus/)
      .map((row) => row.props.accessibilityLabel);
    expect(renderedTitles[0]).toBe('Open task Focus week start');
  });

  it('searches task titles and matching goal titles only when grouped by goal', () => {
    mockGoals([
      {
        id: 'goal-1',
        title: 'Build a routine',
        status: 'active',
        milestones: [
          { id: 'milestone-1', title: 'Plan the week' },
          { id: 'milestone-2', title: 'Review progress' },
        ],
      },
      { id: 'goal-2', title: 'Learn Spanish', status: 'active', milestones: [] },
    ] as GoalWithMilestones[]);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({
          id: 'task-1',
          title: 'Choose a day',
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
        }),
        makeTask({
          id: 'task-2',
          title: 'Gather materials',
          goalId: 'goal-1',
          milestoneId: 'milestone-1',
        }),
        makeTask({
          id: 'task-3',
          title: 'Track progress',
          goalId: 'goal-1',
          milestoneId: 'milestone-2',
        }),
        makeTask({ id: 'task-4', title: 'Practice verbs', goalId: 'goal-2' }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    applyTaskGroup('goal');
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Build a routine');
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
    expect(screen.getByLabelText('Open task Gather materials')).toBeTruthy();
    expect(screen.getByLabelText('Open task Track progress')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Practice verbs')).toBeNull();

    applyTaskGroup('all');
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Build a routine');
    expect(screen.queryByLabelText('Open task Choose a day')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Choose a day');
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Gather materials')).toBeNull();
  });

  it('keeps one row action menu open at a time and dismisses it outside', () => {
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({ id: 'task-active', title: 'Active task' }),
        makeTask({
          id: 'task-completed',
          title: 'Completed task',
          status: 'completed',
          completionSource: 'manual',
          completedAt: new Date(2026, 6, 28, 9, 0, 0),
        }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    applyTaskFilter('all');
    const actionTriggers = screen.getAllByLabelText('Task actions');
    expect(actionTriggers).toHaveLength(2);

    fireEvent.press(actionTriggers[0]);
    expect(screen.getAllByLabelText('Task actions menu')).toHaveLength(1);
    fireEvent.press(actionTriggers[1]);
    expect(screen.getAllByLabelText('Task actions menu')).toHaveLength(1);
    expect(screen.getByRole('menuitem', { name: 'Uncomplete task' })).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Dismiss Task actions menu'), {
      stopPropagation: jest.fn(),
    });
    expect(screen.queryByLabelText('Task actions menu')).toBeNull();
  });

  it('paginates ungrouped tasks and lets the user change the page size and page number', () => {
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: Array.from({ length: 26 }, (_, index) =>
        makeTask({ id: `task-${index + 1}`, title: `Task ${String(index + 1).padStart(2, '0')}` }),
      ),
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);

    expect(screen.getByText('Task 01')).toBeTruthy();
    expect(screen.getByText('Task 15')).toBeTruthy();
    expect(screen.queryByText('Task 16')).toBeNull();

    fireEvent.press(screen.getByLabelText('Next page'));
    expect(screen.getByLabelText('Page number').props.value).toBe('2');
    expect(screen.getByText('Task 16')).toBeTruthy();
    expect(screen.queryByText('Task 01')).toBeNull();

    fireEvent.press(screen.getByLabelText('10 tasks per page'));
    expect(screen.getByLabelText('Page number').props.value).toBe('1');
    expect(screen.getByText('Task 10')).toBeTruthy();
    expect(screen.queryByText('Task 11')).toBeNull();

    const pageInput = screen.getByLabelText('Page number');
    fireEvent.changeText(pageInput, '99');
    fireEvent(pageInput, 'endEditing');
    expect(screen.getByLabelText('Page number').props.value).toBe('3');
    expect(screen.getByText('Task 26')).toBeTruthy();
  });

  it('sorts tasks ascending and descending by due date, updated time, and title', () => {
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({
          id: 'task-later',
          title: 'Zeta',
          dueDate: new Date(2026, 8, 1),
          updatedAt: new Date(2026, 8, 3),
        }),
        makeTask({
          id: 'task-earlier',
          title: 'Beta',
          dueDate: new Date(2026, 7, 1),
          updatedAt: new Date(2026, 8, 2),
        }),
        makeTask({ id: 'task-undated', title: 'Alpha', updatedAt: new Date(2026, 8, 1) }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    const taskOrder = () =>
      screen
        .getAllByRole('button', { name: /Open task/ })
        .map((row) => row.props.accessibilityLabel);

    expect(taskOrder()).toEqual(['Open task Beta', 'Open task Zeta', 'Open task Alpha']);
    applyTaskSort('title:asc');
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    applyTaskSort('title:desc');
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    applyTaskSort('dueDate:desc');
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    applyTaskSort('updated:asc');
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    applyTaskSort('updated:desc');
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);
  });

  it('opens a separate edit screen and confirms deletion with the shared dialog', async () => {
    const updateTask = jest.fn(async () => undefined);
    const deleteTask = jest.fn(async () => undefined);
    const reactivateTask = jest.fn(async () => undefined);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [makeTask({ dueDate: new Date(2026, 7, 20) })],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask,
      completeTask: async () => undefined,
      reactivateTask,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit task' }));
    expect(screen.getByRole('header', { name: 'Edit Task' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Task Details' })).toBeNull();
    expect(screen.getByLabelText('Edit task due date')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Clear due date'));
    await act(async () => fireEvent.press(screen.getByLabelText('Save task changes')));
    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ dueDate: null })),
    );

    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete task' }));
    expect(screen.getByLabelText('Delete task? confirmation dialog')).toBeTruthy();
    expect(screen.getByText('Delete', { exact: true })).toBeTruthy();
    expect(screen.queryByText('Delete task', { exact: true })).toBeNull();
    await act(async () => fireEvent.press(screen.getByLabelText('Confirm delete task')));
    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith('task-1'));
    expect(reactivateTask).not.toHaveBeenCalled();
  });

  it('reactivates completed tasks from the task action menu', async () => {
    const reactivateTask = jest.fn(async () => undefined);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({ status: 'completed', completionSource: 'manual', completedAt: new Date() }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: '',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    applyTaskFilter('completed');
    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));

    await waitFor(() => expect(reactivateTask).toHaveBeenCalledWith('task-1'));
  });

  it('completes and uncompletes from the menu while preserving and crossing out the due date', async () => {
    jest.useFakeTimers();
    const completeTask = jest.fn(async () => undefined);
    const reactivateTask = jest.fn(async () => undefined);
    const activeTask = makeTask({ dueDate: new Date(2026, 8, 8) });
    const taskState: ReturnType<typeof useTasks> = {
      tasks: [activeTask],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask,
      reactivateTask,
      convertTaskToEvent: async () => ({
        eventId: 'event-1',
        eventInput: {
          title: activeTask.title,
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    };
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
    mockedUseTasks.mockReturnValue(taskState);
    const renderTaskScreen = () => (
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ taskFilter: 'all' }) } }} />
    );
    const { rerender } = render(renderTaskScreen());
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.press(screen.getByLabelText('Task actions'));
    await act(async () => {
      fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' }));
      jest.advanceTimersByTime(200);
    });
    await waitFor(() =>
      expect(completeTask).toHaveBeenCalledWith(activeTask.id, { completionSource: 'manual' }),
    );
    expect(screen.queryByRole('header', { name: 'Task Details' })).toBeNull();

    mockedUseTasks.mockReturnValue({
      ...taskState,
      tasks: [{ ...activeTask, status: 'completed', completedAt: new Date(2026, 8, 10) }],
    });
    rerender(renderTaskScreen());
    for (const text of [activeTask.title, 'Due Sep 8']) {
      expect(StyleSheet.flatten(screen.getByText(text).props.style)).toEqual(
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      );
    }
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));
      jest.advanceTimersByTime(200);
    });
    await waitFor(() => expect(reactivateTask).toHaveBeenCalledWith(activeTask.id));

    mockedUseTasks.mockReturnValue(taskState);
    rerender(renderTaskScreen());
    expect(StyleSheet.flatten(screen.getByText('Due Sep 8').props.style)).not.toHaveProperty(
      'textDecorationLine',
    );
  });

  it('shows filter-specific empty copy', () => {
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

    mockedUseTasks.mockReturnValue({
      tasks: [makeTask()],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'task-task-1',
        eventInput: {
          title: 'Inbox zero',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);
    applyTaskFilter('completed');

    expect(screen.getByText('No completed tasks.')).toBeTruthy();
    expect(screen.queryByLabelText('No completed tasks. icon')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'No completed tasks.' }).props.style)
        .fontSize,
    ).toBe(14);
    expect(
      StyleSheet.flatten(screen.getByText('Tasks you mark complete will appear here.').props.style)
        .fontSize,
    ).toBe(12);
    expect(screen.getByText('Tasks you mark complete will appear here.')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'No completed tasks.' }).props.style)
        .textAlign,
    ).toBe('center');

    applyTaskFilter('active');
    fireEvent.press(screen.getByRole('button', { name: 'Filter tasks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Past due' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply task filters' }));
    expect(screen.getByText('No matching tasks.')).toBeTruthy();
  });

  it('creates a task from the route-driven modal without a screen FAB', async () => {
    const createTaskMock = jest.fn(async () => undefined);
    const setParams = jest.fn();
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

    mockedUseTasks.mockReturnValue({
      tasks: [],
      uiState: 'empty',
      createTask: createTaskMock,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
      reactivateTask: async () => undefined,
      convertTaskToEvent: async () => ({
        eventId: 'task-task-1',
        eventInput: {
          title: 'Inbox zero',
          description: '',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      }),
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen route={{ params: { createTask: true } }} navigation={{ setParams }} />);

    expect(screen.queryByRole('button', { name: 'New task' })).toBeNull();
    expect(setParams).toHaveBeenCalledWith({ createTask: undefined });
    expect(screen.getByLabelText('Task due date')).toBeTruthy();
    expect(screen.queryByLabelText('Add schedule details')).toBeNull();
    expect(screen.queryByLabelText('Task schedule start date')).toBeNull();
    expect(screen.queryByLabelText('All-day task')).toBeNull();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Choose task goal or milestone, currently No goal or milestone',
      }),
    );
    const associationScroll = screen.getByTestId('task-association-options-scroll');
    expect(StyleSheet.flatten(associationScroll.props.style).marginRight).toBe(-spacing.lg);
    expect(StyleSheet.flatten(associationScroll.props.contentContainerStyle).paddingRight).toBe(
      spacing.lg,
    );
    fireEvent.press(screen.getByLabelText('Back to task'));
    fireEvent.changeText(screen.getByLabelText('Task title'), 'Plan weekly meals');
    fireEvent.changeText(
      screen.getByLabelText('Task description'),
      'Make a simple shopping list first.',
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save task'));
    });

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith({
        title: 'Plan weekly meals',
        description: 'Make a simple shopping list first.',
        starter: '',
      });
    });
  });

  it('schedules a task by prefilling the event modal without completing the task', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 28, 9, 15, 0));

    const completeTaskMock = jest.fn(async () => undefined);
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
    const convertTaskToEvent = jest.fn(async (_taskId: string, eventInput: CreateEventInput) => ({
      eventId: 'task-task-1',
      eventInput,
      created: true,
    }));

    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: 'Work',
      createEvent: jest.fn(async () => 'event-new'),
      publishEvent: jest.fn(async () => undefined),
    });
    mockedUseTasks.mockReturnValue({
      tasks: [makeTask()],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: completeTaskMock,
      reactivateTask: async () => undefined,
      convertTaskToEvent,
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);

    fireEvent.press(screen.getByText('Inbox zero'));
    fireEvent.press(screen.getByLabelText('Schedule task'));

    expect(screen.getByDisplayValue('Inbox zero')).toBeTruthy();
    expect(screen.getByDisplayValue('Clear the remaining work messages.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save event'));
    });

    await waitFor(() => {
      expect(convertTaskToEvent).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Inbox zero',
          description: 'Clear the remaining work messages.',
          timezone: expect.any(String),
        }),
      );
      expect(completeTaskMock).not.toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('starts a task immediately with the default 30-minute duration and opens Calendar focus mode', async () => {
    jest.useFakeTimers();
    const startAt = new Date(2026, 6, 28, 14, 0, 0);
    jest.setSystemTime(startAt);

    const completeTaskMock = jest.fn(async () => undefined);
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
    const convertTaskToEvent = jest.fn(async (_taskId: string, eventInput: CreateEventInput) => ({
      eventId: 'task-task-1',
      eventInput,
      created: true,
    }));
    const publishEvent = jest.fn(async () => undefined);

    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: 'Work',
      createEvent: jest.fn(async () => 'event-new'),
      publishEvent,
    });
    mockedUseTasks.mockReturnValue({
      tasks: [
        makeTask({ title: 'Write proposal', description: 'Focus on the executive summary.' }),
      ],
      uiState: 'ready',
      createTask: async () => undefined,
      updateTask: async () => undefined,
      completeTask: completeTaskMock,
      reactivateTask: async () => undefined,
      convertTaskToEvent,
      deleteTask: async () => undefined,
      retry: jest.fn(),
    });

    render(<TasksScreen />);

    fireEvent.press(screen.getByText('Write proposal'));
    fireEvent.press(screen.getByLabelText('Start task now'));

    expect(screen.getByDisplayValue('30')).toBeTruthy();
    fireEvent(screen.getByLabelText('Add to Work'), 'valueChange', true);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm start now'));
    });

    await waitFor(() => {
      expect(convertTaskToEvent).toHaveBeenCalledWith('task-1', {
        title: 'Write proposal',
        description: 'Focus on the executive summary.',
        startAt,
        endAt: new Date(2026, 6, 28, 14, 30, 0),
        timezone: expect.any(String),
      });
      expect(publishEvent).toHaveBeenCalledWith(
        'task-task-1',
        expect.objectContaining({ title: 'Write proposal' }),
      );
      expect(convertTaskToEvent.mock.invocationCallOrder[0]).toBeLessThan(
        publishEvent.mock.invocationCallOrder[0],
      );
      expect(completeTaskMock).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Plan', {
        screen: 'FocusMode',
        params: {
          eventId: 'task-task-1',
          taskId: 'task-1',
          title: 'Write proposal',
          description: 'Focus on the executive summary.',
          startAtIso: startAt.toISOString(),
          endAtIso: new Date(2026, 6, 28, 14, 30, 0).toISOString(),
          timezone: 'America/Chicago',
        },
      });
    });

    jest.useRealTimers();
  });
});
