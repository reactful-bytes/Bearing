import { Text } from 'react-native';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { AddNoteModal } from '../components/notes/AddNoteModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { AppScreen } from '../components/ui/AppScreen';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useCreateNote, useNotes } from '../features/notes/useNotes';
import { hasActivePremiumStatus } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import {
  CalendarStackParamList,
  NotesStackParamList,
  PlanStackParamList,
  RootStackParamList,
} from '../navigation/navigationTypes';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

type CreationNavigation = {
  canGoBack?: () => boolean;
  goBack?: () => void;
  navigate?: (
    screen: string,
    params?: Record<string, unknown> | RootStackParamList['PremiumPaywall'],
  ) => void;
  replace?: (screen: string) => void;
};

type CreateGoalScreenProps = {
  navigation?: CreationNavigation;
};

type CreateTaskScreenProps = {
  route?: { params?: PlanStackParamList['CreateTask'] };
  navigation?: CreationNavigation;
};

type CreateNoteScreenProps = {
  route?: { params?: NotesStackParamList['NoteEditor'] };
  navigation?: CreationNavigation;
};

type CreateEventScreenProps = {
  route?: { params?: CalendarStackParamList['CreateEvent'] };
  navigation?: CreationNavigation;
};

type NoteConversionProps = {
  route?: { params?: { noteId: string } };
  navigation?: CreationNavigation;
};

function NoteConversionMissing() {
  return <Text>Note unavailable.</Text>;
}

function dismissCreationScreen(
  navigation: CreationNavigation | undefined,
  fallbackRoute: string,
): void {
  if (navigation?.canGoBack?.() === true) {
    navigation.goBack?.();
    return;
  }

  if (navigation?.replace) {
    navigation.replace(fallbackRoute);
    return;
  }

  if (navigation?.navigate) {
    navigation.navigate(fallbackRoute);
    return;
  }

  navigation?.goBack?.();
}

export function CreateGoalScreen({ navigation }: CreateGoalScreenProps) {
  const { authUser, isAnonymous } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const { createGoal } = useGoals();
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);

  return (
    <AppScreen mode="unmanaged">
      <CreateGoalModal
        visible
        onClose={() => dismissCreationScreen(navigation, 'PlanHome')}
        onSave={createGoal}
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
    </AppScreen>
  );
}

export function CreateTaskScreen({ route, navigation }: CreateTaskScreenProps) {
  const { createTask } = useTasks();
  const params = route?.params;

  return (
    <AppScreen mode="unmanaged">
      <AddTaskModal
        visible
        onClose={() => dismissCreationScreen(navigation, 'PlanHome')}
        onSave={createTask}
        fullScreen
        initialGoalId={params?.goalId ?? null}
        initialStepId={params?.stepId ?? null}
      />
    </AppScreen>
  );
}

export function CreateNoteScreen({ route, navigation }: CreateNoteScreenProps) {
  const createNote = useCreateNote();
  const params = route?.params;

  return (
    <AppScreen mode="unmanaged">
      <AddNoteModal
        visible
        onClose={() => dismissCreationScreen(navigation, 'NotesHome')}
        fullScreen
        sourceEventId={params?.sourceEventId ?? null}
        sourceStepId={params?.sourceStepId ?? null}
        onSave={createNote}
      />
    </AppScreen>
  );
}

export function CreateEventScreen({ route, navigation }: CreateEventScreenProps) {
  const { profile } = useUserProfile();
  const { createEvent, publicationCalendarTitle } = useCalendarPublication();
  const params = route?.params;

  return (
    <AppScreen mode="unmanaged">
      <AddEventModal
        visible
        initialDate={new Date()}
        fullScreen
        initialValues={{
          goalId: params?.goalId ?? null,
          stepId: params?.stepId ?? null,
        }}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => dismissCreationScreen(navigation, 'CalendarHome')}
        onSave={async (input, options) => {
          await createEvent(input, options);
        }}
      />
    </AppScreen>
  );
}

export function CreateGoalFromNoteScreen({ route, navigation }: NoteConversionProps) {
  const { notes } = useNotes();
  const note = notes.find((item) => item.id === route?.params?.noteId);
  const { authUser, isAnonymous } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const { createGoal } = useGoals();
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);

  if (!note) {
    return (
      <AppScreen mode="unmanaged">
        <NoteConversionMissing />
      </AppScreen>
    );
  }

  return (
    <AppScreen mode="unmanaged">
      <CreateGoalModal
        visible
        initialTitle={note.title}
        initialDescription={note.body}
        onClose={() => dismissCreationScreen(navigation, 'NotesHome')}
        onSave={createGoal}
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
    </AppScreen>
  );
}

export function CreateTaskFromNoteScreen({ route, navigation }: NoteConversionProps) {
  const { notes } = useNotes();
  const note = notes.find((item) => item.id === route?.params?.noteId);
  const { createTask } = useTasks();

  if (!note) {
    return (
      <AppScreen mode="unmanaged">
        <NoteConversionMissing />
      </AppScreen>
    );
  }

  return (
    <AppScreen mode="unmanaged">
      <AddTaskModal
        visible
        initialTitle={note.title}
        initialDescription={note.body}
        onClose={() => navigation?.goBack?.()}
        onSave={createTask}
      />
    </AppScreen>
  );
}

export function CreateEventFromNoteScreen({ route, navigation }: NoteConversionProps) {
  const { notes } = useNotes();
  const note = notes.find((item) => item.id === route?.params?.noteId);
  const { profile } = useUserProfile();
  const { createEvent, publicationCalendarTitle } = useCalendarPublication();

  if (!note) {
    return (
      <AppScreen mode="unmanaged">
        <NoteConversionMissing />
      </AppScreen>
    );
  }

  return (
    <AppScreen mode="unmanaged">
      <AddEventModal
        visible
        initialDate={new Date()}
        initialValues={{ title: note.title, description: note.body }}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => dismissCreationScreen(navigation, 'NotesHome')}
        onSave={async (input, options) => {
          await createEvent(input, options);
        }}
      />
    </AppScreen>
  );
}
