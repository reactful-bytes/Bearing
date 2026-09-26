import { StyleSheet, Text, View } from 'react-native';

import { CalendarDisplayEvent } from '../../features/calendar/calendarTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { Card } from '../ui/Card';

type EventSourceChipProps = {
  label: string;
  tone?: 'bearing' | 'device';
};

export function getEventKindLabel(event: CalendarDisplayEvent): string {
  if (event.ownership === 'bearing' && event.sourceTaskId !== null) return 'Task';
  if (event.ownership === 'bearing' && event.milestoneId !== null) return 'Milestone';
  return '';
}

export function getEventCalendarLabel(event: CalendarDisplayEvent): string {
  return event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle;
}

export function EventSourceChip({ label, tone = 'bearing' }: EventSourceChipProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={[styles.sourceChip, tone === 'device' ? styles.deviceChip : null]}>{label}</Text>
  );
}

type EventRowProps = {
  event: CalendarDisplayEvent;
  dateTime: string;
  timezone: string;
  onPress: () => void;
};

export function EventRow({ event, dateTime, timezone, onPress }: EventRowProps) {
  const styles = useThemedStyles(createStyles);
  const sourceLabel = event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle;
  const kindLabel = getEventKindLabel(event);
  const accentStyle = event.ownership === 'device' ? styles.deviceAccent : styles.bearingAccent;
  return (
    <Card
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onPress}
      variant="outlined"
      style={[styles.row, accentStyle]}
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.title}>
          {event.title}
        </Text>
        {kindLabel ? <Text style={styles.kindLabel}>{kindLabel}</Text> : null}
        <EventSourceChip label={sourceLabel} tone={event.ownership} />
      </View>
      <Text style={styles.meta}>{dateTime}</Text>
      <Text style={styles.meta}>{timezone}</Text>
    </Card>
  );
}

type EventCardProps = EventRowProps & {
  description?: string;
};

export function EventCard({
  event,
  dateTime,
  timezone,
  onPress,
  description = event.description,
}: EventCardProps) {
  const styles = useThemedStyles(createStyles);
  const sourceLabel = event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle;
  const kindLabel = getEventKindLabel(event);
  const accentStyle = event.ownership === 'device' ? styles.deviceAccent : styles.bearingAccent;
  return (
    <Card
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onPress}
      variant="outlined"
      style={[styles.row, accentStyle]}
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.title}>
          {event.title}
        </Text>
        {kindLabel ? <Text style={styles.kindLabel}>{kindLabel}</Text> : null}
        <EventSourceChip label={sourceLabel} tone={event.ownership} />
      </View>
      <Text style={styles.meta}>{dateTime}</Text>
      <Text style={styles.meta}>{timezone}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { gap: theme.spacing.xs, borderLeftWidth: 2 },
    bearingAccent: { borderLeftColor: theme.colors.brand },
    deviceAccent: { borderLeftColor: theme.colors.textSecondary },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: { ...theme.typography.cardTitle, color: theme.colors.text, flex: 1 },
    kindLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
    meta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    description: { ...theme.typography.helper, color: theme.colors.text },
    sourceChip: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    deviceChip: { color: theme.colors.textSecondary },
  });
