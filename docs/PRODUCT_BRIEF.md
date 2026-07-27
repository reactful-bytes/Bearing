# Product Brief

## Product Name (Working)
Bearing

## Vision
Bearing helps men turn ambition into execution by combining daily scheduling, long-term goal planning, and focused execution support in one mobile app.

## Target Audience
- Men who want structure for daily execution and long-term life planning.
- Users who want one place for calendar events, goals, and notes.
- Users who value guided planning support and optional AI help.

## Problem Statement
Many users split their day planning, goal management, and notes across disconnected tools. This causes context switching, weak follow-through, and unclear progress on meaningful goals.

## Core Value Proposition
- Plan your day and your life goals in one app.
- Convert high-level goals into practical steps and timelines.
- Stay focused during active events with a distraction-reducing Focus Mode.
- Capture thoughts quickly (Idea Dump) and process them later in Notes.

## Primary Platforms
- iOS and Android via Expo React Native.
- Firebase-backed authentication and cloud data.

## Core Experience
Bottom tab navigation with four screens:
1. Calendar
2. Goals
3. Notes
4. Profile

## Feature Overview By Screen

### 1) Calendar
- Mobile calendar experience intentionally close to Apple Calendar interaction patterns.
- Floating action button (FAB) opens Focus Mode.
- Calendar interoperability with Google, Microsoft, and Apple calendars.
- Use iCalendar (.ics) standards for import/export and sharing.

#### Focus Mode
- Darkened UI to reduce distractions.
- Shows only:
  - Current event name
  - Countdown/time remaining
  - Idea Dump note entry area
- Idea Dump entries save into Notes for later review and processing.

### 2) Goals
- FAB to create a new goal.
- Goals displayed as pressable cards showing:
  - Goal name
  - Estimated completion date
  - Next task

#### Goal Creation Wizard
1. SMART goal education step (Specific, Measurable, Achievable, Relevant, Time-Bound).
2. Goal input step.
3. Optional premium AI setup step to help generate plan and timeline.
4. Manual path (if AI skipped): completion date input.
5. Step creation flow.
6. Finish.

#### Goal Details Modal
- Read-only default view.
- Top-right edit button for goal name, description, and estimated finish date.
- Top-right close button.
- Scrollable step cards list.
- Completed steps shown grayed out with strike-through text.
- Plus button at list bottom to add a step.
- Drag-and-drop reorder via press-and-hold on hamburger handle.

#### Step Details Modal
- Opens when tapping a step card.
- Read-only default with edit button.
- Back-arrow close behavior returns to Goal Details.
- Fields:
  - Step name
  - Description
  - Starter (small text field; behavior to be finalized later)
- Schedule button creates calendar event linked to the goal step.
- Scrollable list of linked events.
- Past events shown grayed out with strike-through text.

### 3) Notes
- Scrollable list of note cards.
- Each note supports view, edit, and delete.
- FAB to create note.
- Idea Dump entries from Focus Mode appear here.

### 4) Profile
- Account management with display name, timezone, and locale.
- Secure anonymous sessions by linking email/password credentials.
- Password reset.
- Upgrade to premium placeholder.
- Connect external calendars (Apple, Google, Microsoft) placeholders.
- Tips & Wisdom modal with refreshable random guidance.
- Alarm and reminder sound settings with preview.

## Premium Scope (Initial)
- AI-assisted goal setup and plan generation in the goal wizard.
- Free users can still create goals manually.

## AI Helper Concept
- Input: user goal.
- Output: suggested milestones, ordered steps, and target timeline.
- User remains in control with ability to edit generated plans.

## Data and Integration Requirements
- Firebase Auth for user accounts.
- Cloud data storage for goals, steps, notes, and settings.
- Calendar integration adapters for Google, Microsoft, and Apple.
- .ics support for standards-based event data exchange.

## Non-Functional Priorities
- Fast, low-friction capture of tasks and notes.
- Reliable sync for calendar-linked data.
- Privacy and secure handling of user data.
- Clear state representation for completed/past items.

## Success Metrics (v1)
- Goal creation completion rate.
- Weekly active users who complete at least one planned step.
- Focus Mode usage frequency and average session duration.
- Notes captured from Idea Dump and later processed.
- Premium conversion rate from goal wizard AI step.

## Open Product Questions
- Final behavioral definition for the Step "Starter" field.
- Degree of visual mimicry versus legal-safe differentiation from Apple Calendar aesthetics.
- Limits and quotas for AI-assisted planning in premium.
- Whether calendar write-back is enabled by default or opt-in by provider.
