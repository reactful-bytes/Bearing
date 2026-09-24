import type { NavigatorScreenParams } from '@react-navigation/native';

import type { LegalDocumentId } from '../features/profile/legalDocuments';
import type { PremiumFeature } from '../features/premium/premiumAccess';

export type CalendarFocusLaunch = {
  token: string;
  eventId: string;
  title: string;
  description: string;
  startAtIso: string;
  endAtIso: string;
  timezone: string;
};

export type PlanStackParamList = {
  PlanHome: undefined;
  Goals: { createGoal?: boolean } | undefined;
  Tasks: { createTask?: boolean } | undefined;
  GoalDetail: { goalId: string; initialTab?: 'tasks' | 'timeline' };
  FocusMode:
    | {
        eventId?: string;
        taskId?: string;
        title?: string;
        description?: string;
        startAtIso?: string;
        endAtIso?: string;
        timezone?: string;
        returnTo?: string;
      }
    | undefined;
  CreateGoal: { sourceNoteId?: string } | undefined;
  CreateTask: { goalId?: string; taskId?: string } | undefined;
};

export type CalendarStackParamList = {
  CalendarHome:
    { focusLaunch?: CalendarFocusLaunch; createEvent?: boolean; dateIso?: string } | undefined;
  EventDetail: { eventId: string; dateIso?: string };
  EventEdit: { eventId: string; dateIso?: string };
  CalendarSources: undefined;
  CreateEvent: { goalId?: string; taskId?: string; returnTo?: string } | undefined;
  CreateTask: { goalId?: string; taskId?: string; returnTo?: string } | undefined;
};

export type NotesStackParamList = {
  NotesHome: { createNote?: boolean } | undefined;
  CreateNote: { sourceEventId?: string; sourceTaskId?: string } | undefined;
  NoteEditor: { noteId?: string; sourceEventId?: string; sourceTaskId?: string } | undefined;
  CreateGoalFromNote: { noteId: string };
  CreateTaskFromNote: { noteId: string };
  CreateEventFromNote: { noteId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  PersonalInformation: undefined;
  Security: undefined;
  Notifications: undefined;
  FocusPreferences: undefined;
  Appearance: undefined;
  DeviceCalendars: undefined;
  CalendarExport: undefined;
  TipsWisdom: undefined;
  AiCredits: undefined;
  DataExport: undefined;
  DeleteAccount: undefined;
  PremiumPaywall: { feature: PremiumFeature; source: PremiumEntryPoint };
  LegalDocument: { documentId: LegalDocumentId; bottomInset?: boolean };
};

export type PremiumEntryPoint = 'profile' | 'ai_goal_builder';

export type RootStackParamList = {
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Notes: NavigatorScreenParams<NotesStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  PremiumPaywall: { feature: PremiumFeature; source: PremiumEntryPoint };
  LegalDocument: { documentId: LegalDocumentId; bottomInset?: boolean };
};

export type AppTabParamList = {
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Notes: NavigatorScreenParams<NotesStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
