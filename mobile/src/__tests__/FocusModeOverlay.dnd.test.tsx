import { act, render, waitFor } from '@testing-library/react-native';
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

  it('opens Android settings and activates after access is granted', async () => {
    let accessGranted = false;
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    let openSettingsAction: (() => void) | undefined;
    const dndService = makeDndService(() => accessGranted);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      openSettingsAction = buttons?.find((button) => button.text === 'Open Settings')?.onPress;
    });

    renderFocusMode(dndService);

    await waitFor(() => expect(openSettingsAction).toBeDefined());
    act(() => openSettingsAction?.());
    await waitFor(() => expect(dndService.openPolicyAccessSettings).toHaveBeenCalledTimes(1));
    expect(dndService.beginPriorityMode).not.toHaveBeenCalled();

    accessGranted = true;
    act(() => appStateListener?.('active'));

    await waitFor(() => expect(dndService.beginPriorityMode).toHaveBeenCalledTimes(1));
  });
});
