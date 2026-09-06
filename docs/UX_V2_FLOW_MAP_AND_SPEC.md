# BEARING --- Copilot-Ready UI Implementation Specification

## 1. Purpose

This document is the design and implementation source of truth for the
Bearing mobile app UI redesign.

Bearing helps users turn ambition into execution by combining:

-   Daily scheduling
-   Calendar management
-   Long-term goals
-   Goal milestones and actionable tasks
-   Notes and quick idea capture
-   Focus Mode
-   Optional AI-assisted goal planning

The product philosophy is:

> Capture → Clarify → Plan → Schedule → Focus → Review.

The UI should feel focused, calm, capable, and premium. It should
communicate direction and progress rather than overwhelm the user with
productivity noise.

The visual source of truth is the Bearing UI mockup/storyboard supplied
with this project. When implementation details are ambiguous, preserve
the existing app's functionality while matching the visual language and
information hierarchy of the mockups.

------------------------------------------------------------------------

# 2. Instructions for GitHub Copilot / Coding Agent

## Agent operating rules

Before making major changes:

1.  Inspect the existing Expo / React Native project.
2.  Identify:
    -   navigation library and current navigation tree
    -   screen locations
    -   existing theme/styling approach
    -   state management
    -   existing models and API calls
    -   existing reusable components
    -   icon library
3.  Do not replace working backend/API functionality for cosmetic
    reasons.
4.  Prefer adapting existing models over creating duplicate data
    structures.
5.  Implement reusable primitives before redesigning individual screens.
6.  Keep the app compiling and navigable after each implementation
    phase.
7.  Do not redesign unrelated functionality unless necessary for
    consistency.
8.  Avoid hard-coding mockup data into production data flows.
9.  Use realistic local placeholder data only where a backend
    integration is not yet available.
10. Keep domain/business logic separate from presentation components.

## Implementation priorities

Priority order:

1.  Theme and design tokens
2.  Shared primitives
3.  Navigation architecture
4.  Plan dashboard
5.  Calendar
6.  Goals and goal detail
7.  Tasks
8.  Create action sheet and creation flows
9.  Notes and note editor
10. Focus Mode
11. Profile/settings
12. Animation and polish
13. Accessibility and responsive refinement

------------------------------------------------------------------------

# 3. Product Information Architecture

## Primary bottom navigation

Use five persistent bottom navigation destinations:

``` text
Plan | Calendar | Create | Notes | Profile
```

The center Create action is visually emphasized and opens a multi-action
sheet.

### Why Goals is not a permanent bottom tab

Goals are a major feature, but a permanent Goals tab would create six
destinations:

-   Plan
-   Calendar
-   Goals
-   Create
-   Notes
-   Profile

That is too crowded for a mobile bottom bar.

Goals should instead be reachable from:

-   Plan dashboard → Goals section → "View all"
-   Goal cards on the dashboard
-   Calendar context when a scheduled task belongs to a goal
-   Deep links/notifications

The Goals list itself should still be a first-class screen.

## Navigation map

``` text
Root Tabs
│
├── Plan Tab
│   ├── Plan Dashboard
│   ├── Goals List
│   │   ├── Goal Detail
│   │   │   ├── Tasks Tab
│   │   │   └── Timeline Tab
│   │   ├── Create Task
│   │   └── Edit Goal
│   ├── Focus Mode
│   └── Idea Dump / New Note
│
├── Calendar Tab
│   ├── Calendar
│   │   ├── Daily View
│   │   ├── Monthly View
│   │   ├── Event Detail
│   │   └── Calendar Sources
│   ├── New Event
│   └── New Task
│
├── Create Action
│   ├── New Goal Wizard
│   ├── New Task
│   ├── New Note
│   └── New Event
│
├── Notes Tab
│   ├── Notes List
│   ├── Note Editor
│   ├── Create Goal from Note
│   ├── Create Task from Note
│   └── Create Event from Note
│
└── Profile Tab
    ├── Personal Information
    ├── Security
    ├── Connected Services
    ├── Notifications
    ├── Focus Preferences
    ├── Appearance
    ├── Plan & Billing
    ├── Legal
    └── Logout
```

------------------------------------------------------------------------

# 4. Recommended React Navigation Architecture

Use a root tab navigator with nested native stacks.

``` tsx
RootTabs
├── PlanStack
│   ├── PlanScreen
│   ├── GoalsScreen
│   ├── GoalDetailScreen
│   ├── FocusModeScreen
│   └── CreateGoalScreen
│
├── CalendarStack
│   ├── CalendarScreen
│   ├── EventDetailScreen
│   └── CalendarSourcesScreen
│
├── NotesStack
│   ├── NotesScreen
│   └── NoteEditorScreen
│
└── ProfileStack
    ├── ProfileScreen
    ├── AccountSettingsScreen
    └── SubscriptionScreen
```

The center Create button should not be treated as a normal content tab.
It should open a global modal/bottom sheet.

## Recommended navigator behavior

-   Each primary area preserves its own navigation state.
-   Returning to a tab should preserve scroll position where practical.
-   Creation flows open modally above the current screen.
-   Focus Mode opens as a full-screen modal/overlay and intentionally
    hides normal app navigation.
-   Completing a create flow returns to the relevant contextual screen.

------------------------------------------------------------------------

# 5. Visual Design System

## Design principles

The UI should feel:

-   Dark and focused
-   Modern but not flashy
-   Structured and information-rich
-   Premium
-   Masculine without using stereotypical imagery
-   Calm during planning
-   More visually reduced during Focus Mode

## Color roles

Do not scatter raw color hex values throughout screens. Centralize them
in the theme.

Suggested semantic tokens:

``` ts
export const colors = {
  background: '#061220',
  backgroundElevated: '#0A192B',
  surface: '#0D1C2E',
  surfaceElevated: '#10243A',
  surfacePressed: '#152C45',

  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',

  textPrimary: '#F4F7FB',
  textSecondary: '#A9B6C5',
  textMuted: '#718096',

  primary: '#2F7FE8',
  primaryPressed: '#2366BD',

  success: '#43B977',
  warning: '#F5B83D',
  danger: '#E45A5A',
  purple: '#9B6BE8',

  focus: '#6DBA72',
};
```

Exact values can be refined to better match existing branding.

## Accent meaning

Use color semantically:

-   Blue: navigation, primary actions, scheduling
-   Green: goals, completion, Focus Mode
-   Amber/yellow: ideas, notes, insight
-   Purple: AI-assisted planning
-   Red: destructive actions

## Typography

Prefer the app's existing system font unless a brand font is already
configured.

Semantic typography:

``` text
Screen Title: 28–32 / bold
Section Title: 18–20 / semibold
Card Title: 15–17 / semibold
Body: 14–16 / regular
Caption: 12–13 / regular
Micro label: 10–11 / medium
```

## Spacing scale

``` ts
const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};
```

## Radius

``` ts
const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};
```

## Shadows

Use shadows sparingly. In the dark UI, hierarchy should primarily come
from:

-   surface elevation
-   border contrast
-   spacing
-   subtle gradients

Avoid heavy drop shadows around every card.

------------------------------------------------------------------------

# 6. Recommended Shared Component Structure

Create reusable primitives under a dedicated UI folder.

``` text
src/
  components/
    ui/
      AppScreen.tsx
      AppHeader.tsx
      SectionHeader.tsx
      Card.tsx
      Button.tsx
      IconButton.tsx
      ProgressBar.tsx
      EmptyState.tsx
      Divider.tsx
      ListRow.tsx
      BottomSheet.tsx

    navigation/
      BearingTabBar.tsx
      CreateFab.tsx

    goals/
      GoalCard.tsx
      GoalProgress.tsx
      GoalStatusTabs.tsx
      GoalTimeline.tsx
      TaskRow.tsx
      MilestoneCard.tsx

    calendar/
      CalendarDayTimeline.tsx
      CalendarMonthGrid.tsx
      CalendarEventCard.tsx
      CalendarSourceChip.tsx

    notes/
      NoteCard.tsx
      NoteEditorToolbar.tsx

    focus/
      FocusTimer.tsx
      IdeaDumpInput.tsx
      HoldToExitButton.tsx

    create/
      CreateActionSheet.tsx
      CreateActionRow.tsx
      GoalWizardProgress.tsx
```

## Important shared component rule

A screen should compose components. It should not contain a large amount
of repeated visual markup.

For example:

``` tsx
<PlanScreen>
  <AppHeader />
  <TodayPlanSection />
  <FocusStatusCard />
  <GoalsOverview />
  <IdeaDumpCard />
</PlanScreen>
```

------------------------------------------------------------------------

# 7. Domain Model Recommendations

Adapt these concepts to the existing backend rather than blindly
replacing existing models.

## Goal

``` ts
type GoalStatus = 'current' | 'completed' | 'archived';

type Goal = {
  id: string;
  title: string;
  summary?: string;
  objective?: string;

  status: GoalStatus;

  targetDate?: string;

  progress?: number;

  milestones: Milestone[];
  tasks?: Task[];

  createdAt: string;
  completedAt?: string;
};
```

## Milestone

``` ts
type Milestone = {
  id: string;
  goalId: string;

  title: string;
  description?: string;

  status: 'upcoming' | 'in_progress' | 'completed';

  targetDate?: string;
  order: number;
};
```

## Task

Tasks may belong to a goal, but do not require one.

``` ts
type Task = {
  id: string;

  title: string;
  description?: string;

  completed: boolean;

  goalId?: string;
  milestoneId?: string;

  dueDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;

  createdAt: string;
  completedAt?: string;
};
```

## Calendar Event

``` ts
type CalendarEvent = {
  id: string;

  title: string;
  description?: string;

  start: string;
  end: string;

  source: 'bearing' | 'google' | 'device';

  goalId?: string;
  taskId?: string;

  calendarId?: string;
};
```

## Note

``` ts
type Note = {
  id: string;

  title?: string;
  content: string;

  pinned: boolean;

  createdAt: string;
  updatedAt: string;
};
```

------------------------------------------------------------------------

# 8. Screen Specification --- Plan Dashboard

## Purpose

The Plan screen answers:

> What matters now, what is coming next, and how am I progressing?

This is the user's daily command center.

## Layout

### Header

-   "Plan" or greeting
-   Optional contextual greeting:
    -   Good morning
    -   Good afternoon
    -   Good evening
-   Profile/avatar access
-   Optional overflow menu

### Today's Plan

Show upcoming events in chronological order.

Each event should include:

-   color/source indicator
-   title
-   time
-   optional calendar source

Avoid showing too many items. Use:

-   next 3--5 items
-   "More events" action

### Focus Mode card

Prominent card.

States:

``` text
No active focus session
→ Start Focus

Upcoming/current event
→ Focus on [event]

Active focus session
→ Time remaining
```

### Goals overview

Show approximately three current goals.

Each card:

-   goal title
-   progress percentage
-   progress bar
-   target date or task progress

Include "View all".

### Idea Dump

Small but prominent capture/status card.

Display:

-   icon
-   number of unprocessed ideas or notes
-   shortcut to Notes

Optional direct quick-capture interaction can be supported if it does
not make the dashboard visually busy.

------------------------------------------------------------------------

# 9. Goals List

## Status tabs

Use:

``` text
Current | Completed | Archived
```

Current is the default.

## Goal cards

Each card contains:

-   visual goal icon/status marker
-   title
-   progress percentage
-   progress bar
-   target date
-   completed task count

Tapping opens Goal Detail.

## Empty states

Do not leave an empty screen.

Example:

``` text
No active goals yet

Turn something important into a clear plan.

[ Create Goal ]
```

------------------------------------------------------------------------

# 10. Goal Detail

Use two top tabs:

``` text
Tasks | Timeline
```

## Tasks tab

### Next Up

Highlight the next most actionable task.

### Task list

Each task row:

-   completion control
-   title
-   due/scheduled date
-   optional status
-   optional goal milestone context

Allow:

-   complete
-   edit
-   delete
-   schedule

## Timeline tab

The Timeline is chronological, not simply a task list.

Show:

-   goal start
-   milestones
-   key steps
-   target completion date

Recommended visual pattern:

``` text
● Apr 15 — Research
│
● May 10 — Marketing Plan
│
◉ May 25 — Content Calendar
│
○ Jun 5 — Launch Campaign
│
○ Jun 20 — Review & Optimize
```

Use different visual states:

-   completed
-   current/in-progress
-   upcoming

Tapping a milestone can expand its associated tasks.

------------------------------------------------------------------------

# 11. Calendar

## Views

The calendar supports:

-   Daily timeline
-   Monthly overview

A segmented control or top-level toggle switches views.

## Daily view

Use a vertical time axis.

Show:

-   events
-   scheduled tasks
-   goal milestones
-   imported calendar events

Visual distinction:

### Calendar event

Filled event card.

### Scheduled task

More task-like styling, such as:

-   checkbox
-   subtle outline

### Goal milestone

Flag or goal marker.

### Imported event

Uses source-specific color or small source label.

## Monthly view

Traditional month grid.

Each day may show:

-   small colored indicators
-   event/task count

Selecting a day updates an agenda section below the month.

## Calendar sources

Support:

-   Bearing
-   Google
-   device/system calendars where supported

Source management should be accessible from an overflow menu or settings
rather than occupying primary screen space.

------------------------------------------------------------------------

# 12. Center Create Action

## Interaction

Tapping the center + button opens a modal bottom sheet.

The background behind the sheet should dim and slightly blur if
supported.

## Actions

``` text
New Goal
Define a long-term outcome

New Task
Add an actionable item

New Note
Capture an idea or thought

New Event
Add something to your calendar
```

Each action gets:

-   distinct icon
-   semantic accent color

Suggested:

-   Goal: green
-   Task: blue
-   Note: amber
-   Event: purple

Do not navigate away until an action is selected.

------------------------------------------------------------------------

# 13. New Goal Wizard

## Recommended flow

The existing five-step concept is good, with one adjustment:

Use the AI planning step as an optional branch rather than forcing the
user to purchase or invoke AI.

Recommended wizard:

``` text
1. SMART Goal Introduction
2. Define Goal
3. Target Date
4. Build the Plan
   ├── AI-assisted
   └── Start manually
5. Review & Edit
6. Create Goal
```

This is more flexible than making "AI generation" the only fourth step.

## Persistent wizard features

Every step should show:

-   back button
-   progress indicator
-   continue button
-   ability to exit with confirmation if unsaved changes exist

Avoid showing "Step 1 of 5" as the only progress representation. Use
dots or a progress bar plus a short step label.

------------------------------------------------------------------------

## Step 1 --- SMART Introduction

Purpose: teach briefly, not lecture.

Explain:

-   Specific
-   Measurable
-   Achievable
-   Relevant
-   Time-bound

Keep each explanation concise.

Example layout:

``` text
Let's create a SMART goal

S  Specific
M  Measurable
A  Achievable
R  Relevant
T  Time-bound

[ Continue ]
```

------------------------------------------------------------------------

## Step 2 --- Define Goal

Fields:

### Goal title

Short, clear outcome.

Example:

``` text
Build a Strong Business
```

### Summary / objective

Longer explanation.

Prompt:

``` text
What are you trying to achieve?
```

### Why it matters

Prompt:

``` text
Why is this important to you?
```

This "why" is valuable because it can later be surfaced during Focus
Mode or reviews.

------------------------------------------------------------------------

## Step 3 --- Target Date

Use a visual date picker.

Also allow:

-   no target date, if the product supports open-ended goals

If a target date is selected, show:

``` text
Target completion
December 31, 2025
```

------------------------------------------------------------------------

## Step 4 --- Build the Plan

This step offers two choices.

### AI-assisted planning

Paid/Pro feature.

Explain exactly what AI will do:

-   propose milestones
-   break milestones into actionable tasks
-   recommend ordering
-   suggest a rough timeline

Do not imply AI will execute anything automatically.

CTA:

``` text
Generate Plan
```

### Build manually

For users without Pro access or who prefer manual planning.

CTA:

``` text
Add milestones myself
```

## AI paywall behavior

If the user does not have access:

-   clearly label AI Planning as a Pro feature
-   explain the benefit
-   provide upgrade CTA
-   preserve the user's goal draft

Never make the user restart the wizard after declining an upgrade.

------------------------------------------------------------------------

## Step 5 --- Review Plan

Display editable milestones.

Each milestone:

-   title
-   date range or target date
-   expandable task list

Actions:

-   edit milestone
-   add task
-   delete
-   reorder

Allow:

``` text
[ Back ] [ Create Goal ]
```

The goal should not be created until the final action.

------------------------------------------------------------------------

# 14. New Task

## Fields

Required:

-   title

Optional:

-   description
-   linked goal
-   linked milestone
-   due date
-   scheduled time
-   all-day

The task creation form should be concise.

Advanced scheduling should not block quick capture.

Recommended progressive disclosure:

``` text
Title

Description

Goal (optional)

More options
  Due date
  Schedule time
  All day
```

------------------------------------------------------------------------

# 15. New Note

## Purpose

Notes should be fast enough for Idea Dump capture and powerful enough
for planning.

## Fields

-   title
-   content

Support:

-   formatting only if the current editor architecture supports it
    cleanly
-   tags if already part of the product

## Contextual actions

From a note, allow:

``` text
Create Task
Create Goal
Create Event
```

These actions should extract context where possible but always allow
editing before creation.

Example:

``` text
Selected note text:
"Call John about the marketing partnership"

→ Create Task

Pre-filled task title:
Call John about the marketing partnership
```

------------------------------------------------------------------------

# 16. New Event

## Fields

-   title
-   location
-   description
-   all-day
-   date
-   start time
-   end time
-   calendar/source

Optional associations:

-   linked goal
-   linked task

Keep the creation form visually consistent with New Task.

------------------------------------------------------------------------

# 17. Focus Mode

## Product purpose

Focus Mode is not merely a timer.

It is a deliberate app state that reduces distraction and helps the user
stay engaged with the current calendar event or work session.

## Entry state

From the Plan dashboard:

``` text
Focus Mode

Focus on:
Deep Work

Start Focus Session
```

If linked to a current event:

``` text
Deep Work
Ends at 3:00 PM
```

## Active Focus overlay

Focus Mode should become a full-screen experience.

Hide:

-   bottom navigation
-   normal screen navigation
-   dashboard content

Show:

### Header

``` text
FOCUS MODE
Deep Work
```

### Main timer

Large countdown.

Example:

``` text
01:23:45
Time remaining
```

### End time

``` text
Ends at 3:00 PM
```

### Distraction state

``` text
Distractions blocked
```

This text should only claim actual blocking behavior if the operating
system/platform implementation supports it.

## Active screen hierarchy

The active screen should be simpler and more intentional than the five
icon toolbar shown in mockup 14B. That toolbar was generated as part of
the visual exploration and does not define five required product
features.

Use this hierarchy:

``` text
FOCUS MODE

Deep Work

01:23:45
Time remaining

Ends at 3:00 PM

─────────────────────

IDEA DUMP

[ Capture a thought...          + ]

─────────────────────

Distractions blocked

[ Session Details ] [ Focus Settings ]

─────────────────────

Hold for 3 seconds to exit
[ progress indicator ]
```

Idea Dump remains directly visible because it is the most important
interaction during a session. The user should not have to open a tool
menu before capturing a distracting thought.

## Focus utilities

Expose no more than two optional utility buttons:

### Session Details

Show:

-   linked event information
-   original scheduled duration
-   elapsed and remaining time
-   focus session statistics available during the current session
-   linked goal, step, or task context when present

Session Details is informational by default. Do not add timer editing or
session mutation unless that behavior is separately specified and
tested.

### Focus Settings

Show only settings supported by the current platform and product:

-   notification or Do Not Disturb behavior
-   timer sound or ambient sound preferences, when available
-   screen or display behavior, when available

Do not claim that notifications or distractions are blocked when the
platform service is unavailable or permission has not been granted.

## Mockup icon interpretation

The five mockup icons may be interpreted as Idea Dump, session timing,
focus environment, settings, and session tools, but they should not be
implemented as five separate icon buttons. Their useful behavior is
consolidated into the visible Idea Dump area, Session Details, and Focus
Settings.

Use the centralized `AppIcon` system for the two utility actions. Prefer
the approved mockup-derived Focus icon for Focus Settings when it remains
clear at button size; otherwise use the closest approved Material icon.
Icons must have visible text labels and must not be the only indication
of an action.

------------------------------------------------------------------------

# 18. Focus Mode --- Idea Dump

A central requirement.

During Focus Mode, the user can quickly capture an idea without leaving
focus.

Component:

``` text
Quick Idea Dump

Capture thoughts without
breaking your focus.

[ Type your idea...        + ]
```

Submitting creates a new note.

Recommended metadata:

``` ts
{
  source: 'focus_mode',
  focusSessionId,
  createdAt
}
```

Do not navigate to the Notes screen after submission.

Show lightweight confirmation:

``` text
Saved
```

Then return the user's attention to the timer.

------------------------------------------------------------------------

# 19. Focus Mode Exit

Exiting Focus Mode must require intentional interaction.

Do not show an X, close button, back button, dismiss icon, or redundant
close control on the active Focus Mode screen. The duplicate X icons in
mockup 14B are visual-generation artifacts and are not product
requirements.

The three-second hold control is the only in-app interaction that exits
an active session. Hardware back, modal dismissal, swipe-to-dismiss, and
navigation gestures must not bypass it.

Use a press-and-hold button.

Example:

``` text
Hold for 3 seconds to exit
```

Interaction:

-   user presses and holds
-   circular or horizontal progress fills
-   releasing early cancels
-   completing 3 seconds exits
-   progress is announced accessibly without moving keyboard or screen
  reader focus
-   interrupted or backgrounded holds cancel instead of completing

This is better than a simple confirmation dialog because it is:

-   intentional
-   fast
-   less disruptive

On exit, show a summary rather than immediately returning to the
dashboard.

------------------------------------------------------------------------

# 20. Focus Session Summary

Show:

-   success indicator
-   session duration
-   ideas captured
-   distractions blocked, if applicable

Example:

``` text
Focus Session Complete

Duration
2h 15m

Ideas Captured
3

[ Done ]
```

The Done button returns to the previous contextual screen.

------------------------------------------------------------------------

# 21. Notes List

## Header

-   search
-   filter

## Sections

Recommended:

``` text
Pinned
Recent
All Notes
```

A note card shows:

-   title
-   preview
-   updated date

Do not make every note card excessively tall.

The Notes screen should prioritize scanning.

------------------------------------------------------------------------

# 22. Profile

The Profile screen is a settings hub.

## Header

-   avatar
-   name
-   email

## Account

-   personal information
-   security

## Connected Services

-   Google Calendar
-   other integrations

Display connection status clearly.

## Preferences

-   notifications
-   Focus Mode preferences
-   appearance

## Plan & Billing

-   current plan
-   subscription status
-   manage subscription

## Legal

-   terms of service
-   privacy policy

## Account actions

-   logout

Destructive actions should use danger styling but should not dominate
the screen.

------------------------------------------------------------------------

# 23. Bottom Navigation

## Required destinations

``` text
Plan
Calendar
Create
Notes
Profile
```

## Center Create button

Visually elevated.

Behavior:

-   larger than standard tab icons
-   circular
-   primary blue
-   opens Create Action Sheet

The center button should not visually imply that it is the currently
selected "tab."

------------------------------------------------------------------------

# 24. Reusable Component Contracts

## GoalCard

``` ts
type GoalCardProps = {
  goal: Goal;
  onPress?: () => void;
  compact?: boolean;
};
```

## TaskRow

``` ts
type TaskRowProps = {
  task: Task;
  onToggleComplete: () => void;
  onPress?: () => void;
  showGoalContext?: boolean;
};
```

## FocusTimer

``` ts
type FocusTimerProps = {
  remainingSeconds: number;
  totalSeconds: number;
  title: string;
  endTime?: string;
};
```

## CreateActionSheet

``` ts
type CreateAction =
  | 'goal'
  | 'task'
  | 'note'
  | 'event';

type CreateActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateAction) => void;
};
```

## HoldToExitButton

``` ts
type HoldToExitButtonProps = {
  holdDuration?: number;
  onComplete: () => void;
};
```

Default:

``` ts
holdDuration = 3000;
```

------------------------------------------------------------------------

# 25. State Management Guidance

Keep UI state separate from domain state.

## UI state examples

-   bottom sheet open/closed
-   selected calendar view
-   wizard step
-   expanded milestone
-   note editor formatting toolbar

## Domain state examples

-   goals
-   tasks
-   events
-   notes
-   calendar connections
-   focus session

Do not place all state in one global store simply for convenience.

Prefer:

-   screen-local state for ephemeral UI
-   existing query/cache system for server data
-   existing global state only for truly shared application state

------------------------------------------------------------------------

# 26. Recommended Implementation Phases

## Phase 1 --- Foundation

Implement:

-   theme
-   tokens
-   shared primitives
-   tab bar
-   create FAB
-   screen containers

Acceptance criteria:

-   no visual duplication of colors/spacing across screens
-   app remains functional

## Phase 2 --- Navigation

Implement:

-   root tabs
-   nested stacks
-   global create sheet
-   modal presentation patterns

Acceptance criteria:

-   all primary destinations reachable
-   navigation state preserved where practical

## Phase 3 --- Plan

Implement:

-   header
-   today's plan
-   Focus Mode card
-   goals overview
-   idea dump

## Phase 4 --- Goals and Tasks

Implement:

-   goals list
-   status tabs
-   goal detail
-   task list
-   timeline

## Phase 5 --- Calendar

Implement:

-   daily timeline
-   monthly view
-   event/task rendering
-   source distinction

## Phase 6 --- Create flows

Implement:

-   create action sheet
-   task
-   note
-   event
-   goal wizard

## Phase 7 --- Focus Mode

Implement:

-   start
-   full-screen overlay
-   countdown
-   Idea Dump
-   hold-to-exit
-   summary

## Phase 8 --- Notes

Implement:

-   list
-   search/filter
-   editor
-   create task/goal/event from note

## Phase 9 --- Profile

Implement:

-   account
-   integrations
-   preferences
-   billing
-   legal
-   logout

## Phase 10 --- Polish

Implement:

-   loading states
-   empty states
-   error states
-   animations
-   accessibility
-   dark theme consistency
-   device-size refinement

------------------------------------------------------------------------

# 27. Copilot Task Prompt Template

Use this prompt for each implementation phase:

``` text
Read BEARING_UI_IMPLEMENTATION_SPEC.md before making changes.

The supplied Bearing UI mockups are the visual design reference.

Task:
[INSERT SPECIFIC TASK]

Requirements:
- Preserve existing backend and business logic.
- Inspect existing components before creating duplicates.
- Reuse the Bearing design system.
- Keep styling centralized through theme tokens.
- Implement responsive behavior for supported mobile sizes.
- Do not use hard-coded production mock data.
- Keep unrelated screens unchanged.
- After implementation, run the relevant typecheck/lint/test commands available in the project.
- Report:
  1. files changed
  2. architectural decisions
  3. assumptions
  4. anything requiring manual follow-up
```

------------------------------------------------------------------------

# 28. Recommended First Copilot Agent Task

Use this before asking the agent to redesign screens:

``` text
Read BEARING_UI_IMPLEMENTATION_SPEC.md and inspect the current Expo React Native application.

Do not modify code yet.

Create an implementation plan that maps the current architecture to the Bearing UI specification.

Identify:
- current navigation architecture
- existing screens and routes
- styling/theme approach
- reusable components
- state management
- API/data hooks
- existing Goal, Task, Event, and Note models
- installed UI/icon libraries

Then provide:
1. a proposed file-by-file implementation plan
2. components that can be reused
3. components that should be created
4. navigation changes required
5. data-model gaps that affect the UI

Do not begin implementation until the plan is complete.
```

------------------------------------------------------------------------

# 29. Recommended Second Copilot Agent Task

``` text
Read BEARING_UI_IMPLEMENTATION_SPEC.md.

Implement Phase 1 only: the Bearing design system and shared UI primitives.

Do not redesign every screen yet.

Create or update:
- centralized theme tokens
- spacing
- typography
- color roles
- AppScreen
- AppHeader
- Card
- Button
- IconButton
- SectionHeader
- ProgressBar
- EmptyState

Reuse existing project infrastructure wherever possible.

Do not introduce a second styling system.

After implementation:
- run type checking
- fix type errors caused by your changes
- report all files changed
```

------------------------------------------------------------------------

# 30. Definition of Done

The UI redesign is complete when:

-   Every primary feature in this specification is reachable.
-   Navigation matches the recommended information architecture.
-   The Plan screen functions as a daily command center.
-   Goals support Current, Completed, and Archived states.
-   Goal Detail has Tasks and Timeline views.
-   Tasks can optionally belong to goals.
-   Calendar supports daily and monthly views.
-   Calendar visually distinguishes events, tasks, milestones, and
    imported events.
-   The center + button exposes all four creation actions.
-   New Goal uses the multi-step SMART planning flow.
-   AI planning is optional and preserves drafts.
-   Notes can create goals, tasks, and events.
-   Focus Mode is a full-screen distraction-reduced experience.
-   Focus Mode supports countdown, Idea Dump, and hold-to-exit.
-   Profile provides account, integration, preference, plan, legal, and
    logout access.
-   Shared components are used instead of repeated screen-specific
    markup.
-   Colors, spacing, and typography are centralized.
-   Existing business functionality remains intact unless intentionally
    changed.
-   The implementation is type-safe and passes the project's relevant
    checks.

------------------------------------------------------------------------

# 31. Final Product Principle

When deciding between adding more controls and preserving clarity,
prefer clarity.

Bearing should never feel like a dashboard full of productivity widgets.

Every screen should answer one of these questions:

-   What should I do now?
-   What am I working toward?
-   What needs to happen next?
-   When will it happen?
-   What idea do I need to capture?
-   How can I stay focused?

If a UI element does not help answer one of those questions, it should
be challenged before adding it.
