import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import {
  CreateEventScreen,
  CreateGoalScreen,
  CreateNoteScreen,
  CreateTaskScreen,
} from './CreationScreens';

const mockCreateGoal = jest.fn(async () => undefined);
const mockCreateTask = jest.fn(async () => undefined);
const mockCreateNote = jest.fn(async () => undefined);
const mockCreateEvent = jest.fn(async () => 'event-1');

jest.mock('../components/ui/AppScreen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/goals/CreateGoalModal', () => {
  const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CreateGoalModal: ({
      onClose,
      onSave,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
    }) => (
      <>
        <Button title="Save goal" onPress={() => void onSave({ title: 'Goal' })} />
        <Button title="Cancel goal" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/tasks/AddTaskModal', () => {
  const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddTaskModal: ({
      onClose,
      onSave,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
    }) => (
      <>
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
      sourceStepId,
    }: {
      onClose: () => void;
      onSave: (input: unknown) => void;
      sourceEventId: string | null;
      sourceStepId: string | null;
    }) => (
      <>
        <Text testID="note-source">{`${sourceEventId}:${sourceStepId}`}</Text>
        <Button title="Save note" onPress={() => void onSave({ body: 'Note' })} />
        <Button title="Cancel note" onPress={onClose} />
      </>
    ),
  };
});

jest.mock('../components/calendar/AddEventModal', () => {
  const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddEventModal: ({
      onClose,
      onSave,
    }: {
      onClose: () => void;
      onSave: (input: unknown, options: unknown) => void;
    }) => (
      <>
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
  useGoals: () => ({ createGoal: mockCreateGoal }),
}));

jest.mock('../features/tasks/useTasks', () => ({
  useTasks: () => ({ createTask: mockCreateTask }),
}));

jest.mock('../features/notes/useNotes', () => ({
  useCreateNote: () => mockCreateNote,
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
    render(<CreateGoalScreen navigation={{ goBack }} />);

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
        navigation={{ goBack }}
        route={{ params: { sourceEventId: 'event-1', sourceStepId: 'step-1' } }}
      />,
    );

    expect(screen.getByTestId('note-source').props.children).toBe('event-1:step-1');
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
});
