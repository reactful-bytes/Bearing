import type { GoalWithMilestones } from '../../features/goals/goalTypes';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';

type TaskGoalFilterProps = {
  goals: GoalWithMilestones[];
  selectedGoalIds: ReadonlySet<string>;
  onToggleGoal: (goalId: string) => void;
  onClear: () => void;
};

export function TaskGoalFilter({
  goals,
  selectedGoalIds,
  onToggleGoal,
  onClear,
}: TaskGoalFilterProps) {
  const selectedGoals = goals.filter((goal) => selectedGoalIds.has(goal.id));
  const selectedSummary =
    selectedGoals.length === 1
      ? selectedGoals[0].title
      : selectedGoals.length > 1
        ? `${selectedGoals.length} goals selected`
        : 'All goals';
  const options = goals.map((goal) => ({
    id: goal.id,
    label: goal.title,
    icon: 'goal' as const,
  }));

  return (
    <MultiSelectDropdown
      sectionLabel="Goal"
      triggerIcon="goal"
      selectedSummary={selectedSummary}
      triggerAccessibilityLabel={`Filter by goals, ${selectedGoalIds.size} selected`}
      optionAccessibilityLabel={(option) => `Filter tasks to ${option.label}`}
      options={options}
      selectedIds={selectedGoalIds}
      emptyMessage="No goals linked to tasks."
      clearAccessibilityLabel="Clear goal filters"
      onToggle={onToggleGoal}
      onClear={onClear}
    />
  );
}
