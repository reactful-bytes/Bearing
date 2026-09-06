import { StyleSheet, Text, View } from 'react-native';

import { CalendarDisplayEvent } from '../../features/calendar/calendarTypes';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { Card } from '../ui/Card';

type EventSourceChipProps = {
  label: string;
  tone?: 'bearing' | 'device';
};

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
  return (
    <Card
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onPress}
      variant="outlined"
      style={styles.row}
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.title}>
          {event.title}
        </Text>
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
  return (
    <Card
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onPress}
      variant="outlined"
      style={styles.row}
    >
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.title}>
          {event.title}
        </Text>
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
    row: { gap: theme.spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: { ...theme.typography.cardTitle, color: theme.colors.text, flex: 1 },
    meta: { ...theme.typography.caption, color: theme.colors.textSecondary },
    description: { ...theme.typography.helper, color: theme.colors.text },
    sourceChip: {
      ...theme.typography.caption,
      color: theme.colors.onBrand,
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radii.xl,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    deviceChip: { color: theme.colors.text, backgroundColor: theme.colors.surfaceMuted },
  });
