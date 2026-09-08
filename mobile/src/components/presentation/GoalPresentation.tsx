import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoalMilestone, GoalStepRecord, GoalWithSteps } from '../../features/goals/goalTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { SegmentedControl, SegmentedControlOption } from '../ui/SegmentedControl';

export type GoalFilter = 'active' | 'completed' | 'archived' | 'all';

export function getGoalProgressPercent(
  goal: Pick<GoalWithSteps, 'status' | 'completedStepCount' | 'totalStepCount'>,
): number {
  if (goal.status === 'completed') return 100;
  if (goal.totalStepCount === 0) return 0;
  return Math.round((goal.completedStepCount / goal.totalStepCount) * 100);
}

type GoalCardProps = {
  goal: GoalWithSteps;
  formatDate: (date: Date) => string;
  onPress: () => void;
};

export function GoalCard({ goal, formatDate, onPress }: GoalCardProps) {
  const styles = useThemedStyles(createStyles);
  const progressPercent = getGoalProgressPercent(goal);
  const nextStep =
    goal.nextStep?.title ??
    (goal.status === 'completed'
      ? 'Completed'
      : goal.status === 'archived'
        ? 'Archived'
        : 'Add a step');
  const statusStyle =
    goal.status === 'completed'
      ? styles.completed
      : goal.status === 'archived'
        ? styles.archived
        : styles.active;
  const statusLabel =
    goal.status === 'active' ? 'Current' : `${goal.status[0].toUpperCase()}${goal.status.slice(1)}`;
  const statusIcon = goal.status === 'completed' ? 'complete' : 'goalsOutline';
  const statusColor =
    goal.status === 'completed'
      ? styles.completed.color
      : goal.status === 'archived'
        ? styles.archived.color
        : styles.active.color;

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
            <Text style={statusStyle}>{statusLabel}</Text>
          </View>
          <Text style={styles.meta}>Target: {formatDate(goal.estimatedCompletionDate)}</Text>
          <Text numberOfLines={1} style={styles.nextStep}>
            Next: {nextStep}
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
  steps: readonly GoalStepRecord[];
  onPressStep?: (step: GoalStepRecord) => void;
  taskCountsByStepId?: Readonly<Record<string, number>>;
};

export function GoalTimeline({ steps, onPressStep, taskCountsByStepId = {} }: GoalTimelineProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLabel="Goal timeline" style={styles.timeline}>
      {steps.map((step, index) => (
        <Pressable
          key={step.id}
          accessibilityRole={onPressStep ? 'button' : undefined}
          accessibilityLabel={onPressStep ? `Open step ${step.title}` : undefined}
          disabled={!onPressStep}
          onPress={() => onPressStep?.(step)}
          style={styles.timelineItem}
        >
          <View
            style={[
              styles.timelineMarker,
              step.status === 'completed' ? styles.timelineMarkerComplete : null,
            ]}
          >
            <Text style={styles.timelineIndex}>{index + 1}</Text>
          </View>
          <View style={styles.timelineCopy}>
            <Text style={styles.timelineTitle}>{step.title}</Text>
            <Text style={styles.meta}>
              {step.status === 'completed' ? 'Completed' : 'Upcoming'}
              {taskCountsByStepId[step.id]
                ? ` · ${taskCountsByStepId[step.id]} task${taskCountsByStepId[step.id] === 1 ? '' : 's'}`
                : ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

type GoalMilestonesProps = {
  milestones: readonly GoalMilestone[];
};

export function GoalMilestones({ milestones }: GoalMilestonesProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel="Goal milestones" style={styles.milestones}>
      {milestones.map((milestone, index) => (
        <Card key={`${milestone.title}-${index}`} variant="outlined" style={styles.milestone}>
          <Text style={styles.milestoneLabel}>Milestone {index + 1}</Text>
          <Text style={styles.timelineTitle}>{milestone.title}</Text>
          <Text style={styles.meta}>{milestone.description}</Text>
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
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: theme.colors.surfaceBrand,
    },
    cardCopy: { flex: 1, gap: theme.spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    title: { ...theme.typography.cardTitle, color: theme.colors.text, flex: 1 },
    active: { ...theme.typography.caption, color: theme.colors.brand },
    completed: { ...theme.typography.caption, color: theme.colors.success },
    archived: { ...theme.typography.caption, color: theme.colors.textSecondary },
    meta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    nextStep: { ...theme.typography.caption, color: theme.colors.textSecondary },
    timeline: { gap: theme.spacing.sm },
    timelineItem: {
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    timelineMarker: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceBrand,
    },
    timelineMarkerComplete: { backgroundColor: theme.colors.success },
    timelineIndex: { ...theme.typography.caption, color: theme.colors.onBrand, fontWeight: '700' },
    timelineCopy: { flex: 1, gap: theme.spacing.xs },
    timelineTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    milestones: { gap: theme.spacing.md },
    milestone: { gap: theme.spacing.xs },
    milestoneLabel: { ...theme.typography.label, color: theme.colors.purple },
  });
