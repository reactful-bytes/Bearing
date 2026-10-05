import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { CreateEventInput } from '../features/calendar/calendarTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { GoalWithMilestones } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useTasks } from '../features/tasks/useTasks';
import { TasksScreen } from '../screens/TasksScreen';
import type { TaskViewDraft } from '../navigation/navigationTypes';
import { spacing } from '../design/tokens';

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

function taskViewDraft(overrides: Partial<TaskViewDraft> = {}): TaskViewDraft {
  return {
    taskFilter: 'active',
    groupBy: 'none',
    sortBy: 'dueDate:asc',
    selectedGoalIds: [],
    taskSearch: '',
    ...overrides,
  };
}

describe('TasksScreen', () => {
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

  it('applies active, completed, and all task filters returned from the view screen', () => {
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

    const renderWithFilter = (taskFilter: TaskViewDraft['taskFilter']) => (
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ taskFilter }) } }} />
    );
    const setParams = jest.fn();
    const taskScreen = render(
      <TasksScreen
        route={{ params: { viewResult: taskViewDraft({ taskFilter: 'active' }) } }}
        navigation={{ setParams }}
      />,
    );
    expect(setParams).toHaveBeenCalledWith({ createTask: undefined, viewResult: undefined });
    expect(screen.getByText('Inbox zero')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('flat-task-list').props.style).gap).toBe(4);
    expect(screen.queryByText('Archived planning note')).toBeNull();

    taskScreen.rerender(renderWithFilter('completed'));

    expect(screen.getByText('Archived planning note')).toBeTruthy();
    expect(screen.queryByText('Inbox zero')).toBeNull();

    taskScreen.rerender(renderWithFilter('all'));

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
    expect(
      screen.getByRole('button', { name: 'Task view: active, ungrouped, due date ascending' }),
    ).toBeTruthy();
  });

  it('groups each task once by milestone and keeps unlinked tasks together', () => {
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

    render(
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ groupBy: 'milestone' }) } }} />,
    );

    expect(screen.getByRole('button', { name: 'Build a routine, 2 tasks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Plan the week, 1 task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review progress, 1 task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlinked tasks, 1 task' })).toBeTruthy();
    expect(screen.getAllByLabelText('Open task Choose a day')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Track habits')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Buy a notebook')).toHaveLength(1);
    expect(screen.getAllByRole('header', { name: 'TASKS' })).toHaveLength(2);
    expect(screen.queryByLabelText('Page number')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('task-group-children-goal-1').props.style)
        .borderLeftWidth,
    ).toBe(0);
    const milestoneGroupStyle = StyleSheet.flatten(
      screen.getByTestId('task-group-children-goal-1').props.style,
    );
    expect(milestoneGroupStyle.marginLeft).toBe(0);
    expect(milestoneGroupStyle.paddingLeft).toBe(0);
    const milestoneTaskStyle = StyleSheet.flatten(
      screen.getByTestId('milestone-task-children-milestone-1').props.style,
    );
    expect(milestoneTaskStyle.borderLeftWidth).toBe(2);
    expect(milestoneTaskStyle.marginLeft).toBe(24);
    const milestoneRowStyle = StyleSheet.flatten(
      screen.getByRole('button', { name: 'Plan the week, 1 task' }).parent?.props.style,
    );
    expect(milestoneRowStyle.borderLeftWidth).toBeUndefined();
    expect(milestoneRowStyle.borderBottomWidth).toBeUndefined();
    const taskRowStyle = StyleSheet.flatten(screen.getByTestId('task-list-row-task-3').props.style);
    expect(taskRowStyle.borderBottomWidth).toBeUndefined();
    const taskTitleStyle = StyleSheet.flatten(screen.getByText('Choose a day').props.style);
    expect(taskTitleStyle.fontSize).toBe(14);
    expect(taskTitleStyle.fontWeight).toBe('600');
    expect(screen.queryByText('Build a routine / Plan the week')).toBeNull();
    expect(screen.queryByText('1', { exact: true })).toBeNull();

    fireEvent.press(screen.getByLabelText('Collapse all groups'));
    expect(
      screen.getByRole('button', { name: 'Build a routine, 2 tasks', expanded: false }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Open task Choose a day')).toBeNull();
    fireEvent.press(screen.getByLabelText('Expand all groups'));
    expect(
      screen.getByRole('button', { name: 'Build a routine, 2 tasks', expanded: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Plan the week, 1 task', expanded: true }),
    ).toBeTruthy();

    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
  });

  it('opens the full-screen view route with the current filters and available goals', () => {
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
    fireEvent.press(screen.getByRole('button', { name: /^Task view:/ }));

    expect(mockNavigate).toHaveBeenCalledWith('TaskView', {
      draft: taskViewDraft(),
      goals: [{ id: 'goal-1', title: 'Build a routine' }],
    });
  });

  it('filters tasks to selected goals and supports selecting multiple goals', () => {
    mockGoals([
      {
        id: 'goal-1',
        title: 'Build a routine',
        status: 'active',
        milestones: [],
      } as unknown as GoalWithMilestones,
      {
        id: 'goal-2',
        title: 'Learn Spanish',
        status: 'active',
        milestones: [],
      } as unknown as GoalWithMilestones,
    ]);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [
        makeTask({ id: 'task-1', title: 'Plan mornings', goalId: 'goal-1' }),
        makeTask({ id: 'task-2', title: 'Practice verbs', goalId: 'goal-2' }),
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

    const taskScreen = render(
      <TasksScreen
        route={{ params: { viewResult: taskViewDraft({ selectedGoalIds: ['goal-1'] }) } }}
      />,
    );
    expect(screen.getByLabelText('Open task Plan mornings')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Practice verbs')).toBeNull();
    expect(screen.queryByLabelText('Open task Buy a notebook')).toBeNull();

    taskScreen.rerender(
      <TasksScreen
        route={{
          params: { viewResult: taskViewDraft({ selectedGoalIds: ['goal-1', 'goal-2'] }) },
        }}
      />,
    );
    expect(screen.getByLabelText('Open task Plan mornings')).toBeTruthy();
    expect(screen.getByLabelText('Open task Practice verbs')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Buy a notebook')).toBeNull();
  });

  it('searches task titles and retains all tasks under matching goal or milestone rows', () => {
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

    const taskScreen = render(
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ groupBy: 'goal' }) } }} />,
    );
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Build a routine');
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
    expect(screen.getByLabelText('Open task Gather materials')).toBeTruthy();
    expect(screen.getByLabelText('Open task Track progress')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Practice verbs')).toBeNull();

    taskScreen.rerender(
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ groupBy: 'milestone' }) } }} />,
    );
    fireEvent.changeText(screen.getByLabelText('Search tasks by name or title'), 'Plan the week');
    expect(screen.getByLabelText('Open task Choose a day')).toBeTruthy();
    expect(screen.getByLabelText('Open task Gather materials')).toBeTruthy();
    expect(screen.queryByLabelText('Open task Track progress')).toBeNull();
    expect(screen.queryByLabelText('Open task Practice verbs')).toBeNull();
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

    render(
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ taskFilter: 'all' }) } }} />,
    );
    const actionTriggers = screen.getAllByLabelText('Task actions');
    expect(actionTriggers).toHaveLength(2);

    fireEvent.press(actionTriggers[0]);
    expect(screen.getAllByLabelText('Task actions menu')).toHaveLength(1);
    fireEvent.press(actionTriggers[1]);
    expect(screen.getAllByLabelText('Task actions menu')).toHaveLength(1);
    expect(screen.getByRole('menuitem', { name: 'Mark task active' })).toBeTruthy();

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

    const renderWithSort = (sortBy: TaskViewDraft['sortBy']) => (
      <TasksScreen route={{ params: { viewResult: taskViewDraft({ sortBy }) } }} />
    );
    const taskScreen = render(renderWithSort('dueDate:asc'));
    const taskOrder = () =>
      screen
        .getAllByRole('button', { name: /Open task/ })
        .map((row) => row.props.accessibilityLabel);

    expect(taskOrder()).toEqual(['Open task Beta', 'Open task Zeta', 'Open task Alpha']);
    taskScreen.rerender(renderWithSort('title:asc'));
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    taskScreen.rerender(renderWithSort('title:desc'));
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    taskScreen.rerender(renderWithSort('dueDate:desc'));
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    taskScreen.rerender(renderWithSort('updated:asc'));
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    taskScreen.rerender(renderWithSort('updated:desc'));
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);
  });

  it('opens a separate edit screen and confirms deletion with the shared dialog', async () => {
    const updateTask = jest.fn(async () => undefined);
    const deleteTask = jest.fn(async () => undefined);
    const reactivateTask = jest.fn(async () => undefined);
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [makeTask()],
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
    fireEvent.press(screen.getByLabelText('Back to task details'));

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

    render(
      <TasksScreen
        route={{ params: { viewResult: taskViewDraft({ taskFilter: 'completed' }) } }}
      />,
    );
    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Mark task active' }));

    await waitFor(() => expect(reactivateTask).toHaveBeenCalledWith('task-1'));
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

    render(
      <TasksScreen
        route={{ params: { viewResult: taskViewDraft({ taskFilter: 'completed' }) } }}
      />,
    );

    expect(screen.getByText('No completed tasks.')).toBeTruthy();
    expect(screen.getByText('Tasks you mark complete will appear here.')).toBeTruthy();
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
