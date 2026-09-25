import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { AddTaskModal } from '../components/tasks/AddTaskModal';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    profile: { locale: 'en-US', timezone: 'America/Chicago', timeFormat: '12-hour' },
  })),
}));

const goals = [
  { id: 'goal-b', title: 'Write a novel', status: 'active' as const },
  { id: 'goal-a', title: 'Build an emergency fund', status: 'active' as const },
  { id: 'goal-c', title: 'Run a 10k', status: 'completed' as const },
  { id: 'goal-d', title: 'Learn piano', status: 'archived' as const },
];

describe('AddTaskModal', () => {
  it('defaults to Unaffiliated and saves a selected active goal', async () => {
    const onSave = jest.fn(async () => undefined);
    render(<AddTaskModal visible goals={goals} onClose={jest.fn()} onSave={onSave} />);

    expect(screen.getByText('Goal:')).toBeTruthy();
    expect(screen.getByText('Unaffiliated')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select task goal'));
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual([
      'Select goal Unaffiliated',
      'Select goal Build an emergency fund',
      'Select goal Write a novel',
    ]);
    expect(screen.getByLabelText('Select goal Build an emergency fund')).toBeTruthy();
    expect(screen.getByLabelText('Select goal Write a novel')).toBeTruthy();
    expect(screen.queryByLabelText('Select goal Run a 10k')).toBeNull();
    expect(screen.queryByLabelText('Select goal Learn piano')).toBeNull();

    fireEvent.press(screen.getByLabelText('Select goal Build an emergency fund'));
    fireEvent.changeText(screen.getByLabelText('Task title'), 'Set monthly savings target');
    fireEvent.press(screen.getByLabelText('Save task'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        title: 'Set monthly savings target',
        description: '',
        starter: '',
        goalId: 'goal-a',
      }),
    );
  });

  it('preselects the current completed goal and allows clearing the affiliation', async () => {
    const onSave = jest.fn(async () => undefined);
    render(
      <AddTaskModal
        visible
        goals={goals}
        initialGoalId="goal-c"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('Run a 10k')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Select task goal'));
    expect(screen.getByLabelText('Select goal Run a 10k')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Select goal Unaffiliated'));
    fireEvent.changeText(screen.getByLabelText('Task title'), 'Choose the next race');
    fireEvent.press(screen.getByLabelText('Save task'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        title: 'Choose the next race',
        description: '',
        starter: '',
        goalId: null,
      }),
    );
  });
});
