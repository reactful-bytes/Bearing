import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoalMilestone, GoalStepRecord, GoalWithSteps } from '../../features/goals/goalTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { SegmentedControl, SegmentedControlOption } from '../ui/SegmentedControl';

export type GoalFilter = 'active' | 'completed' | 'all';

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
    goal.nextStep?.title ?? (goal.status === 'completed' ? 'Completed' : 'Add a step');

  return (
    <Card accessibilityLabel={`Open goal ${goal.title}`} onPress={onPress} style={styles.card}>
      <View style={styles.titleRow}>
        <Text numberOfLines={2} style={styles.title}>
          {goal.title}
        </Text>
        <Text style={goal.status === 'completed' ? styles.completed : styles.active}>
          {goal.status === 'completed' ? 'Completed' : 'Active'}
        </Text>
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
        accent={goal.status === 'completed' ? 'success' : 'brand'}
        showPercentage
      />
    </Card>
  );
}

type GoalStatusTabsProps = {
  value: GoalFilter;
  options: readonly SegmentedControlOption<GoalFilter>[];
  onChange: (value: GoalFilter) => void;
};

export function GoalStatusTabs({ value, options, onChange }: GoalStatusTabsProps) {
  return (
    <SegmentedControl
      accessibilityLabel="Goal filter"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

type GoalTimelineProps = {
  steps: readonly GoalStepRecord[];
  onPressStep?: (step: GoalStepRecord) => void;
};

export function GoalTimeline({ steps, onPressStep }: GoalTimelineProps) {
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
    card: { gap: theme.spacing.md },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    title: { ...theme.typography.cardTitle, color: theme.colors.text, flex: 1 },
    active: { ...theme.typography.caption, color: theme.colors.brand },
    completed: { ...theme.typography.caption, color: theme.colors.success },
    meta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    nextStep: { ...theme.typography.helper, color: theme.colors.text },
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
