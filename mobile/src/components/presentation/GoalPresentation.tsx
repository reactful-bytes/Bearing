import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoalMilestoneWithTasks, GoalWithMilestones } from '../../features/goals/goalTypes';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { SegmentedControl, SegmentedControlOption } from '../ui/SegmentedControl';

export type GoalFilter = 'active' | 'completed' | 'archived' | 'all';

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
    (goal.status === 'completed'
      ? 'Completed'
      : goal.status === 'archived'
        ? 'Archived'
        : 'Add a milestone');
  const badgeStyle =
    goal.status === 'completed'
      ? styles.badgeCompleted
      : goal.status === 'archived'
        ? styles.badgeArchived
        : styles.badgeActive;
  const badgeTextStyle =
    goal.status === 'completed'
      ? styles.badgeTextCompleted
      : goal.status === 'archived'
        ? styles.badgeTextArchived
        : styles.badgeTextActive;
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
                : goal.status === 'archived'
                  ? 'neutral'
                  : 'brand'
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
};

function getCurrentMilestoneId(milestones: readonly GoalMilestoneWithTasks[]): string | null {
  const ordered = [...milestones].sort((left, right) => left.order - right.order);
  return ordered.find((milestone) => milestone.status !== 'completed')?.id ?? null;
}

export function GoalTimeline({ milestones, onPressMilestone }: GoalTimelineProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const currentMilestoneId = useMemo(() => getCurrentMilestoneId(milestones), [milestones]);

  return (
    <View accessibilityLabel="Goal milestone timeline" style={styles.timeline}>
      {milestones.map((milestone, index) => {
        const isCompleted = milestone.status === 'completed';
        const isCurrent = !isCompleted && milestone.id === currentMilestoneId;

        return (
          <Pressable
            key={milestone.id}
            accessibilityRole={onPressMilestone ? 'button' : undefined}
            accessibilityLabel={onPressMilestone ? `Open milestone ${milestone.title}` : undefined}
            disabled={!onPressMilestone}
            onPress={() => onPressMilestone?.(milestone)}
            style={styles.timelineItem}
          >
            <View style={styles.timelineMarkerColumn}>
              <View
                style={[
                  styles.timelineMarker,
                  isCompleted
                    ? styles.timelineMarkerComplete
                    : isCurrent
                      ? styles.timelineMarkerCurrent
                      : styles.timelineMarkerUpcoming,
                ]}
              >
                {isCompleted ? (
                  <AppIcon name="complete" size={12} color={theme.colors.onBrand} decorative />
                ) : null}
              </View>
              {index < milestones.length - 1 ? <View style={styles.timelineConnector} /> : null}
            </View>
            <View style={styles.timelineCopy}>
              <View style={styles.timelineTitleRow}>
                <Text style={styles.timelineTitle}>{milestone.title}</Text>
              </View>
              <Text style={styles.meta}>
                {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'}
                {` · ${milestone.progressText}`}
              </Text>
            </View>
          </Pressable>
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
    timelineMarkerColumn: {
      width: 20,
      alignItems: 'center',
    },
    timelineMarker: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    timelineMarkerComplete: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    timelineMarkerCurrent: {
      borderWidth: 2,
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.surfaceBrand,
    },
    timelineMarkerUpcoming: { borderColor: theme.colors.border },
    timelineConnector: {
      flex: 1,
      width: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.xs,
    },
    timelineCopy: { flex: 1, gap: theme.spacing.xs, paddingBottom: theme.spacing.sm },
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
