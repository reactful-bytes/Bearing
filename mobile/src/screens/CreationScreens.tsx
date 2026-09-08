import { useState } from 'react';
import { Text } from 'react-native';

import { AddEventModal } from '../components/calendar/AddEventModal';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { AddNoteModal } from '../components/notes/AddNoteModal';
import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { AppScreen } from '../components/ui/AppScreen';
import { useCalendarPublication } from '../features/calendar/useCalendarPublication';
import { useCreateNote, useNotes } from '../features/notes/useNotes';
import { hasActivePremiumStatus, PremiumFeature } from '../features/premium/premiumAccess';
import { usePremiumEntitlement } from '../features/premium/usePremiumEntitlement';
import { useGoals } from '../features/goals/useGoals';
import { useTasks } from '../features/tasks/useTasks';
import { useUserProfile } from '../features/profile/useUserProfile';
import {
  CalendarStackParamList,
  NotesStackParamList,
  PlanStackParamList,
} from '../navigation/navigationTypes';
import {
  generateAiGoalPlanDraft,
  getAiCreditStatus,
} from '../services/firebase/firebaseAiGoalPlans';

type CreationNavigation = {
  goBack?: () => void;
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

export function CreateGoalScreen({ navigation }: CreateGoalScreenProps) {
  const { authUser, isAnonymous } = useUserProfile();
  const { entitlement, uiState: entitlementUiState } = usePremiumEntitlement(authUser?.uid ?? null);
  const { createGoal } = useGoals();
  const [premiumPaywallFeature, setPremiumPaywallFeature] = useState<PremiumFeature | null>(null);
  const hasPremiumAccess = hasActivePremiumStatus(entitlement?.status);

  return (
    <AppScreen mode="unmanaged">
      <CreateGoalModal
        visible
        onClose={() => navigation?.goBack?.()}
        onSave={createGoal}
        hasPremiumAccess={hasPremiumAccess}
        isPremiumStatusResolved={entitlementUiState === 'ready'}
        onOpenPremiumPaywall={() => setPremiumPaywallFeature('ai_goal_builder')}
        onGenerateAiPlan={generateAiGoalPlanDraft}
        onLoadAiCreditStatus={getAiCreditStatus}
        creditPackUserId={!isAnonymous ? (authUser?.uid ?? null) : null}
      />
      <PremiumPaywallModal
        visible={premiumPaywallFeature !== null}
        feature={premiumPaywallFeature}
        userId={authUser?.uid ?? null}
        isAnonymous={isAnonymous}
        hasPremiumAccess={hasPremiumAccess}
        onClose={() => setPremiumPaywallFeature(null)}
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
        onClose={() => navigation?.goBack?.()}
        onSave={createTask}
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
        onClose={() => navigation?.goBack?.()}
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
        initialValues={{
          goalId: params?.goalId ?? null,
          stepId: params?.stepId ?? null,
        }}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={profile?.timeFormat}
        onClose={() => navigation?.goBack?.()}
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
  const [premiumPaywallFeature, setPremiumPaywallFeature] = useState<PremiumFeature | null>(null);
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
        onClose={() => navigation?.goBack?.()}
        onSave={createGoal}
        hasPremiumAccess={hasPremiumAccess}
        isPremiumStatusResolved={entitlementUiState === 'ready'}
        onOpenPremiumPaywall={() => setPremiumPaywallFeature('ai_goal_builder')}
        onGenerateAiPlan={generateAiGoalPlanDraft}
        onLoadAiCreditStatus={getAiCreditStatus}
        creditPackUserId={!isAnonymous ? (authUser?.uid ?? null) : null}
      />
      <PremiumPaywallModal
        visible={premiumPaywallFeature !== null}
        feature={premiumPaywallFeature}
        userId={authUser?.uid ?? null}
        isAnonymous={isAnonymous}
        hasPremiumAccess={hasPremiumAccess}
        onClose={() => setPremiumPaywallFeature(null)}
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
        onClose={() => navigation?.goBack?.()}
        onSave={async (input, options) => {
          await createEvent(input, options);
        }}
      />
    </AppScreen>
  );
}
