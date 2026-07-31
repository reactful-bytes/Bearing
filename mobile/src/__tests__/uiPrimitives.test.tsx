import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { AppCard } from '../components/ui/AppCard';
import { AppModal } from '../components/ui/AppModal';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { ListItem } from '../components/ui/ListItem';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeading } from '../components/ui/SectionHeading';
import { SegmentedControl } from '../components/ui/SegmentedControl';

describe('UI primitives', () => {
  it('renders a header with eyebrow and description', () => {
    render(<ScreenHeader eyebrow="Section" title="Calendar" description="Plan your schedule." />);

    expect(screen.getByText('Section')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('Plan your schedule.')).toBeTruthy();
  });

  it('renders card content', () => {
    render(
      <AppCard>
        <ListItem title="Route ID" description="tabs/calendar" />
      </AppCard>,
    );

    expect(screen.getByText('Route ID')).toBeTruthy();
    expect(screen.getByText('tabs/calendar')).toBeTruthy();
  });

  it('renders a reusable section heading', () => {
    render(<SectionHeading title="Preferences" description="Choose how Bearing feels." />);

    expect(screen.getByRole('header', { name: 'Preferences' })).toBeTruthy();
    expect(screen.getByText('Choose how Bearing feels.')).toBeTruthy();
  });

  it('renders segmented labels and counts with selected accessibility state', () => {
    const handleChange = jest.fn();

    render(
      <SegmentedControl
        accessibilityLabel="Task filter"
        options={[
          { value: 'active', label: 'Active', count: 2 },
          { value: 'completed', label: 'Completed', count: 1 },
          { value: 'all', label: 'All', count: 3 },
        ]}
        value="active"
        onChange={handleChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Active, 2', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Completed, 1', selected: false })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'All, 3' }));

    expect(handleChange).toHaveBeenCalledWith('all');
  });

  it('fires presses from the list item primitive', () => {
    const handlePress = jest.fn();

    render(
      <ListItem
        title="Sign Out"
        description="End the session."
        trailingText="Action"
        onPress={handlePress}
      />,
    );

    fireEvent.press(screen.getByText('Sign Out'));

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('fires presses from the floating action button primitive', () => {
    const handlePress = jest.fn();

    render(<FloatingActionButton label="New Goal" onPress={handlePress} />);

    fireEvent.press(screen.getByText('New Goal'));

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders modal content and close action', () => {
    const handleClose = jest.fn();

    render(
      <AppModal visible title="Goal Details" onClose={handleClose}>
        <AppCard>
          <ScreenHeader title="Edit goal" description="Update the current goal details." />
        </AppCard>
      </AppModal>,
    );

    expect(screen.getByText('Goal Details')).toBeTruthy();
    expect(screen.getByText('Edit goal')).toBeTruthy();
    expect(screen.getByText('Close')).toBeTruthy();

    fireEvent.press(screen.getByText('Close'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
