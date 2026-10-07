import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { AppIcon } from '../components/ui/AppIcon';
import { AppModal } from '../components/ui/AppModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ThemeProvider } from '../design/ThemeProvider';
import { darkTheme, lightTheme, spacing, typography } from '../design/tokens';
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
  UpdateGoalMilestoneInput,
} from '../features/goals/goalTypes';
import { CompleteTaskInput, CreateTaskInput, TaskRecord } from '../features/tasks/taskTypes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: mockGoBack, navigate: mockNavigate })),
  useIsFocused: jest.fn(() => true),
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
    updateMilestone?: (milestoneId: string, fields: UpdateGoalMilestoneInput) => Promise<void>;
    createMilestone?: (
      goalId: string,
      input: { title: string; description: string },
    ) => Promise<void>;
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
    createMilestone: overrides.createMilestone ?? jest.fn(async () => undefined),
    deleteMilestone: jest.fn(async () => undefined),
    updateMilestone: overrides.updateMilestone ?? jest.fn(async () => undefined),
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
  afterEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useIsFocused as jest.MockedFunction<typeof useIsFocused>).mockReturnValue(true);
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

  it('centers a compact task empty state and keeps the All tasks description readable', () => {
    mockHooks({ tasks: [] });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const emptyStates = screen.UNSAFE_getAllByType(EmptyState);
    expect(emptyStates.map((emptyState) => emptyState.props.title)).toEqual([
      'No next task',
      'No tasks yet',
    ]);
    const [nextTaskEmptyState, allTasksEmptyState] = emptyStates;
    expect(nextTaskEmptyState.props).toMatchObject({
      title: 'No next task',
      presentation: 'compact',
    });
    expect(nextTaskEmptyState.props).not.toHaveProperty('icon');
    expect(nextTaskEmptyState.props).not.toHaveProperty('actionLabel');
    expect(nextTaskEmptyState.props).not.toHaveProperty('onPressAction');
    expect(StyleSheet.flatten(nextTaskEmptyState.props.style)).toMatchObject({
      alignItems: 'center',
    });
    expect(allTasksEmptyState.props).toMatchObject({
      title: 'No tasks yet',
      description: 'Tasks linked to this goal will appear here.',
      presentation: 'compact',
    });
    expect(allTasksEmptyState.props).not.toHaveProperty('icon');
    expect(allTasksEmptyState.props).not.toHaveProperty('actionLabel');
    expect(allTasksEmptyState.props).not.toHaveProperty('onPressAction');
    expect(StyleSheet.flatten(allTasksEmptyState.props.style)).toMatchObject({
      alignItems: 'center',
    });
    expect(screen.getAllByRole('button', { name: 'Add task' })).toHaveLength(1);

    const description = StyleSheet.flatten(
      screen.getByText('Tasks linked to this goal will appear here.').props.style,
    );
    expect(description).toMatchObject({
      fontSize: 12,
      lineHeight: 16,
      color: darkTheme.colors.textSecondary,
    });
  });

  it('keeps the detail header below the top safe area', () => {
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 24,
      right: 0,
      bottom: 0,
      left: 0,
    });

    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    expect(StyleSheet.flatten(screen.getByTestId('goal-detail-fixed-header').props.style)).toEqual(
      expect.objectContaining({ paddingTop: 32 }),
    );
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

  it('keeps the + Add Task text action on the right of the Next Up header', () => {
    render(<GoalDetailScreen route={{ params: { goalId: goal.id } }} />);
    const header = screen.getByTestId('goal-next-up-header');
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      flexDirection: 'row',
      justifyContent: 'space-between',
    });
    expect(StyleSheet.flatten(within(header).getByText('Next Up').props.style).flex).toBe(1);
    const addTask = within(header).getByRole('button', { name: 'Add task' });
    expect(within(addTask).getByText('+ Add Task')).toBeTruthy();
    expect(
      header.children.map((child) =>
        typeof child === 'object' ? child.props.accessibilityRole : null,
      ),
    ).toEqual(['header', 'button']);
  });

  it('opens Overview and shows the milestone timeline and linked task counts', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    expect(screen.getByRole('tab', { name: 'Overview', selected: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Milestones' })).toBeTruthy();
    expect(screen.getByText('Current · 0 of 0 tasks')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open milestone Choose a race date' })).toBeTruthy();
  });

  it('opens the selected milestone task route and restores details after returning', () => {
    const milestoneTask = { ...task, starter: 'Compare races.' };
    mockHooks({
      goal: { ...goal, milestones: [{ ...milestone, tasks: [milestoneTask] }] },
      tasks: [milestoneTask],
    });
    const { rerender } = render(
      <GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />,
    );
    fireEvent.press(screen.getByLabelText(`Open milestone ${milestone.title}`));
    expect(screen.queryByText('Start here: Compare races.')).toBeNull();
    fireEvent.press(screen.getByLabelText(`Open task ${task.title}`));
    expect(mockNavigate).toHaveBeenCalledWith('Plan', {
      screen: 'TaskDetail',
      params: { taskId: task.id },
    });
    (useIsFocused as jest.MockedFunction<typeof useIsFocused>).mockReturnValue(false);
    rerender(<GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />);
    expect(screen.queryByLabelText('Milestone Details modal')).toBeNull();
    (useIsFocused as jest.MockedFunction<typeof useIsFocused>).mockReturnValue(true);
    rerender(<GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />);
    expect(screen.getByLabelText('Milestone Details modal')).toBeTruthy();
    expect(screen.getByLabelText(`Open task ${task.title}`)).toBeTruthy();
  });

  it('places the disclosure arrow right of the milestone title with no completion circle', () => {
    const completedTask: TaskRecord = { ...task, status: 'completed', completedAt: new Date() };
    mockHooks({
      goal: composeGoalWithMilestones(goal, [milestone], [completedTask]),
      tasks: [completedTask],
    });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);
    const header = screen.getByTestId(`milestone-header-${milestone.id}`);
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId(`milestone-icon-${milestone.id}`).props.style),
    ).toMatchObject({ width: 34, height: 34 });
    expect(
      within(header)
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual([
      'Open milestone Choose a race date',
      'Expand milestone Choose a race date',
      'Milestone actions for Choose a race date',
    ]);
    expect(
      within(screen.getByTestId('goal-detail-milestone-list'))
        .UNSAFE_getAllByType(AppIcon)
        .map((icon) => icon.props.name),
    ).toEqual(['goalMilestone', 'expand', 'moreVertical']);
    fireEvent.press(
      within(header).getByRole('button', { name: 'Expand milestone Choose a race date' }),
    );
    expect(
      within(header)
        .UNSAFE_getAllByType(AppIcon)
        .map((icon) => icon.props.name),
    ).toEqual(['goalMilestone', 'collapse', 'moreVertical']);
    fireEvent.press(
      within(header).getByRole('button', { name: 'Open milestone Choose a race date' }),
    );
    expect(screen.getByLabelText('Milestone Details modal')).toBeTruthy();
    expect(screen.queryByLabelText('Schedule milestone event')).toBeNull();
    expect(screen.queryByText('Linked Events')).toBeNull();
    expect(screen.queryByText('No events scheduled.')).toBeNull();
    expect(useMilestoneEvents).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Manually complete milestone' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reopen milestone' })).toBeNull();
  });

  it('opens milestone editing from the Overview row context menu', () => {
    mockHooks({ goal: composeGoalWithMilestones(goal, [milestone], []) });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Milestone actions for Choose a race date' }),
    );
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit milestone Choose a race date' }));

    expect(screen.getByRole('header', { name: 'Edit Milestone' })).toBeTruthy();
    expect(screen.getByLabelText('Edit milestone name').props.value).toBe('Choose a race date');
    fireEvent.press(screen.getByRole('button', { name: 'Back to overview' }));
    expect(screen.queryByLabelText('Milestone Details modal')).toBeNull();
    expect(screen.getByTestId('goal-detail-milestone-list')).toBeTruthy();
  });

  it('opens milestone deletion confirmation from the Overview row context menu', () => {
    mockHooks({ goal: composeGoalWithMilestones(goal, [milestone], []) });
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1', initialTab: 'overview' } }} />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Milestone actions for Choose a race date' }),
    );
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete milestone Choose a race date' }));

    expect(screen.getByRole('button', { name: 'Confirm delete milestone' })).toBeTruthy();
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

  it('fills the overview scroll area and preserves the bottom safe-area inset', () => {
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
    const firstSummaryChild = screen.getByTestId('goal-overview-summary').children[0];
    expect(typeof firstSummaryChild === 'object' ? firstSummaryChild.props.testID : null).toBe(
      'goal-finish-date',
    );
    expect(StyleSheet.flatten(summary.getByText(goal.description).props.style)).toMatchObject({
      fontSize: 14,
      color: darkTheme.colors.textPrimary,
    });
    const finishDateStyle = StyleSheet.flatten(screen.getByTestId('goal-finish-date').props.style);
    expect(finishDateStyle).toMatchObject({ color: '#FFFFFF', fontWeight: '700' });
    expect(finishDateStyle.color).not.toBe(
      StyleSheet.flatten(summary.getByRole('header', { name: 'Description' }).props.style).color,
    );
    const list = screen.getByTestId('goal-detail-milestone-list');
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({ flexGrow: 1 });
    expect(list.props).not.toHaveProperty('nestedScrollEnabled');
    const contentScroll = screen.getByTestId('goal-detail-scroll');
    expect(StyleSheet.flatten(contentScroll.props.style)).toMatchObject({ flex: 1 });
    expect(StyleSheet.flatten(contentScroll.props.contentContainerStyle).paddingBottom).toBe(
      darkTheme.spacing.xl + 16,
    );
    expect(within(list).queryByText(goal.description)).toBeNull();
  });

  it('keeps smaller overview copy and the emphasized finish date readable in light mode', async () => {
    await AsyncStorage.setItem('@bearing/theme-preference', 'light');
    render(
      <ThemeProvider>
        <GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(StyleSheet.flatten(screen.getByText(goal.description).props.style)).toMatchObject({
        fontSize: 14,
        color: lightTheme.colors.textPrimary,
      });
    });
    expect(StyleSheet.flatten(screen.getByTestId('goal-finish-date').props.style)).toMatchObject({
      color: lightTheme.colors.textEmphasis,
      fontWeight: '700',
    });
    expect(lightTheme.colors.textEmphasis).not.toBe('#FFFFFF');
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
    expect(within(expand).UNSAFE_getByType(AppIcon).props.name).toBe('expand');
    expect(screen.queryByText(task.title)).toBeNull();
    fireEvent.press(expand);

    const collapse = screen.getByRole('button', {
      name: 'Collapse milestone Choose a race date',
      expanded: true,
    });
    expect(within(collapse).UNSAFE_getByType(AppIcon).props.name).toBe('collapse');
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
    expect(screen.getByText('DUE')).toBeTruthy();
    expect(screen.getByText('September 8, 2026')).toBeTruthy();
    const taskDetails = within(screen.getByTestId('task-details-content'));
    expect(taskDetails.getByText(/^Expected completion date:/)).toBeTruthy();
    expect(StyleSheet.flatten(taskDetails.getByText(milestone.title).props.style).color).toBe(
      darkTheme.colors.textPrimary,
    );
    expect(
      StyleSheet.flatten(taskDetails.getByTestId('task-details-milestone-icon-frame').props.style),
    ).toMatchObject({
      width: 40,
      height: 40,
      backgroundColor: darkTheme.colors.surface,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('task-details-content').props.contentContainerStyle)
        .gap,
    ).toBe(0);
    expect(screen.queryByText('Due September 8, 2026')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('task-details-updated-at').props.style),
    ).toMatchObject(typography.caption);
    const taskMenus = screen.getAllByLabelText('Task actions');
    fireEvent.press(taskMenus[taskMenus.length - 1]);
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit task' }));
    expect(screen.getByRole('header', { name: 'Edit Task' })).toBeTruthy();
    expect(screen.getByLabelText('Back to overview')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back to overview'));
    expect(screen.queryByRole('header', { name: 'Task Details' })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Collapse milestone Choose a race date',
        expanded: true,
      }),
    ).toBeTruthy();
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
    expect(screen.getByText('+ Add Milestone')).toBeTruthy();
  });

  it('creates milestones from the text action above the overview list', async () => {
    jest.setSystemTime(new Date(2026, 9, 6, 12));
    const createMilestone = jest.fn(async () => undefined);
    mockHooks({
      createMilestone,
      goal: { ...goal, estimatedCompletionDate: new Date(2026, 10, 1) },
    });
    render(<GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />);
    const header = screen.getByTestId('goal-milestones-header');
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: darkTheme.spacing.md,
    });
    expect(
      header.children.map((child) =>
        typeof child === 'object' ? child.props.accessibilityRole : null,
      ),
    ).toEqual(['header', 'button']);
    const button = screen.getByRole('button', { name: 'Add milestone' });
    expect(within(button).getByText('+ Add Milestone')).toBeTruthy();
    expect(
      within(screen.getByTestId('goal-detail-milestone-list')).queryByText('+ Add Milestone'),
    ).toBeNull();
    fireEvent.press(button);
    const addMilestoneModal = screen
      .UNSAFE_getAllByType(AppModal)
      .find((modal) => modal.props.title === 'Add Milestone');
    expect(addMilestoneModal?.props).toMatchObject({
      fullScreen: true,
      fullScreenEdgeToEdge: true,
      hideHeader: true,
    });
    expect(screen.getByRole('header', { name: 'Add Milestone' })).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Milestone name'), 'Build endurance');
    fireEvent.press(screen.getByLabelText('Set new milestone target date to today'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone'));
    });
    expect(createMilestone).toHaveBeenCalledWith(goal.id, {
      title: 'Build endurance',
      description: '',
      estimatedFinishDate: new Date(2026, 9, 6),
    });
  });

  it.each([
    { status: 'active' as const, hasTasks: true },
    { status: 'active' as const, hasTasks: false },
    { status: 'draft' as const, hasTasks: false },
  ])(
    'creates a task in the expanded milestone for $status goals (hasTasks=$hasTasks)',
    async ({ status, hasTasks }) => {
      const createTask = jest.fn(async () => undefined);
      const secondMilestone = {
        ...milestone,
        id: 'milestone-2',
        title: 'Build endurance',
        order: 1,
      };
      mockHooks({
        createTask,
        goal: { ...goal, status, milestones: [milestone, secondMilestone] },
        tasks: hasTasks ? [{ ...task, milestoneId: secondMilestone.id }] : [],
      });
      render(<GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />);
      expect(screen.queryByLabelText(`Add task to milestone ${secondMilestone.title}`)).toBeNull();
      fireEvent.press(screen.getByLabelText(`Expand milestone ${secondMilestone.title}`));
      const addTask = screen.getByLabelText(`Add task to milestone ${secondMilestone.title}`);
      expect(within(addTask).getByText('+ Add Task')).toBeTruthy();
      const expandedTasks = screen.getByTestId(`milestone-tasks-${secondMilestone.id}`);
      const taskRows = screen.queryByTestId(`milestone-task-rows-${secondMilestone.id}`);
      if (hasTasks) {
        expect(taskRows).toBeTruthy();
        expect(StyleSheet.flatten(taskRows?.props.style)).toMatchObject({
          marginLeft: darkTheme.spacing.md,
          paddingLeft: darkTheme.spacing.sm,
          borderLeftWidth: 2,
          borderLeftColor: darkTheme.colors.border,
        });
        expect(within(taskRows!).queryByLabelText(addTask.props.accessibilityLabel)).toBeNull();
      } else {
        expect(taskRows).toBeNull();
        expect(StyleSheet.flatten(expandedTasks.props.style)).not.toHaveProperty('borderLeftWidth');
      }
      const lastChild = expandedTasks.children[expandedTasks.children.length - 1];
      expect(typeof lastChild === 'object' ? lastChild.props.accessibilityLabel : null).toBe(
        `Add task to milestone ${secondMilestone.title}`,
      );
      if (!hasTasks) expect(screen.getByText('No tasks in this milestone.')).toBeTruthy();
      fireEvent.press(addTask);
      fireEvent.changeText(screen.getByLabelText('Task title'), 'Run a training session');
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Save task'));
      });
      expect(createTask).toHaveBeenCalledWith({
        title: 'Run a training session',
        description: '',
        starter: '',
        goalId: goal.id,
        milestoneId: secondMilestone.id,
      });
    },
  );

  it('persists milestone date edits through goal details', async () => {
    jest.setSystemTime(new Date(2026, 9, 6, 12));
    const updateMilestone = jest.fn(async () => undefined);
    const datedMilestone = { ...milestone, estimatedFinishDate: new Date(2026, 10, 1) };
    mockHooks({
      updateMilestone,
      goal: {
        ...goal,
        estimatedCompletionDate: new Date(2026, 11, 1),
        milestones: [datedMilestone],
      },
    });
    render(<GoalDetailScreen route={{ params: { goalId: goal.id, initialTab: 'overview' } }} />);
    fireEvent.press(screen.getByLabelText(`Open milestone ${milestone.title}`));
    fireEvent.press(screen.getByLabelText('Milestone actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit milestone' }));
    fireEvent.press(screen.getByRole('button', { name: 'November 15, 2026' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(updateMilestone).toHaveBeenCalledWith(milestone.id, {
      title: milestone.title,
      description: milestone.description,
      estimatedFinishDate: new Date(2026, 10, 15),
    });
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

  it('scrolls all tasks beneath the fixed navigation with consistent header spacing', () => {
    render(<GoalDetailScreen route={{ params: { goalId: 'goal-1' } }} />);

    const list = screen.getByTestId('goal-detail-task-list');
    expect(list.props.accessibilityLabel).toBe('All goal tasks');
    expect(list.props).not.toHaveProperty('nestedScrollEnabled');
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({ gap: darkTheme.spacing.sm });
    expect(
      StyleSheet.flatten(screen.getByRole('header', { name: 'All tasks' }).props.style),
    ).toMatchObject({ marginTop: darkTheme.spacing.sm });
    expect(screen.getByTestId('goal-detail-scroll').props.nestedScrollEnabled).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('goal-detail-scroll').props.style)).toMatchObject({
      flex: 1,
    });
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
