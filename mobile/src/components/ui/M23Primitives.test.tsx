import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, StyleSheet, Text } from 'react-native';

import { AppHeader } from './AppHeader';
import { BottomSheet } from './BottomSheet';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { FloatingActionButton } from './FloatingActionButton';
import { FormField } from './FormField';
import { ProgressBar } from './ProgressBar';
import { SectionHeader } from './SectionHeader';

describe('M23 shared UI primitives', () => {
  it('keeps app header action slots fixed while rendering the centered logo treatment', () => {
    render(
      <AppHeader
        testID="app-header"
        title="Bearing"
        eyebrow="Today"
        subtitle="One thing at a time."
        centeredTitle
        leading={<Text>Back</Text>}
        trailing={<Text>More</Text>}
      />,
    );

    expect(screen.getByRole('header', { name: 'Bearing' })).toBeTruthy();
    expect(screen.getByTestId('app-header-leading').props.style).toEqual(
      expect.objectContaining({ width: 44, height: 44 }),
    );
    expect(screen.getByTestId('app-header-trailing').props.style).toEqual(
      expect.objectContaining({ width: 44, height: 44 }),
    );
  });

  it('does not reserve empty action slots for an uncentered action-free header', () => {
    render(<AppHeader testID="plain-header" title="Foundation gallery" eyebrow="Bearing UI" />);

    expect(screen.queryByTestId('plain-header-leading')).toBeNull();
    expect(screen.queryByTestId('plain-header-trailing')).toBeNull();
    expect(screen.getByRole('header', { name: 'Foundation gallery' })).toBeTruthy();
  });

  it('renders section variants and invokes its labeled action', () => {
    const onPressAction = jest.fn();

    render(
      <SectionHeader
        title="Pinned notes"
        description="Keep useful thoughts nearby."
        variant="uppercase-accent"
        actionLabel="View all"
        onPressAction={onPressAction}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'View all' }));
    expect(onPressAction).toHaveBeenCalledTimes(1);
  });

  it('supports outlined cards and accessible press behavior', () => {
    const onPress = jest.fn();

    render(
      <Card variant="outlined" onPress={onPress} accessibilityLabel="Open goal" testID="goal-card">
        <Text>Learn Spanish</Text>
      </Card>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open goal' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(screen.getByTestId('goal-card').props.style)).toEqual(
      expect.objectContaining({ minHeight: 44, borderWidth: 1 }),
    );
  });

  it('clamps progress values and exposes progress semantics with a separate label', () => {
    render(
      <ProgressBar testID="goal-progress" value={140} max={80} accent="success" showPercentage />,
    );

    expect(screen.getByLabelText('Progress').props.accessibilityValue).toEqual({
      min: 0,
      max: 80,
      now: 80,
      text: '100%',
    });
    expect(screen.getByTestId('goal-progress-fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '100%' })]),
    );
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders semantic empty state content and invokes its optional action', () => {
    const onPressAction = jest.fn();

    render(
      <EmptyState
        icon="note"
        title="No notes yet"
        description="Capture an idea when it arrives."
        presentation="compact"
        actionLabel="Add note"
        onPressAction={onPressAction}
      />,
    );

    expect(screen.getByLabelText('No notes yet icon')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add note' }));
    expect(onPressAction).toHaveBeenCalledTimes(1);
  });

  it('dismisses the bottom sheet through its backdrop and Android back callback', () => {
    const onDismiss = jest.fn();
    const result = render(
      <BottomSheet
        visible
        onDismiss={onDismiss}
        accessibilityLabel="Create item"
        testID="create-sheet"
      >
        <Text>Create something</Text>
      </BottomSheet>,
    );

    expect(result.getByLabelText('Create item').props.accessibilityViewIsModal).toBe(true);
    fireEvent.press(result.UNSAFE_getByProps({ testID: 'create-sheet-backdrop' }));
    result.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('renders a circular icon-only FAB at the requested touch-target size', () => {
    render(
      <FloatingActionButton
        icon="create"
        size="small"
        accessibilityLabel="Add task"
        onPress={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Add task' }).props.style),
    ).toEqual(expect.objectContaining({ width: 44, minHeight: 44, borderRadius: 22 }));
  });

  it('invokes a field trailing icon action without changing input labeling', () => {
    const onPressTrailingIcon = jest.fn();

    render(
      <FormField
        label="Password"
        value="secret"
        onChangeText={jest.fn()}
        trailingIcon="focus"
        trailingIconLabel="Show password"
        onPressTrailingIcon={onPressTrailingIcon}
      />,
    );

    expect(screen.getByLabelText('Password')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(onPressTrailingIcon).toHaveBeenCalledTimes(1);
  });
});
