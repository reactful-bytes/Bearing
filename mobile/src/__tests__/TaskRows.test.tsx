import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, StyleSheet } from 'react-native';

import { TaskListRow } from '../components/tasks/TaskListRow';
import { TaskRow } from '../components/presentation/TaskRow';
import { AppIcon } from '../components/ui/AppIcon';
import type { TaskRecord } from '../features/tasks/taskTypes';

type SwipeEvent = { translationX: number; translationY: number };
type PanGestureMock = {
  enabledValue: boolean;
  activeOffsetXValue: number;
  failOffsetYValue: [number, number];
  onUpdateCallback: (event: SwipeEvent) => void;
  onEndCallback: (event: SwipeEvent) => void;
  onFinalizeCallback: () => void;
};

function getSwipeGesture(): PanGestureMock {
  return jest
    .requireMock<{ __getLatestPanGesture: () => PanGestureMock }>('react-native-gesture-handler')
    .__getLatestPanGesture();
}

const task: TaskRecord = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Book the race',
  description: '',
  starter: '',
  goalId: 'goal-1',
  milestoneId: 'milestone-1',
  dueDate: new Date(2026, 8, 8),
  scheduledStart: null,
  scheduledEnd: null,
  allDay: true,
  status: 'active',
  completionSource: null,
  completedAt: null,
  completedEventId: null,
  createdAt: new Date(2026, 6, 20),
  updatedAt: new Date(2026, 6, 20),
};

function renderListRow(
  record: TaskRecord,
  onComplete?: () => void | Promise<void>,
  onReactivate?: () => void,
  onPress = jest.fn(),
) {
  return (
    <TaskListRow
      task={record}
      dateLabel="Due Sep 8"
      onPress={onPress}
      onComplete={onComplete}
      onReactivate={onReactivate}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );
}

describe('task row completion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes circles and crosses out both the title and date only for completed tasks', () => {
    const onComplete = jest.fn<() => void>();
    const { rerender } = render(renderListRow(task, onComplete));
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.UNSAFE_getAllByType(AppIcon).map((icon) => icon.props.name)).not.toContain(
      'none',
    );
    expect(StyleSheet.flatten(screen.getByText(task.title).props.style)).not.toHaveProperty(
      'textDecorationLine',
    );
    expect(StyleSheet.flatten(screen.getByText('Due Sep 8').props.style)).not.toHaveProperty(
      'textDecorationLine',
    );

    rerender(renderListRow({ ...task, status: 'completed' }, onComplete));
    for (const text of [task.title, 'Due Sep 8']) {
      expect(StyleSheet.flatten(screen.getByText(text).props.style)).toEqual(
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      );
    }
    rerender(renderListRow(task, onComplete));
    for (const text of [task.title, 'Due Sep 8']) {
      expect(StyleSheet.flatten(screen.getByText(text).props.style)).not.toHaveProperty(
        'textDecorationLine',
      );
    }
  });

  it('offers Complete or Uncomplete based on status without opening task details', async () => {
    const onComplete = jest.fn(async () => undefined);
    const onReactivate = jest.fn();
    const onPress = jest.fn();
    const { rerender } = render(renderListRow(task, onComplete, onReactivate, onPress));
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Uncomplete task' })).toBeNull();
    await act(async () => fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' })));
    expect(onComplete).toHaveBeenCalledTimes(1);

    rerender(renderListRow({ ...task, status: 'completed' }, onComplete, onReactivate, onPress));
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Uncomplete task' }));
    expect(onReactivate).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('requires an 80px rightward swipe and yields initial vertical movement to scrolling', async () => {
    const onComplete = jest.fn(async () => undefined);
    const onPress = jest.fn();
    render(renderListRow(task, onComplete, undefined, onPress));
    const gesture = getSwipeGesture();
    expect(gesture.enabledValue).toBe(true);
    expect(gesture.activeOffsetXValue).toBe(12);
    expect(gesture.failOffsetYValue).toEqual([-12, 12]);
    await act(async () => {
      for (const event of [
        { translationX: 79, translationY: 0 },
        { translationX: -100, translationY: 0 },
        { translationX: 100, translationY: 13 },
        { translationX: 100, translationY: -13 },
      ]) {
        gesture.onEndCallback(event);
      }
    });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      gesture.onEndCallback({ translationX: 80, translationY: 12 });
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('returns the row to its original position when the gesture ends or is cancelled', () => {
    render(renderListRow(task, jest.fn<() => void>()));
    const gesture = getSwipeGesture();
    const sharedValues = jest
      .requireMock<{ __getSharedValues: () => { value: number }[] }>('react-native-reanimated')
      .__getSharedValues();
    const translation = sharedValues[sharedValues.length - 1];
    act(() => gesture.onUpdateCallback({ translationX: 55, translationY: 0 }));
    expect(translation.value).toBe(55);
    act(() => gesture.onFinalizeCallback());
    expect(translation.value).toBe(0);
  });

  it('does not enable swiping or completion menus for completed or restricted tasks', () => {
    const onComplete = jest.fn<() => void>();
    const { rerender } = render(
      renderListRow({ ...task, status: 'completed' }, onComplete, jest.fn()),
    );
    expect(getSwipeGesture().enabledValue).toBe(false);
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    fireEvent.press(screen.getByLabelText('Dismiss Task actions menu'));

    rerender(renderListRow(task));
    expect(getSwipeGesture().enabledValue).toBe(false);
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.queryByRole('menuitem', { name: 'Complete task' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Uncomplete task' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Edit task' })).toBeTruthy();
  });

  it('prevents repeated swipe or menu submissions while completion is pending', async () => {
    let finishCompletion!: () => void;
    const onComplete = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCompletion = resolve;
        }),
    );
    render(renderListRow(task, onComplete));
    const gesture = getSwipeGesture();
    act(() => {
      gesture.onEndCallback({ translationX: 90, translationY: 0 });
      gesture.onEndCallback({ translationX: 90, translationY: 0 });
    });
    expect(getSwipeGesture().enabledValue).toBe(false);
    fireEvent.press(screen.getByLabelText('Task actions'));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Complete task' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    await act(async () => finishCompletion());
  });

  it('surfaces failed completions without crossing out the task and permits retry', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let offline = true;
    const onComplete = jest.fn(async () => {
      if (offline) throw new Error('offline');
    });
    render(renderListRow(task, onComplete));
    await act(async () => {
      getSwipeGesture().onEndCallback({ translationX: 90, translationY: 0 });
    });
    expect(alert).toHaveBeenCalledWith('Unable to complete task', 'Please try again.');
    expect(StyleSheet.flatten(screen.getByText(task.title).props.style)).not.toHaveProperty(
      'textDecorationLine',
    );
    offline = false;
    await act(async () => {
      getSwipeGesture().onEndCallback({ translationX: 90, translationY: 0 });
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
  });

  it('supports the same swipe and completion menu on Next Up presentation rows', async () => {
    const onComplete = jest.fn(async () => undefined);
    const onPress = jest.fn();
    const { rerender } = render(
      <TaskRow
        task={task}
        context="Due Sep 8"
        onPress={onPress}
        onToggleComplete={onComplete}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
    await act(async () => {
      getSwipeGesture().onEndCallback({ translationX: 80, translationY: 0 });
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Task actions'));
    expect(screen.getByRole('menuitem', { name: 'Complete task' })).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Dismiss Task actions menu'));

    rerender(
      <TaskRow task={{ ...task, status: 'completed' }} context="Due Sep 8" onPress={onPress} />,
    );
    for (const text of [task.title, 'Due Sep 8']) {
      expect(StyleSheet.flatten(screen.getByText(text).props.style)).toEqual(
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      );
    }
    expect(
      within(screen.getByRole('button', { name: 'Open task Book the race' })).getByText(task.title),
    ).toBeTruthy();
  });
});
