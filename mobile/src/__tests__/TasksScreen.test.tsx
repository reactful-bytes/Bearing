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

  it('filters active, completed, and all tasks with counts and selected state', () => {
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
    expect(screen.queryByText('Archived planning note')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Task status: Active', expanded: false }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Task status: Active' }));
    expect(screen.getByRole('button', { name: 'Select Active', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select Completed', selected: false })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Select Completed' }));

    expect(screen.getByText('Archived planning note')).toBeTruthy();
    expect(screen.queryByText('Inbox zero')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Task status: Completed', expanded: false }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Task status: Completed' }));
    fireEvent.press(screen.getByRole('button', { name: 'Select All tasks' }));

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
    expect(screen.getByRole('button', { name: 'Task status: Active' })).toBeTruthy();
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
      } as GoalWithMilestones,
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
    fireEvent.press(screen.getByLabelText('Task grouping: None'));
    fireEvent.press(screen.getByLabelText('Select Milestone'));

    expect(screen.getByRole('button', { name: 'Build a routine, 2 tasks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Plan the week, 1 task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review progress, 1 task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlinked tasks, 1 task' })).toBeTruthy();
    expect(screen.getAllByLabelText('Open task Choose a day')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Track habits')).toHaveLength(1);
    expect(screen.getAllByLabelText('Open task Buy a notebook')).toHaveLength(1);
    expect(screen.getAllByRole('header', { name: 'TASKS' })).toHaveLength(3);
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
    expect(milestoneTaskStyle.marginLeft).toBe(16);
    const taskTitleStyle = StyleSheet.flatten(screen.getByText('Choose a day').props.style);
    expect(taskTitleStyle.fontSize).toBe(14);
    expect(taskTitleStyle.fontWeight).toBe('600');
    expect(screen.queryByText('Build a routine / Plan the week')).toBeNull();
    expect(screen.queryByText('1', { exact: true })).toBeNull();
  });

  it('switches directly between open task list dropdowns', () => {
    (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
      tasks: [makeTask()],
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
    expect(screen.getByLabelText('Task list controls')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Task grouping: None'));
    expect(screen.getByLabelText('Group options')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Task sorting: Due date ascending'));

    expect(screen.getByLabelText('Sort options')).toBeTruthy();
    expect(screen.queryByLabelText('Group options')).toBeNull();
    expect(screen.getByLabelText('Select Due date descending')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Dismiss task list menus'));
    expect(screen.queryByLabelText('Sort options')).toBeNull();
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
    fireEvent.press(screen.getByLabelText('Task sorting: Due date ascending'));
    fireEvent.press(screen.getByLabelText('Select Title A to Z'));
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    fireEvent.press(screen.getByLabelText('Task sorting: Title A to Z'));
    fireEvent.press(screen.getByLabelText('Select Title Z to A'));
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    fireEvent.press(screen.getByLabelText('Task sorting: Title Z to A'));
    fireEvent.press(screen.getByLabelText('Select Due date descending'));
    expect(taskOrder()).toEqual(['Open task Zeta', 'Open task Beta', 'Open task Alpha']);

    fireEvent.press(screen.getByLabelText('Task sorting: Due date descending'));
    fireEvent.press(screen.getByLabelText('Select Updated ascending'));
    expect(taskOrder()).toEqual(['Open task Alpha', 'Open task Beta', 'Open task Zeta']);

    fireEvent.press(screen.getByLabelText('Task sorting: Updated ascending'));
    fireEvent.press(screen.getByLabelText('Select Updated descending'));
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
    fireEvent.press(screen.getByLabelText('Task status: Active'));
    fireEvent.press(screen.getByRole('button', { name: 'Select Completed' }));
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

    render(<TasksScreen />);
    fireEvent.press(screen.getByLabelText('Task status: Active'));
    fireEvent.press(screen.getByRole('button', { name: 'Select Completed' }));

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
