import { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GoalDetailsModal } from '../components/goals/GoalDetailsModal';
import { EditMilestoneModal } from '../components/goals/EditMilestoneModal';
import { MilestoneDetailModal } from '../components/goals/MilestoneDetailModal';
import { EmptyState } from '../components/ui/EmptyState';
import { AppScreen } from '../components/ui/AppScreen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useGoals } from '../features/goals/useGoals';
import { useUserProfile } from '../features/profile/useUserProfile';
import { TaskRecord } from '../features/tasks/taskTypes';
import { PlanStackParamList } from '../navigation/navigationTypes';

type EditGoalScreenProps = {
  route: { params: PlanStackParamList['EditGoal'] };
  navigation: NavigationProp<PlanStackParamList, 'EditGoal'>;
};

type MilestoneDetailScreenProps = {
  route: { params: PlanStackParamList['MilestoneDetail'] };
  navigation: NativeStackNavigationProp<PlanStackParamList, 'MilestoneDetail'>;
};

type EditMilestoneScreenProps = {
  route: { params: PlanStackParamList['EditMilestone'] };
  navigation: NavigationProp<PlanStackParamList, 'EditMilestone'>;
};

function UnavailableRoute({
  title,
  description,
  onPressBack,
  backAccessibilityLabel,
}: {
  title: string;
  description: string;
  onPressBack: () => void;
  backAccessibilityLabel: string;
}) {
  return (
    <AppScreen mode="unmanaged" contentContainerStyle={{ flex: 1 }}>
      <ScreenHeader
        title={title}
        onPressBack={onPressBack}
        backAccessibilityLabel={backAccessibilityLabel}
      />
      <EmptyState title="Unavailable" description={description} presentation="compact" />
    </AppScreen>
  );
}

export function EditGoalScreen({ route, navigation }: EditGoalScreenProps) {
  const { goals, updateGoal, activateGoalDraft, setGoalManuallyCompleted } = useGoals();
  const goal = goals.find((candidate) => candidate.id === route.params.goalId) ?? null;

  if (!goal) {
    return (
      <UnavailableRoute
        title="Edit Goal"
        description="This goal may have been removed."
        onPressBack={navigation.goBack}
        backAccessibilityLabel="Back to goal details"
      />
    );
  }

  return (
    <AppScreen mode="unmanaged" testID="edit-goal-route-screen" contentContainerStyle={{ flex: 1 }}>
      <GoalDetailsModal
        goal={goal}
        visible
        embedded
        initialEditMode
        backAccessibilityLabel="Back to goal details"
        onClose={navigation.goBack}
        onSaveGoal={async (goalId, fields) => {
          await updateGoal(goalId, fields);
          navigation.goBack();
        }}
        onActivateDraft={activateGoalDraft}
        onToggleGoalManualCompletion={async (goalId, completed) => {
          await setGoalManuallyCompleted(goalId, completed);
          navigation.goBack();
        }}
      />
    </AppScreen>
  );
}

export function MilestoneDetailScreen({ route, navigation }: MilestoneDetailScreenProps) {
  const { profile } = useUserProfile();
  const { goals, deleteMilestone } = useGoals();
  const goal = goals.find((candidate) => candidate.id === route.params.goalId) ?? null;
  const milestone =
    goal?.milestones.find((candidate) => candidate.id === route.params.milestoneId) ?? null;

  if (!goal || !milestone) {
    return (
      <UnavailableRoute
        title="Milestone Details"
        description="This milestone may have been removed."
        onPressBack={navigation.goBack}
        backAccessibilityLabel="Back to goal details"
      />
    );
  }

  return (
    <AppScreen mode="unmanaged" testID="milestone-route-screen" contentContainerStyle={{ flex: 1 }}>
      <MilestoneDetailModal
        goalTitle={goal.title}
        milestone={milestone}
        visible
        embedded
        initialAction={route.params.initialAction ?? null}
        locale={profile?.locale}
        onClose={navigation.goBack}
        onDeleteMilestone={async (selectedMilestone) => {
          await deleteMilestone(selectedMilestone.id);
        }}
        onEdit={(selectedMilestone) =>
          navigation.push('EditMilestone', {
            goalId: goal.id,
            milestoneId: selectedMilestone.id,
          })
        }
        onAddTask={(selectedMilestone) =>
          navigation.navigate('CreateTask', {
            goalId: goal.id,
            milestoneId: selectedMilestone.id,
          })
        }
        onOpenTask={(task: TaskRecord) => navigation.navigate('TaskDetail', { taskId: task.id })}
      />
    </AppScreen>
  );
}

export function EditMilestoneScreen({ route, navigation }: EditMilestoneScreenProps) {
  const { goals, updateMilestone } = useGoals();
  const goal = goals.find((candidate) => candidate.id === route.params.goalId) ?? null;
  const milestone =
    goal?.milestones.find((candidate) => candidate.id === route.params.milestoneId) ?? null;

  if (!goal || !milestone) {
    return (
      <UnavailableRoute
        title="Edit Milestone"
        description="This milestone may have been removed."
        onPressBack={navigation.goBack}
        backAccessibilityLabel="Back to milestone details"
      />
    );
  }

  return (
    <AppScreen
      mode="unmanaged"
      testID="edit-milestone-route-screen"
      contentContainerStyle={{ flex: 1 }}
    >
      <EditMilestoneModal
        milestone={milestone}
        visible
        embedded
        goalEstimatedCompletionDate={goal.estimatedCompletionDate}
        onClose={navigation.goBack}
        onSaveMilestone={updateMilestone}
      />
    </AppScreen>
  );
}
