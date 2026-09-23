import { useState } from 'react';
import { Text } from 'react-native';

import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CalendarStackParamList } from '../navigation/navigationTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT } from '../features/profile/timeFormat';

type EventDetailScreenProps = {
  route: { params: CalendarStackParamList['EventDetail'] };
  navigation: {
    goBack: () => void;
    navigate: (screen: 'EventEdit', params: CalendarStackParamList['EventEdit']) => void;
  };
};

export function EventDetailScreen({ route, navigation }: EventDetailScreenProps) {
  const { profile } = useUserProfile();
  const [eventDate] = useState(() => new Date(route.params.dateIso ?? Date.now()));
  const { events, uiState, retryPublication, updateEvent, deleteEvent, refresh } =
    useCalendarEvents(eventDate);
  const event = events.find((candidate) => candidate.id === route.params.eventId) ?? null;

  if (uiState === 'loading' && !event) {
    return (
      <AppScreen mode="scroll" testID="event-detail-loading">
        <AppCard>
          <Text>Loading event...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  if (uiState === 'error' && !event) {
    return (
      <AppScreen mode="scroll" testID="event-detail-error">
        <RecoveryCard
          title="Unable to load event."
          description="Check your connection, then retry."
          onRetry={() => void refresh()}
        />
      </AppScreen>
    );
  }

  if (!event) {
    return (
      <AppScreen mode="scroll" testID="event-detail-missing">
        <AppCard>
          <Text>Event unavailable.</Text>
          <Text>This event may have been deleted or is outside the selected calendar range.</Text>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <EventDetailModal
      event={event}
      embedded
      onEdit={() =>
        navigation.navigate('EventEdit', {
          eventId: event.id,
          dateIso: event.startAt.toISOString(),
        })
      }
      onClose={navigation.goBack}
      onUpdate={async (selectedEvent, input) => updateEvent(selectedEvent, input)}
      onDelete={async (selectedEvent) => deleteEvent(selectedEvent)}
      onRetryPublication={retryPublication}
      locale={profile?.locale}
      timeFormat={profile?.timeFormat ?? DEFAULT_TIME_FORMAT}
    />
  );
}
