import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkTheme, spacing, typography } from '../design/tokens';
import { MilestoneDetailModal } from '../components/goals/MilestoneDetailModal';
import { AppModal } from '../components/ui/AppModal';
import { AppIcon } from '../components/ui/AppIcon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { TaskListRow } from '../components/tasks/TaskListRow';
import { GoalMilestoneWithTasks } from '../features/goals/goalTypes';
import { TaskRecord } from '../features/tasks/taskTypes';

const milestone: GoalMilestoneWithTasks = {
  id: 'milestone-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Choose a race',
  description: 'Compare local events.',
  estimatedFinishDate: new Date(2026, 10, 1),
  order: 0,
  status: 'pending',
  manuallyCompletedAt: null,
  createdAt: new Date(2026, 9, 6),
  updatedAt: new Date(2026, 9, 6),
  tasks: [],
  completedTaskCount: 0,
  totalTaskCount: 0,
  progressPercent: 0,
  progressText: '0 of 0 tasks',
};

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    userId: milestone.userId,
    title: 'Register for the race',
    description: '',
    starter: '',
    goalId: milestone.goalId,
    milestoneId: milestone.id,
    dueDate: new Date(2026, 9, 10),
    scheduledStart: null,
    scheduledEnd: null,
    allDay: true,
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: milestone.createdAt,
    updatedAt: milestone.updatedAt,
    ...overrides,
  };
}

function renderDetails(overrides: Partial<React.ComponentProps<typeof MilestoneDetailModal>> = {}) {
  const props = {
    goalTitle: 'Run a 10k',
    milestone,
    visible: true,
    linkedEvents: [],
    linkedEventsState: 'empty' as const,
    onClose: jest.fn(),
    onSaveMilestone: jest.fn<
      (id: string, fields: { title: string; description: string }) => Promise<void>
    >(async () => undefined),
    onDeleteMilestone: jest.fn<(value: GoalMilestoneWithTasks) => Promise<void>>(
      async () => undefined,
    ),
    onSchedule: jest.fn(),
    onAddTask: jest.fn(),
    onOpenTask: jest.fn<(task: TaskRecord) => void>(),
    ...overrides,
  };
  return { ...render(<MilestoneDetailModal {...props} />), props };
}

async function openAction(label: 'Edit milestone' | 'Delete milestone'): Promise<void> {
  fireEvent.press(screen.getByRole('button', { name: 'Milestone actions' }));
  fireEvent.press(await screen.findByRole('menuitem', { name: label }));
}

describe('MilestoneDetailModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 12));
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  it('uses the full-screen wrapper with a goal-style title, progress, back arrow and menu', () => {
    const { props } = renderDetails();
    expect(screen.UNSAFE_getByType(AppModal).props).toMatchObject({
      fullScreen: true,
      hideHeader: true,
      fullScreenEdgeToEdge: true,
    });
    expect(screen.getByRole('header', { name: 'MILESTONE DETAILS' })).toBeTruthy();
    expect(screen.getByText('MILESTONE')).toBeTruthy();
    const milestoneTitle = screen.getByRole('header', { name: milestone.title });
    expect(StyleSheet.flatten(milestoneTitle.props.style).color).toBe(darkTheme.colors.text);
    expect(screen.getByText('Expected completion date: Nov 1, 2026')).toBeTruthy();
    const milestoneHeader = screen.getByTestId('milestone-section-header');
    const milestoneCopy = within(milestoneHeader).getByTestId('milestone-section-copy');
    expect(
      StyleSheet.flatten(within(milestoneCopy).getByText('MILESTONE').props.style).color,
    ).toBe(darkTheme.colors.brand);
    expect(within(milestoneCopy).getByTestId('milestone-expected-date')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        within(milestoneHeader).getByTestId('milestone-section-icon-frame').props.style,
      ),
    ).toMatchObject({
      width: 40,
      height: 40,
      backgroundColor: darkTheme.colors.surface,
    });
    expect(screen.getByText('Compare local events.')).toBeTruthy();
    expect(screen.getByText('GOAL')).toBeTruthy();
    expect(screen.getByText('Run a 10k')).toBeTruthy();
    expect(screen.queryByText('DESCRIPTION')).toBeNull();
    expect(screen.getByRole('header', { name: 'PROGRESS' })).toBeTruthy();
    expect(screen.getByText('0% complete · 0 of 0 tasks completed')).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ProgressBar)).toHaveLength(1);
    expect(
      StyleSheet.flatten(screen.getByLabelText(`Add task to milestone ${milestone.title}`).props.style)
        .marginLeft,
    ).toBe('auto');
    expect(screen.getByRole('button', { name: 'Milestone actions' })).toBeTruthy();
    const back = screen.getByRole('button', { name: 'Back to goal details' });
    expect(within(back).UNSAFE_getByType(AppIcon).props.name).toBe('back');
    const detailContentStyle = StyleSheet.flatten(
      screen.getByTestId('milestone-detail-scroll').props.contentContainerStyle,
    );
    expect(detailContentStyle.paddingBottom).toBeGreaterThan(0);
    expect(detailContentStyle.gap).toBe(0);
    expect(detailContentStyle.paddingHorizontal).toBe(spacing.lg);
    expect(screen.getByTestId('milestone-hero')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('milestone-goal-name').props.style).fontWeight,
    ).toBeUndefined();
    fireEvent.press(back);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('opens full-screen editing and uses the same top-left arrow to discard changes', async () => {
    const { props } = renderDetails();
    const detailArrow = within(
      screen.getByRole('button', { name: 'Back to goal details' }),
    ).UNSAFE_getByType(AppIcon).props;
    await openAction('Edit milestone');
    expect(screen.UNSAFE_getByType(AppModal).props.fullScreen).toBe(true);
    expect(screen.getByRole('header', { name: 'Edit Milestone' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Milestone actions' })).toBeNull();
    expect(screen.queryByText('Linked Events')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Unsaved title');
    fireEvent.changeText(
      screen.getByLabelText('Edit milestone description'),
      'Unsaved description',
    );
    const back = screen.getByRole('button', { name: 'Back to milestone details' });
    expect(within(back).UNSAFE_getByType(AppIcon).props).toMatchObject({
      name: detailArrow.name,
      size: detailArrow.size,
    });
    fireEvent.press(back);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onSaveMilestone).not.toHaveBeenCalled();
    expect(screen.getByText(milestone.title)).toBeTruthy();
    await openAction('Edit milestone');
    expect(screen.getByLabelText('Edit milestone name').props.value).toBe(milestone.title);
    expect(screen.getByLabelText('Edit milestone description').props.value).toBe(
      milestone.description,
    );
  });

  it('trims and saves edits, then returns to details', async () => {
    const { props } = renderDetails();
    await openAction('Edit milestone');
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), '  Updated race  ');
    fireEvent.changeText(screen.getByLabelText('Edit milestone description'), '  Updated plan  ');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenCalledWith(milestone.id, {
      title: 'Updated race',
      description: 'Updated plan',
    });
    expect(screen.getByRole('button', { name: 'Milestone actions' })).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('shows the expected completion date and a smaller asterisk-prefixed completion note', () => {
    renderDetails({
      locale: 'en-US',
      milestone: {
        ...milestone,
        totalTaskCount: 2,
      },
    });
    expect(screen.getByText('Expected completion date: Nov 1, 2026')).toBeTruthy();
    const note = screen.getByText(
      '* Completion updates automatically when tasks are completed or uncompleted.',
    );
    expect(StyleSheet.flatten(note.props.style).fontSize).toBe(12);
    expect(StyleSheet.flatten(note.props.style).fontSize).toBeLessThan(
      StyleSheet.flatten(screen.getByText(milestone.description).props.style).fontSize,
    );
  });

  it('saves a changed finish date and displays the persisted date after a snapshot update', async () => {
    const { props, rerender } = renderDetails({
      goalEstimatedCompletionDate: new Date(2026, 10, 30),
      locale: 'en-US',
    });
    await openAction('Edit milestone');
    expect(screen.getByRole('button', { name: 'November 1, 2026', selected: true })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'November 15, 2026' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenCalledWith(milestone.id, {
      title: milestone.title,
      description: milestone.description,
      estimatedFinishDate: new Date(2026, 10, 15),
    });
    rerender(
      <MilestoneDetailModal
        {...props}
        milestone={{
          ...milestone,
          estimatedFinishDate: new Date(2026, 10, 15),
        }}
      />,
    );
    expect(screen.getByText('Expected completion date: Nov 15, 2026')).toBeTruthy();
  });

  it('discards date edits when the top-left back arrow returns to details', async () => {
    const { props } = renderDetails();
    await openAction('Edit milestone');
    fireEvent.press(screen.getByRole('button', { name: 'November 15, 2026' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back to milestone details' }));
    expect(props.onSaveMilestone).not.toHaveBeenCalled();
    await openAction('Edit milestone');
    expect(screen.getByRole('button', { name: 'November 1, 2026', selected: true })).toBeTruthy();
  });

  it('preserves an unchanged past date when only editing text', async () => {
    const { props } = renderDetails({
      milestone: { ...milestone, estimatedFinishDate: new Date(2026, 7, 1) },
      goalEstimatedCompletionDate: new Date(2026, 8, 1),
    });
    await openAction('Edit milestone');
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Updated milestone');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenCalledWith(milestone.id, {
      title: 'Updated milestone',
      description: milestone.description,
    });
  });

  it('preserves unset dates until the user explicitly sets and saves a date', async () => {
    const { props } = renderDetails({ milestone: { ...milestone, estimatedFinishDate: null } });
    expect(screen.getByText('Expected completion date: Not set')).toBeTruthy();
    await openAction('Edit milestone');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenLastCalledWith(milestone.id, {
      title: milestone.title,
      description: milestone.description,
    });
    await openAction('Edit milestone');
    fireEvent.press(screen.getByLabelText('Set milestone expected completion date'));
    fireEvent.press(screen.getByRole('button', { name: 'October 12, 2026' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenLastCalledWith(milestone.id, {
      title: milestone.title,
      description: milestone.description,
      estimatedFinishDate: new Date(2026, 9, 12),
    });
  });

  it('rejects newly changed past dates and keeps editing open', async () => {
    const { props } = renderDetails({
      milestone: { ...milestone, estimatedFinishDate: new Date(2026, 7, 1) },
    });
    await openAction('Edit milestone');
    fireEvent.press(screen.getByLabelText('Next month for edit milestone'));
    fireEvent.press(screen.getByLabelText('Save milestone changes'));
    expect(screen.getByText('Expected completion date must be today or later.')).toBeTruthy();
    expect(props.onSaveMilestone).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Edit milestone name')).toBeTruthy();
  });

  it('rejects dates after the goal finish while accepting the goal finish day', async () => {
    const { props } = renderDetails({ goalEstimatedCompletionDate: new Date(2026, 10, 15, 12) });
    await openAction('Edit milestone');
    fireEvent.press(screen.getByRole('button', { name: 'November 16, 2026' }));
    fireEvent.press(screen.getByLabelText('Save milestone changes'));
    expect(
      screen.getByText('Milestone must finish on or before the goal completion date.'),
    ).toBeTruthy();
    expect(props.onSaveMilestone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'November 15, 2026' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(props.onSaveMilestone).toHaveBeenCalledWith(milestone.id, {
      title: milestone.title,
      description: milestone.description,
      estimatedFinishDate: new Date(2026, 10, 15),
    });
  });

  it('rejects blank names and shows actionable save errors without leaving editing', async () => {
    const onSaveMilestone = jest.fn(async () => {
      throw new Error('Connection unavailable.');
    });
    renderDetails({ onSaveMilestone });
    await openAction('Edit milestone');
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), '  ');
    fireEvent.press(screen.getByLabelText('Save milestone changes'));
    expect(screen.getByText('Milestone name is required.')).toBeTruthy();
    expect(onSaveMilestone).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Edit milestone name'), 'Valid name');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save milestone changes'));
    });
    expect(screen.getByText('Connection unavailable.')).toBeTruthy();
    expect(screen.getByLabelText('Edit milestone name')).toBeTruthy();
  });

  it('requires confirmation and allows cancellation before deleting', async () => {
    const { props } = renderDetails();
    await openAction('Delete milestone');
    expect(screen.getByText(/Are you sure you want to delete "Choose a race"/)).toBeTruthy();
    expect(props.onDeleteMilestone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Confirm delete milestone')).toBeNull();
    expect(props.onDeleteMilestone).not.toHaveBeenCalled();
    await openAction('Delete milestone');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    });
    expect(props.onDeleteMilestone).toHaveBeenCalledWith(milestone);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents repeated deletion and closing while deletion is pending', async () => {
    let resolveDelete: () => void = () => {
      throw new Error('Delete was not started.');
    };
    const onDeleteMilestone = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const { props } = renderDetails({ onDeleteMilestone });
    await openAction('Delete milestone');
    fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back to goal details' }));
    expect(onDeleteMilestone).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText('Confirm delete milestone').props.accessibilityState,
    ).toMatchObject({
      busy: true,
      disabled: true,
    });
    await act(async () => {
      resolveDelete();
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows deletion failures, keeps details open, and allows retry', async () => {
    const onDeleteMilestone = jest
      .fn<(value: GoalMilestoneWithTasks) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Unable to reach server.'))
      .mockResolvedValueOnce(undefined);
    const { props } = renderDetails({ onDeleteMilestone });
    await openAction('Delete milestone');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    });
    expect(screen.getByText('Unable to reach server.')).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
    await openAction('Delete milestone');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm delete milestone'));
    });
    expect(onDeleteMilestone).toHaveBeenCalledTimes(2);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the text add-task action and removes scheduling and linked events for all goals', () => {
    const { props, rerender } = renderDetails();
    expect(screen.getByText('+ Add Task')).toBeTruthy();
    fireEvent.press(screen.getByLabelText(`Add task to milestone ${milestone.title}`));
    expect(props.onAddTask).toHaveBeenCalledWith(milestone);
    expect(screen.queryByLabelText('Schedule milestone event')).toBeNull();
    expect(screen.queryByText('Linked Events')).toBeNull();
    expect(screen.queryByText('No events scheduled.')).toBeNull();
    expect(props.onSchedule).not.toHaveBeenCalled();
    expect(screen.getByText('No tasks yet.')).toBeTruthy();
    rerender(<MilestoneDetailModal {...props} milestoneActionsEnabled={false} />);
    expect(screen.queryByLabelText('Schedule milestone event')).toBeNull();
    expect(screen.getByLabelText(`Add task to milestone ${milestone.title}`)).toBeTruthy();
  });

  it('shows progress below the description with percent and task counts below the bar', () => {
    const { rerender, props } = renderDetails({
      milestone: { ...milestone, completedTaskCount: 1, totalTaskCount: 2, progressPercent: 50 },
    });
    const progress = screen.getByTestId('milestone-progress');
    const overview = screen.getByTestId('milestone-overview');
    expect(screen.getByTestId('milestone-description')).toBeTruthy();
    expect(within(overview).queryByText('PROGRESS')).toBeNull();
    expect(within(progress).getByText('PROGRESS')).toBeTruthy();
    expect(within(progress).UNSAFE_getByType(ProgressBar)).toBeTruthy();
    expect(
      within(progress).getByLabelText('Milestone progress').props.accessibilityValue,
    ).toMatchObject({
      now: 50,
      text: '50% complete, 1 of 2 tasks completed',
    });
    const progressSummary = within(progress).getByText('50% complete · 1 of 2 tasks completed');
    expect(StyleSheet.flatten(progressSummary.props.style)).toMatchObject(typography.caption);
    expect(StyleSheet.flatten(progressSummary.props.style).color).toBe(
      darkTheme.colors.textSecondary,
    );
    rerender(
      <MilestoneDetailModal
        {...props}
        milestone={{
          ...milestone,
          completedTaskCount: 2,
          totalTaskCount: 2,
          progressPercent: 100,
        }}
      />,
    );
    expect(screen.getByLabelText('Milestone progress').props.accessibilityValue.now).toBe(100);
    expect(screen.getByText('100% complete · 2 of 2 tasks completed')).toBeTruthy();
  });

  it('renders clickable due-ordered task rows without starter cues in a bounded scrollable list', () => {
    (useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>).mockReturnValue({
      top: 24,
      bottom: 16,
      left: 0,
      right: 0,
    });
    const completedTask = makeTask({
      id: 'completed-task',
      title: 'Choose a date',
      dueDate: new Date(2026, 9, 8),
      status: 'completed',
      starter: 'Compare local dates.',
    });
    const activeTask = makeTask();
    const unscheduledTask = makeTask({ id: 'unscheduled-task', title: 'Train', dueDate: null });
    const { props } = renderDetails({
      milestone: { ...milestone, tasks: [unscheduledTask, activeTask, completedTask] },
      locale: 'en-US',
    });
    const list = screen.getByTestId('milestone-detail-task-list');
    expect(list.props.nestedScrollEnabled).toBe(true);
    expect(screen.getByTestId('milestone-detail-scroll').props.nestedScrollEnabled).toBe(true);
    expect(StyleSheet.flatten(list.props.style).maxHeight).toBe(
      (Dimensions.get('window').height - 40) * 0.45,
    );
    expect(
      within(list)
        .UNSAFE_getAllByType(TaskListRow)
        .map((row) => row.props.task.id),
    ).toEqual([completedTask.id, activeTask.id, unscheduledTask.id]);
    expect(within(list).queryByText('+ Add Task')).toBeNull();
    expect(within(list).getAllByRole('button')).toHaveLength(3);
    expect(within(list).queryByText('Start here: Compare local dates.')).toBeNull();
    for (const task of [completedTask, activeTask, unscheduledTask]) {
      fireEvent.press(within(list).getByRole('button', { name: `Open task ${task.title}` }));
      expect(props.onOpenTask).toHaveBeenLastCalledWith(task);
    }
    expect(
      StyleSheet.flatten(within(list).getByText(completedTask.title).props.style)
        .textDecorationLine,
    ).toBe('line-through');
    expect(
      StyleSheet.flatten(within(list).getByText('Due Oct 8').props.style).textDecorationLine,
    ).toBe('line-through');
    expect(within(list).getByText('Unscheduled')).toBeTruthy();
  });
});
