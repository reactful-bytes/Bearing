import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
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

type MilestoneDetailModalProps = {
  goalTitle: string;
  milestone: GoalMilestoneWithTasks | null;
  visible: boolean;
  /** @deprecated Milestone details no longer display linked events. */
  linkedEvents?: CalendarEvent[];
  /** @deprecated Milestone details no longer display linked events. */
  linkedEventsState?: MilestoneEventsUiState;
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSaveMilestone: (
    milestoneId: string,
    fields: { title: string; description: string },
  ) => Promise<void>;
  onDeleteMilestone: (milestone: GoalMilestoneWithTasks) => Promise<void>;
  /** @deprecated Milestone scheduling is no longer available from details. */
  onSchedule?: (milestone: GoalMilestoneWithTasks) => void;
  onAddTask: (milestone: GoalMilestoneWithTasks) => void;
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
  locale,
  onClose,
  onSaveMilestone,
  onDeleteMilestone,
  onAddTask,
}: MilestoneDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [editMode, setEditMode] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const actionInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!milestone || !visible) return;
    setEditMode(false);
    setDeleteVisible(false);
    setTitle(milestone.title);
    setDescription(milestone.description);
    setSaving(false);
    setError(null);
  }, [milestone, visible]);

  function handleBack(): void {
    if (actionInFlight.current) return;
    setError(null);
    if (editMode && milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description);
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
    actionInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSaveMilestone(milestone.id, { title: title.trim(), description: description.trim() });
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
      hideHeader
    >
      {milestone ? (
        <ScrollView
          testID="milestone-detail-scroll"
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: spacing.sm + insets.top,
              paddingBottom: spacing['3xl'] + insets.bottom,
            },
          ]}
        >
          {editMode ? (
            <ScreenHeader
              title="Edit Milestone"
              onPressBack={handleBack}
              backAccessibilityLabel="Back to milestone details"
            />
          ) : (
            <>
              <View style={styles.detailHeader}>
                <IconButton
                  name="back"
                  accessibilityLabel="Back to goal details"
                  onPress={handleBack}
                  disabled={saving}
                />
                <View style={styles.detailHeaderCopy}>
                  <Text numberOfLines={1} style={styles.milestoneTitle}>
                    {milestone.title}
                  </Text>
                </View>
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
              </View>
              <View style={styles.summary}>
                <Text style={styles.goalLabel}>{goalTitle}</Text>
                <Text style={styles.statusLabel}>
                  {milestone.status === 'completed'
                    ? 'Completed'
                    : milestone.status === 'in_progress'
                      ? 'In progress'
                      : 'Not started'}
                </Text>
                {milestone.estimatedFinishDate ? (
                  <Text style={styles.infoValue}>
                    Target date: {milestone.estimatedFinishDate.toLocaleDateString(locale)}
                  </Text>
                ) : null}
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
              <AppButton
                label="Save Changes"
                accessibilityLabel="Save milestone changes"
                onPress={() => void handleSave()}
                loading={saving}
              />
            </View>
          ) : (
            <View testID="milestone-overview" style={styles.section}>
              <View testID="milestone-description" style={styles.summary}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>
                  {milestone.description || 'No description yet.'}
                </Text>
              </View>
              <View testID="milestone-progress" style={styles.summary}>
                <ProgressBar
                  value={milestone.progressPercent}
                  accessibilityLabel="Milestone progress"
                  accessibilityValueText={`${milestone.progressPercent}% complete, ${milestone.completedTaskCount} of ${milestone.totalTaskCount} tasks completed`}
                />
                <Text style={styles.statusLabel}>
                  {milestone.progressPercent}% complete · {milestone.completedTaskCount} of{' '}
                  {milestone.totalTaskCount} tasks completed
                </Text>
              </View>
              <View style={styles.taskSection}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Tasks in this milestone
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add task to milestone ${milestone.title}`}
                  onPress={() => onAddTask(milestone)}
                  style={({ pressed }) => [styles.addTaskButton, pressed && styles.pressed]}
                >
                  <Text style={styles.addTaskText}>+ Add Task</Text>
                </Pressable>
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
                      <View key={task.id}>
                        <TaskListRow task={task} dateLabel={formatTaskDateLabel(task, locale)} />
                        {task.starter ? (
                          <Text style={styles.guidance}>Start here: {task.starter}</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
              <Text style={styles.guidance}>
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
    content: { gap: spacing.lg, flexGrow: 1 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    detailHeaderCopy: { flex: 1, gap: spacing.xs },
    summary: { gap: spacing.sm },
    section: { gap: spacing.md },
    taskSection: { gap: spacing.sm },
    taskListContent: { gap: spacing.sm },
    addTaskButton: {
      minHeight: 44,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.md,
    },
    addTaskText: { ...typography.label, color: theme.colors.brand, fontWeight: '700' },
    pressed: { opacity: 0.68 },
    goalLabel: { ...typography.label, color: theme.colors.textSecondary },
    milestoneTitle: { ...typography.sectionTitle, color: theme.colors.text },
    statusLabel: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    infoLabel: { ...typography.label, color: theme.colors.textSecondary },
    infoValue: { ...typography.body, color: theme.colors.textPrimary },
    guidance: { ...typography.helper, color: theme.colors.textSecondary },
    sectionTitle: { ...typography.button, color: theme.colors.text },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
