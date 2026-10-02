import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { spacing, typography } from '../../design/tokens';
import { GoalWithMilestones } from '../../features/goals/goalTypes';
import { TaskRecord } from '../../features/tasks/taskTypes';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  timeFormatOptions,
} from '../../features/profile/timeFormat';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { ScreenHeader } from '../ui/ScreenHeader';
import { TaskActionMenu } from './TaskActionMenu';
import { AppIcon } from '../ui/AppIcon';

type TaskDetailsModalProps = {
  visible: boolean;
  task: TaskRecord | null;
  goals: readonly GoalWithMilestones[];
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onSchedule: (task: TaskRecord) => void;
  onStartNow: (task: TaskRecord) => void;
  onMarkComplete: (task: TaskRecord) => Promise<void>;
  onReactivate: (task: TaskRecord) => Promise<void>;
  taskActionsEnabled?: boolean;
};

function formatDateTime(date: Date, timeFormat: TimeFormat, locale?: string): string {
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

export function TaskDetailsModal({
  visible,
  task,
  goals,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  onClose,
  onEdit,
  onDelete,
  onSchedule,
  onStartNow,
  onMarkComplete,
  onReactivate,
  taskActionsEnabled = true,
}: TaskDetailsModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkComplete(): Promise<void> {
    if (!task) return;
    setWorking(true);
    setError(null);
    try {
      await onMarkComplete(task);
      onClose();
    } catch {
      setError('Failed to mark task complete.');
    } finally {
      setWorking(false);
    }
  }

  async function handleReactivate(): Promise<void> {
    if (!task) return;
    setWorking(true);
    setError(null);
    try {
      await onReactivate(task);
      onClose();
    } catch {
      setError('Failed to mark task active.');
    } finally {
      setWorking(false);
    }
  }

  const linkedGoal = task?.goalId ? goals.find((goal) => goal.id === task.goalId) : null;
  const linkedMilestone = task?.milestoneId
    ? linkedGoal?.milestones.find((milestone) => milestone.id === task.milestoneId)
    : null;
  return (
    <AppModal visible={visible} onClose={onClose} fullScreen hideHeader>
      {task ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
          ]}
        >
          <ScreenHeader
            title="Task Details"
            onPressBack={onClose}
            backAccessibilityLabel="Close Task Details"
            trailing={
              <TaskActionMenu
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task)}
                onReactivate={
                  task.status === 'completed' && taskActionsEnabled
                    ? () => void handleReactivate()
                    : undefined
                }
              />
            }
          />

          <View testID="task-details-hero" style={styles.hero}>
            <View style={styles.heroTopline}>
              <View
                style={[
                  styles.statusIconFrame,
                  task.status === 'completed' ? styles.completedFrame : null,
                ]}
              >
                <AppIcon
                  name={task.status === 'active' ? 'active' : 'completed'}
                  size={20}
                  color={
                    task.status === 'active' ? styles.activeIcon.color : styles.completedIcon.color
                  }
                  decorative
                />
              </View>
              <View style={styles.heroStatusCopy}>
                <Text
                  style={[
                    styles.statusLabel,
                    task.status === 'completed' ? styles.completedLabel : null,
                  ]}
                >
                  {task.status === 'active' ? 'ACTIVE TASK' : 'COMPLETED TASK'}
                </Text>
                <Text style={styles.updatedAt}>
                  Updated {formatDateTime(task.updatedAt, timeFormat, locale)}
                </Text>
              </View>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {task.title}
            </Text>
            {task.description.trim() ? (
              <Text style={styles.heroDescription}>{task.description}</Text>
            ) : null}
          </View>

          <DetailSection
            icon="goal"
            title={linkedMilestone ? 'MILESTONE' : linkedGoal ? 'GOAL' : 'NO GOAL LINKED'}
          >
            <Text style={styles.bodyText}>
              {linkedMilestone?.title ?? linkedGoal?.title ?? 'Independent task'}
            </Text>
            {linkedMilestone && linkedGoal ? (
              <Text style={styles.updatedAt}>In {linkedGoal.title}</Text>
            ) : null}
          </DetailSection>

          {!task.description.trim() ? (
            <DetailSection icon="document" title="DESCRIPTION">
              <Text style={styles.bodyText}>No description added.</Text>
            </DetailSection>
          ) : null}

          <DetailSection icon="idea" title="STARTER CUE">
            <Text style={styles.bodyText}>
              {task.starter.trim() ? task.starter : 'No starter cue added.'}
            </Text>
          </DetailSection>

          <DetailSection icon="date" title="TIMING">
            {task.dueDate ? (
              <InfoLine
                icon="date"
                text={`Due ${task.dueDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}`}
              />
            ) : null}
            {task.scheduledStart ? (
              <InfoLine
                icon="calendar"
                text={`Scheduled ${formatDateTime(task.scheduledStart, timeFormat, locale)}`}
              />
            ) : null}
            {!task.dueDate && !task.scheduledStart ? (
              <Text style={styles.updatedAt}>No dates set</Text>
            ) : null}
            {task.status === 'completed' && task.completedAt ? (
              <InfoLine
                icon="complete"
                text={`Completed ${formatDateTime(task.completedAt, timeFormat, locale)}`}
              />
            ) : null}
          </DetailSection>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {task.status === 'active' && taskActionsEnabled ? (
            <View style={styles.actions}>
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
                onPress={handleMarkComplete}
                loading={working}
                loadingLabel="Working..."
              />
            </View>
          ) : null}
          {task.status === 'completed' && taskActionsEnabled ? (
            <AppButton
              label="Mark Active"
              variant="secondary"
              accessibilityLabel="Mark task active"
              onPress={handleReactivate}
              loading={working}
              loadingLabel="Updating..."
            />
          ) : null}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: 'goal' | 'document' | 'idea' | 'date';
  title: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionIconFrame}>
        <AppIcon name={icon} size={17} color={styles.sectionIcon.color} decorative />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: 'date' | 'calendar' | 'complete'; text: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoLine}>
      <AppIcon name={icon} size={15} color={styles.infoIcon.color} decorative />
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1, gap: spacing.lg },
    hero: {
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    heroTopline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    statusIconFrame: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
    },
    completedFrame: { backgroundColor: theme.colors.surfaceMuted },
    activeIcon: { color: theme.colors.brand },
    completedIcon: { color: theme.colors.success },
    heroStatusCopy: { flex: 1, gap: 2 },
    statusLabel: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    completedLabel: { color: theme.colors.success },
    title: { ...typography.title, color: theme.colors.text },
    heroDescription: { ...typography.body, color: theme.colors.textPrimary },
    updatedAt: { ...typography.helper, color: theme.colors.textSecondary },
    section: {
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
    sectionIcon: { color: theme.colors.brand },
    sectionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    sectionTitle: { ...typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
    bodyText: { ...typography.body, color: theme.colors.textPrimary },
    actions: { gap: spacing.md },
    infoLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    infoIcon: { color: theme.colors.textSecondary },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
