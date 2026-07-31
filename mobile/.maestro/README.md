# Native Critical-Journey Tests

These Maestro flows exercise the signed-in mobile app against a disposable Firebase test account.
They require an installed development build because Bearing uses native calendar and billing modules.

## Prerequisites

1. Install Maestro and an Android emulator/device or an iOS simulator/device.
2. Build and install Bearing with the normal development-client workflow.
3. Create a dedicated free Firebase account with no premium subscription document.
4. Set `E2E_EMAIL`, `E2E_PASSWORD`, and a unique `RUN_ID` in the Maestro environment.
5. For `03-firestore-retry.yaml`, start Metro with
   `EXPO_PUBLIC_E2E_FAIL_NOTES_SUBSCRIBE_ONCE=true` before opening the development build.

Run one flow from `mobile/`:

```sh
maestro test -e E2E_EMAIL=user@example.com -e E2E_PASSWORD=password -e RUN_ID=local-001 .maestro/flows/01-create-manual-goal.yaml
```

Run the complete suite:

```sh
maestro test -e E2E_EMAIL=user@example.com -e E2E_PASSWORD=password -e RUN_ID=local-001 .maestro/flows
```

The goal and task flows create records. Purge the disposable account with trusted administrator
tooling after a run. The privacy flow opens the deletion confirmation but never enters `DELETE` or
invokes permanent deletion.

Native execution is an owner handoff: Android can run from Windows after installing a development
build; iOS execution requires an iPhone development build or macOS simulator build.
