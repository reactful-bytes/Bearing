import { useEffect, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { GoalFilterModal } from '../components/goals/GoalFilterModal';
import type { GoalFilterOption, GoalTargetDateFilter } from '../components/goals/GoalFilterModal';
import { GoalCard } from '../components/presentation/GoalPresentation';
import type { GoalFilter } from '../components/presentation/GoalPresentation';
import { AppCard } from '../components/ui/AppCard';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { EmptyState } from '../components/ui/EmptyState';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppIcon } from '../components/ui/AppIcon';
import { FilterSortToolbar } from '../components/ui/FilterSortToolbar';
import { SortOptionsModal } from '../components/ui/SortOptionsModal';
import { layout, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { CreateGoalInput, GoalWithMilestones } from '../features/goals/goalTypes';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useUserProfile } from '../features/profile/useUserProfile';
import { useGoals } from '../features/goals/useGoals';
import { PlanStackParamList, RootStackParamList } from '../navigation/navigationTypes';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function matchesGoalTargetDate(goal: GoalWithMilestones, filter: GoalTargetDateFilter): boolean {
  if (filter === 'any') return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'pastDue') {
    return goal.status === 'active' && goal.estimatedCompletionDate < todayStart;
  }

  const rangeStart =
    filter === 'thisWeek'
      ? new Date(
          todayStart.getFullYear(),
          todayStart.getMonth(),
          todayStart.getDate() - ((todayStart.getDay() + 6) % 7),
        )
      : new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const rangeEnd =
    filter === 'thisWeek'
      ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + 7)
      : new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1);

  return goal.estimatedCompletionDate >= rangeStart && goal.estimatedCompletionDate < rangeEnd;
}

type GoalSortBy =
  | 'targetDate:asc'
  | 'targetDate:desc'
  | 'updatedAt:desc'
  | 'updatedAt:asc'
  | 'title:asc'
  | 'title:desc';

const goalSortOptions = [
  {
    value: 'targetDate:asc',
    label: 'Target date soonest',
    summary: 'Target date ↑',
    icon: 'dateAscending',
  },
  {
    value: 'targetDate:desc',
    label: 'Target date latest',
    summary: 'Target date ↓',
    icon: 'dateDescending',
  },
  {
    value: 'updatedAt:desc',
    label: 'Updated newest',
    summary: 'Updated ↓',
    icon: 'updatedDescending',
  },
  {
    value: 'updatedAt:asc',
    label: 'Updated oldest',
    summary: 'Updated ↑',
    icon: 'updatedAscending',
  },
  { value: 'title:asc', label: 'Title A to Z', summary: 'Title A-Z', icon: 'textAscending' },
  { value: 'title:desc', label: 'Title Z to A', summary: 'Title Z-A', icon: 'textDescending' },
] as const;

type GoalsScreenProps = {
  route?: { params?: PlanStackParamList['Goals'] };
  navigation?: {
    setParams?: (params: PlanStackParamList['Goals']) => void;
    navigate?: (
      screen: 'GoalDetail' | 'EditGoal' | 'PremiumPaywall',
      params:
        | PlanStackParamList['GoalDetail']
        | PlanStackParamList['EditGoal']
        | RootStackParamList['PremiumPaywall'],
    ) => void;
    goBack?: () => void;
    getParent?: () =>
      | {
          navigate?: (screen: string, params?: Record<string, unknown>) => void;
        }
      | undefined;
  };
};

export function GoalsScreen({ route, navigation }: GoalsScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const stackNavigation = useNavigation<NavigationProp<PlanStackParamList>>();
  const insets = useSafeAreaInsets();
  const { authUser, isAnonymous } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const {
    goals,
    uiState,
    createGoal,
    createGoalDraft,
    saveGoalDraft,
    activateGoalDraft,
    deleteGoal,
    setGoalManuallyCompleted,
    retry,
  } = useGoals();
  const [createGoalVisible, setCreateGoalVisible] = useState(false);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<GoalWithMilestones | null>(null);
  const [goalActionWorking, setGoalActionWorking] = useState(false);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const [goalTargetDateFilter, setGoalTargetDateFilter] = useState<GoalTargetDateFilter>('any');
  const [goalSearch, setGoalSearch] = useState('');
  const [goalSortBy, setGoalSortBy] = useState<GoalSortBy>('targetDate:asc');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status, entitlement?.periodEndAt);

  useEffect(() => {
    if (!route?.params?.createGoal) {
      return;
    }

    setCreateGoalVisible(true);
    navigation?.setParams?.({ createGoal: undefined });
  }, [navigation, route?.params?.createGoal]);

  const activeGoalCount = useMemo(
    () => goals.filter((goal) => goal.status === 'active').length,
    [goals],
  );
  const draftGoalCount = goals.filter((goal) => goal.status === 'draft').length;
  const completedGoalCount = goals.filter((goal) => goal.status === 'completed').length;
  const archivedGoalCount = goals.filter((goal) => goal.status === 'archived').length;
  const goalFilterOptions: GoalFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All goals', count: goals.length },
      { value: 'draft' as const, label: 'Draft', count: draftGoalCount },
      { value: 'active' as const, label: 'Current', count: activeGoalCount },
      { value: 'completed' as const, label: 'Completed', count: completedGoalCount },
      { value: 'archived' as const, label: 'Archived', count: archivedGoalCount },
    ],
    [activeGoalCount, archivedGoalCount, completedGoalCount, draftGoalCount, goals.length],
  );
  const visibleGoals = useMemo(() => {
    const normalizedQuery = goalSearch.trim().toLocaleLowerCase();
    const filtered = goals.filter((goal) => {
      const matchesStatus = goalFilter === 'all' || goal.status === goalFilter;
      const matchesTargetDate = matchesGoalTargetDate(goal, goalTargetDateFilter);
      const matchesSearch =
        !normalizedQuery ||
        goal.title.toLocaleLowerCase().includes(normalizedQuery) ||
        goal.description.toLocaleLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesTargetDate && matchesSearch;
    });
    const [sortKey, direction] = goalSortBy.split(':') as [string, 'asc' | 'desc'];
    const multiplier = direction === 'asc' ? 1 : -1;
    return filtered.sort((left, right) => {
      if (sortKey === 'title') return left.title.localeCompare(right.title) * multiplier;
      if (sortKey === 'updatedAt') {
        return (
          (left.updatedAt.getTime() - right.updatedAt.getTime()) * multiplier ||
          left.title.localeCompare(right.title)
        );
      }
      return (
        (left.estimatedCompletionDate.getTime() - right.estimatedCompletionDate.getTime()) *
          multiplier || left.title.localeCompare(right.title)
      );
    });
  }, [goalFilter, goalSearch, goalSortBy, goalTargetDateFilter, goals]);

  const selectedGoalFilter = goalFilterOptions.find((option) => option.value === goalFilter)!;
  const targetDateFilterLabel =
    goalTargetDateFilter === 'pastDue'
      ? 'Past due'
      : goalTargetDateFilter === 'thisWeek'
        ? 'This week'
        : goalTargetDateFilter === 'thisMonth'
          ? 'This month'
          : null;
  const goalFilterSummary = [selectedGoalFilter.label, targetDateFilterLabel]
    .filter(Boolean)
    .join(' · ');
  const selectedGoalSort = goalSortOptions.find((option) => option.value === goalSortBy)!;

  async function handleCreateGoal(input: CreateGoalInput): Promise<void> {
    await createGoal(input);
    setGoalFilter('active');
    setCreateGoalVisible(false);
  }

  async function handleCreateGoalDraft(input: CreateGoalInput): Promise<string> {
    if (!createGoalDraft) throw new Error('Goal draft creation is unavailable.');
    const goalId = await createGoalDraft(input);
    setGoalFilter('draft');
    return goalId;
  }

  async function handleActivateGoalDraft(goalId: string): Promise<void> {
    if (!activateGoalDraft) throw new Error('Goal draft activation is unavailable.');
    await activateGoalDraft(goalId);
    setGoalFilter('active');
  }

  async function handleGoalCompletion(goal: GoalWithMilestones, completed: boolean): Promise<void> {
    if (goalActionWorking) return;
    setGoalActionWorking(true);
    try {
      await setGoalManuallyCompleted(goal.id, completed);
    } catch (error) {
      Alert.alert(
        'Unable to update goal',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setGoalActionWorking(false);
    }
  }

  async function handleDeleteGoal(): Promise<void> {
    if (!pendingDeleteGoal || goalActionWorking) return;
    setGoalActionWorking(true);
    try {
      await deleteGoal(pendingDeleteGoal.id);
      setPendingDeleteGoal(null);
    } catch {
      Alert.alert('Unable to delete goal', 'Please try again.');
    } finally {
      setGoalActionWorking(false);
    }
  }

  function openGoal(goal: GoalWithMilestones, initialAction?: 'edit'): void {
    const screen = initialAction ? 'EditGoal' : 'GoalDetail';
    if (navigation?.navigate) {
      navigation.navigate(screen, { goalId: goal.id });
      return;
    }
    stackNavigation.navigate(screen, { goalId: goal.id });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top },
          { paddingBottom: spacing['3xl'] + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Goals"
          onPressBack={() => {
            if (navigation?.goBack) {
              navigation.goBack();
            } else {
              navigation?.getParent?.()?.navigate?.('Plan');
            }
          }}
        />
        <View style={styles.goalSearchField}>
          <AppIcon name="search" size={18} color={styles.searchIcon.color} decorative />
          <TextInput
            accessibilityLabel="Search goals by title or description"
            autoCapitalize="none"
            onChangeText={setGoalSearch}
            placeholder="Search goals"
            placeholderTextColor={styles.searchPlaceholder.color}
            returnKeyType="search"
            style={styles.goalSearchInput}
            value={goalSearch}
          />
          {goalSearch.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear goal search"
              onPress={() => setGoalSearch('')}
              style={styles.clearGoalSearch}
            >
              <AppIcon name="close" size={16} color={styles.searchIcon.color} decorative />
            </Pressable>
          ) : null}
        </View>
        <FilterSortToolbar
          testID="goal-filter-sort-toolbar"
          filterSummary={goalFilterSummary}
          sortSummary={selectedGoalSort.summary}
          filterAccessibilityLabel="Filter goals"
          sortAccessibilityLabel="Sort goals"
          onPressFilter={() => setFilterModalVisible(true)}
          onPressSort={() => setSortModalVisible(true)}
        />
        <View style={styles.goalsListHeader}>
          <Text accessibilityRole="header" style={styles.goalsListTitle}>
            {goalFilter === 'all' ? 'All goals' : `${selectedGoalFilter.label} goals`}
          </Text>
          <Text style={styles.goalsListCount}>
            {visibleGoals.length} {visibleGoals.length === 1 ? 'goal' : 'goals'}
          </Text>
        </View>

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading goals...</Text>
            <Text style={styles.stateDescription}>
              Pulling in your goals, milestones, and task progress.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <RecoveryCard
            title="Unable to load goals."
            description="Check your connection, then retry."
            onRetry={retry}
          />
        ) : null}

        {(uiState === 'empty' || uiState === 'ready') && visibleGoals.length === 0 ? (
          <EmptyState
            presentation="compact"
            style={styles.emptyState}
            title={
              goalSearch.trim() || goalTargetDateFilter !== 'any'
                ? 'No matching goals.'
                : goalFilter === 'draft'
                  ? 'No goal drafts.'
                  : goalFilter === 'active'
                    ? 'No active goals.'
                    : goalFilter === 'completed'
                      ? 'No completed goals.'
                      : goalFilter === 'archived'
                        ? 'No archived goals.'
                        : 'No goals yet.'
            }
            description={
              goalSearch.trim() || goalTargetDateFilter !== 'any'
                ? 'Try a different search or filter.'
                : goalFilter === 'draft'
                  ? 'Goals saved for later will appear here.'
                  : goalFilter === 'active'
                    ? 'Create a goal to start building a step-by-step plan.'
                    : goalFilter === 'completed'
                      ? 'Goals you finish will stay available here.'
                      : goalFilter === 'archived'
                        ? 'Archived goals will stay available here for reference.'
                        : 'Create your first goal to start building a step-by-step plan.'
            }
          />
        ) : null}

        {(uiState === 'ready' || uiState === 'empty') && visibleGoals.length > 0 ? (
          <View style={styles.goalsRows}>
            {visibleGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatDate={formatDate}
                onPress={() => openGoal(goal)}
                onEdit={() => openGoal(goal, 'edit')}
                onComplete={
                  goal.status === 'active' ? () => void handleGoalCompletion(goal, true) : undefined
                }
                onUncomplete={
                  goal.status === 'completed'
                    ? () => void handleGoalCompletion(goal, false)
                    : undefined
                }
                onDelete={() => setPendingDeleteGoal(goal)}
                actionsDisabled={goalActionWorking}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <CreateGoalModal
        visible={createGoalVisible}
        onClose={() => setCreateGoalVisible(false)}
        onSave={handleCreateGoal}
        onCreateDraft={createGoalDraft ? handleCreateGoalDraft : undefined}
        onSaveDraft={saveGoalDraft}
        onActivateDraft={activateGoalDraft ? handleActivateGoalDraft : undefined}
        hasPremiumAccess={hasPremiumAccess}
        isPremiumStatusResolved={entitlementUiState === 'ready'}
        onOpenPremiumPaywall={() =>
          navigation?.navigate?.('PremiumPaywall', {
            feature: 'ai_goal_builder',
            source: 'ai_goal_builder',
          })
        }
        onGenerateAiPlan={generateAiGoalPlanDraft}
        onLoadAiCreditStatus={getAiCreditStatus}
        creditPackUserId={!isAnonymous ? (authUser?.uid ?? null) : null}
      />

      <ConfirmationModal
        visible={pendingDeleteGoal !== null}
        title="Delete goal?"
        message={
          pendingDeleteGoal
            ? `"${pendingDeleteGoal.title}" and its milestones will be permanently deleted. Tasks, calendar events, and notes will be kept with their goal and milestone links removed.`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete goal"
        icon="delete"
        iconTone="danger"
        loading={goalActionWorking}
        onCancel={() => setPendingDeleteGoal(null)}
        onConfirm={() => void handleDeleteGoal()}
      />

      <GoalFilterModal
        visible={filterModalVisible}
        selectedFilter={goalFilter}
        selectedTargetDateFilter={goalTargetDateFilter}
        options={goalFilterOptions}
        onClose={() => setFilterModalVisible(false)}
        onApply={(filter, targetDateFilter) => {
          setGoalFilter(filter);
          setGoalTargetDateFilter(targetDateFilter);
          setFilterModalVisible(false);
        }}
      />
      <SortOptionsModal
        visible={sortModalVisible}
        title="Sort goals"
        accessibilityLabelPrefix="Sort goals by"
        selectedValue={goalSortBy}
        options={goalSortOptions}
        onClose={() => setSortModalVisible(false)}
        onApply={(value) => {
          setGoalSortBy(value);
          setSortModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: layout.pagePaddingHorizontal,
      paddingVertical: layout.pagePaddingVertical,
      gap: spacing.xl,
    },
    stateTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    stateDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
      marginTop: spacing.sm,
    },
    emptyState: { alignSelf: 'stretch', alignItems: 'center' },
    goalSearchField: {
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
    searchIcon: { color: theme.colors.textSecondary },
    searchPlaceholder: { color: theme.colors.textSecondary },
    goalSearchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      color: theme.colors.text,
      ...typography.helper,
    },
    clearGoalSearch: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalsListHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    goalsListTitle: { ...typography.button, color: theme.colors.text },
    goalsListCount: { ...typography.caption, color: theme.colors.textSecondary },
    goalsRows: { gap: spacing.xs },
  });
