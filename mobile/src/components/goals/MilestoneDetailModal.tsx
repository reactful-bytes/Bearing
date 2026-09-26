import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { CalendarEvent } from '../../features/calendar/calendarTypes';
import { GoalMilestoneWithTasks } from '../../features/goals/goalTypes';
import { MilestoneEventsUiState } from '../../features/goals/useMilestoneEvents';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  timeFormatOptions,
} from '../../features/profile/timeFormat';

type MilestoneDetailModalProps = {
  goalTitle: string;
  milestone: GoalMilestoneWithTasks | null;
  visible: boolean;
  linkedEvents: CalendarEvent[];
  linkedEventsState: MilestoneEventsUiState;
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSaveMilestone: (
    milestoneId: string,
    fields: { title: string; description: string },
  ) => Promise<void>;
  onDeleteMilestone: (milestone: GoalMilestoneWithTasks) => Promise<void>;
  onSchedule: (milestone: GoalMilestoneWithTasks) => void;
  onAddTask: (milestone: GoalMilestoneWithTasks) => void;
  onToggleManualCompletion: (
    milestone: GoalMilestoneWithTasks,
    completed: boolean,
  ) => Promise<void>;
};

function formatLinkedEvent(event: CalendarEvent, timeFormat: TimeFormat, locale?: string): string {
  return event.startAt.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

export function MilestoneDetailModal({
  goalTitle,
  milestone,
  visible,
  linkedEvents,
  linkedEventsState,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  onClose,
  onSaveMilestone,
  onDeleteMilestone,
  onSchedule,
  onAddTask,
  onToggleManualCompletion,
}: MilestoneDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!milestone || !visible) return;
    setEditMode(false);
    setTitle(milestone.title);
    setDescription(milestone.description);
    setSaving(false);
    setError(null);
  }, [milestone, visible]);

  async function handleSave(): Promise<void> {
    if (!milestone) return;
    if (!title.trim()) {
      setError('Milestone name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveMilestone(milestone.id, { title: title.trim(), description: description.trim() });
      setEditMode(false);
    } catch {
      setError('Failed to save milestone changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!milestone) return;
    setSaving(true);
    setError(null);
    try {
      await onDeleteMilestone(milestone);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete milestone.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCompletion(completed: boolean): Promise<void> {
    if (!milestone) return;
    setSaving(true);
    setError(null);
    try {
      await onToggleManualCompletion(milestone, completed);
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : 'Failed to update milestone completion.',
      );
    } finally {
      setSaving(false);
    }
  }

  const allTasksComplete = Boolean(
    milestone &&
    milestone.totalTaskCount > 0 &&
    milestone.completedTaskCount === milestone.totalTaskCount,
  );
  const manuallyComplete = Boolean(milestone?.manuallyCompletedAt);
  const canReopen = manuallyComplete && !allTasksComplete;

  return (
    <AppModal visible={visible} title="Milestone Details" onClose={onClose} closeLabel="Back">
      {milestone ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.goalLabel}>{goalTitle}</Text>
            <Text style={styles.milestoneTitle}>{milestone.title}</Text>
            <Text style={styles.statusLabel}>
              {milestone.status === 'completed'
                ? 'Completed'
                : milestone.status === 'in_progress'
                  ? 'In progress'
                  : 'Not started'}
              {` · ${milestone.progressText}`}
            </Text>
            {milestone.estimatedFinishDate ? (
              <Text style={styles.infoValue}>
                Target date: {milestone.estimatedFinishDate.toLocaleDateString(locale)}
              </Text>
            ) : null}
          </AppCard>

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
              <AppButton label="Save Changes" onPress={() => void handleSave()} loading={saving} />
            </View>
          ) : (
            <View style={styles.section}>
              <AppCard style={styles.summaryCard}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>
                  {milestone.description || 'No description yet.'}
                </Text>
              </AppCard>
              <Text style={styles.sectionTitle}>Tasks in this milestone</Text>
              {milestone.tasks.length === 0 ? (
                <Text style={styles.infoValue}>No tasks yet.</Text>
              ) : (
                milestone.tasks.map((task) => (
                  <AppCard key={task.id} style={styles.summaryCard}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.infoValue}>
                      {task.status === 'completed' ? 'Completed' : 'Active'}
                    </Text>
                    {task.starter ? (
                      <Text style={styles.infoValue}>Start here: {task.starter}</Text>
                    ) : null}
                  </AppCard>
                ))
              )}
              {manuallyComplete && allTasksComplete ? (
                <Text style={styles.guidance}>
                  All linked tasks are complete. Add a new task before reopening this milestone.
                </Text>
              ) : null}
              <View style={styles.actionColumn}>
                <AppButton
                  label="Add Task"
                  accessibilityLabel={`Add task to milestone ${milestone.title}`}
                  onPress={() => onAddTask(milestone)}
                />
                <AppButton
                  label="Schedule Event"
                  accessibilityLabel="Schedule milestone event"
                  variant="secondary"
                  onPress={() => onSchedule(milestone)}
                />
                {manuallyComplete ? (
                  canReopen ? (
                    <AppButton
                      label="Reopen Milestone"
                      accessibilityLabel="Reopen milestone"
                      variant="secondary"
                      onPress={() => void handleToggleCompletion(false)}
                      loading={saving}
                    />
                  ) : null
                ) : milestone.status !== 'completed' ? (
                  <AppButton
                    label="Mark Milestone Complete"
                    accessibilityLabel="Manually complete milestone"
                    variant="secondary"
                    onPress={() => void handleToggleCompletion(true)}
                    loading={saving}
                  />
                ) : null}
                <AppButton
                  label="Edit Milestone"
                  variant="secondary"
                  onPress={() => setEditMode(true)}
                />
                <AppButton
                  label="Delete Milestone"
                  variant="danger"
                  accessibilityLabel="Delete milestone"
                  onPress={() => void handleDelete()}
                  loading={saving}
                  loadingLabel="Deleting..."
                />
              </View>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Events</Text>
            {linkedEventsState === 'loading' ? (
              <Text style={styles.infoValue}>Loading linked events...</Text>
            ) : null}
            {linkedEventsState === 'error' ||
            linkedEventsState === 'empty' ||
            linkedEventsState === 'idle' ? (
              <Text style={styles.infoValue}>No events scheduled.</Text>
            ) : null}
            {linkedEventsState === 'ready'
              ? linkedEvents.map((event) => (
                  <AppCard
                    key={`${event.id}-${event.startAt.toISOString()}`}
                    style={styles.summaryCard}
                  >
                    <Text style={styles.infoValue}>{event.title}</Text>
                    <Text style={styles.statusLabel}>
                      {formatLinkedEvent(event, timeFormat, locale)}
                    </Text>
                  </AppCard>
                ))
              : null}
          </View>
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: spacing.lg },
    summaryCard: { gap: spacing.sm },
    section: { gap: spacing.md },
    actionColumn: { gap: spacing.md },
    goalLabel: { ...typography.label, color: theme.colors.textSecondary },
    milestoneTitle: { ...typography.button, fontSize: 18, color: theme.colors.text },
    taskTitle: { ...typography.button, color: theme.colors.text },
    statusLabel: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    infoLabel: { ...typography.label, color: theme.colors.textSecondary },
    infoValue: { ...typography.body, color: theme.colors.textPrimary },
    guidance: { ...typography.helper, color: theme.colors.textSecondary },
    sectionTitle: { ...typography.button, color: theme.colors.text },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
