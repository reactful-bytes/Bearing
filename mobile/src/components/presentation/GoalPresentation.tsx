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
import { SegmentedControl, SegmentedControlOption } from '../ui/SegmentedControl';

export type GoalFilter = GoalStatus | 'all';

export function getGoalProgressPercent(
  goal: Pick<GoalWithMilestones, 'status' | 'completedMilestoneCount' | 'totalMilestoneCount'>,
): number {
  if (goal.status === 'completed') return 100;
  if (goal.totalMilestoneCount === 0) return 0;
  return Math.round((goal.completedMilestoneCount / goal.totalMilestoneCount) * 100);
}

type GoalCardProps = {
  goal: GoalWithMilestones;
  formatDate: (date: Date) => string;
  onPress: () => void;
};

export function GoalCard({ goal, formatDate, onPress }: GoalCardProps) {
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
    <Card accessibilityLabel={`Open goal ${goal.title}`} onPress={onPress} style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconContainer, { borderColor: statusColor }]}>
          <AppIcon name={statusIcon} size={22} color={statusColor} decorative />
        </View>
        <View style={styles.cardCopy}>
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
      </View>
    </Card>
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
  renderMilestoneTasks?: (milestone: GoalMilestoneWithTasks) => ReactNode;
};

function getCurrentMilestoneId(milestones: readonly GoalMilestoneWithTasks[]): string | null {
  const ordered = [...milestones].sort((left, right) => left.order - right.order);
  return ordered.find((milestone) => milestone.status !== 'completed')?.id ?? null;
}

export function GoalTimeline({
  milestones,
  onPressMilestone,
  renderMilestoneTasks,
}: GoalTimelineProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
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

  return (
    <View accessibilityLabel="Goal milestone timeline" style={styles.timeline}>
      {milestones.map((milestone) => {
        const isCompleted = milestone.status === 'completed';
        const isCurrent = !isCompleted && milestone.id === currentMilestoneId;
        const isExpanded = expandedMilestoneIds.has(milestone.id);

        return (
          <View key={milestone.id} style={styles.timelineItem}>
            <View style={styles.timelineBody}>
              <View testID={`milestone-header-${milestone.id}`} style={styles.timelineHeader}>
                {renderMilestoneTasks ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} milestone ${milestone.title}`}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => toggleMilestone(milestone.id)}
                    style={({ pressed }) => [
                      styles.timelineDisclosure,
                      pressed ? styles.listFilterButtonPressed : null,
                    ]}
                  >
                    <AppIcon
                      name={isExpanded ? 'expand' : 'forward'}
                      size={18}
                      color={theme.colors.textSecondary}
                      decorative
                    />
                  </Pressable>
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
              </View>
              {renderMilestoneTasks && isExpanded ? (
                <View style={styles.timelineTasks}>{renderMilestoneTasks(milestone)}</View>
              ) : null}
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
    card: { padding: theme.spacing.lg },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: theme.colors.surfaceBrand,
    },
    cardCopy: { flex: 1, gap: theme.spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    title: { ...theme.typography.cardTitle, color: theme.colors.text, flex: 1 },
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
    timelineCopy: { flex: 1, gap: theme.spacing.xs, paddingBottom: theme.spacing.sm },
    timelineBody: { flex: 1, gap: theme.spacing.sm },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    timelineTasks: { paddingLeft: theme.layout.minimumTouchTarget + theme.spacing.xs },
    timelineDisclosure: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
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
