import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../design/ThemeProvider';
import { icons } from '../../design/icons';
import { FoundationGallery } from './FoundationGallery';

async function renderGallery() {
  const result = render(
    <ThemeProvider>
      <FoundationGallery />
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByText('Theme')).toBeTruthy());
  return result;
}

describe('FoundationGallery', () => {
  it('renders every registered Bearing icon alongside the foundation catalog', async () => {
    await renderGallery();

    expect(screen.getByTestId('foundation-gallery-scroll').props.style).toEqual(
      expect.objectContaining({ flex: 1 }),
    );
    expect(screen.getByLabelText('Icon library')).toBeTruthy();
    Object.keys(icons).forEach((name) => {
      expect(screen.getByLabelText(`${name} icon`)).toBeTruthy();
    });
    expect(screen.getByText('Domain presentation')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
  });

  it('keeps controls live for theme, selection, task state, and navigation', async () => {
    await renderGallery();

    fireEvent.press(screen.getByRole('button', { name: 'Light' }));
    expect(screen.getByText('Light theme selected.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Month' }));
    expect(screen.getByText('month view selected.')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('checkbox', { name: 'Mark Lay out running clothes complete' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Mark Lay out running clothes incomplete' }),
    ).toBeTruthy();

    fireEvent.press(screen.getAllByRole('tab', { name: 'Calendar' })[0]);
    expect(screen.getByText('calendar destination selected.')).toBeTruthy();
  });

  it('opens and dismisses modal, bottom-sheet, and create-sheet primitives', async () => {
    await renderGallery();

    fireEvent.press(screen.getByRole('button', { name: 'Open modal' }));
    expect(screen.getByRole('header', { name: 'Foundation modal' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close modal' }));
    expect(screen.queryByRole('header', { name: 'Foundation modal' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Open sheet' }));
    expect(screen.getByLabelText('Foundation sheet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss sheet' }));
    expect(screen.queryByLabelText('Foundation sheet')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Add a goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create Goal' }));
    expect(screen.getByText('Create goal selected.')).toBeTruthy();
  });
});
