import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  GoalMilestoneWithTasks,
  GoalStatus,
  GoalWithMilestones,
} from '../../features/goals/goalTypes';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { RowContextMenu } from '../ui/RowContextMenu';
import { SegmentedControl, SegmentedControlOption } from '../ui/SegmentedControl';

export type GoalFilter = GoalStatus | 'all';

export function getGoalProgressPercent(
  goal: Pick<GoalWithMilestones, 'completedTaskCount' | 'totalTaskCount'>,
): number {
  if (goal.totalTaskCount === 0) return 0;
  return Math.round((goal.completedTaskCount / goal.totalTaskCount) * 100);
}

type GoalCardProps = {
  goal: GoalWithMilestones;
  formatDate: (date: Date) => string;
  onPress: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onUncomplete?: () => void;
  onDelete?: () => void;
  actionsDisabled?: boolean;
};

export function GoalCard({
  goal,
  formatDate,
  onPress,
  onEdit,
  onComplete,
  onUncomplete,
  onDelete,
  actionsDisabled = false,
}: GoalCardProps) {
  const styles = useThemedStyles(createStyles);
  const progressPercent = getGoalProgressPercent(goal);
  const nextMilestone =
    goal.nextMilestone?.title ??
    (goal.status === 'draft'
      ? 'Draft plan'
      : goal.status === 'completed'
        ? 'Completed'
        : goal.status === 'archived'
          ? 'Archived'
          : 'Add a milestone');
  const badgeStyle =
    goal.status === 'completed'
      ? styles.badgeCompleted
      : goal.status === 'active'
        ? styles.badgeActive
        : styles.badgeArchived;
  const badgeTextStyle =
    goal.status === 'completed'
      ? styles.badgeTextCompleted
      : goal.status === 'active'
        ? styles.badgeTextActive
        : styles.badgeTextArchived;
  const statusLabel =
    goal.status === 'active' ? 'Current' : `${goal.status[0].toUpperCase()}${goal.status.slice(1)}`;
  const statusIcon = goal.status === 'completed' ? 'complete' : 'goalsOutline';
  const statusColor = badgeTextStyle.color;

  return (
    <View style={styles.goalRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open goal ${goal.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.goalMain, pressed ? styles.goalRowPressed : null]}
      >
        <View style={styles.iconContainer}>
          <AppIcon name={statusIcon} size={22} color={statusColor} decorative />
        </View>
        <View style={styles.goalCopy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.title}>
              {goal.title}
            </Text>
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Target: {formatDate(goal.estimatedCompletionDate)}</Text>
          <Text numberOfLines={1} style={styles.nextStep}>
            Next milestone: {nextMilestone}
          </Text>
          <Text style={styles.meta}>{goal.progressText}</Text>
          <ProgressBar
            accessibilityLabel={`Goal progress ${goal.title}`}
            value={progressPercent}
            max={100}
            accent={
              goal.status === 'completed'
                ? 'success'
                : goal.status === 'active'
                  ? 'brand'
                  : 'neutral'
            }
            accessibilityValueText={goal.progressText}
            style={styles.progressBar}
            showPercentage
          />
        </View>
      </Pressable>
      {onEdit && onDelete ? (
        <View testID={`goal-row-menu-anchor-${goal.id}`} style={styles.goalMenuPosition}>
          <RowContextMenu
            accessibilityLabel={`Goal actions for ${goal.title}`}
            menuAccessibilityLabel={`Goal actions menu for ${goal.title}`}
            disabled={actionsDisabled}
            items={[
              {
                label: 'Edit',
                accessibilityLabel: `Edit goal ${goal.title}`,
                icon: 'edit',
                onPress: onEdit,
              },
              ...(onComplete
                ? [
                    {
                      label: 'Complete',
                      accessibilityLabel: `Complete goal ${goal.title}`,
                      icon: 'complete' as const,
                      onPress: onComplete,
                    },
                  ]
                : []),
              ...(onUncomplete
                ? [
                    {
                      label: 'Uncomplete',
                      accessibilityLabel: `Uncomplete goal ${goal.title}`,
                      icon: 'refresh' as const,
                      onPress: onUncomplete,
                    },
                  ]
                : []),
              {
                label: 'Delete',
                accessibilityLabel: `Delete goal ${goal.title}`,
                icon: 'delete',
                tone: 'danger' as const,
                onPress: onDelete,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

type GoalStatusTabsProps = {
  value: GoalFilter;
  options: readonly SegmentedControlOption<GoalFilter>[];
  onChange: (value: GoalFilter) => void;
  accessibilityLabel?: string;
};

export function GoalStatusTabs({
  value,
  options,
  onChange,
  accessibilityLabel = 'Goal filter',
}: GoalStatusTabsProps) {
  return (
    <SegmentedControl
      accessibilityLabel={accessibilityLabel}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

type GoalTimelineProps = {
  milestones: readonly GoalMilestoneWithTasks[];
  onPressMilestone?: (milestone: GoalMilestoneWithTasks) => void;
  onEditMilestone?: (milestone: GoalMilestoneWithTasks) => void;
  onDeleteMilestone?: (milestone: GoalMilestoneWithTasks) => void;
  onReorderMilestones?: (orderedMilestoneIds: string[]) => void | Promise<void>;
  renderMilestoneTasks?: (milestone: GoalMilestoneWithTasks) => ReactNode;
  showMilestoneIcon?: boolean;
};

function getCurrentMilestoneId(milestones: readonly GoalMilestoneWithTasks[]): string | null {
  const ordered = [...milestones].sort((left, right) => left.order - right.order);
  return ordered.find((milestone) => milestone.status !== 'completed')?.id ?? null;
}

export function GoalTimeline({
  milestones,
  onPressMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onReorderMilestones,
  renderMilestoneTasks,
  showMilestoneIcon = false,
}: GoalTimelineProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const orderedMilestones = useMemo(
    () => [...milestones].sort((left, right) => left.order - right.order),
    [milestones],
  );
  const currentMilestoneId = useMemo(() => getCurrentMilestoneId(milestones), [milestones]);
  const [expandedMilestoneIds, setExpandedMilestoneIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function toggleMilestone(milestoneId: string): void {
    setExpandedMilestoneIds((previous) => {
      const next = new Set(previous);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
    });
  }

  function moveMilestone(milestoneId: string, direction: -1 | 1): void {
    if (!onReorderMilestones) return;
    const currentIndex = orderedMilestones.findIndex((milestone) => milestone.id === milestoneId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedMilestones.length) return;

    const nextMilestones = [...orderedMilestones];
    [nextMilestones[currentIndex], nextMilestones[nextIndex]] = [
      nextMilestones[nextIndex],
      nextMilestones[currentIndex],
    ];
    void onReorderMilestones(nextMilestones.map((milestone) => milestone.id));
  }

  return (
    <View accessibilityLabel="Goal milestone timeline" style={styles.timeline}>
      {orderedMilestones.map((milestone, index) => {
        const isCompleted = milestone.status === 'completed';
        const isCurrent = !isCompleted && milestone.id === currentMilestoneId;
        const isExpanded = expandedMilestoneIds.has(milestone.id);

        return (
          <View key={milestone.id} style={styles.timelineItem}>
            <View style={styles.timelineBody}>
              <View testID={`milestone-header-${milestone.id}`} style={styles.timelineHeader}>
                {showMilestoneIcon ? (
                  <View testID={`milestone-icon-${milestone.id}`} style={styles.milestoneIconFrame}>
                    <AppIcon
                      name="goalMilestone"
                      size={18}
                      color={theme.colors.importedCyan}
                      decorative
                    />
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole={onPressMilestone ? 'button' : undefined}
                  accessibilityLabel={
                    onPressMilestone ? `Open milestone ${milestone.title}` : undefined
                  }
                  disabled={!onPressMilestone}
                  onPress={() => onPressMilestone?.(milestone)}
                  style={styles.timelineCopy}
                >
                  <View style={styles.timelineTitleRow}>
                    <Text style={styles.timelineTitle}>{milestone.title}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'}
                    {` · ${milestone.progressText}`}
                  </Text>
                </Pressable>
                {renderMilestoneTasks ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} milestone ${milestone.title}`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => toggleMilestone(milestone.id)}
                    style={({ pressed }) => [
                      styles.timelineDisclosure,
                      pressed ? styles.timelineDisclosurePressed : null,
                    ]}
                  >
                    <AppIcon
                      name={isExpanded ? 'collapse' : 'expand'}
                      size={18}
                      color={theme.colors.textSecondary}
                      decorative
                    />
                  </Pressable>
                ) : null}
                {onEditMilestone && onDeleteMilestone ? (
                  <RowContextMenu
                    accessibilityLabel={`Milestone actions for ${milestone.title}`}
                    menuAccessibilityLabel={`Milestone actions menu for ${milestone.title}`}
                    items={[
                      {
                        label: 'Edit',
                        accessibilityLabel: `Edit milestone ${milestone.title}`,
                        icon: 'edit',
                        onPress: () => onEditMilestone(milestone),
                      },
                      ...(onReorderMilestones && index > 0
                        ? [
                            {
                              label: 'Move up',
                              accessibilityLabel: `Move milestone ${milestone.title} up`,
                              icon: 'collapse' as const,
                              onPress: () => moveMilestone(milestone.id, -1),
                            },
                          ]
                        : []),
                      ...(onReorderMilestones && index < orderedMilestones.length - 1
                        ? [
                            {
                              label: 'Move down',
                              accessibilityLabel: `Move milestone ${milestone.title} down`,
                              icon: 'expand' as const,
                              onPress: () => moveMilestone(milestone.id, 1),
                            },
                          ]
                        : []),
                      {
                        label: 'Delete',
                        accessibilityLabel: `Delete milestone ${milestone.title}`,
                        icon: 'delete',
                        tone: 'danger',
                        onPress: () => onDeleteMilestone(milestone),
                      },
                    ]}
                  />
                ) : null}
              </View>
              {renderMilestoneTasks && isExpanded ? renderMilestoneTasks(milestone) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

type GoalMilestonesProps = {
  milestones: readonly GoalMilestoneWithTasks[];
};

export function GoalMilestones({ milestones }: GoalMilestonesProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel="Goal milestones" style={styles.milestones}>
      {milestones.map((milestone, index) => (
        <Card key={`${milestone.title}-${index}`} variant="outlined" style={styles.milestone}>
          <Text style={styles.milestoneLabel}>Milestone {index + 1}</Text>
          <Text style={styles.timelineTitle}>{milestone.title}</Text>
          <Text style={styles.meta}>{milestone.description || milestone.progressText}</Text>
        </Card>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    goalRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    goalMenuPosition: { alignSelf: 'center', flexShrink: 0 },
    goalMain: {
      flex: 1,
      minWidth: 0,
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    goalRowPressed: { opacity: 0.74 },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceBrand,
    },
    goalCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    title: {
      ...theme.typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
      flex: 1,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.xl,
    },
    badgeText: { ...theme.typography.caption, fontWeight: '700' },
    badgeActive: { backgroundColor: theme.colors.surfaceBrand },
    badgeCompleted: { backgroundColor: `${theme.colors.success}26` },
    badgeArchived: { backgroundColor: theme.colors.surfacePressed },
    badgeTextActive: { color: theme.colors.brand },
    badgeTextCompleted: { color: theme.colors.success },
    badgeTextArchived: { color: theme.colors.textSecondary },
    meta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    nextStep: { ...theme.typography.caption, color: theme.colors.textSecondary },
    progressBar: { marginTop: theme.spacing.xs },
    timeline: { gap: theme.spacing.sm },
    timelineItem: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.md,
    },
    timelineCopy: { flex: 1, gap: theme.spacing.xs },
    timelineBody: { flex: 1, gap: theme.spacing.sm },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    milestoneIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    timelineDisclosure: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    timelineDisclosurePressed: { opacity: 0.74 },
    timelineTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    timelineTitle: {
      ...theme.typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
      flex: 1,
    },
    timelineDate: { ...theme.typography.caption, color: theme.colors.textSecondary },
    milestones: { gap: theme.spacing.md },
    milestone: { gap: theme.spacing.xs },
    milestoneLabel: { ...theme.typography.label, color: theme.colors.purple },
  });
