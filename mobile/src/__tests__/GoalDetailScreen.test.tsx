import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { AppIcon } from '../components/ui/AppIcon';
import { useGoals } from '../features/goals/useGoals';
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
    goal?: GoalWithMilestones;
    activateGoalDraft?: (goalId: string) => Promise<void>;
    updateGoal?: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
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
    setGoalManuallyCompleted: jest.fn(async () => undefined),
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
    retry: jest.fn(),
  });
}

describe('GoalDetailScreen', () => {
  beforeEach(() => {
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
    fireEvent.press(screen.getAllByRole('checkbox', { name: 'Mark Book the race complete' })[0]);
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
    fireEvent.press(screen.getByRole('checkbox', { name: 'Mark Book the race complete' }));
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

  it('uses vertical header dots and preserves goal editing', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const edit = screen.getByRole('button', { name: 'Edit goal' });
    expect(within(edit).UNSAFE_getByType(AppIcon).props.name).toBe('moreVertical');
    fireEvent.press(edit);
    expect(screen.getByText(goal.description)).toBeTruthy();
  });

  it('keeps completion disabled for draft milestone tasks', () => {
    mockHooks({ goal: { ...goal, status: 'draft' } });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(screen.getByRole('button', { name: 'Expand milestone Choose a race date' }));
    expect(screen.getByRole('button', { name: 'Open task Book the race' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
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

    fireEvent.press(screen.getAllByLabelText('Task actions')[1]);
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
    mockHooks({ goal: { ...goal, status: 'draft' }, updateGoal });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    fireEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Edit goal' })[1]);
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
});
