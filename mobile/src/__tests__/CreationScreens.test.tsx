import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import {
  CreateEventScreen,
  CreateEventFromNoteScreen,
  CreateGoalScreen,
  CreateGoalFromNoteScreen,
  CreateNoteScreen,
  CreateTaskScreen,
  CreateTaskFromNoteScreen,
} from '../screens/CreationScreens';

const mockCreateGoal = jest.fn(async () => undefined);
const mockCreateTask = jest.fn(async () => undefined);
const mockCreateNote = jest.fn(async () => undefined);
const mockCreateEvent = jest.fn(async () => 'event-1');

jest.mock('../components/ui/AppScreen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/goals/CreateGoalModal', () => {
  const { Button, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CreateGoalModal: ({
      onClose,
      onSave,
      initialTitle,
      initialDescription,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
      initialTitle?: string;
      initialDescription?: string;
    }) => (
      <>
        <Text testID="goal-draft">{`${initialTitle ?? ''}:${initialDescription ?? ''}`}</Text>
        <Button title="Save goal" onPress={() => void onSave({ title: 'Goal' })} />
        <Button title="Cancel goal" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/tasks/AddTaskModal', () => {
  const { Button, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddTaskModal: ({
      onClose,
      onSave,
      initialTitle,
      initialDescription,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
      initialTitle?: string;
      initialDescription?: string;
    }) => (
      <>
        <Text testID="task-draft">{`${initialTitle ?? ''}:${initialDescription ?? ''}`}</Text>
        <Button title="Save task" onPress={() => void onSave({ title: 'Task' })} />
        <Button title="Cancel task" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/notes/AddNoteModal', () => {
  const { Button, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddNoteModal: ({
      onClose,
      onSave,
      sourceEventId,
      sourceTaskId,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
      sourceEventId: string | null;
      sourceTaskId: string | null;
    }) => (
      <>
        <Text testID="note-source">{`${sourceEventId}:${sourceTaskId}`}</Text>
        <Button title="Save note" onPress={() => void onSave({ body: 'Note' })} />
        <Button title="Cancel note" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/calendar/AddEventModal', () => {
  const { Button, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddEventModal: ({
      onClose,
      onSave,
      initialValues,
    }: {
      onClose: () => void;
      onSave: (input: unknown, options: unknown) => void;
      initialValues?: { title?: string; description?: string };
    }) => (
      <>
        <Text testID="event-draft">
          {`${initialValues?.title ?? ''}:${initialValues?.description ?? ''}`}
        </Text>
        <Button title="Save event" onPress={() => void onSave({ title: 'Event' }, {})} />
        <Button title="Cancel event" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/premium/PremiumPaywallModal', () => ({
  PremiumPaywallModal: () => null,
}));

jest.mock('../features/goals/useGoals', () => ({
  useGoals: () => ({
    goals: [],
    createGoal: mockCreateGoal,
  }),
}));

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: () => ({ createTask: mockCreateTask }),
}));

jest.mock('../features/notes/useNotes', () => ({
  useCreateNote: () => mockCreateNote,
  useNotes: () => ({
    notes: [{ id: 'note-1', title: 'Note title', body: 'Note body' }],
  }),
}));

jest.mock('../features/calendar/useCalendarPublication', () => ({
  useCalendarPublication: () => ({
    createEvent: mockCreateEvent,
    publicationCalendarTitle: 'Personal',
  }),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: () => ({
    authUser: { uid: 'user-1' },
    isAnonymous: false,
    profile: { locale: 'en-US', timeFormat: '12h' },
  }),
}));

jest.mock('../features/premium/usePremiumEntitlement', () => ({
  usePremiumEntitlement: () => ({ entitlement: { status: 'active' }, uiState: 'ready' }),
}));

jest.mock('../services/firebase/firebaseAiGoalPlans', () => ({
  generateAiGoalPlanDraft: jest.fn(),
  getAiCreditStatus: jest.fn(),
}));

describe('creation route screens', () => {
  it('delegates goal save and cancel to the existing wizard and navigation', async () => {
    const goBack = jest.fn();
    render(<CreateGoalScreen navigation={{ canGoBack: () => true, goBack }} />);

    fireEvent.press(screen.getByText('Save goal'));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith({ title: 'Goal' }));

    fireEvent.press(screen.getByText('Cancel goal'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('delegates task save without adding a second back navigation', async () => {
    const goBack = jest.fn();
    render(<CreateTaskScreen navigation={{ goBack }} />);

    fireEvent.press(screen.getByText('Save task'));
    await waitFor(() => expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Task' }));
    expect(goBack).not.toHaveBeenCalled();
  });

  it('forwards note source metadata and delegates cancellation', async () => {
    const goBack = jest.fn();
    render(
      <CreateNoteScreen
        navigation={{ canGoBack: () => true, goBack }}
        route={{ params: { sourceEventId: 'event-1', sourceTaskId: 'task-1' } }}
      />,
    );

    expect(screen.getByTestId('note-source').props.children).toBe('event-1:task-1');
    fireEvent.press(screen.getByText('Save note'));
    await waitFor(() => expect(mockCreateNote).toHaveBeenCalledWith({ body: 'Note' }));

    fireEvent.press(screen.getByText('Cancel note'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('delegates event save to the calendar publication service', async () => {
    render(<CreateEventScreen navigation={{ goBack: jest.fn() }} />);

    fireEvent.press(screen.getByText('Save event'));
    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalledWith({ title: 'Event' }, {}));
  });

  it('replaces the event route with Calendar home when it has no back history', () => {
    const goBack = jest.fn();
    const replace = jest.fn();
    render(<CreateEventScreen navigation={{ canGoBack: () => false, goBack, replace }} />);

    fireEvent.press(screen.getByText('Cancel event'));

    expect(replace).toHaveBeenCalledWith('CalendarHome');
    expect(goBack).not.toHaveBeenCalled();
  });

  it('prefills editable task, goal, and event drafts from a note', () => {
    const navigation = { goBack: jest.fn() };

    const task = render(
      <CreateTaskFromNoteScreen navigation={navigation} route={{ params: { noteId: 'note-1' } }} />,
    );
    expect(task.getByTestId('task-draft').props.children).toBe('Note title:Note body');
    task.unmount();

    const goal = render(
      <CreateGoalFromNoteScreen navigation={navigation} route={{ params: { noteId: 'note-1' } }} />,
    );
    expect(goal.getByTestId('goal-draft').props.children).toBe('Note title:Note body');
    goal.unmount();

    const event = render(
      <CreateEventFromNoteScreen
        navigation={navigation}
        route={{ params: { noteId: 'note-1' } }}
      />,
    );
    expect(event.getByTestId('event-draft').props.children).toBe('Note title:Note body');
  });
});
