import { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../components/ui/AppIcon';
import { AppScreen } from '../components/ui/AppScreen';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { spacing, typography } from '../design/tokens';
import {
  PlanStackParamList,
  TaskFilter,
  TaskGroupBy,
  TaskViewDraft,
} from '../navigation/navigationTypes';
import { DEFAULT_TASK_VIEW, TASK_SORT_OPTIONS } from './taskViewOptions';

type TaskViewScreenProps = NativeStackScreenProps<PlanStackParamList, 'TaskView'>;
type TaskGoalSelectionScreenProps = NativeStackScreenProps<
  PlanStackParamList,
  'TaskGoalSelection'
>;
type TaskSortSelectionScreenProps = NativeStackScreenProps<
  PlanStackParamList,
  'TaskSortSelection'
>;

const taskFilterOptions: { value: TaskFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All tasks' },
];

const taskGroupOptions: { value: TaskGroupBy; label: string; icon?: 'goal' | 'milestone' }[] = [
  { value: 'none', label: 'None' },
  { value: 'goal', label: 'Goal', icon: 'goal' },
  { value: 'milestone', label: 'Milestone', icon: 'milestone' },
];

export function TaskViewScreen({ route, navigation }: TaskViewScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState(route.params.draft);
  const selectedSort = TASK_SORT_OPTIONS.find((option) => option.value === draft.sortBy)!;
  const selectedGoals = route.params.goals.filter((goal) =>
    draft.selectedGoalIds.includes(goal.id),
  );
  const goalSummary =
    selectedGoals.length === 0
      ? 'All goals'
      : selectedGoals.length === 1
        ? selectedGoals[0].title
        : `${selectedGoals.length} goals selected`;

  useEffect(() => {
    setDraft(route.params.draft);
  }, [route.params.draft]);

  function finish(): void {
    navigation.popTo('Tasks', { viewResult: draft });
  }

  function reset(): void {
    setDraft({ ...DEFAULT_TASK_VIEW });
  }

  return (
    <AppScreen mode="scroll" contentContainerStyle={styles.content}>
      <ScreenHeader
        title="View tasks"
        onPressBack={() => navigation.popTo('Tasks')}
        backAccessibilityLabel="Back to tasks"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply"
            onPress={finish}
            style={({ pressed }) => [styles.applyButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        }
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.segmentedControl}>
          {taskFilterOptions.map((option) => {
            const selected = draft.taskFilter === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Select ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setDraft((current) => ({ ...current, taskFilter: option.value }))}
                style={({ pressed }) => [
                  styles.segmentOption,
                  selected ? styles.segmentOptionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text numberOfLines={1} style={styles.segmentLabel}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Group</Text>
        <View style={styles.segmentedControl}>
          {taskGroupOptions.map((option) => {
            const selected = draft.groupBy === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={
                  option.value === 'none'
                    ? 'Do not group tasks'
                    : `Group tasks by ${option.label.toLowerCase()}`
                }
                accessibilityState={{ selected }}
                onPress={() => setDraft((current) => ({ ...current, groupBy: option.value }))}
                style={({ pressed }) => [
                  styles.segmentOption,
                  styles.groupOption,
                  selected ? styles.segmentOptionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {option.icon ? (
                  <AppIcon
                    name={option.icon}
                    size={16}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                ) : null}
                <Text numberOfLines={1} style={styles.segmentLabel}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Filters</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter by goals, ${draft.selectedGoalIds.length} selected`}
          onPress={() =>
            navigation.push('TaskGoalSelection', {
              draft,
              goals: route.params.goals,
            })
          }
          style={({ pressed }) => [styles.selectionRow, pressed ? styles.pressed : null]}
        >
          <AppIcon name="goal" size={18} color={styles.selectedIcon.color} decorative />
          <View style={styles.selectionCopy}>
            <Text style={styles.selectionLabel}>Goal</Text>
            <Text numberOfLines={1} style={styles.selectionValue}>
              {goalSummary}
            </Text>
          </View>
          <AppIcon name="next" size={18} color={styles.optionIcon.color} decorative />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort tasks, ${selectedSort.label}`}
          onPress={() => navigation.push('TaskSortSelection', { draft, goals: route.params.goals })}
          style={({ pressed }) => [styles.selectionRow, pressed ? styles.pressed : null]}
        >
          <AppIcon name={selectedSort.icon} size={18} color={styles.selectedIcon.color} decorative />
          <View style={styles.selectionCopy}>
            <Text style={styles.selectionLabel}>Sort</Text>
            <Text numberOfLines={1} style={styles.selectionValue}>
              {selectedSort.summary}
            </Text>
          </View>
          <AppIcon name="next" size={18} color={styles.optionIcon.color} decorative />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset filters and sorting"
        accessibilityState={{ disabled: isDefaultTaskView(draft) }}
        disabled={isDefaultTaskView(draft)}
        onPress={reset}
        style={({ pressed }) => [
          styles.resetButton,
          isDefaultTaskView(draft) ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <AppIcon name="refresh" size={16} color={styles.optionIcon.color} decorative />
        <Text style={styles.resetText}>Reset</Text>
      </Pressable>
    </AppScreen>
  );
}

export function TaskGoalSelectionScreen({
  route,
  navigation,
}: TaskGoalSelectionScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [selectedGoalIds, setSelectedGoalIds] = useState(
    () => new Set(route.params.draft.selectedGoalIds),
  );
  const filteredGoals = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? route.params.goals.filter((goal) => goal.title.toLocaleLowerCase().includes(normalizedQuery))
      : route.params.goals;
  }, [query, route.params.goals]);

  function toggleGoal(goalId: string): void {
    setSelectedGoalIds((current) => {
      const next = new Set(current);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  }

  function finish(): void {
    navigation.popTo('TaskView', {
      draft: { ...route.params.draft, selectedGoalIds: [...selectedGoalIds] },
      goals: route.params.goals,
    });
  }

  return (
    <AppScreen mode="scroll" contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Goals"
        onPressBack={() => navigation.goBack()}
        backAccessibilityLabel="Back to task filters"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply"
            onPress={finish}
            style={({ pressed }) => [styles.applyButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        }
      />
      <View style={styles.searchField}>
        <AppIcon name="search" size={18} color={styles.optionIcon.color} decorative />
        <TextInput
          accessibilityLabel="Search goals"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Search goals"
          placeholderTextColor={styles.optionIcon.color}
          style={styles.searchInput}
          value={query}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear goal search"
            onPress={() => setQuery('')}
            style={styles.clearSearch}
          >
            <AppIcon name="close" size={16} color={styles.optionIcon.color} decorative />
          </Pressable>
        ) : null}
      </View>
      {selectedGoalIds.size > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear goal selection"
          onPress={() => setSelectedGoalIds(new Set())}
          style={styles.clearSelection}
        >
          <Text style={styles.resetText}>Clear selection</Text>
        </Pressable>
      ) : null}
      {filteredGoals.length === 0 ? (
        <EmptyState
          title={route.params.goals.length === 0 ? 'No goals available' : 'No matching goals'}
          description="Goals linked to tasks appear here."
          presentation="compact"
        />
      ) : (
        <View style={styles.optionList}>
          {filteredGoals.map((goal) => {
            const selected = selectedGoalIds.has(goal.id);
            return (
              <Pressable
                key={goal.id}
                testID={`task-goal-option-${goal.id}`}
                accessibilityRole="checkbox"
                accessibilityLabel={`Filter tasks to ${goal.title}`}
                accessibilityState={{ checked: selected }}
                onPress={() => toggleGoal(goal.id)}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected ? styles.optionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <AppIcon
                  name="goal"
                  size={18}
                  color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                  decorative
                />
                <Text numberOfLines={1} style={styles.optionLabel}>
                  {goal.title}
                </Text>
                <AppIcon
                  name={selected ? 'complete' : 'none'}
                  size={18}
                  color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                  decorative
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

export function TaskSortSelectionScreen({ route, navigation }: TaskSortSelectionScreenProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <AppScreen mode="scroll" contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Sort tasks"
        onPressBack={() => navigation.goBack()}
        backAccessibilityLabel="Back to task filters"
      />
      <View style={styles.optionList}>
        {TASK_SORT_OPTIONS.map((option) => {
          const selected = route.params.draft.sortBy === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() =>
                navigation.popTo('TaskView', {
                  draft: { ...route.params.draft, sortBy: option.value },
                  goals: route.params.goals,
                })
              }
              style={({ pressed }) => [styles.optionRow, pressed ? styles.pressed : null]}
            >
              <AppIcon
                name={option.icon}
                size={18}
                color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                decorative
              />
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selected ? (
                <AppIcon name="complete" size={18} color={styles.selectedIcon.color} decorative />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

function isDefaultTaskView(draft: TaskViewDraft): boolean {
  return (
    draft.taskFilter === DEFAULT_TASK_VIEW.taskFilter &&
    draft.groupBy === DEFAULT_TASK_VIEW.groupBy &&
    draft.sortBy === DEFAULT_TASK_VIEW.sortBy &&
    draft.selectedGoalIds.length === 0 &&
    draft.taskSearch.length === 0
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: spacing.xl, paddingBottom: spacing['3xl'] },
    section: { gap: spacing.sm },
    applyButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    applyText: { ...typography.helper, color: theme.colors.brand, fontWeight: '700' },
    sectionLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    segmentedControl: {
      flexDirection: 'row',
      gap: spacing.xs,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      padding: spacing.xs,
    },
    segmentOption: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.xs,
    },
    groupOption: { flexDirection: 'row', gap: spacing.xs },
    segmentOptionSelected: { backgroundColor: theme.colors.surfaceBrand },
    segmentLabel: { ...typography.caption, color: theme.colors.textPrimary, fontWeight: '600' },
    selectionRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: spacing.sm,
    },
    selectionCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    selectionLabel: { ...typography.helper, color: theme.colors.textPrimary, fontWeight: '600' },
    selectionValue: { ...typography.caption, color: theme.colors.textSecondary },
    resetButton: {
      minHeight: 44,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    resetText: { ...typography.helper, color: theme.colors.textPrimary, fontWeight: '600' },
    disabled: { opacity: 0.45 },
    searchField: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      paddingLeft: spacing.md,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      color: theme.colors.text,
      ...typography.helper,
    },
    clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    clearSelection: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center' },
    optionList: { gap: spacing.xs },
    optionRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.md,
    },
    optionSelected: { backgroundColor: theme.colors.surfaceBrand },
    optionLabel: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    pressed: { opacity: 0.72 },
  });
