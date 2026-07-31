import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import { CalendarEvent, CalendarUiState, EventStatus } from '../../features/calendar/calendarTypes';

type HourlyTimelineProps = {
  date: Date;
  events: CalendarEvent[];
  onPressEvent: (event: CalendarEvent) => void;
  uiState: CalendarUiState;
};

const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const LABEL_COL_WIDTH = 52;
const EVENT_PADDING_H = 8;
const MIN_EVENT_HEIGHT = 24;

const HOUR_LABELS: string[] = [
  '12 AM',
  '1 AM',
  '2 AM',
  '3 AM',
  '4 AM',
  '5 AM',
  '6 AM',
  '7 AM',
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
  '6 PM',
  '7 PM',
  '8 PM',
  '9 PM',
  '10 PM',
  '11 PM',
];

function getEventTop(startAt: Date): number {
  return (startAt.getHours() + startAt.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeight(startAt: Date, endAt: Date): number {
  const durationMs = Math.max(endAt.getTime() - startAt.getTime(), 0);
  const durationHours = durationMs / 3_600_000;
  return Math.max(durationHours * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
}

function formatEventTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

function getEventBgColor(status: EventStatus): string {
  if (status === 'completed') return colors.textSecondary;
  if (status === 'canceled') return colors.surfaceMuted;
  return colors.brand;
}

function getEventTextColor(status: EventStatus): string {
  return status === 'canceled' ? colors.textSecondary : '#F4F8FA';
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function HourlyTimeline({ date, events, onPressEvent, uiState }: HourlyTimelineProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const now = new Date();
  const isToday = isSameCalendarDay(date, now);
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

  useEffect(() => {
    const scrollTarget = isToday ? Math.max(currentTimeTop - HOUR_HEIGHT * 2, 0) : HOUR_HEIGHT * 7; // default to 7 AM for non-today

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: false });
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toDateString()]);

  if (uiState === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>Loading events...</Text>
      </View>
    );
  }

  if (uiState === 'error') {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.stateText, styles.errorText]}>
          Unable to load events. Try again in a moment.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      testID="hourly-timeline-scroll"
    >
      <View style={styles.timelineContainer}>
        {/* Hour rows */}
        {HOUR_LABELS.map((label, hour) => (
          <View key={hour} style={[styles.hourRow, { top: hour * HOUR_HEIGHT }]}>
            <Text style={styles.hourLabel}>{hour === 0 ? '' : label}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {/* Current time indicator */}
        {isToday ? (
          <View style={[styles.currentTimeLine, { top: currentTimeTop }]}>
            <View style={styles.currentTimeDot} />
          </View>
        ) : null}

        {/* Event blocks */}
        {(uiState === 'ready' || uiState === 'empty') && events.length > 0
          ? events.map((event) => {
              const bgColor = getEventBgColor(event.status);
              const textColor = getEventTextColor(event.status);
              return (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  accessibilityLabel={event.title}
                  onPress={() => onPressEvent(event)}
                  style={({ pressed }) => [
                    styles.eventBlock,
                    {
                      top: getEventTop(event.startAt),
                      height: getEventHeight(event.startAt, event.endAt),
                      left: LABEL_COL_WIDTH + EVENT_PADDING_H,
                      right: EVENT_PADDING_H,
                      backgroundColor: bgColor,
                    },
                    event.status === 'canceled' ? styles.eventBlockCanceled : null,
                    pressed ? styles.eventBlockPressed : null,
                  ]}
                >
                  <Text style={[styles.eventTitle, { color: textColor }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventTime, { color: textColor }]} numberOfLines={1}>
                    {formatEventTime(event.startAt)} – {formatEventTime(event.endAt)}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    color: colors.dangerText,
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    height: TOTAL_HEIGHT,
    position: 'relative',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    ...typography.helper,
    fontSize: 11,
    color: colors.textSecondary,
    width: LABEL_COL_WIDTH,
    paddingRight: spacing.sm,
    textAlign: 'right',
    marginTop: -7,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: 0,
  },
  currentTimeLine: {
    position: 'absolute',
    left: LABEL_COL_WIDTH - 4,
    right: 0,
    height: 2,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    marginLeft: -5,
    marginTop: -4,
  },
  eventBlock: {
    position: 'absolute',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    zIndex: 2,
  },
  eventBlockCanceled: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  eventBlockPressed: {
    opacity: 0.8,
  },
  eventTitle: {
    ...typography.helper,
    fontWeight: '600',
    fontSize: 12,
  },
  eventTime: {
    fontSize: 11,
    opacity: 0.9,
  },
});
