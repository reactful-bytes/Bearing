import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, AppState, AppStateStatus } from 'react-native';

import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { FocusDndService } from '../services/focus/androidFocusDndService';

function makeDndService(hasAccess: () => boolean = () => true): jest.Mocked<FocusDndService> {
  return {
    isAvailable: true,
    hasPolicyAccess: jest.fn(async () => hasAccess()),
    openPolicyAccessSettings: jest.fn(async () => undefined),
    beginPriorityMode: jest.fn(async () => true),
    endPriorityMode: jest.fn(async () => true),
  };
}

function renderFocusMode(dndService: FocusDndService) {
  return render(
    <FocusModeOverlay
      visible
      events={[]}
      onClose={jest.fn()}
      onSaveIdeaDump={jest.fn(async () => undefined)}
      dndService={dndService}
    />,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FocusModeOverlay Android Do Not Disturb lifecycle', () => {
  it('activates priority-only on entry and restores DND on exit', async () => {
    const dndService = makeDndService();
    const view = renderFocusMode(dndService);

    await act(async () => undefined);
    expect(dndService.beginPriorityMode).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(
        <FocusModeOverlay
          visible={false}
          events={[]}
          onClose={jest.fn()}
          onSaveIdeaDump={jest.fn(async () => undefined)}
          dndService={dndService}
        />,
      );
    });

    expect(dndService.endPriorityMode).toHaveBeenCalledTimes(1);
  });

  it('turns DND off and back on through the in-session environment toggle', async () => {
    const dndService = makeDndService();
    renderFocusMode(dndService);

    await waitFor(() => expect(screen.getByText('Distractions blocked')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));
    fireEvent(screen.getByTestId('focus-dnd-toggle'), 'valueChange', false);

    await waitFor(() => expect(screen.getByText('Protection off for this session')).toBeTruthy());
    expect(dndService.endPriorityMode).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId('focus-dnd-toggle'), 'valueChange', true);
    await waitFor(() => expect(screen.getByText('Distractions blocked')).toBeTruthy());
    expect(dndService.beginPriorityMode).toHaveBeenCalledTimes(2);
  });

  it('keeps the Environment description stable while DND activation is pending', async () => {
    const dndService = makeDndService();
    renderFocusMode(dndService);

    await waitFor(() => expect(screen.getByText('Distractions blocked')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));
    fireEvent(screen.getByTestId('focus-dnd-toggle'), 'valueChange', false);
    await waitFor(() => expect(screen.getByTestId('focus-dnd-toggle').props.value).toBe(false));

    let finishActivation: ((started: boolean) => void) | undefined;
    dndService.beginPriorityMode.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishActivation = resolve;
        }),
    );
    fireEvent(screen.getByTestId('focus-dnd-toggle'), 'valueChange', true);
    const description = screen.getByTestId('focus-dnd-description');

    expect(description.props.children).toBe(
      "Turning this off only stops Do Not Disturb for this session. To revoke Bearing's permission, remove Do Not Disturb access in Android system settings.",
    );
    await waitFor(() => expect(dndService.beginPriorityMode).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('focus-dnd-description').props.children).toBe(
      description.props.children,
    );

    await act(async () => {
      finishActivation?.(true);
    });
    await waitFor(() => expect(screen.getByText('Distractions blocked')).toBeTruthy());
    expect(screen.getByTestId('focus-dnd-description').props.children).toBe(
      description.props.children,
    );
  });

  it('does not offer Android settings after an automatic DND activation failure', async () => {
    const dndService = makeDndService();
    dndService.beginPriorityMode.mockResolvedValue(false);
    renderFocusMode(dndService);

    await waitFor(() =>
      expect(screen.getByText('Protection unavailable on this device')).toBeTruthy(),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));

    expect(screen.queryByRole('button', { name: 'Open Android Settings' })).toBeNull();
  });

  it('does not show a native alert when DND lifecycle calls fail', async () => {
    const dndService = makeDndService();
    dndService.hasPolicyAccess.mockRejectedValue(new Error('access lookup failed'));
    dndService.endPriorityMode.mockRejectedValue(new Error('restore failed'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const view = renderFocusMode(dndService);

    await waitFor(() =>
      expect(screen.getByText('Protection unavailable on this device')).toBeTruthy(),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));
    expect(screen.getByText('Could not update Do Not Disturb. Please try again.')).toBeTruthy();

    await act(async () => {
      view.rerender(
        <FocusModeOverlay
          visible={false}
          events={[]}
          onClose={jest.fn()}
          onSaveIdeaDump={jest.fn(async () => undefined)}
          dndService={dndService}
        />,
      );
    });

    await waitFor(() => expect(dndService.endPriorityMode).toHaveBeenCalledTimes(1));
    expect(alert).not.toHaveBeenCalled();
  });

  it('offers Android settings only after enabling protection in Focus Environment', async () => {
    let accessGranted = false;
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const dndService = makeDndService(() => accessGranted);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    renderFocusMode(dndService);

    await waitFor(() => expect(screen.getByText('Protection not granted')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Focus Environment' }));
    expect(screen.queryByRole('button', { name: 'Open Android Settings' })).toBeNull();

    fireEvent(screen.getByTestId('focus-dnd-toggle'), 'valueChange', true);
    expect(await screen.findByRole('button', { name: 'Open Android Settings' })).toBeTruthy();
    expect(dndService.openPolicyAccessSettings).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Open Android Settings' }));
    await waitFor(() => expect(dndService.openPolicyAccessSettings).toHaveBeenCalledTimes(1));
    expect(dndService.beginPriorityMode).not.toHaveBeenCalled();

    accessGranted = true;
    act(() => appStateListener?.('active'));

    await waitFor(() => expect(dndService.beginPriorityMode).toHaveBeenCalledTimes(1));
  });
});
