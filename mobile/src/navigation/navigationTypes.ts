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
  Plan: undefined;
  Goals: { createGoal?: boolean } | undefined;
  Tasks: { createTask?: boolean } | undefined;
  GoalDetail: { goalId: string; initialTab?: 'tasks' | 'timeline' };
  FocusMode: { eventId: string; taskId?: string; returnTo?: string };
  CreateGoal: { sourceNoteId?: string } | undefined;
};

export type CalendarStackParamList = {
  Calendar: { focusLaunch?: CalendarFocusLaunch; createEvent?: boolean } | undefined;
  EventDetail: { eventId: string };
  CalendarSources: undefined;
  CreateEvent: { goalId?: string; stepId?: string; returnTo?: string } | undefined;
  CreateTask: { goalId?: string; stepId?: string; returnTo?: string } | undefined;
};

export type NotesStackParamList = {
  Notes: { createNote?: boolean } | undefined;
  NoteEditor: { noteId?: string; sourceEventId?: string; sourceStepId?: string } | undefined;
  CreateGoalFromNote: { noteId: string };
  CreateTaskFromNote: { noteId: string };
  CreateEventFromNote: { noteId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  PersonalInformation: undefined;
  Security: undefined;
  ConnectedServices: undefined;
  Notifications: undefined;
  FocusPreferences: undefined;
  Appearance: undefined;
  PlanBilling: undefined;
  Legal: undefined;
  Subscription: undefined;
};

export type AppTabParamList = {
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Create: undefined;
  Notes: NavigatorScreenParams<NotesStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
