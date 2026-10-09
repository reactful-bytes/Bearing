import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ScrollView, StyleSheet } from 'react-native';

import { BearingEvent, CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { GoalWithMilestones } from '../features/goals/goalTypes';
import { spacing } from '../design/tokens';
import { NoteRecord } from '../features/notes/noteTypes';
import { UserProfileRecord } from '../features/profile/profileTypes';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { useFocusSession } from '../features/focus/focusSession';
import { useGoals } from '../features/goals/useGoals';
import { useNotes } from '../features/notes/useNotes';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import { PlanScreen } from '../screens/PlanScreen';
import { EditTaskScreen, TaskDetailScreen } from '../screens/TaskDetailScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockRootNavigate })),
}));

jest.mock('../features/calendar/useCalendarEvents', () => ({
  useCalendarEvents: jest.fn(),
}));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(() => ({
    publicationCalendarTitle: null,
    publishEvent: jest.fn(async () => undefined),
  })),
}));
jest.mock('../features/focus/focusSession', () => ({
  useFocusSession: jest.fn(),
}));
jest.mock('../features/goals/useGoals', () => ({
  useGoals: jest.fn(),
}));
jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(),
}));
jest.mock('../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

const mockUseCalendarEvents = useCalendarEvents as jest.MockedFunction<typeof useCalendarEvents>;
const mockUseFocusSession = useFocusSession as jest.MockedFunction<typeof useFocusSession>;
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockRootNavigate = jest.fn();

function makeProfile(): UserProfileRecord {
  return {
    userId: 'user-1',
    displayName: 'Preston',
    email: 'preston@example.com',
    timezone: 'America/New_York',
    locale: 'en-US',
    timeFormat: '12-hour',
    premiumStatus: 'free',
    premiumSource: 'none',
    tipsEnabled: true,
    reminderSoundId: 'signal-pulse',
    alarmSoundId: 'summit-chime',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeEvent(index: number): BearingEvent {
  const startAt = new Date();
  startAt.setMinutes(startAt.getMinutes() + index + 10);
  const endAt = new Date(startAt.getTime() + 30 * 60_000);
  return {
    id: `event-${index}`,
    title: `Plan block ${index}`,
    description: '',
    startAt,
    endAt,
    timezone: 'America/New_York',
    allDay: false,
    location: '',
    recurrenceRule: null,
    alarms: [],
    availability: 'busy',
    url: null,
    status: 'scheduled',
    ownership: 'bearing',
    userId: 'user-1',
    sourceTaskId: null,
    goalId: null,
    milestoneId: null,
    publication: {
      status: 'unpublished',
      markerId: null,
      commonHash: null,
      lastError: null,
      retryable: false,
      deletionIntent: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeGoal(): GoalWithMilestones {
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Ship the next release',
    description: '',
    smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
    estimatedCompletionDate: new Date(2026, 8, 30),
    nextMilestoneId: null,
    manuallyCompletedAt: null,
    status: 'active',
    isAiAssisted: false,
    aiPlanVersion: null,
    milestones: [],
    tasks: [],
    nextMilestone: null,
    nextTask: null,
    completedTaskCount: 1,
    totalTaskCount: 2,
    completedMilestoneCount: 1,
    totalMilestoneCount: 2,
    progressText: '1 of 2 tasks completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeNote(): NoteRecord {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Idea',
    body: 'Try a smaller release.',
    labels: [],
    source: 'idea_dump',
    sourceEventId: null,
    sourceMilestoneId: null,
    pinned: false,
    processed: false,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeTask(index: number): TaskRecord {
  const updatedAt = new Date();
  return {
    id: `task-${index}`,
    userId: 'user-1',
    title: `Task ${index}`,
    description: '',
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
    createdAt: updatedAt,
    updatedAt,
  };
}

function mockReadyState(events: CalendarDisplayEvent[] = [makeEvent(1)]): void {
  mockUseUserProfile.mockReturnValue({ profile: makeProfile() } as ReturnType<
    typeof useUserProfile
  >);
  mockUseCalendarEvents.mockReturnValue({
    events,
    uiState: 'ready',
    refresh: jest.fn(async () => undefined),
  } as unknown as ReturnType<typeof useCalendarEvents>);
  mockUseFocusSession.mockReturnValue(null);
  mockUseGoals.mockReturnValue({
    goals: [makeGoal()],
    uiState: 'ready',
    retry: jest.fn(),
  } as unknown as ReturnType<typeof useGoals>);
  mockUseNotes.mockReturnValue({
    notes: [makeNote()],
    uiState: 'ready',
    retry: jest.fn(),
  } as unknown as ReturnType<typeof useNotes>);
  mockUseTasks.mockReturnValue({
    tasks: [],
    uiState: 'empty',
    retry: jest.fn(),
  } as unknown as ReturnType<typeof useTasks>);
}

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date(2026, 8, 7, 10, 0, 0) });
    mockReadyState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('composes the upcoming command center and limits events to three', () => {
    mockReadyState(Array.from({ length: 6 }, (_, index) => makeEvent(index)));
    const stackNavigate = jest.fn();

    render(<PlanScreen navigation={{ navigate: stackNavigate } as never} />);

    expect(screen.getByText(/Preston/)).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('Plan block 0')).toBeTruthy();
    expect(screen.getByText('Plan block 2')).toBeTruthy();
    expect(screen.getAllByText('Bearing · 30 min')).toHaveLength(3);
    expect(screen.queryByText('Plan block 3')).toBeNull();
    expect(screen.getByText('Ship the next release')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('plan-goal-row-content-Ship the next release').props.style,
      ),
    ).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('plan-goal-marker-Ship the next release').props.style),
    ).toMatchObject({ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 });
    const goalProgressRow = screen.getByTestId('plan-goal-progress-row-Ship the next release');
    expect(StyleSheet.flatten(goalProgressRow.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    });
    expect(screen.getByTestId('plan-goal-progress-bar-Ship the next release').props).toMatchObject({
      accessibilityRole: 'progressbar',
      accessibilityLabel: 'Goal progress Ship the next release',
      accessibilityValue: { now: 50, text: '50%' },
    });
    expect(within(goalProgressRow).getByText('50%')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View full day' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'See all' })).toHaveLength(2);
  });

  it('uses distinct keys for recurring occurrences of the same event', () => {
    const firstOccurrence = {
      ...makeEvent(1),
      id: 'task-Vz7B6910zb59VxaAfYAE',
      recurrenceInstanceDate: '2026-09-07',
      title: 'Recurring task, first occurrence',
    };
    const secondOccurrence = {
      ...firstOccurrence,
      recurrenceInstanceDate: '2026-09-08',
      title: 'Recurring task, second occurrence',
      startAt: new Date(firstOccurrence.startAt.getTime() + 24 * 60 * 60_000),
      endAt: new Date(firstOccurrence.endAt.getTime() + 24 * 60 * 60_000),
    };
    mockReadyState([firstOccurrence, secondOccurrence]);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    const errorCalls = consoleError.mock.calls;
    consoleError.mockRestore();
    expect(screen.getByText('Recurring task, first occurrence')).toBeTruthy();
    expect(screen.getByText('Recurring task, second occurrence')).toBeTruthy();
    expect(errorCalls.flat().join(' ')).not.toContain('Encountered two children with the same key');
  });

  it('includes an event that is currently in progress', () => {
    const activeEvent = makeEvent(1);
    activeEvent.startAt = new Date(Date.now() - 10 * 60_000);
    activeEvent.endAt = new Date(Date.now() + 20 * 60_000);
    mockReadyState([activeEvent]);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    expect(screen.getByText('Plan block 1')).toBeTruthy();
  });

  it('routes dashboard surfaces and rows to the existing typed destinations', () => {
    const stackNavigate = jest.fn();
    render(
      <PlanScreen
        navigation={
          { navigate: stackNavigate, getParent: () => ({ navigate: mockRootNavigate }) } as never
        }
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open event Plan block 1' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open goal Ship the next release' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open Notes' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open Tasks' }));
    fireEvent.press(screen.getByTestId('tasks-see-all'));
    fireEvent.press(screen.getByRole('link', { name: 'View full day' }));
    fireEvent.press(screen.getAllByRole('link', { name: 'See all' })[0]);
    fireEvent.press(screen.getByRole('button', { name: 'Open profile' }));

    expect(stackNavigate).toHaveBeenCalledWith('GoalDetail', { goalId: 'goal-1' });
    expect(mockRootNavigate).toHaveBeenCalledWith('Notes', {
      screen: 'NotesHome',
    });
    expect(stackNavigate).toHaveBeenCalledWith('Tasks');
    expect(mockRootNavigate).toHaveBeenCalledWith('Calendar', {
      screen: 'CalendarHome',
      params: expect.objectContaining({ dateIso: expect.any(String) }),
    });
    expect(stackNavigate).toHaveBeenCalledWith('Goals');
    expect(mockRootNavigate).toHaveBeenCalledWith('Profile');
  });

  it('shows a witty daily phrase when there are no events or active goals', () => {
    mockUseCalendarEvents.mockReturnValue({
      events: [],
      uiState: 'ready',
      refresh: jest.fn(async () => undefined),
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockUseGoals.mockReturnValue({
      goals: [],
      uiState: 'ready',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    expect(screen.getByText('Room to roam, think, or make')).toBeTruthy();
    expect(screen.getByText('Your future self would love a goal here')).toBeTruthy();
    expect(screen.queryByText('Nothing scheduled today')).toBeNull();
    expect(screen.queryByText('No active goals')).toBeNull();
  });

  it('shows the active focus session and opens Focus Mode', () => {
    mockUseFocusSession.mockReturnValue({
      eventId: 'event-1',
      title: 'Plan block 1',
      endAt: new Date(Date.now() + 15 * 60_000),
    });
    const stackNavigate = jest.fn();

    render(
      <PlanScreen
        navigation={
          { navigate: stackNavigate, getParent: () => ({ navigate: mockRootNavigate }) } as never
        }
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open Focus Mode' }));
    expect(stackNavigate).toHaveBeenCalledWith('FocusMode', { eventId: 'event-1' });
  });

  it('surfaces the task linked to the active focus session', () => {
    const focusedTask = makeTask(1);
    const focusedEvent = makeEvent(1);
    focusedEvent.sourceTaskId = focusedTask.id;
    mockUseCalendarEvents.mockReturnValue({
      events: [focusedEvent],
      uiState: 'ready',
      refresh: jest.fn(async () => undefined),
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockUseFocusSession.mockReturnValue({
      eventId: focusedEvent.id,
      title: focusedEvent.title,
      endAt: focusedEvent.endAt,
    });
    mockUseTasks.mockReturnValue({
      tasks: [focusedTask],
      uiState: 'ready',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);
    const stackNavigate = jest.fn();

    render(<PlanScreen navigation={{ navigate: stackNavigate } as never} />);

    expect(screen.getByText('Task 1')).toBeTruthy();
    expect(screen.getByText('In focus mode')).toBeTruthy();
    fireEvent.press(screen.getByTestId('plan-task-task-1'));
    expect(stackNavigate).toHaveBeenCalledWith('TaskDetail', { taskId: 'task-1' });
    expect(screen.queryByRole('header', { name: 'Task Details' })).toBeNull();
  });

  it('renders task details as a navigation screen whose back action returns to Plan', () => {
    const task = makeTask(1);
    const goBack = jest.fn();
    mockUseTasks.mockReturnValue({
      tasks: [task],
      uiState: 'ready',
      retry: jest.fn(),
      updateTask: jest.fn(async () => undefined),
      completeTask: jest.fn(async () => undefined),
      reactivateTask: jest.fn(async () => undefined),
      convertTaskToEvent: jest.fn(async () => ({
        eventId: 'event-1',
        eventInput: {
          title: task.title,
          description: task.description,
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'UTC',
        },
        created: true,
      })),
      deleteTask: jest.fn(async () => undefined),
    } as unknown as ReturnType<typeof useTasks>);

    render(
      <TaskDetailScreen
        route={{ params: { taskId: task.id } }}
        navigation={{ goBack, navigate: jest.fn() } as never}
      />,
    );

    expect(screen.getByRole('header', { name: 'Task Details' })).toBeTruthy();
    expect(screen.getByLabelText('Back to Plan')).toBeTruthy();
    expect(screen.queryByLabelText('Task Details modal')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('task-detail-screen').props.style).paddingHorizontal,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(screen.getByTestId('task-details-content').props.contentContainerStyle)
        .paddingHorizontal,
    ).toBe(spacing.lg);
    fireEvent.press(screen.getByLabelText('Back to Plan'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('keeps draft task details editable while disabling completion and calendar actions', () => {
    const draftGoal = { ...makeGoal(), status: 'draft' as const };
    const task = { ...makeTask(1), goalId: draftGoal.id, starter: 'Compare races.' };
    const navigate = jest.fn();
    mockUseGoals.mockReturnValue({ ...mockUseGoals(), goals: [draftGoal] });
    mockUseTasks.mockReturnValue({ ...mockUseTasks(), tasks: [task] });
    render(
      <TaskDetailScreen
        route={{ params: { taskId: task.id } }}
        navigation={{ goBack: jest.fn(), navigate } as never}
      />,
    );
    expect(screen.getByRole('header', { name: 'Task Details' })).toBeTruthy();
    expect(screen.getByText('Compare races.')).toBeTruthy();
    expect(screen.queryByLabelText('Schedule task')).toBeNull();
    expect(screen.queryByLabelText('Start task now')).toBeNull();
    expect(screen.queryByLabelText('Mark task complete')).toBeNull();
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit task' }));
    expect(navigate).toHaveBeenCalledWith('EditTask', { taskId: task.id });
  });

  it('saves task edits through the EditTask route and returns to task details', async () => {
    const task = makeTask(3);
    const updateTask = jest.fn(async () => undefined);
    const goBack = jest.fn();
    mockUseGoals.mockReturnValue({ ...mockUseGoals(), goals: [] });
    mockUseTasks.mockReturnValue({ ...mockUseTasks(), tasks: [task], updateTask });

    render(
      <EditTaskScreen route={{ params: { taskId: task.id } }} navigation={{ goBack } as never} />,
    );

    expect(
      StyleSheet.flatten(screen.getByTestId('edit-task-screen').props.style).backgroundColor,
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle)
        .paddingHorizontal,
    ).toBe(spacing.lg);
    fireEvent.changeText(screen.getByLabelText('Edit task title'), 'Run the shorter route');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save task changes'));
    });

    expect(updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ title: 'Run the shorter route' }),
    );
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('excludes draft-linked tasks from the Plan task surface', () => {
    const draftGoal = { ...makeGoal(), id: 'draft-goal', status: 'draft' as const };
    mockUseGoals.mockReturnValue({
      goals: [draftGoal],
      uiState: 'ready',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);
    const draftTask = { ...makeTask(1), goalId: 'draft-goal' };
    const activeTask = makeTask(2);
    mockUseTasks.mockReturnValue({
      tasks: [draftTask, activeTask],
      uiState: 'ready',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    expect(screen.queryByText('Task 1')).toBeNull();
    expect(screen.getByText('Task 2')).toBeTruthy();
  });

  it('renders recovery states for each live Plan source', () => {
    mockUseCalendarEvents.mockReturnValue({
      events: [],
      uiState: 'error',
      refresh: jest.fn(async () => undefined),
    } as unknown as ReturnType<typeof useCalendarEvents>);
    mockUseGoals.mockReturnValue({
      goals: [],
      uiState: 'loading',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);
    mockUseNotes.mockReturnValue({
      notes: [],
      uiState: 'empty',
      retry: jest.fn(),
    } as unknown as ReturnType<typeof useNotes>);

    render(<PlanScreen navigation={{ navigate: jest.fn() } as never} />);

    expect(screen.getByText('Unable to load upcoming events.')).toBeTruthy();
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });
});
