import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../design/tokens';
import {
  CalendarDisplayEvent,
  CalendarUiState,
  EventStatus,
} from '../../features/calendar/calendarTypes';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  formatClockTime,
} from '../../features/profile/timeFormat';

type HourlyTimelineProps = {
  date: Date;
  events: CalendarDisplayEvent[];
  focusCurrentTimeRequest?: number;
  onPressEvent: (event: CalendarDisplayEvent) => void;
  uiState: CalendarUiState;
  timeFormat?: TimeFormat;
};

const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const LABEL_COL_WIDTH = 52;
const EVENT_PADDING_H = 8;
const MIN_EVENT_HEIGHT = 24;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function getEventTop(startAt: Date): number {
  return (startAt.getHours() + startAt.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeight(startAt: Date, endAt: Date): number {
  const durationMs = Math.max(endAt.getTime() - startAt.getTime(), 0);
  const durationHours = durationMs / 3_600_000;
  return Math.max(durationHours * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
}

function formatHourLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === '24-hour') return `${String(hour).padStart(2, '0')}:00`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
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

export function HourlyTimeline({
  date,
  events,
  focusCurrentTimeRequest = 0,
  onPressEvent,
  uiState,
  timeFormat = DEFAULT_TIME_FORMAT,
}: HourlyTimelineProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const now = new Date();
  const isToday = isSameCalendarDay(date, now);
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const allDayEvents = events.filter((event) => event.allDay);
  const timedEvents = events.filter((event) => !event.allDay);

  useEffect(() => {
    if (uiState === 'loading' || uiState === 'error' || viewportHeight === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const currentTime = new Date();
      const latestCurrentTimeTop =
        (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT;
      const maxScrollTop = Math.max(TOTAL_HEIGHT - viewportHeight, 0);
      const centeredCurrentTime = Math.min(
        Math.max(latestCurrentTimeTop - viewportHeight / 2, 0),
        maxScrollTop,
      );
      const scrollTarget = isSameCalendarDay(new Date(selectedDay), currentTime)
        ? centeredCurrentTime
        : HOUR_HEIGHT * 7;
      scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: false });
    }, 50);

    return () => clearTimeout(timer);
  }, [focusCurrentTimeRequest, selectedDay, uiState, viewportHeight]);

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
    <View style={styles.container}>
      {allDayEvents.length > 0 ? (
        <View style={styles.allDaySection} testID="all-day-events-header">
          <Text style={styles.allDayLabel}>all-day</Text>
          <View style={styles.allDayEventList}>
            {allDayEvents.map((event) => {
              const backgroundColor =
                event.ownership === 'device' && event.calendarColor
                  ? event.calendarColor
                  : getEventBgColor(event.status);
              const textColor = getEventTextColor(event.status);
              return (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  accessibilityLabel={event.title}
                  onPress={() => onPressEvent(event)}
                  testID={`all-day-event-${event.id}`}
                  style={({ pressed }) => [
                    styles.allDayEvent,
                    { backgroundColor },
                    event.status === 'canceled' ? styles.eventBlockCanceled : null,
                    pressed ? styles.eventBlockPressed : null,
                  ]}
                >
                  <Text style={[styles.eventTitle, { color: textColor }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <ScrollView
        ref={scrollViewRef}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        testID="hourly-timeline-scroll"
      >
        <View style={styles.timelineContainer}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <View key={hour} style={[styles.hourRow, { top: hour * HOUR_HEIGHT }]}>
              <Text style={styles.hourLabel}>
                {hour === 0 ? '' : formatHourLabel(hour, timeFormat)}
              </Text>
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
          {(uiState === 'ready' || uiState === 'empty') && timedEvents.length > 0
            ? timedEvents.map((event) => {
                const bgColor =
                  event.ownership === 'device' && event.calendarColor
                    ? event.calendarColor
                    : getEventBgColor(event.status);
                const textColor = getEventTextColor(event.status);
                return (
                  <Pressable
                    key={event.id}
                    accessibilityRole="button"
                    accessibilityLabel={event.title}
                    onPress={() => onPressEvent(event)}
                    testID={`timed-event-${event.id}`}
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
                      {formatClockTime(event.startAt, timeFormat)} –{' '}
                      {formatClockTime(event.endAt, timeFormat)}
                    </Text>
                  </Pressable>
                );
              })
            : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  allDaySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: EVENT_PADDING_H,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  allDayLabel: {
    ...typography.helper,
    fontSize: 11,
    color: colors.textSecondary,
    width: LABEL_COL_WIDTH - EVENT_PADDING_H,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
    textAlign: 'right',
  },
  allDayEventList: {
    flex: 1,
    gap: spacing.xs,
  },
  allDayEvent: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
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
