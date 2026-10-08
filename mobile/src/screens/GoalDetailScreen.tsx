import { useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalTimeline, getGoalProgressPercent } from '../components/presentation/GoalPresentation';
import { TaskRow } from '../components/presentation/TaskRow';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { EmptyState } from '../components/ui/EmptyState';
import { AppIcon } from '../components/ui/AppIcon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { RowContextMenu } from '../components/ui/RowContextMenu';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import { spacing } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { GoalMilestoneWithTasks, GoalWithMilestones } from '../features/goals/goalTypes';
import { useGoals } from '../features/goals/useGoals';
import { sortGoalTasks } from '../features/goals/goalHelpers';
import { useTasks } from '../features/tasks/useTasks';
import { TaskRecord } from '../features/tasks/taskTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { AppTabParamList, PlanStackParamList } from '../navigation/navigationTypes';
import { TaskListRow, formatTaskDateLabel } from '../components/tasks/TaskListRow';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const DETAIL_TABS = ['tasks', 'overview'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

type GoalDetailScreenProps = {
  route: { params: PlanStackParamList['GoalDetail'] };
};

function formatTaskContext(task: TaskRecord, goal: GoalWithMilestones, locale?: string): string {
  const milestone = task.milestoneId
    ? goal.milestones.find((candidate) => candidate.id === task.milestoneId)
    : null;
  const date = task.dueDate ?? task.scheduledStart;
  const dateText = date
    ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : 'Unscheduled';
  return milestone ? `${milestone.title} · ${dateText}` : dateText;
}

export function GoalDetailScreen({ route }: GoalDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const { profile } = useUserProfile();
  const {
    goals,
    uiState,
    deleteGoal,
    activateGoalDraft,
    setGoalManuallyCompleted,
    reorderMilestones,
    retry,
  } = useGoals();
  const {
    tasks,
    completeTask,
    reactivateTask,
    deleteTask,
  } = useTasks();
  const [activeTab, setActiveTab] = useState<DetailTab>(
    route.params.initialTab === 'timeline' ? 'overview' : (route.params.initialTab ?? 'tasks'),
  );
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null);
  const [deleteGoalVisible, setDeleteGoalVisible] = useState(false);
  const [goalActionWorking, setGoalActionWorking] = useState(false);
  const [activatingDraft, setActivatingDraft] = useState(false);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  const goal = useMemo(
    () => goals.find((candidate) => candidate.id === route.params.goalId) ?? null,
    [goals, route.params.goalId],
  );
  const goalTasks = useMemo(
    () => sortGoalTasks(tasks.filter((task) => task.goalId === goal?.id)),
    [goal?.id, tasks],
  );
  const nextTask = goalTasks.find((task) => task.status === 'active') ?? null;

  function openMilestoneRoute(
    milestone: GoalMilestoneWithTasks,
    initialAction?: 'edit' | 'delete',
  ): void {
    if (!goal) return;
    if (initialAction === 'edit') {
      navigation.navigate('Plan', {
        screen: 'EditMilestone',
        params: { goalId: goal.id, milestoneId: milestone.id },
      });
      return;
    }
    navigation.navigate('Plan', {
      screen: 'MilestoneDetail',
      params: {
        goalId: goal.id,
        milestoneId: milestone.id,
        ...(initialAction === 'delete' ? { initialAction } : {}),
      },
    });
  }

  async function handleActivateDraft(): Promise<void> {
    if (!goal || !activateGoalDraft) return;
    setActivatingDraft(true);
    setDraftActionError(null);
    try {
      await activateGoalDraft(goal.id);
    } catch {
      setDraftActionError('Failed to activate goal draft.');
    } finally {
      setActivatingDraft(false);
    }
  }

  async function handleGoalCompletion(completed: boolean): Promise<void> {
    if (!goal || goalActionWorking) return;
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
    if (!goal || goalActionWorking) return;
    setGoalActionWorking(true);
    try {
      await deleteGoal(goal.id);
      setDeleteGoalVisible(false);
      navigation.goBack();
    } catch {
      Alert.alert('Unable to delete goal', 'Please try again.');
    } finally {
      setGoalActionWorking(false);
    }
  }

  async function handleDeleteTask(): Promise<void> {
    if (!pendingDeleteTask) return;
    try {
      await deleteTask(pendingDeleteTask.id);
      setPendingDeleteTask(null);
    } catch {
      Alert.alert('Unable to delete task', 'Please try again.');
    }
  }

  function confirmDeleteTask(task: TaskRecord): void {
    setPendingDeleteTask(task);
  }

  async function handleReactivateTask(task: TaskRecord): Promise<void> {
    if (goal?.status === 'draft') return;
    try {
      await reactivateTask(task.id);
    } catch {
      Alert.alert('Unable to reactivate task', 'Please try again.');
    }
  }

  async function handleToggleTask(task: TaskRecord): Promise<void> {
    await completeTask(task.id, { completionSource: 'manual' });
  }

  function renderTaskListRow(task: TaskRecord) {
    return (
      <TaskListRow
        key={task.id}
        task={task}
        dateLabel={formatTaskDateLabel(task, profile?.locale)}
        onPress={() =>
          navigation.navigate('Plan', { screen: 'TaskDetail', params: { taskId: task.id } })
        }
        onComplete={goal?.status === 'draft' ? undefined : () => handleToggleTask(task)}
        onReactivate={
          goal?.status === 'draft' || task.status !== 'completed'
            ? undefined
            : () => void handleReactivateTask(task)
        }
        onEdit={() =>
          navigation.navigate('Plan', { screen: 'EditTask', params: { taskId: task.id } })
        }
        onDelete={() => confirmDeleteTask(task)}
      />
    );
  }

  if (uiState === 'loading') {
    return (
      <View style={styles.screen}>
        <AppCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Loading goal...</Text>
          <Text style={styles.stateDescription}>Pulling in the goal and its milestones.</Text>
        </AppCard>
      </View>
    );
  }

  if (uiState === 'error') {
    return (
      <View style={styles.screen}>
        <RecoveryCard
          title="Unable to load goal."
          description="Check your connection, then retry."
          onRetry={retry}
        />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="goal"
          title="Goal unavailable"
          description="This goal may have been removed or is still syncing."
          actionLabel="Back to goals"
          onPressAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View
        testID="goal-detail-fixed-header"
        style={[styles.fixedHeader, { paddingTop: insets.top }]}
      >
        <ScreenHeader
          title="GOAL DETAILS"
          onPressBack={() => navigation.goBack()}
          backAccessibilityLabel="Back to goals"
          trailing={
            <RowContextMenu
              accessibilityLabel="Goal actions"
              menuAccessibilityLabel="Goal actions menu"
              disabled={goalActionWorking}
              items={[
                {
                  label: 'Edit',
                  accessibilityLabel: 'Edit goal',
                  icon: 'edit',
                  onPress: () =>
                    navigation.navigate('Plan', {
                      screen: 'EditGoal',
                      params: { goalId: goal.id },
                    }),
                },
                ...(goal.status === 'active'
                  ? [
                      {
                        label: 'Complete',
                        accessibilityLabel: 'Complete goal',
                        icon: 'complete' as const,
                        onPress: () => void handleGoalCompletion(true),
                      },
                    ]
                  : goal.status === 'completed'
                    ? [
                        {
                          label: 'Uncomplete',
                          accessibilityLabel: 'Uncomplete goal',
                          icon: 'refresh' as const,
                          onPress: () => void handleGoalCompletion(false),
                        },
                      ]
                    : []),
                {
                  label: 'Delete',
                  accessibilityLabel: 'Delete goal',
                  icon: 'delete',
                  tone: 'danger',
                  onPress: () => setDeleteGoalVisible(true),
                },
              ]}
            />
          }
        />
        <View testID="goal-detail-summary" style={styles.detailSummary}>
          <View style={styles.detailIdentityRow}>
            <View style={styles.detailIdentityIconFrame}>
              <AppIcon name="goal" size={20} color={styles.sectionIconColor.color} decorative />
            </View>
            <View style={styles.detailIdentityCopy}>
              <Text
                accessibilityRole="header"
                accessibilityLabel="Goal"
                style={styles.detailIdentityLabel}
              >
                GOAL
              </Text>
              <Text testID="goal-finish-date" style={styles.detailFinishDate}>
                Finish date:{' '}
                {goal.estimatedCompletionDate.toLocaleDateString(profile?.locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
          <Text testID="goal-detail-title" style={styles.detailTitle}>
            {goal.title}
          </Text>
          <View testID="goal-detail-progress" style={styles.goalProgressSection}>
            <View style={styles.detailIdentityIconFrame}>
              <AppIcon name="complete" size={17} color={styles.sectionIconColor.color} decorative />
            </View>
            <View style={styles.goalProgressCopy}>
              <Text accessibilityRole="header" style={styles.progressSectionTitle}>
                PROGRESS
              </Text>
              <ProgressBar
                accessibilityLabel={`Goal progress ${goal.title}`}
                value={getGoalProgressPercent(goal)}
                accessibilityValueText={`${getGoalProgressPercent(goal)}% complete`}
              />
              <Text style={styles.progressSummary}>
                {getGoalProgressPercent(goal)}% complete · {goal.progressText}
              </Text>
            </View>
          </View>
        </View>
        {goal.status === 'draft' ? (
          <View style={styles.section}>
            <AppButton
              label="Make Active"
              accessibilityLabel="Make goal active"
              onPress={() => void handleActivateDraft()}
              loading={activatingDraft}
              loadingLabel="Activating..."
            />
            {draftActionError ? (
              <Text style={styles.stateDescription}>{draftActionError}</Text>
            ) : null}
          </View>
        ) : null}
        <View accessibilityLabel="Goal detail tabs" style={styles.tabRow}>
          {DETAIL_TABS.map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
            >
              <Text style={[styles.tabLabel, activeTab === tab ? styles.tabLabelActive : null]}>
                {tab === 'tasks' ? 'Tasks' : 'Overview'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        testID="goal-detail-scroll"
        nestedScrollEnabled
        style={styles.detailScroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: spacing.xl + insets.bottom,
          },
        ]}
      >
        {activeTab === 'tasks' ? (
          <View style={styles.section}>
            <View testID="goal-next-up-header" style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Next Up
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add task"
                onPress={() => {
                  navigation.navigate('Plan', {
                    screen: 'CreateTask',
                    params: {
                      goalId: goal.id,
                      ...(goal.nextMilestone?.id ? { milestoneId: goal.nextMilestone.id } : {}),
                    },
                  });
                }}
                style={({ pressed }) => [styles.addItemButton, pressed && styles.textButtonPressed]}
              >
                <Text style={styles.addItemText}>+ Add Task</Text>
              </Pressable>
            </View>
            {nextTask ? (
              <AppCard style={styles.nextTaskCard}>
                <TaskRow
                  task={nextTask}
                  context={formatTaskContext(nextTask, goal, profile?.locale)}
                  onPress={() =>
                    navigation.navigate('Plan', {
                      screen: 'TaskDetail',
                      params: { taskId: nextTask.id },
                    })
                  }
                  onToggleComplete={
                    goal.status === 'draft' ? undefined : () => handleToggleTask(nextTask)
                  }
                  onEdit={() =>
                    navigation.navigate('Plan', {
                      screen: 'EditTask',
                      params: { taskId: nextTask.id },
                    })
                  }
                  onDelete={() => confirmDeleteTask(nextTask)}
                />
              </AppCard>
            ) : (
              <EmptyState
                title="No next task"
                description="Add a task to give this goal a clear next move."
                presentation="compact"
                style={styles.taskEmptyState}
              />
            )}
            <Text accessibilityRole="header" style={[styles.sectionTitle, styles.allTasksHeader]}>
              All tasks
            </Text>
            {goalTasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Tasks linked to this goal will appear here."
                presentation="compact"
                style={styles.taskEmptyState}
              />
            ) : (
              <View
                testID="goal-detail-task-list"
                accessibilityLabel="All goal tasks"
                style={styles.taskListContent}
              >
                {goalTasks.map(renderTaskListRow)}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.section, styles.overviewContent]}>
            <View
              testID="goal-overview-description-section"
              style={styles.overviewDescriptionSection}
            >
              <View style={styles.overviewDescriptionHeader}>
                <View style={styles.overviewDescriptionIconFrame}>
                  <AppIcon
                    name="document"
                    size={18}
                    color={styles.sectionIconColor.color}
                    decorative
                  />
                </View>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Description
                </Text>
              </View>
              <Text testID="goal-overview-description" style={styles.overviewDescription}>
                {goal.description || 'No description yet.'}
              </Text>
            </View>
            <View
              testID="goal-milestones-header"
              style={[styles.sectionHeader, styles.overviewMilestonesHeader]}
            >
              <View testID="goal-milestones-title" style={styles.overviewMilestonesTitle}>
                <View testID="goal-milestones-icon-frame" style={styles.overviewMilestoneIconFrame}>
                  <AppIcon
                    name="goalMilestone"
                    size={18}
                    color={styles.sectionIconColor.color}
                    decorative
                  />
                </View>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Milestones
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add milestone"
                onPress={() =>
                  navigation.navigate('Plan', {
                    screen: 'CreateMilestone',
                    params: { goalId: goal.id },
                  })
                }
                style={({ pressed }) => [styles.addItemButton, pressed && styles.textButtonPressed]}
              >
                <Text style={styles.addItemText}>+ Add Milestone</Text>
              </Pressable>
            </View>
            {goal.milestones.length === 0 ? (
              <EmptyState
                title="No milestones yet"
                description="Add one to break this goal into smaller steps."
                presentation="compact"
                style={styles.taskEmptyState}
              />
            ) : (
              <View
                testID="goal-detail-milestone-list"
                accessibilityLabel="Goal milestones"
                style={styles.milestoneTimeline}
              >
                <GoalTimeline
                  key={goal.id}
                  milestones={goal.milestones}
                  onPressMilestone={(milestone) => openMilestoneRoute(milestone)}
                  onEditMilestone={(milestone) => openMilestoneRoute(milestone, 'edit')}
                  onDeleteMilestone={(milestone) => openMilestoneRoute(milestone, 'delete')}
                  onReorderMilestones={(orderedMilestoneIds) =>
                    reorderMilestones(goal.id, orderedMilestoneIds)
                  }
                  showMilestoneIcon
                  renderMilestoneTasks={(milestone) => {
                    const milestoneTasks = goalTasks.filter(
                      (task) => task.milestoneId === milestone.id,
                    );
                    return (
                      <View
                        testID={`milestone-tasks-${milestone.id}`}
                        style={styles.milestoneTaskContent}
                      >
                        {milestoneTasks.length === 0 ? (
                          <Text style={styles.stateDescription}>No tasks in this milestone.</Text>
                        ) : (
                          <View
                            testID={`milestone-task-rows-${milestone.id}`}
                            style={[styles.taskListContent, styles.milestoneTaskListContent]}
                          >
                            {milestoneTasks.map(renderTaskListRow)}
                          </View>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add task to milestone ${milestone.title}`}
                          onPress={() =>
                            navigation.navigate('Plan', {
                              screen: 'CreateTask',
                              params: { goalId: goal.id, milestoneId: milestone.id },
                            })
                          }
                          style={({ pressed }) => [
                            styles.addItemButton,
                            pressed && styles.textButtonPressed,
                          ]}
                        >
                          <Text style={styles.addItemText}>+ Add Task</Text>
                        </Pressable>
                      </View>
                    );
                  }}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={pendingDeleteTask !== null}
        title="Delete task?"
        message={
          pendingDeleteTask ? `"${pendingDeleteTask.title}" will be permanently deleted.` : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete task"
        icon="delete"
        iconTone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => void handleDeleteTask()}
      />
      <ConfirmationModal
        visible={deleteGoalVisible}
        title="Delete goal?"
        message={`"${goal.title}" and its milestones will be permanently deleted. Tasks, calendar events, and notes will be kept with their goal and milestone links removed.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        confirmAccessibilityLabel="Confirm delete goal"
        icon="delete"
        iconTone="danger"
        loading={goalActionWorking}
        onCancel={() => setDeleteGoalVisible(false)}
        onConfirm={() => void handleDeleteGoal()}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    fixedHeader: {
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      gap: theme.spacing.md,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    detailScroll: { flex: 1 },
    stateCard: { margin: theme.layout.pagePaddingHorizontal, gap: theme.spacing.sm },
    stateTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    stateDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
    taskEmptyState: { alignItems: 'center' },
    detailSummary: { gap: theme.spacing.sm },
    detailIdentityRow: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    detailIdentityIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    detailIdentityCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
    detailIdentityLabel: {
      ...theme.typography.caption,
      color: theme.colors.brand,
      fontWeight: '700',
    },
    detailFinishDate: { ...theme.typography.caption, color: theme.colors.textSecondary },
    sectionIconColor: { color: theme.colors.brand },
    goalProgressSection: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    goalProgressCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
    progressSectionTitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    progressSummary: { ...theme.typography.caption, color: theme.colors.textSecondary },
    overviewDescription: { ...theme.typography.body, color: theme.colors.textPrimary },
    detailTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, flexShrink: 1 },
    tabRow: {
      flexDirection: 'row',
      padding: 4,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radii.lg,
    },
    tab: {
      flex: 1,
      minHeight: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    tabActive: { backgroundColor: theme.colors.surfaceBrand },
    tabLabel: { ...theme.typography.helper, color: theme.colors.textSecondary },
    tabLabelActive: { color: theme.colors.brand, fontWeight: '700' },
    section: { gap: theme.spacing.sm },
    overviewContent: { flexGrow: 1 },
    overviewDescriptionSection: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    overviewDescriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    overviewDescriptionIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    milestoneTimeline: { flexGrow: 1 },
    taskListContent: { gap: theme.spacing.sm },
    milestoneTaskContent: { gap: theme.spacing.sm },
    milestoneTaskListContent: {
      marginLeft: theme.spacing.md,
      paddingLeft: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
    },
    addItemButton: {
      minHeight: theme.layout.minimumTouchTarget,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.md,
    },
    addItemText: { ...theme.typography.label, color: theme.colors.brand, fontWeight: '700' },
    textButtonPressed: { opacity: 0.68 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionTitle: { ...theme.typography.label, color: theme.colors.textSecondary, flex: 1 },
    allTasksHeader: { marginTop: theme.spacing.sm },
    overviewMilestonesHeader: { marginTop: theme.spacing.md },
    overviewMilestonesTitle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    overviewMilestoneIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    nextTaskCard: { paddingVertical: theme.spacing.sm },
  });
