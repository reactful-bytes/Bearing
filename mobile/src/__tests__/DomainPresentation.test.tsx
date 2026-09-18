import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { GoalCard, GoalMilestones, GoalStatusTabs, GoalTimeline } from '../components/presentation/GoalPresentation';
import { TaskRow } from '../components/presentation/TaskRow';
import { EventCard, EventRow, EventSourceChip } from '../components/presentation/EventPresentation';
import { BottomNavigation } from '../components/presentation/BottomNavigation';
import { CreateFabGroup } from '../components/presentation/CreateFabGroup';
import { CalendarDisplayEvent } from '../features/calendar/calendarTypes';
import { ThemeProvider } from '../design/ThemeProvider';
import { GoalStepRecord, GoalWithSteps } from '../features/goals/goalTypes';
import { TaskRecord } from '../features/tasks/taskTypes';

const step: GoalStepRecord = {
  id: 'step-1',
  userId: 'user-1',
  goalId: 'goal-1',
  title: 'Buy shoes',
  description: '',
  starter: '',
  estimatedFinishDate: null,
  order: 0,
  status: 'pending',
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const goal: GoalWithSteps = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Run a 10k',
  description: '',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 8, 1),
  nextStepId: step.id,
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  steps: [step],
  nextStep: step,
  completedStepCount: 0,
  totalStepCount: 1,
  progressText: '0 of 1 steps completed',
};
const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Plan meals',
  description: '',
  goalId: null,
  stepId: null,
  dueDate: null,
  scheduledStart: null,
  scheduledEnd: null,
  allDay: false,
  status: 'active',
  completionSource: null,
  completedAt: null,
  completedEventId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const event: CalendarDisplayEvent = {
  id: 'event-1',
  title: 'Training run',
  description: 'Easy pace.',
  startAt: new Date(),
  endAt: new Date(),
  timezone: 'America/Chicago',
  allDay: false,
  location: '',
  recurrenceRule: null,
  alarms: [],
  availability: 'busy',
  url: null,
  status: 'scheduled',
  ownership: 'bearing',
  userId: 'user-1',
  sourceTaskId: null,
  goalId: null,
  stepId: null,
  publication: {
    status: 'unpublished',
    markerId: null,
    commonHash: null,
    lastError: null,
    retryable: false,
    deletionIntent: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('domain presentation', () => {
  it('renders supplied goal data and delegates card, tab, and timeline callbacks', () => {
    const onGoalPress = jest.fn();
    const onFilterChange = jest.fn();
    const onStepPress = jest.fn();
    render(
      <>
        <GoalCard goal={goal} formatDate={() => 'Sep 1, 2026'} onPress={onGoalPress} />
        <GoalStatusTabs
          value="active"
          options={[
            { value: 'active', label: 'Active', count: 1 },
            { value: 'completed', label: 'Completed', count: 0 },
          ]}
          onChange={onFilterChange}
        />
        <GoalTimeline steps={[step]} onPressStep={onStepPress} />
        <GoalMilestones milestones={[{ title: 'First 5k', description: 'Build consistency.' }]} />
      </>,
    );
    expect(screen.getByText('Target: Sep 1, 2026')).toBeTruthy();
    expect(screen.getByLabelText('Goal progress Run a 10k').props.accessibilityValue.now).toBe(0);
    fireEvent.press(screen.getByRole('button', { name: 'Open goal Run a 10k' }));
    fireEvent.press(screen.getByRole('button', { name: 'Completed, 0' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open step Buy shoes' }));
    expect(onGoalPress).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith('completed');
    expect(onStepPress).toHaveBeenCalledWith(step);
    expect(screen.getByText('First 5k')).toBeTruthy();
  });

  it('keeps task completion and row presses independent and renders optional context', () => {
    const onPress = jest.fn();
    const onToggleComplete = jest.fn();
    render(
      <TaskRow
        task={task}
        context="Today, 9:00 AM"
        onPress={onPress}
        onToggleComplete={onToggleComplete}
      />,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Mark Plan meals complete' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open task Plan meals' }));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Today, 9:00 AM')).toBeTruthy();
  });

  it('renders caller-formatted event strings and delegates event presses', () => {
    const onPress = jest.fn();
    const deviceEvent: CalendarDisplayEvent = {
      ...event,
      ownership: 'device',
      nativeEventId: 'native-1',
      calendarId: 'calendar-1',
      calendarTitle: 'Work',
      calendarColor: null,
      sourceLabel: 'Google',
      allowsModifications: true,
    };
    render(
      <>
        <EventSourceChip label="Work" tone="device" />
        <EventRow
          event={deviceEvent}
          dateTime="Friday, 9:00 AM"
          timezone="Central time"
          onPress={onPress}
        />
        <EventCard event={event} dateTime="Sep 5, 9:00 AM" timezone="CDT" onPress={onPress} />
      </>,
    );
    expect(screen.getByText('Friday, 9:00 AM')).toBeTruthy();
    expect(screen.getByText('Central time')).toBeTruthy();
    expect(screen.getByText('Easy pace.')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Open event Training run' })[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('intercepts create separately from destination selection in both navigation variants', () => {
    const onSelect = jest.fn();
    const onCreate = jest.fn();
    render(
      <>
        <BottomNavigation
          activeDestination="calendar"
          onSelectDestination={onSelect}
          onPressCreate={onCreate}
        />
        <BottomNavigation
          activeDestination="plan"
          onSelectDestination={onSelect}
          onPressCreate={onCreate}
          variant="rail"
        />
      </>,
    );
    fireEvent.press(screen.getAllByRole('button', { name: 'Create' })[0]);
    fireEvent.press(screen.getAllByRole('tab', { name: 'Plan' })[0]);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('plan');
    expect(screen.getAllByRole('tab', { name: 'Calendar', selected: true })).toHaveLength(1);
  });

  it('delegates every create-fab-group action without navigation or data dependencies', () => {
    const onCreateGoal = jest.fn();
    const onCreateTask = jest.fn();
    const onCreateNote = jest.fn();
    const onCreateEvent = jest.fn();
    const onCreateFocus = jest.fn();
    render(
      <CreateFabGroup
        visible
        bottomOffset={0}
        onDismiss={jest.fn()}
        onCreateGoal={onCreateGoal}
        onCreateTask={onCreateTask}
        onCreateNote={onCreateNote}
        onCreateEvent={onCreateEvent}
        onCreateFocus={onCreateFocus}
      />,
    );
    const goalButtons = screen.getAllByRole('button', { name: 'Create Goal' });
    fireEvent.press(goalButtons[0]);
    expect(onCreateGoal).toHaveBeenCalledTimes(1);
    fireEvent.press(goalButtons[1]);
    fireEvent.press(screen.getAllByRole('button', { name: 'Create Task' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'Create Note' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'Create Event' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'Create Focus' })[0]);
    expect(onCreateGoal).toHaveBeenCalledTimes(2);
    expect(onCreateTask).toHaveBeenCalledTimes(1);
    expect(onCreateNote).toHaveBeenCalledTimes(1);
    expect(onCreateEvent).toHaveBeenCalledTimes(1);
    expect(onCreateFocus).toHaveBeenCalledTimes(1);
  });

  it('renders domain components with the default dark fallback and persisted light theme', async () => {
    render(<TaskRow task={task} onPress={jest.fn()} onToggleComplete={jest.fn()} />);
    expect(screen.getByText('Plan meals')).toBeTruthy();

    await AsyncStorage.setItem('@bearing/theme-preference', 'light');
    const lightRender = render(
      <ThemeProvider>
        <GoalCard goal={goal} formatDate={() => 'Sep 1, 2026'} onPress={jest.fn()} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(lightRender.getByText('Run a 10k')).toBeTruthy();
    });
  });
});
