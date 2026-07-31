import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { TasksScreen } from '../screens/TasksScreen';
import { useTasks } from '../features/tasks/useTasks';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { CreateEventInput } from '../features/calendar/calendarTypes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
  })),
}));

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));

jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));

jest.mock('../services/firebase/firebaseEvents', () => ({
  createEvent: jest.fn(),
  subscribeToEventsByDateRange: jest.fn(() => jest.fn()),
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
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: new Date(2026, 6, 28, 8, 0, 0),
    updatedAt: new Date(2026, 6, 28, 8, 15, 0),
    ...overrides,
  };
}

describe('TasksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
      publicationCalendarTitle: null,
      createEvent: jest.fn(async () => 'event-new'),
      publishEvent: jest.fn(async () => undefined),
    });
  });

  it('shows active tasks by default and reveals completed tasks when toggled', () => {
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
    });

    render(<TasksScreen />);

    expect(screen.getByText('Inbox zero')).toBeTruthy();
    expect(screen.queryByText('Archived planning note')).toBeNull();

    fireEvent.press(screen.getByLabelText('Show completed tasks'));

    expect(screen.getByText('Archived planning note')).toBeTruthy();
  });

  it('creates a task from the modal', async () => {
    const createTaskMock = jest.fn(async () => undefined);
    const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

    mockedUseTasks.mockReturnValue({
      tasks: [],
      uiState: 'empty',
      createTask: createTaskMock,
      updateTask: async () => undefined,
      completeTask: async () => undefined,
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
    });

    render(<TasksScreen />);

    fireEvent.press(screen.getByLabelText('New task'));
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
      });
    });
  });

  it('schedules a task by prefilling the event modal and auto-completing the task', async () => {
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
      convertTaskToEvent,
      deleteTask: async () => undefined,
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
        'scheduled',
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
      convertTaskToEvent,
      deleteTask: async () => undefined,
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
      expect(convertTaskToEvent).toHaveBeenCalledWith(
        'task-1',
        {
          title: 'Write proposal',
          description: 'Focus on the executive summary.',
          startAt,
          endAt: new Date(2026, 6, 28, 14, 30, 0),
          timezone: expect.any(String),
        },
        'start_now',
      );
      expect(publishEvent).toHaveBeenCalledWith(
        'task-task-1',
        expect.objectContaining({ title: 'Write proposal' }),
      );
      expect(convertTaskToEvent.mock.invocationCallOrder[0]).toBeLessThan(
        publishEvent.mock.invocationCallOrder[0],
      );
      expect(completeTaskMock).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Calendar', {
        focusLaunch: expect.objectContaining({
          eventId: 'task-task-1',
          title: 'Write proposal',
          description: 'Focus on the executive summary.',
          startAtIso: startAt.toISOString(),
          endAtIso: new Date(2026, 6, 28, 14, 30, 0).toISOString(),
        }),
      });
    });

    jest.useRealTimers();
  });
});
