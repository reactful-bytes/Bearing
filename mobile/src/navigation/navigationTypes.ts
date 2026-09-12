import type { NavigatorScreenParams } from '@react-navigation/native';

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
  CreateTask: { goalId?: string; stepId?: string } | undefined;
};

export type CalendarStackParamList = {
  CalendarHome: { focusLaunch?: CalendarFocusLaunch; createEvent?: boolean } | undefined;
  EventDetail: { eventId: string; dateIso?: string };
  CalendarSources: undefined;
  CreateEvent: { goalId?: string; stepId?: string; returnTo?: string } | undefined;
  CreateTask: { goalId?: string; stepId?: string; returnTo?: string } | undefined;
};

export type NotesStackParamList = {
  NotesHome: { createNote?: boolean } | undefined;
  CreateNote: { sourceEventId?: string; sourceStepId?: string } | undefined;
  NoteEditor: { noteId?: string; sourceEventId?: string; sourceStepId?: string } | undefined;
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
  PremiumAccess: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  DataExport: undefined;
  DeleteAccount: undefined;
};

export type AppTabParamList = {
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Create: undefined;
  Notes: NavigatorScreenParams<NotesStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
