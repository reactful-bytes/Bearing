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

export type TaskFilter = 'active' | 'completed' | 'all';
export type TaskGroupBy = 'goal' | 'unlinked' | 'all';
export type TaskSortBy =
  'dueDate:asc' | 'dueDate:desc' | 'updated:asc' | 'updated:desc' | 'title:asc' | 'title:desc';

export type PlanStackParamList = {
  PlanHome: undefined;
  Goals: { createGoal?: boolean } | undefined;
  Tasks: { createTask?: boolean } | undefined;
  TaskDetail: { taskId: string };
  EditTask: { taskId: string };
  GoalDetail: {
    goalId: string;
    initialTab?: 'tasks' | 'overview' | 'timeline';
  };
  EditGoal: { goalId: string };
  MilestoneDetail: {
    goalId: string;
    milestoneId: string;
    initialAction?: 'delete';
  };
  EditMilestone: { goalId: string; milestoneId: string };
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
  CreateTask: { goalId?: string; milestoneId?: string } | undefined;
  CreateMilestone: { goalId: string };
};

export type CalendarStackParamList = {
  CalendarHome:
    { focusLaunch?: CalendarFocusLaunch; createEvent?: boolean; dateIso?: string } | undefined;
  EventDetail: { eventId: string; dateIso?: string };
  EventEdit: { eventId: string; dateIso?: string };
  CalendarSources: undefined;
  CreateEvent: { goalId?: string; milestoneId?: string; returnTo?: string } | undefined;
  CreateTask: { goalId?: string; milestoneId?: string; returnTo?: string } | undefined;
};

export type NotesStackParamList = {
  NotesHome: { createNote?: boolean; resetView?: boolean } | undefined;
  NoteDetail: { noteId: string };
  CreateNote: { sourceEventId?: string; sourceMilestoneId?: string } | undefined;
  NoteEditor: { noteId?: string; sourceEventId?: string; sourceMilestoneId?: string } | undefined;
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
