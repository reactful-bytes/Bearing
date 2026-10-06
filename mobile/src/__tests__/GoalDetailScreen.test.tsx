import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { AppIcon } from '../components/ui/AppIcon';
import { useGoals } from '../features/goals/useGoals';
import { composeGoalWithMilestones } from '../features/goals/goalHelpers';
import { useTasks } from '../features/tasks/useTasks';
import { useMilestoneEvents } from '../features/goals/useMilestoneEvents';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useUserProfile } from '../features/profile/useUserProfile';
import {
  GoalMilestoneWithTasks,
  GoalWithMilestones,
  UpdateGoalInput,
} from '../features/goals/goalTypes';
import { CompleteTaskInput, CreateTaskInput, TaskRecord } from '../features/tasks/taskTypes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: mockGoBack, navigate: mockNavigate })),
}));

jest.mock('../features/goals/useGoals', () => ({ useGoals: jest.fn() }));
jest.mock('../features/tasks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../features/goals/useMilestoneEvents', () => ({ useMilestoneEvents: jest.fn() }));
jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: jest.fn(),
}));
jest.mock('../features/profile/useUserProfile', () => ({ useUserProfile: jest.fn() }));
jest.mock('../services/firebase/firebaseEvents', () => ({
  subscribeToEventsByMilestoneId: jest.fn(() => jest.fn()),
}));

const milestone: GoalMilestoneWithTasks = {
  id: 'milestone-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Choose a race date',
  description: 'Pick a local event.',
  estimatedFinishDate: new Date(2026, 8, 10),
  order: 0,
  status: 'pending' as const,
  manuallyCompletedAt: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  tasks: [],
  completedTaskCount: 0,
  totalTaskCount: 0,
  progressPercent: 0,
  progressText: '0 of 0 tasks',
};

const goal: GoalWithMilestones = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Run a 10k',
  description: 'Build an eight-week training block.',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 9, 1),
  nextMilestoneId: milestone.id,
  manuallyCompletedAt: null,
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
  milestones: [milestone],
  tasks: [],
  nextMilestone: milestone,
  nextTask: null,
  completedTaskCount: 0,
  totalTaskCount: 1,
  completedMilestoneCount: 0,
  totalMilestoneCount: 1,
  progressText: '0 of 1 milestones complete',
};

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Book the race',
  description: 'Choose and register for the event.',
  starter: '',
  goalId: 'goal-1',
  milestoneId: 'milestone-1',
  dueDate: new Date(2026, 8, 8),
  scheduledStart: null,
  scheduledEnd: null,
  allDay: true,
  status: 'active',
  completionSource: null,
  completedAt: null,
  completedEventId: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
};

function mockHooks(
  overrides: {
    createTask?: (input: CreateTaskInput) => Promise<void>;
    completeTask?: (taskId: string, input: CompleteTaskInput) => Promise<void>;
    reactivateTask?: (taskId: string) => Promise<void>;
    goal?: GoalWithMilestones;
    activateGoalDraft?: (goalId: string) => Promise<void>;
    updateGoal?: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
    deleteGoal?: (goalId: string) => Promise<void>;
    setGoalManuallyCompleted?: (goalId: string, completed: boolean) => Promise<void>;
    tasks?: TaskRecord[];
  } = {},
): void {
  (useUserProfile as jest.MockedFunction<typeof useUserProfile>).mockReturnValue({
    profile: { locale: 'en-US', timeFormat: '12-hour' },
  } as never);
  (useCalendarPublication as jest.MockedFunction<typeof useCalendarPublication>).mockReturnValue({
    publicationCalendarTitle: null,
    createEvent: jest.fn(async () => 'event-1'),
    publishEvent: jest.fn(async () => undefined),
  });
  (useMilestoneEvents as jest.MockedFunction<typeof useMilestoneEvents>).mockReturnValue({
    events: [],
    uiState: 'idle',
  });
  (useGoals as jest.MockedFunction<typeof useGoals>).mockReturnValue({
    goals: [overrides.goal ?? goal],
    uiState: 'ready',
    createGoal: jest.fn(async () => undefined),
    updateGoal: overrides.updateGoal ?? jest.fn(async () => undefined),
    deleteGoal: overrides.deleteGoal ?? jest.fn(async () => undefined),
    setGoalManuallyCompleted: overrides.setGoalManuallyCompleted ?? jest.fn(async () => undefined),
    setMilestoneManuallyCompleted: jest.fn(async () => undefined),
    createMilestone: jest.fn(async () => undefined),
    deleteMilestone: jest.fn(async () => undefined),
    updateMilestone: jest.fn(async () => undefined),
    reorderMilestones: jest.fn(async () => undefined),
    activateGoalDraft: overrides.activateGoalDraft ?? jest.fn(async () => undefined),
    retry: jest.fn(),
  });
  (useTasks as jest.MockedFunction<typeof useTasks>).mockReturnValue({
    tasks: overrides.tasks ?? [task],
    uiState: 'ready',
    createTask:
      overrides.createTask ?? jest.fn(async (_input: CreateTaskInput): Promise<void> => undefined),
    updateTask: jest.fn(async () => undefined),
    completeTask:
      overrides.completeTask ??
      jest.fn(async (_taskId: string, _input: CompleteTaskInput): Promise<void> => undefined),
    reactivateTask: overrides.reactivateTask ?? jest.fn(async () => undefined),
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
    retry: jest.fn(),
  });
}

describe('GoalDetailScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    mockHooks();
  });

  it('renders linked tasks and keeps task completion independent from row navigation', async () => {
    const completeTask = jest.fn(async () => undefined);
    mockHooks({ completeTask });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.getAllByText('Book the race')).toHaveLength(2);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.press(screen.getAllByLabelText('Task actions')[0]);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Open task Book the race' })[0]);

    await waitFor(() => {
      expect(completeTask).toHaveBeenCalledWith('task-1', { completionSource: 'manual' });
    });
    expect(screen.getByText('Task Details')).toBeTruthy();
  });

  it('keeps the detail header below the top safe area', () => {
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 24,
      right: 0,
      bottom: 0,
      left: 0,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(
      StyleSheet.flatten(screen.getByTestId('goal-detail-scroll').props.contentContainerStyle),
    ).toEqual(expect.objectContaining({ paddingTop: 32 }));
  });

  it('creates a task with the goal and milestone context', async () => {
    const createTask = jest.fn(async () => undefined);
    mockHooks({ createTask });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.changeText(screen.getByLabelText('Task title'), 'Register for the race');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    });

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({
        title: 'Register for the race',
        description: '',
        starter: '',
        goalId: 'goal-1',
        milestoneId: 'milestone-1',
      });
    });
  });

  it('opens Overview and shows the milestone timeline and linked task counts', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    expect(screen.getByRole('tab', { name: 'Overview', selected: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Milestones' })).toBeTruthy();
    expect(screen.getByText('Current · 0 of 0 tasks')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open milestone Choose a race date' })).toBeTruthy();
  });

  it('places the disclosure arrow left of the milestone title with no completion circle', () => {
    const completedTask: TaskRecord = { ...task, status: 'completed', completedAt: new Date() };
    mockHooks({
      goal: composeGoalWithMilestones(goal, [milestone], [completedTask]),
      tasks: [completedTask],
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    const header = screen.getByTestId(`milestone-header-${milestone.id}`);
    expect(StyleSheet.flatten(header.props.style).flexDirection).toBe('row');
    expect(
      within(header)
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['Expand milestone Choose a race date', 'Open milestone Choose a race date']);
    expect(
      within(screen.getByTestId('goal-detail-milestone-list'))
        .UNSAFE_getAllByType(AppIcon)
        .map((icon) => icon.props.name),
    ).toEqual(['forward']);
    fireEvent.press(
      within(header).getByRole('button', { name: 'Expand milestone Choose a race date' }),
    );
    expect(within(header).UNSAFE_getByType(AppIcon).props.name).toBe('expand');
    fireEvent.press(
      within(header).getByRole('button', { name: 'Open milestone Choose a race date' }),
    );
    expect(screen.getByText('Milestone Details')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manually complete milestone' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reopen milestone' })).toBeNull();
  });

  it('shows automatic milestone completion and reopening as task snapshots change', async () => {
    const completeTask = jest.fn(async () => undefined);
    const reactivateTask = jest.fn(async () => undefined);
    const legacyMilestone = { ...milestone, manuallyCompletedAt: new Date(2026, 6, 20) };
    const setSnapshot = (tasks: TaskRecord[]) =>
      mockHooks({
        goal: composeGoalWithMilestones(goal, [legacyMilestone], tasks),
        tasks,
        completeTask,
        reactivateTask,
      });
    setSnapshot([task]);
    const { rerender } = render(
      <GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />,
    );
    expect(screen.getByText('Current · 0 of 1 tasks')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Choose a race date' }));
    fireEvent.press(screen.getByLabelText('Task actions'));
    await act(async () => fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' })));
    expect(completeTask).toHaveBeenCalledWith(task.id, { completionSource: 'manual' });

    const completedTask: TaskRecord = { ...task, status: 'completed', completedAt: new Date() };
    setSnapshot([completedTask]);
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    expect(screen.getByText('Completed · 1 of 1 tasks')).toBeTruthy();
    expect(screen.getByText('100% complete')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Task actions'));
    await act(async () =>
      fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' })),
    );
    expect(reactivateTask).toHaveBeenCalledWith(task.id);

    setSnapshot([task]);
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    expect(screen.getByText('Current · 0 of 1 tasks')).toBeTruthy();
    expect(screen.getByText('0% complete')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Collapse milestone Choose a race date', expanded: true }),
    ).toBeTruthy();

    setSnapshot([completedTask, { ...task, id: 'new-task', title: 'New active task' }]);
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    expect(screen.getByText('Current · 1 of 2 tasks')).toBeTruthy();
    expect(screen.getByText('New active task')).toBeTruthy();
    setSnapshot([]);
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    expect(screen.getByText('Current · 0 of 0 tasks')).toBeTruthy();
    expect(screen.getByText('No tasks in this milestone.')).toBeTruthy();
    expect(screen.getByText('0% complete')).toBeTruthy();
  });

  it('shows the goal description and finish date above a bounded milestone list', () => {
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 24,
      right: 0,
      bottom: 16,
      left: 0,
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    const summary = within(screen.getByTestId('goal-overview-summary'));
    expect(summary.getByText(goal.description)).toBeTruthy();
    expect(summary.getByText('Finish date: Oct 1, 2026')).toBeTruthy();
    const list = screen.getByTestId('goal-detail-milestone-list');
    expect(list.props.nestedScrollEnabled).toBe(true);
    expect(StyleSheet.flatten(list.props.style)).toEqual({
      maxHeight: (Dimensions.get('window').height - 40) * 0.45,
    });
    expect(within(list).queryByText(goal.description)).toBeNull();
  });

  it('expands due-ordered milestone tasks with a down arrow and opens task details', () => {
    const earlierTask = {
      ...task,
      id: 'earlier',
      title: 'Pick the race',
      dueDate: new Date(2026, 8, 1),
    };
    mockHooks({
      tasks: [
        task,
        { ...task, id: 'unlinked', title: 'Not in this milestone', milestoneId: null },
        earlierTask,
        { ...task, id: 'other-goal', title: 'Other goal task', goalId: 'goal-2' },
      ],
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    const expand = screen.getByRole('button', {
      name: 'Expand milestone Choose a race date',
      expanded: false,
    });
    expect(within(expand).UNSAFE_getByType(AppIcon).props.name).toBe('forward');
    expect(screen.queryByText(task.title)).toBeNull();
    fireEvent.press(expand);

    const collapse = screen.getByRole('button', {
      name: 'Collapse milestone Choose a race date',
      expanded: true,
    });
    expect(within(collapse).UNSAFE_getByType(AppIcon).props.name).toBe('expand');
    expect(screen.queryByText('Milestone Details')).toBeNull();
    const list = within(screen.getByTestId('goal-detail-milestone-list'));
    expect(
      list
        .getAllByRole('button', { name: /^Open task / })
        .map((row) => row.props.accessibilityLabel),
    ).toEqual(['Open task Pick the race', 'Open task Book the race']);
    expect(screen.queryByText('Not in this milestone')).toBeNull();
    expect(screen.queryByText('Other goal task')).toBeNull();
    fireEvent.press(list.getByRole('button', { name: 'Open task Book the race' }));
    expect(screen.getByText('Task Details')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close Task Details' }));
    fireEvent.press(collapse);
    expect(screen.queryByText(task.title)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Expand milestone Choose a race date', expanded: false }),
    ).toBeTruthy();
  });

  it('allows multiple expanded milestones and explicitly labels empty milestones', () => {
    const secondMilestone = { ...milestone, id: 'milestone-2', title: 'Train for race', order: 1 };
    mockHooks({ goal: { ...goal, milestones: [milestone, secondMilestone] } });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Choose a race date' }));
    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Train for race' }));
    expect(screen.getByText(task.title)).toBeTruthy();
    expect(screen.getByText('No tasks in this milestone.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Collapse milestone Choose a race date', expanded: true }),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Collapse milestone Train for race' }));
    expect(screen.queryByText('No tasks in this milestone.')).toBeNull();
    expect(screen.getByText(task.title)).toBeTruthy();
  });

  it('updates expanded tasks live and keeps completion separate from task navigation', async () => {
    const completeTask = jest.fn(async () => undefined);
    mockHooks({ completeTask });
    const { rerender } = render(
      <GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Choose a race date' }));
    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' }));
    await waitFor(() =>
      expect(completeTask).toHaveBeenCalledWith(task.id, { completionSource: 'manual' }),
    );
    expect(screen.queryByText('Task Details')).toBeNull();

    mockHooks({ tasks: [{ ...task, id: 'new-task', title: 'New milestone task' }] });
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    expect(screen.getByText('New milestone task')).toBeTruthy();
    expect(screen.queryByText(task.title)).toBeNull();
  });

  it('shows missing description and milestone states and keeps Add milestone available', () => {
    mockHooks({ goal: { ...goal, description: '', milestones: [] } });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    expect(screen.getByText('No description yet.')).toBeTruthy();
    expect(
      screen.getByText('No milestones yet. Add one to break this goal into smaller steps.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add milestone' })).toBeTruthy();
  });

  it('uses vertical header dots and opens goal editing directly from the menu', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const edit = screen.getByRole('button', { name: 'Goal actions' });
    expect(within(edit).UNSAFE_getByType(AppIcon).props.name).toBe('moreVertical');
    fireEvent.press(edit);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal' }));
    expect(screen.getByRole('header', { name: 'Edit Goal' })).toBeTruthy();
    expect(screen.getByLabelText('Edit goal description').props.value).toBe(goal.description);
    expect(screen.getByLabelText('Edit goal name').props.value).toBe(goal.title);
    expect(screen.queryByRole('header', { name: 'Goal Details' })).toBeNull();
  });

  it('keeps completion disabled for draft milestone tasks', () => {
    mockHooks({ goal: { ...goal, status: 'draft' } });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Choose a race date' }));
    expect(screen.getByRole('button', { name: 'Open task Book the race' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Uncomplete task' })).toBeNull();
  });

  it('uncompletes a task from the goal list and retains its due date while completed', async () => {
    const reactivateTask = jest.fn(async () => undefined);
    const completedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: new Date(2026, 8, 10),
    };
    mockHooks({ tasks: [completedTask], reactivateTask });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const list = within(screen.getByTestId('goal-detail-task-list'));
    expect(list.getByText('Due Sep 8')).toBeTruthy();
    expect(StyleSheet.flatten(list.getByText('Due Sep 8').props.style)).toEqual(
      expect.objectContaining({ textDecorationLine: 'line-through' }),
    );
    fireEvent.press(list.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));
    await waitFor(() => expect(reactivateTask).toHaveBeenCalledWith(task.id));
  });

  it('surfaces failed Uncomplete actions and leaves the saved completed state visible', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    try {
      mockHooks({
        tasks: [{ ...task, status: 'completed' }],
        reactivateTask: jest.fn(async () => {
          throw new Error('offline');
        }),
      });
      render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
      fireEvent.press(screen.getByLabelText('Task actions'));
      fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));
      await waitFor(() =>
        expect(alert).toHaveBeenCalledWith('Unable to reactivate task', 'Please try again.'),
      );
      expect(StyleSheet.flatten(screen.getByText(task.title).props.style)).toEqual(
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      );
    } finally {
      alert.mockRestore();
    }
  });

  it('offers Complete and Uncomplete in task detail menus according to saved status', async () => {
    const completeTask = jest.fn(async () => undefined);
    mockHooks({ completeTask });
    const { rerender } = render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getAllByRole('button', { name: 'Open task Book the race' })[0]);
    const menus = screen.getAllByLabelText('Task actions');
    fireEvent.press(menus[menus.length - 1]);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' }));
    await waitFor(() =>
      expect(completeTask).toHaveBeenCalledWith(task.id, { completionSource: 'manual' }),
    );

    const reactivateTask = jest.fn(async () => undefined);
    mockHooks({ tasks: [{ ...task, status: 'completed' }], reactivateTask });
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByRole('button', { name: 'Open task Book the race' }));
    const completedMenus = screen.getAllByLabelText('Task actions');
    fireEvent.press(completedMenus[completedMenus.length - 1]);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));
    await waitFor(() => expect(reactivateTask).toHaveBeenCalledWith(task.id));
  });

  it('preserves legacy timeline links and switches between Tasks and Overview', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'timeline' } }} />);

    expect(screen.getByRole('tab', { name: 'Overview', selected: true })).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Tasks' }));
    expect(screen.getByText('Next Up')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.queryByText('Next Up')).toBeNull();
  });

  it('sorts all tasks by due date regardless of status, with undated tasks last', () => {
    const earlierTask = {
      ...task,
      id: 'earlier',
      title: 'Earlier completed task',
      dueDate: new Date(2026, 8, 1),
      status: 'completed' as const,
      completedAt: new Date(2026, 8, 2),
    };
    const undatedTask = { ...task, id: 'undated', title: 'Undated task', dueDate: null };
    const tiedTask = {
      ...task,
      id: 'tied',
      title: 'Later created task',
      createdAt: new Date(2026, 6, 21),
    };
    mockHooks({
      tasks: [
        undatedTask,
        tiedTask,
        task,
        earlierTask,
        { ...task, id: 'unlinked', title: 'Unlinked task', goalId: null },
      ],
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const rows = within(screen.getByTestId('goal-detail-task-list')).getAllByRole('button', {
      name: /^Open task /,
    });
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
      'Open task Earlier completed task',
      'Open task Book the race',
      'Open task Later created task',
      'Open task Undated task',
    ]);
    expect(screen.queryByText('Unlinked task')).toBeNull();
    expect(screen.getAllByText('Book the race')).toHaveLength(2);
  });

  it('replaces Next Up when an earlier-due task arrives and advances when it is completed', () => {
    const earlierTask = {
      ...task,
      id: 'earlier',
      title: 'New earlier task',
      dueDate: new Date(2026, 8, 1),
      createdAt: new Date(2026, 6, 21),
      updatedAt: new Date(2026, 6, 21),
    };
    const { rerender } = render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    expect(screen.getAllByText('Book the race')).toHaveLength(2);

    mockHooks({ tasks: [task, earlierTask] });
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    expect(screen.getAllByText('New earlier task')).toHaveLength(2);
    expect(screen.getAllByText('Book the race')).toHaveLength(1);

    mockHooks({ tasks: [task, { ...earlierTask, status: 'completed' }] });
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    expect(screen.getAllByText('Book the race')).toHaveLength(2);
    expect(screen.getAllByText('New earlier task')).toHaveLength(1);
  });

  it('bounds the independently scrollable task list to the available screen height', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const list = screen.getByTestId('goal-detail-task-list');
    expect(list.props.nestedScrollEnabled).toBe(true);
    expect(StyleSheet.flatten(list.props.style)).toEqual({
      maxHeight: Dimensions.get('window').height * 0.45,
    });
    expect(screen.getByTestId('goal-detail-scroll').props.nestedScrollEnabled).toBe(true);
  });

  it('keeps draft tasks editable but disables completion and scheduling until activation', async () => {
    const activateGoalDraft = jest.fn(async () => undefined);
    mockHooks({
      goal: { ...goal, status: 'draft' },
      activateGoalDraft,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(screen.getByRole('button', { name: 'Make goal active' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.press(screen.getAllByRole('button', { name: 'Open task Book the race' })[0]);
    expect(screen.getByText('Task Details')).toBeTruthy();
    const taskHeroStyle = StyleSheet.flatten(screen.getByTestId('task-details-hero').props.style);
    expect(taskHeroStyle).not.toHaveProperty('borderLeftWidth');
    expect(taskHeroStyle).not.toHaveProperty('borderRadius');
    expect(taskHeroStyle).not.toHaveProperty('backgroundColor');
    expect(screen.queryByRole('button', { name: 'Schedule task' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start task now' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark task complete' })).toBeNull();

    const taskMenus = screen.getAllByLabelText('Task actions');
    fireEvent.press(taskMenus[taskMenus.length - 1]);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit task' }));
    expect(screen.getByRole('header', { name: 'Edit Task' })).toBeTruthy();
    expect(
      screen.getByLabelText('Task goal or milestone: Milestone · Choose a race date'),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back to task details'));

    fireEvent.press(screen.getByRole('button', { name: 'Close Task Details' }));
    fireEvent.press(screen.getByRole('tab', { name: 'Overview' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open milestone Choose a race date' }));
    expect(screen.queryByRole('button', { name: 'Schedule milestone event' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manually complete milestone' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Make goal active' }));
    await waitFor(() => expect(activateGoalDraft).toHaveBeenCalledWith('goal-1'));
  });

  it('labels draft goal edits Save Draft and preserves the draft while saving', async () => {
    const updateGoal = jest.fn(async () => undefined);
    mockHooks({
      goal: {
        ...goal,
        status: 'draft',
        estimatedCompletionDate: new Date(new Date().getFullYear() + 1, 9, 1),
      },
      updateGoal,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    fireEvent.press(screen.getByRole('button', { name: 'Goal actions' }));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal' }));
    expect(screen.getByRole('button', { name: 'Save draft changes' })).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Edit goal name'), 'Run a local 10k');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save draft changes' }));
    });

    expect(updateGoal).toHaveBeenCalledWith(
      'goal-1',
      expect.objectContaining({ title: 'Run a local 10k' }),
    );
  });

  it('offers Edit, Complete, and Delete for active goals and switches to Uncomplete after completion', async () => {
    const setGoalManuallyCompleted = jest.fn(async () => undefined);
    mockHooks({ setGoalManuallyCompleted });
    const { rerender } = render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByLabelText('Goal actions'));
    expect(screen.getByRole('menuitem', { name: 'Edit goal' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete goal' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Uncomplete goal' })).toBeNull();
    await act(async () => fireEvent.press(screen.getByRole('menuitem', { name: 'Complete goal' })));
    expect(setGoalManuallyCompleted).toHaveBeenCalledWith(goal.id, true);

    mockHooks({
      goal: { ...goal, status: 'completed', manuallyCompletedAt: new Date() },
      setGoalManuallyCompleted,
    });
    rerender(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    expect(screen.getByText('100% complete')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Goal actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete goal' })).toBeNull();
    await act(async () =>
      fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete goal' })),
    );
    expect(setGoalManuallyCompleted).toHaveBeenCalledWith(goal.id, false);
  });

  it.each(['draft', 'archived'] as const)(
    'preserves completion restrictions for %s goals',
    (status) => {
      mockHooks({ goal: { ...goal, status } });
      render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
      fireEvent.press(screen.getByLabelText('Goal actions'));
      expect(screen.getByRole('menuitem', { name: 'Edit goal' })).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: 'Delete goal' })).toBeTruthy();
      expect(screen.queryByRole('menuitem', { name: 'Complete goal' })).toBeNull();
      expect(screen.queryByRole('menuitem', { name: 'Uncomplete goal' })).toBeNull();
    },
  );

  it('saves directly edited goal fields and closes the form, and discards cancelled edits', async () => {
    const updateGoal = jest.fn(async () => undefined);
    mockHooks({
      goal: { ...goal, estimatedCompletionDate: new Date(new Date().getFullYear() + 1, 9, 1) },
      updateGoal,
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal' }));
    fireEvent.changeText(screen.getByLabelText('Edit goal name'), 'Cancelled edit');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel goal editing' }));
    expect(screen.queryByRole('header', { name: 'Edit Goal' })).toBeNull();
    expect(updateGoal).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal' }));
    expect(screen.getByLabelText('Edit goal name').props.value).toBe(goal.title);
    fireEvent.changeText(screen.getByLabelText('Edit goal name'), 'Run a local race');
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Save goal changes' })),
    );
    expect(updateGoal).toHaveBeenCalledWith(
      goal.id,
      expect.objectContaining({ title: 'Run a local race' }),
    );
    expect(screen.queryByRole('header', { name: 'Edit Goal' })).toBeNull();
  });

  it('requires confirmation for Delete and returns to goals only after success', async () => {
    const deleteGoal = jest.fn(async () => undefined);
    mockHooks({ deleteGoal });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete goal' }));
    expect(screen.getByLabelText('Delete goal? confirmation dialog')).toBeTruthy();
    expect(screen.getByText(/Tasks, calendar events, and notes will be kept/)).toBeTruthy();
    expect(deleteGoal).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteGoal).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete goal' }));
    await act(async () => fireEvent.press(screen.getByLabelText('Confirm delete goal')));
    expect(deleteGoal).toHaveBeenCalledWith(goal.id);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('keeps entered goal fields visible when saving the direct-edit form fails', async () => {
    mockHooks({
      goal: { ...goal, estimatedCompletionDate: new Date(new Date().getFullYear() + 1, 9, 1) },
      updateGoal: jest.fn(async () => {
        throw new Error('offline');
      }),
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit goal' }));
    fireEvent.changeText(screen.getByLabelText('Edit goal name'), 'Retry this edit');
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Save goal changes' })),
    );
    expect(screen.getByText('Failed to save goal changes.')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Edit Goal' })).toBeTruthy();
    expect(screen.getByLabelText('Edit goal name').props.value).toBe('Retry this edit');
  });

  it('prevents duplicate goal deletion and cancellation while the delete is pending', async () => {
    let finishDelete!: () => void;
    const deleteGoal = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        }),
    );
    mockHooks({ deleteGoal });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
    fireEvent.press(screen.getByLabelText('Goal actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete goal' }));
    fireEvent.press(screen.getByLabelText('Confirm delete goal'));
    expect(screen.getByRole('button', { name: 'Cancel', disabled: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Goal actions', disabled: true })).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Confirm delete goal'));
    expect(deleteGoal).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    await act(async () => finishDelete());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the delete confirmation available for retry after failure', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    try {
      mockHooks({
        deleteGoal: jest.fn(async () => {
          throw new Error('offline');
        }),
      });
      render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
      fireEvent.press(screen.getByLabelText('Goal actions'));
      fireEvent.press(screen.getByRole('menuitem', { name: 'Delete goal' }));
      await act(async () => fireEvent.press(screen.getByLabelText('Confirm delete goal')));
      expect(alert).toHaveBeenCalledWith('Unable to delete goal', 'Please try again.');
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Delete goal? confirmation dialog')).toBeTruthy();
    } finally {
      alert.mockRestore();
    }
  });

  it('shows an actionable explanation when milestone completion prevents Uncomplete', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const message = 'Uncomplete a task or add a new milestone before uncompleting this goal.';
    try {
      mockHooks({
        goal: { ...goal, status: 'completed' },
        setGoalManuallyCompleted: jest.fn(async () => {
          throw new Error(message);
        }),
      });
      render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);
      fireEvent.press(screen.getByLabelText('Goal actions'));
      await act(async () =>
        fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete goal' })),
      );
      expect(alert).toHaveBeenCalledWith('Unable to update goal', message);
      expect(screen.getByText('100% complete')).toBeTruthy();
    } finally {
      alert.mockRestore();
    }
  });
});
