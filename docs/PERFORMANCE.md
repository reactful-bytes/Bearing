# Performance Validation

## Budgets

Release acceptance uses a signed or preview build on the agreed mid-tier Android device.

| Metric | Budget |
| --- | --- |
| Cold launch to usable Calendar | Under 3 seconds |
| Tab transition response | Under 300 milliseconds |
| Calendar day/month scrolling | At least 55 FPS |
| Long-session memory | No sustained growth during the 20-minute script |
| Calendar query scope | One visible month per Firestore and device query |

## Repository Controls

- React Navigation lazily mounts tab screens.
- Calendar queries only the selected month.
- Calendar does not subscribe to Notes solely to save a Focus Mode Idea Dump.
- Native event requests discard stale overlapping results.
- The month carousel renders one initial page, batches two pages, and retains a three-window neighborhood.
- Firestore listeners unsubscribe on unmount, range change, and explicit retry.

Automated tests verify the write-only note action, bounded month-list properties, month-range subscriptions, stale native-result rejection, and listener cleanup.

## Release Measurement

1. Install a preview or production build with representative test data: 200 events in the visible month, 100 tasks, 50 goals with 10 steps each, and 200 notes.
2. Force-stop the app, start a screen recording or platform trace, and launch Bearing five times.
3. Record cold-launch time from process start until Calendar controls accept input. Report median and slowest run.
4. Switch through Goals, Tasks, Calendar, Notes, and Profile ten times. Record any transition above 300 milliseconds.
5. Scroll Calendar day and month views for two minutes while collecting frame statistics. Record average FPS and slow/frozen frames.
6. Run the 20-minute script: change months, open events, enter/exit Focus Mode, filter Goals/Tasks, scroll Notes, and open Profile settings.
7. Capture memory at start, 10 minutes, and 20 minutes. Investigate retained growth that continues after returning to Calendar and waiting one minute.
8. Attach device model, OS, build identifier, data volume, trace/screenshots, and measurements to the release checklist.

## Acceptance

M10.3 remains a manual handoff until the release-build measurements meet every budget. Repository tests are necessary but do not substitute for native launch, frame, or memory evidence.
