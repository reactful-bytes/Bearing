export type CalendarFocusLaunch = {
  token: string;
  eventId: string;
  title: string;
  description: string;
  startAtIso: string;
  endAtIso: string;
  timezone: string;
};

export type AppTabParamList = {
  Goals: undefined;
  Tasks: undefined;
  Calendar: { focusLaunch?: CalendarFocusLaunch } | undefined;
  Notes: undefined;
  Profile: undefined;
};