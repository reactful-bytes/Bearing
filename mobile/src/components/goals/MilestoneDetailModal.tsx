import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppIcon } from '../ui/AppIcon';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { IconButton } from '../ui/IconButton';
import { RowContextMenu } from '../ui/RowContextMenu';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ProgressBar } from '../ui/ProgressBar';
import { TaskListRow, formatTaskDateLabel } from '../tasks/TaskListRow';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { CalendarEvent } from '../../features/calendar/calendarTypes';
import { GoalMilestoneWithTasks } from '../../features/goals/goalTypes';
import { MilestoneEventsUiState } from '../../features/goals/useMilestoneEvents';
import { TimeFormat } from '../../features/profile/timeFormat';
import { sortGoalTasks } from '../../features/goals/goalHelpers';
import { TaskRecord } from '../../features/tasks/taskTypes';
import {
  GoalDatePicker,
  buildGoalDateParts,
  getGoalDateFromParts,
  isTodayOrFutureDate,
} from './GoalDatePicker';

export type MilestoneDetailInitialAction = 'edit' | 'delete' | null;

type MilestoneDetailModalProps = {
  goalTitle: string;
  milestone: GoalMilestoneWithTasks | null;
  visible: boolean;
  initialAction?: MilestoneDetailInitialAction;
  /** @deprecated Milestone details no longer display linked events. */
  linkedEvents?: CalendarEvent[];
  /** @deprecated Milestone details no longer display linked events. */
  linkedEventsState?: MilestoneEventsUiState;
  locale?: string;
  goalEstimatedCompletionDate?: Date;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSaveMilestone: (
    milestoneId: string,
    fields: { title: string; description: string; estimatedFinishDate?: Date | null },
  ) => Promise<void>;
  onDeleteMilestone: (milestone: GoalMilestoneWithTasks) => Promise<void>;
  /** @deprecated Milestone scheduling is no longer available from details. */
  onSchedule?: (milestone: GoalMilestoneWithTasks) => void;
  onAddTask: (milestone: GoalMilestoneWithTasks) => void;
  onOpenTask?: (task: TaskRecord) => void;
  /** @deprecated Milestone completion is derived from tasks. */
  onToggleManualCompletion?: (
    milestone: GoalMilestoneWithTasks,
    completed: boolean,
  ) => Promise<void>;
  milestoneActionsEnabled?: boolean;
};

export function MilestoneDetailModal({
  goalTitle,
  milestone,
  visible,
  initialAction = null,
  locale,
  goalEstimatedCompletionDate,
  onClose,
  onSaveMilestone,
  onDeleteMilestone,
  onAddTask,
  onOpenTask,
}: MilestoneDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [editMode, setEditMode] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedFinishDate, setExpectedFinishDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [closeOnEditBack, setCloseOnEditBack] = useState(false);
  const actionInFlight = useRef(false);
  const initializedMilestoneId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!milestone || !visible) {
      initializedMilestoneId.current = null;
      setCloseOnEditBack(false);
      return;
    }
    if (initializedMilestoneId.current === milestone.id) return;
    initializedMilestoneId.current = milestone.id;
    setEditMode(initialAction === 'edit');
    setCloseOnEditBack(initialAction === 'edit');
    setDeleteVisible(initialAction === 'delete');
    setTitle(milestone.title);
    setDescription(milestone.description);
    setExpectedFinishDate(milestone.estimatedFinishDate);
    setSaving(false);
    setError(null);
  }, [initialAction, milestone, visible]);

  function handleBack(): void {
    if (actionInFlight.current) return;
    setError(null);
    if (editMode && milestone) {
      if (closeOnEditBack) {
        setCloseOnEditBack(false);
        onClose();
        return;
      }
      setTitle(milestone.title);
      setDescription(milestone.description);
      setExpectedFinishDate(milestone.estimatedFinishDate);
      setEditMode(false);
      return;
    }
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!milestone || actionInFlight.current) return;
    if (!title.trim()) {
      setError('Milestone name is required.');
      return;
    }
    const dateChanged =
      expectedFinishDate?.toDateString() !== milestone.estimatedFinishDate?.toDateString();
    if (dateChanged && expectedFinishDate) {
      if (!isTodayOrFutureDate(expectedFinishDate, new Date())) {
        setError('Expected completion date must be today or later.');
        return;
      }
      if (
        goalEstimatedCompletionDate &&
        expectedFinishDate.getTime() >
          getGoalDateFromParts(buildGoalDateParts(goalEstimatedCompletionDate)).getTime()
      ) {
        setError('Milestone must finish on or before the goal completion date.');
        return;
      }
    }
    actionInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSaveMilestone(milestone.id, {
        title: title.trim(),
        description: description.trim(),
        ...(dateChanged ? { estimatedFinishDate: expectedFinishDate } : {}),
      });
      setCloseOnEditBack(false);
      setEditMode(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save milestone changes.',
      );
    } finally {
      actionInFlight.current = false;
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!milestone || actionInFlight.current) return;
    actionInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await onDeleteMilestone(milestone);
      setDeleteVisible(false);
      onClose();
    } catch (deleteError) {
      setDeleteVisible(false);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete milestone.');
    } finally {
      actionInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <AppModal
      visible={visible}
      title={editMode ? 'Edit Milestone' : 'Milestone Details'}
      onClose={handleBack}
      fullScreen
      fullScreenEdgeToEdge
      hideHeader
    >
      {milestone ? (
        <ScrollView
          testID="milestone-detail-scroll"
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            !editMode ? styles.detailsContent : null,
            {
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm + insets.top,
              paddingBottom: spacing['3xl'] + insets.bottom,
            },
          ]}
        >
          {editMode ? (
            <ScreenHeader
              title="Edit Milestone"
              onPressBack={handleBack}
              backAccessibilityLabel={closeOnEditBack ? 'Back to overview' : 'Back to milestone details'}
            />
          ) : (
            <>
              <ScreenHeader
                title="MILESTONE DETAILS"
                onPressBack={handleBack}
                backAccessibilityLabel="Back to goal details"
                trailing={
                  <RowContextMenu
                    accessibilityLabel="Milestone actions"
                    menuAccessibilityLabel="Milestone actions menu"
                    disabled={saving}
                    items={[
                      {
                        label: 'Edit',
                        accessibilityLabel: 'Edit milestone',
                        icon: 'edit',
                        onPress: () => {
                          setError(null);
                          setCloseOnEditBack(false);
                          setEditMode(true);
                        },
                      },
                      {
                        label: 'Delete',
                        accessibilityLabel: 'Delete milestone',
                        icon: 'delete',
                        tone: 'danger',
                        onPress: () => {
                          setError(null);
                          setDeleteVisible(true);
                        },
                      },
                    ]}
                  />
                }
              />
              <View testID="milestone-overview" style={styles.overview}>
                <View testID="milestone-hero" style={styles.milestoneSection}>
                  <View testID="milestone-section-header" style={styles.milestoneSectionHeader}>
                    <View
                      testID="milestone-section-icon-frame"
                      style={[styles.sectionIconFrame, styles.milestoneIconFrame]}
                    >
                      <AppIcon
                        name="goalMilestone"
                        size={17}
                        color={styles.sectionIcon.color}
                        decorative
                      />
                    </View>
                    <View testID="milestone-section-copy" style={styles.milestoneSectionCopy}>
                      <Text style={styles.milestoneLabel}>MILESTONE</Text>
                      <Text testID="milestone-expected-date" style={styles.expectedDate}>
                        Expected completion date:{' '}
                        {milestone.estimatedFinishDate
                          ? milestone.estimatedFinishDate.toLocaleDateString(locale, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Not set'}
                      </Text>
                    </View>
                  </View>
                  <Text accessibilityRole="header" style={styles.milestoneTitle}>
                    {milestone.title}
                  </Text>
                  <Text testID="milestone-description" style={styles.infoValue}>
                    {milestone.description || 'No description yet.'}
                  </Text>
                </View>
                <View testID="milestone-goal-section" style={styles.detailSection}>
                  <View style={styles.sectionIconFrame}>
                    <AppIcon name="goal" size={17} color={styles.sectionIcon.color} decorative />
                  </View>
                  <View style={styles.sectionCopy}>
                    <Text style={styles.sectionTitle}>GOAL</Text>
                    <Text testID="milestone-goal-name" style={styles.infoValue}>
                      {goalTitle}
                    </Text>
                  </View>
                </View>
              </View>
              <View testID="milestone-progress" style={styles.detailSection}>
                <View style={styles.sectionIconFrame}>
                  <AppIcon
                    name="complete"
                    size={17}
                    color={styles.sectionIcon.color}
                    decorative
                  />
                </View>
                <View style={styles.sectionCopy}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    PROGRESS
                  </Text>
                  <ProgressBar
                    value={milestone.progressPercent}
                    accessibilityLabel="Milestone progress"
                    accessibilityValueText={`${milestone.progressPercent}% complete, ${milestone.completedTaskCount} of ${milestone.totalTaskCount} tasks completed`}
                  />
                  <Text style={styles.progressSummary}>
                    {milestone.progressPercent}% complete · {milestone.completedTaskCount} of{' '}
                    {milestone.totalTaskCount} tasks completed
                  </Text>
                </View>
              </View>
            </>
          )}
          {editMode ? (
            <View style={styles.section}>
              <FormField
                label="Milestone name"
                accessibilityLabel="Edit milestone name"
                value={title}
                onChangeText={setTitle}
              />
              <FormField
                label="Description"
                accessibilityLabel="Edit milestone description"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              {expectedFinishDate ? (
                <GoalDatePicker
                  title="Expected completion date"
                  accessibilityPrefix="edit milestone"
                  dateParts={buildGoalDateParts(expectedFinishDate)}
                  onSelectDate={(date) => {
                    setExpectedFinishDate(date);
                    setError(null);
                  }}
                />
              ) : (
                <View style={styles.summary}>
                  <Text style={styles.infoValue}>Expected completion date: Not set</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Set milestone expected completion date"
                    onPress={() => {
                      setExpectedFinishDate(getGoalDateFromParts(buildGoalDateParts(new Date())));
                      setError(null);
                    }}
                    style={({ pressed }) => [styles.addTaskButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.addTaskText}>+ Set expected completion date</Text>
                  </Pressable>
                </View>
              )}
              <AppButton
                label="Save Changes"
                accessibilityLabel="Save milestone changes"
                onPress={() => void handleSave()}
                loading={saving}
              />
            </View>
          ) : (
            <View style={styles.detailsTaskSection}>
              <View testID="milestone-tasks-header" style={styles.taskSectionHeader}>
                <View style={styles.sectionIconFrame}>
                  <AppIcon name="tasks" size={17} color={styles.sectionIcon.color} decorative />
                </View>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  TASKS
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add task to milestone ${milestone.title}`}
                  onPress={() => onAddTask(milestone)}
                  style={({ pressed }) => [styles.addTaskButton, pressed && styles.pressed]}
                >
                  <Text style={styles.addTaskText}>+ Add Task</Text>
                </Pressable>
              </View>
              <View style={styles.taskSection}>
                <ScrollView
                  testID="milestone-detail-task-list"
                  accessibilityLabel="Milestone tasks"
                  nestedScrollEnabled
                  style={{ maxHeight: (windowHeight - insets.top - insets.bottom) * 0.45 }}
                  contentContainerStyle={styles.taskListContent}
                >
                  {milestone.tasks.length === 0 ? (
                    <Text style={styles.infoValue}>No tasks yet.</Text>
                  ) : (
                    sortGoalTasks(milestone.tasks).map((task) => (
                      <TaskListRow
                        key={task.id}
                        task={task}
                        dateLabel={formatTaskDateLabel(task, locale)}
                        onPress={onOpenTask ? () => onOpenTask(task) : undefined}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
              <Text style={styles.completionNote}>
                {'* '}
                {milestone.totalTaskCount === 0
                  ? 'Add a task to this milestone. It completes automatically when all its tasks are complete.'
                  : 'Completion updates automatically when tasks are completed or uncompleted.'}
              </Text>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      ) : null}
      <ConfirmationModal
        visible={visible && deleteVisible && milestone !== null}
        title="Delete milestone?"
        message={`Are you sure you want to delete "${milestone?.title ?? ''}"? Tasks, calendar events, and notes will be kept with their milestone links removed.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete milestone"
        icon="delete"
        iconTone="danger"
        loading={saving}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={() => void handleDelete()}
      />
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
    detailsContent: { gap: 0 },
    overview: { gap: 0 },
    milestoneSection: {
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    milestoneSectionHeader: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    milestoneSectionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    detailSection: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    sectionIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    milestoneIconFrame: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.surface,
    },
    sectionIcon: { color: theme.colors.brand },
    sectionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    expectedDate: { ...typography.caption, color: theme.colors.textSecondary },
    section: { gap: spacing.md },
    detailsTaskSection: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    taskSectionHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    taskSection: { gap: spacing.sm },
    taskListContent: { gap: spacing.sm },
    addTaskButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.md,
      marginLeft: 'auto',
    },
    addTaskText: { ...typography.label, color: theme.colors.brand, fontWeight: '700' },
    pressed: { opacity: 0.68 },
    milestoneTitle: { ...typography.sectionTitle, color: theme.colors.text },
    milestoneLabel: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    progressSummary: { ...typography.caption, color: theme.colors.textSecondary },
    statusLabel: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    infoValue: { ...typography.body, color: theme.colors.textPrimary },
    completionNote: { ...typography.caption, color: theme.colors.textSecondary },
    sectionTitle: { ...typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
