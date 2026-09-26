import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { GoalWithTasks } from '../../features/goals/goalTypes';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  timeFormatOptions,
} from '../../features/profile/timeFormat';
import type { TaskRecord } from '../../features/tasks/taskTypes';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { ScreenHeader } from '../ui/ScreenHeader';

type TaskDetailModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  goals?: GoalWithTasks[];
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (taskId: string) => Promise<void>;
  onSchedule: (task: TaskRecord) => void;
  onStartNow: (task: TaskRecord) => void;
  onMarkComplete: (task: TaskRecord) => Promise<void>;
  onUncomplete: (task: TaskRecord) => Promise<void>;
};

function formatDateTime(date: Date | null, timeFormat: TimeFormat, locale?: string): string {
  if (!date) return 'Not set';

  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

function getCompletionLabel(task: TaskRecord): string {
  if (task.status === 'active') return 'Active';
  if (task.completionSource === 'scheduled') return 'Completed by scheduling';
  if (task.completionSource === 'start_now') return 'Completed by Start Now';
  return 'Completed manually';
}

export function TaskDetailModal({
  visible,
  task,
  goals = [],
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  onClose,
  onEdit,
  onDelete,
  onSchedule,
  onStartNow,
  onMarkComplete,
  onUncomplete,
}: TaskDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      await onDelete(task.id);
      onClose();
    } catch {
      setError('Failed to delete task.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(action: (task: TaskRecord) => Promise<void>): Promise<void> {
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      await action(task);
      onClose();
    } catch {
      setError(
        task.status === 'completed'
          ? 'Failed to return task to active.'
          : 'Failed to mark task complete.',
      );
    } finally {
      setSaving(false);
    }
  }

  const goalTitle = task?.goalId
    ? (goals.find((goal) => goal.id === task.goalId)?.title ?? 'Unavailable')
    : 'No goal';

  return (
    <AppModal visible={visible} onClose={onClose} fullScreen hideHeader>
      {task ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingTop: insets.top, paddingBottom: spacing.sm + insets.bottom }}
        >
          <ScreenHeader
            title="Task Details"
            onPressBack={onClose}
            trailing={
              <AppButton
                label="Edit"
                accessibilityLabel="Edit task"
                onPress={() => onEdit(task)}
                variant="secondary"
              />
            }
          />

          <AppCard style={styles.summaryCard}>
            <Text style={styles.statusLabel}>{getCompletionLabel(task)}</Text>
            <Text style={styles.summaryTitle}>{task.title}</Text>
            <Text style={styles.summaryDate}>
              Updated {formatDateTime(task.updatedAt, timeFormat, locale)}
            </Text>
          </AppCard>

          <AppCard style={styles.detailCard}>
            <Text style={styles.detailLabel}>Goal</Text>
            <Text style={styles.detailValue}>{goalTitle}</Text>
            <Text style={styles.detailLabel}>Due date</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(task.dueDate, timeFormat, locale)}
            </Text>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>
              {task.scheduledStart && task.scheduledEnd
                ? `${formatDateTime(task.scheduledStart, timeFormat, locale)} to ${formatDateTime(task.scheduledEnd, timeFormat, locale)}${task.allDay ? ' (all day)' : ''}`
                : 'Not scheduled'}
            </Text>
            <Text style={styles.detailLabel}>Starter</Text>
            <Text style={styles.detailValue}>{task.starter.trim() || 'No starter added.'}</Text>
          </AppCard>

          <AppCard style={styles.detailCard}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.description}>{task.description.trim() || 'No description added.'}</Text>
          </AppCard>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {task.status === 'active' ? (
            <View style={styles.actionStack}>
              <AppButton
                label="Schedule"
                accessibilityLabel="Schedule task"
                onPress={() => onSchedule(task)}
              />
              <AppButton
                label="Start Now"
                variant="secondary"
                accessibilityLabel="Start task now"
                onPress={() => onStartNow(task)}
              />
              <AppButton
                label="Mark Complete"
                variant="secondary"
                accessibilityLabel="Mark task complete"
                onPress={() => void handleComplete(onMarkComplete)}
                loading={saving}
                loadingLabel="Working..."
              />
            </View>
          ) : (
            <AppButton
              label="Uncomplete Task"
              variant="secondary"
              accessibilityLabel="Uncomplete task"
              onPress={() => void handleComplete(onUncomplete)}
              loading={saving}
              loadingLabel="Working..."
            />
          )}

          {!confirmingDelete ? (
            <AppButton
              label="Delete Task"
              variant="danger"
              accessibilityLabel="Delete task"
              onPress={() => setConfirmingDelete(true)}
            />
          ) : (
            <View style={styles.confirmBlock}>
              <Text style={styles.confirmText}>Delete this task permanently?</Text>
              <View style={styles.confirmActions}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  accessibilityLabel="Cancel task delete"
                  onPress={() => setConfirmingDelete(false)}
                  style={styles.flexButton}
                />
                <AppButton
                  label="Yes, Delete"
                  variant="danger"
                  accessibilityLabel="Confirm task delete"
                  onPress={() => void handleDelete()}
                  loading={saving}
                  loadingLabel="Deleting..."
                  style={styles.flexButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    summaryCard: { gap: spacing.xs },
    detailCard: { gap: spacing.xs },
    statusLabel: { ...typography.label, color: theme.colors.brand },
    summaryTitle: { ...typography.button, fontSize: 18, color: theme.colors.text },
    summaryDate: { ...typography.helper, color: theme.colors.textSecondary },
    detailLabel: { ...typography.label, color: theme.colors.textSecondary },
    detailValue: { ...typography.body, color: theme.colors.text, marginBottom: spacing.sm },
    description: { ...typography.body, color: theme.colors.textPrimary },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
    actionStack: { gap: spacing.md },
    confirmBlock: { gap: spacing.md },
    confirmText: { ...typography.body, color: theme.colors.text },
    confirmActions: { flexDirection: 'row', gap: spacing.md },
    flexButton: { flex: 1 },
  });
