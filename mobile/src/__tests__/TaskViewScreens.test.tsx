import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import type { TaskViewParams } from '../navigation/navigationTypes';
import {
  TaskGoalSelectionScreen,
  TaskSortSelectionScreen,
  TaskViewScreen,
} from '../screens/TaskViewScreens';
import { DEFAULT_TASK_VIEW } from '../screens/taskViewOptions';

const goals = [
  { id: 'goal-1', title: 'Build a routine' },
  { id: 'goal-2', title: 'Learn Spanish' },
];

function routeParams(overrides: Partial<TaskViewParams> = {}): TaskViewParams {
  return {
    draft: { ...DEFAULT_TASK_VIEW, selectedGoalIds: [] },
    goals,
    ...overrides,
  };
}

describe('TaskViewScreen', () => {
  it('pushes Goal and Sort pages and applies the draft on Apply', () => {
    const navigation = { goBack: jest.fn(), push: jest.fn(), popTo: jest.fn() };
    const params = routeParams();
    render(
      <TaskViewScreen
        route={{ key: 'TaskView', name: 'TaskView', params } as never}
        navigation={navigation as never}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Select Completed' }));
    fireEvent.press(screen.getByRole('button', { name: 'Group tasks by goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Filter by goals, 0 selected' }));
    expect(navigation.push).toHaveBeenCalledWith('TaskGoalSelection', {
      draft: { ...DEFAULT_TASK_VIEW, taskFilter: 'completed', groupBy: 'goal' },
      goals,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Sort tasks, Due date ascending' }));
    expect(navigation.push).toHaveBeenCalledWith('TaskSortSelection', {
      draft: { ...DEFAULT_TASK_VIEW, taskFilter: 'completed', groupBy: 'goal' },
      goals,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));
    expect(navigation.popTo).toHaveBeenCalledWith('Tasks', {
      viewResult: { ...DEFAULT_TASK_VIEW, taskFilter: 'completed', groupBy: 'goal' },
    });
  });

  it('resets all draft settings to their defaults', () => {
    const navigation = { goBack: jest.fn(), push: jest.fn(), popTo: jest.fn() };
    const params = routeParams({
      draft: {
        ...DEFAULT_TASK_VIEW,
        taskFilter: 'all',
        groupBy: 'milestone',
        sortBy: 'title:desc',
        selectedGoalIds: ['goal-1'],
        taskSearch: 'morning',
      },
    });
    render(
      <TaskViewScreen
        route={{ key: 'TaskView', name: 'TaskView', params } as never}
        navigation={navigation as never}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Reset filters and sorting' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));

    expect(navigation.popTo).toHaveBeenCalledWith('Tasks', { viewResult: DEFAULT_TASK_VIEW });
  });
});

describe('TaskGoalSelectionScreen', () => {
  it('searches goals, supports multi-select, and returns the selection to View tasks', () => {
    const navigation = { goBack: jest.fn(), popTo: jest.fn() };
    const params = routeParams({
      draft: { ...DEFAULT_TASK_VIEW, selectedGoalIds: ['goal-1'] },
    });
    render(
      <TaskGoalSelectionScreen
        route={{ key: 'TaskGoalSelection', name: 'TaskGoalSelection', params } as never}
        navigation={navigation as never}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Search goals'), 'spanish');
    expect(screen.queryByRole('checkbox', { name: 'Filter tasks to Build a routine' })).toBeNull();
    fireEvent.press(screen.getByRole('checkbox', { name: 'Filter tasks to Learn Spanish' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));

    expect(navigation.popTo).toHaveBeenCalledWith('TaskView', {
      draft: { ...DEFAULT_TASK_VIEW, selectedGoalIds: ['goal-1', 'goal-2'] },
      goals,
    });
  });
});

describe('TaskSortSelectionScreen', () => {
  it('returns the selected sort option to View tasks', () => {
    const navigation = { goBack: jest.fn(), popTo: jest.fn() };
    const params = routeParams();
    render(
      <TaskSortSelectionScreen
        route={{ key: 'TaskSortSelection', name: 'TaskSortSelection', params } as never}
        navigation={navigation as never}
      />,
    );

    fireEvent.press(screen.getByRole('radio', { name: 'Sort by Updated descending' }));

    expect(navigation.popTo).toHaveBeenCalledWith('TaskView', {
      draft: { ...DEFAULT_TASK_VIEW, sortBy: 'updated:desc' },
      goals,
    });
  });
});
