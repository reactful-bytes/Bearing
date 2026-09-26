import { useState } from 'react';
import { Text } from 'react-native';

import { EventEditForm } from '../components/calendar/EventEditForm';
import { EventUpdateScopePrompt } from '../components/calendar/EventUpdateScopePrompt';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CalendarUpdateScope, CreateEventInput } from '../features/calendar/calendarTypes';
import { CalendarStackParamList } from '../navigation/navigationTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';

type EventEditScreenProps = {
  route: { params: CalendarStackParamList['EventEdit'] };
  navigation: { goBack: () => void };
};

export function EventEditScreen({ route, navigation }: EventEditScreenProps) {
  const { profile } = useUserProfile();
  const [eventDate] = useState(() => new Date(route.params.dateIso ?? Date.now()));
  const { events, uiState, updateEvent, getSupportedUpdateScopes } = useCalendarEvents(eventDate);
  const [choosingUpdateScope, setChoosingUpdateScope] = useState(false);
  const [selectedScope, setSelectedScope] = useState<CalendarUpdateScope | null>(null);
  const event =
    events.find(
      (candidate) =>
        candidate.id === route.params.eventId &&
        candidate.startAt.getTime() === eventDate.getTime(),
    ) ??
    events.find((candidate) => candidate.id === route.params.eventId) ??
    null;
  if (uiState === 'loading' || !event) {
    return (
      <AppScreen mode="scroll" testID="event-edit-loading">
        <AppCard>
          <Text>Loading event...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  const selectedEvent = event;
  const supportedUpdateScopes = getSupportedUpdateScopes?.(selectedEvent) ?? ['series'];

  async function handleSave(input: CreateEventInput): Promise<void> {
    if (selectedEvent.recurrenceRule) {
      if (!choosingUpdateScope) {
        setSelectedScope(null);
        setChoosingUpdateScope(true);
        return;
      }
      if (!selectedScope) return;
      await updateEvent(selectedEvent, input, selectedScope);
    } else {
      await updateEvent(selectedEvent, input);
    }
    navigation.goBack();
  }

  return (
    <EventEditForm
      active
      initialDate={selectedEvent.startAt}
      initialValues={selectedEvent}
      saveLabel={choosingUpdateScope ? 'Yes, update' : 'Update Event'}
      fullScreen
      locale={profile?.locale}
      timeFormat={profile?.timeFormat ?? DEFAULT_TIME_FORMAT}
      header={
        <ScreenHeader
          title="Edit Event"
          onPressBack={navigation.goBack}
          backAccessibilityLabel="Back to event details"
        />
      }
      beforeSave={
        choosingUpdateScope ? (
          <EventUpdateScopePrompt
            supportedScopes={supportedUpdateScopes}
            selectedScope={selectedScope}
            onSelect={setSelectedScope}
          />
        ) : null
      }
      cancelSave={{
        accessibilityLabel: 'Cancel edit event',
        onPress: navigation.goBack,
      }}
      saveDisabled={choosingUpdateScope && selectedScope === null}
      saveAccessibilityLabel={choosingUpdateScope ? 'Confirm recurring update' : 'Save event'}
      onSave={handleSave}
    />
  );
}
