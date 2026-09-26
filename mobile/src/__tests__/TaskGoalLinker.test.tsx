import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TaskGoalLinker } from '../components/tasks/TaskGoalLinker';
import type { GoalWithTasks } from '../features/goals/goalTypes';

const goals = [
  { id: 'goal-1', title: 'Run a 10k', status: 'active' },
  { id: 'goal-2', title: 'Read more', status: 'archived' },
] as GoalWithTasks[];

describe('TaskGoalLinker', () => {
  it('selects a goal and closes the picker', () => {
    const onChange = jest.fn();
    render(<TaskGoalLinker goals={goals} value={null} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Choose task goal'));
    fireEvent.press(screen.getByLabelText('Link task to Run a 10k'));

    expect(onChange).toHaveBeenCalledWith('goal-1');
  });

  it('clears an existing goal with No goal', () => {
    const onChange = jest.fn();
    render(<TaskGoalLinker goals={goals} value="goal-1" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Choose task goal'));
    fireEvent.press(screen.getByLabelText('Leave task unlinked'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});