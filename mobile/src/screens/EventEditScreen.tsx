import { useState } from 'react';
import { Text } from 'react-native';

import { EventEditForm } from '../components/calendar/EventEditForm';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
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
  const { events, uiState, updateEvent } = useCalendarEvents(eventDate);
  const event = events.find((candidate) => candidate.id === route.params.eventId) ?? null;

  if (uiState === 'loading' || !event) {
    return (
      <AppScreen mode="scroll" testID="event-edit-loading">
        <AppCard>
          <Text>Loading event...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <EventEditForm
      active
      initialDate={event.startAt}
      initialValues={event}
      saveLabel="Update Event"
      locale={profile?.locale}
      timeFormat={profile?.timeFormat ?? DEFAULT_TIME_FORMAT}
      fullScreen
      header={
        <ScreenHeader
          title="Edit Event"
          onPressBack={navigation.goBack}
          backAccessibilityLabel="Back to event details"
        />
      }
      onSave={async (input) => {
        await updateEvent(event, input);
        navigation.goBack();
      }}
    />
  );
}
