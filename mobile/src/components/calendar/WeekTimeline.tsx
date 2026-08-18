import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';
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

type WeekTimelineProps = {
  weekStart: Date;
  events: CalendarDisplayEvent[];
  focusCurrentTimeRequest?: number;
  onPressEvent: (event: CalendarDisplayEvent) => void;
  onSelectDate: (date: Date) => void;
  uiState: CalendarUiState;
  timeFormat?: TimeFormat;
};

type PositionedEvent = {
  event: CalendarDisplayEvent;
  lane: number;
  laneCount: number;
};

const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const LABEL_COLUMN_WIDTH = 56;
const WEEK_HEADER_MIN_HEIGHT = 106;
const MIN_EVENT_HEIGHT = 24;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatHourLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === '24-hour') return `${String(hour).padStart(2, '0')}:00`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function getEventColor(event: CalendarDisplayEvent): string {
  if (event.ownership === 'device' && event.calendarColor) return event.calendarColor;
  if (event.status === 'completed') return colors.textSecondary;
  if (event.status === 'canceled') return colors.surfaceMuted;
  return colors.brand;
}

function getEventTextColor(status: EventStatus): string {
  return status === 'canceled' ? colors.textSecondary : '#F4F8FA';
}

function getEventTop(startAt: Date): number {
  return (startAt.getHours() + startAt.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeight(startAt: Date, endAt: Date): number {
  const endOfDay = new Date(startAt);
  endOfDay.setHours(24, 0, 0, 0);
  const visibleEnd = Math.min(endAt.getTime(), endOfDay.getTime());
  const durationHours = Math.max(visibleEnd - startAt.getTime(), 0) / 3_600_000;
  return Math.max(durationHours * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
}

export function positionOverlappingEvents(events: CalendarDisplayEvent[]): PositionedEvent[] {
  const sorted = [...events].sort(
    (left, right) =>
      left.startAt.getTime() - right.startAt.getTime() ||
      left.endAt.getTime() - right.endAt.getTime(),
  );
  const positioned: PositionedEvent[] = [];
  let group: { event: CalendarDisplayEvent; lane: number }[] = [];
  let groupEnd = 0;

  function commitGroup(): void {
    if (group.length === 0) return;
    const laneCount = Math.max(...group.map(({ lane }) => lane)) + 1;
    positioned.push(...group.map(({ event, lane }) => ({ event, lane, laneCount })));
    group = [];
  }

  for (const event of sorted) {
    if (group.length > 0 && event.startAt.getTime() >= groupEnd) {
      commitGroup();
      groupEnd = 0;
    }

    const occupiedLanes = new Set(
      group
        .filter(({ event: activeEvent }) => activeEvent.endAt > event.startAt)
        .map(({ lane }) => lane),
    );
    let lane = 0;
    while (occupiedLanes.has(lane)) lane += 1;

    group.push({ event, lane });
    groupEnd = Math.max(groupEnd, event.endAt.getTime());
  }

  commitGroup();
  return positioned;
}

export function WeekTimeline({
  weekStart,
  events,
  focusCurrentTimeRequest = 0,
  onPressEvent,
  onSelectDate,
  uiState,
  timeFormat = DEFAULT_TIME_FORMAT,
}: WeekTimelineProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const now = new Date();
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const includesToday = days.some((day) => isSameCalendarDay(day, now));

  useEffect(() => {
    if (uiState === 'loading' || uiState === 'error' || viewportHeight === 0) return;

    const timer = setTimeout(() => {
      const latestNow = new Date();
      const latestTop = (latestNow.getHours() + latestNow.getMinutes() / 60) * HOUR_HEIGHT;
      const target = includesToday
        ? latestTop - (viewportHeight - WEEK_HEADER_MIN_HEIGHT) / 2
        : HOUR_HEIGHT * 7;
      scrollViewRef.current?.scrollTo({
        y: Math.min(Math.max(target, 0), Math.max(TOTAL_HEIGHT - viewportHeight, 0)),
        animated: false,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [focusCurrentTimeRequest, includesToday, uiState, viewportHeight, weekStart]);

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
    <View style={styles.container} testID="week-timeline">
      <ScrollView
        ref={scrollViewRef}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        style={styles.scrollView}
        showsVerticalScrollIndicator
        stickyHeaderIndices={[0]}
        testID="week-timeline-scroll"
      >
        <View style={styles.stickyHeaderBlock}>
          <View style={styles.dayHeaderRow}>
            <View style={styles.labelColumn} />
            {days.map((day, index) => {
              const isToday = isSameCalendarDay(day, now);
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={day.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  onPress={() => onSelectDate(day)}
                  style={[styles.dayHeader, isToday ? styles.todayHeader : null]}
                >
                  <Text style={[styles.dayName, isToday ? styles.todayText : null]}>
                    {DAY_NAMES[index]}
                  </Text>
                  <Text style={[styles.dayNumber, isToday ? styles.todayText : null]}>
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.allDayRow} testID="week-all-day-row">
            <Text style={styles.allDayLabel}>all-day</Text>
            {days.map((day) => {
              const allDayEvents = events.filter(
                (event) => event.allDay && isSameCalendarDay(event.startAt, day),
              );
              return (
                <View key={day.toISOString()} style={styles.allDayColumn}>
                  {allDayEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      accessibilityRole="button"
                      accessibilityLabel={event.title}
                      onPress={() => onPressEvent(event)}
                      style={[styles.allDayEvent, { backgroundColor: getEventColor(event) }]}
                    >
                      <Text
                        style={[styles.eventTitle, { color: getEventTextColor(event.status) }]}
                        numberOfLines={1}
                      >
                        {event.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.timelineRow}>
          <View style={styles.hourLabels}>
            {HOURS.map((hour) => (
              <Text key={hour} style={[styles.hourLabel, { top: hour * HOUR_HEIGHT - 7 }]}>
                {hour === 0 ? '' : formatHourLabel(hour, timeFormat)}
              </Text>
            ))}
          </View>

          {days.map((day) => {
            const isToday = isSameCalendarDay(day, now);
            const timedEvents = events.filter(
              (event) => !event.allDay && isSameCalendarDay(event.startAt, day),
            );
            return (
              <View key={day.toISOString()} style={styles.dayColumn}>
                {HOURS.map((hour) => (
                  <View key={hour} style={[styles.hourLine, { top: hour * HOUR_HEIGHT }]} />
                ))}
                {isToday ? (
                  <View style={[styles.currentTimeLine, { top: currentTimeTop }]} />
                ) : null}
                {positionOverlappingEvents(timedEvents).map(({ event, lane, laneCount }) => (
                  <Pressable
                    key={event.id}
                    accessibilityRole="button"
                    accessibilityLabel={event.title}
                    onPress={() => onPressEvent(event)}
                    testID={`week-event-${event.id}`}
                    style={[
                      styles.eventBlock,
                      {
                        top: getEventTop(event.startAt),
                        height: getEventHeight(event.startAt, event.endAt),
                        left: `${(lane / laneCount) * 100}%`,
                        width: `${100 / laneCount}%`,
                        backgroundColor: getEventColor(event),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.eventTitle, { color: getEventTextColor(event.status) }]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={[styles.eventTime, { color: getEventTextColor(event.status) }]}
                      numberOfLines={1}
                    >
                      {formatClockTime(event.startAt, timeFormat)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 760,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
  dayHeaderRow: {
    flexDirection: 'row',
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stickyHeaderBlock: {
    minHeight: WEEK_HEADER_MIN_HEIGHT,
    backgroundColor: colors.surface,
    zIndex: 4,
  },
  labelColumn: {
    width: LABEL_COLUMN_WIDTH,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  todayHeader: {
    backgroundColor: colors.surfaceBrand,
  },
  dayName: {
    ...typography.label,
    color: colors.textSecondary,
  },
  dayNumber: {
    ...typography.button,
    color: colors.text,
  },
  todayText: {
    color: colors.brand,
  },
  allDayRow: {
    flexDirection: 'row',
    minHeight: 38,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  allDayLabel: {
    ...typography.helper,
    width: LABEL_COLUMN_WIDTH,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'right',
  },
  allDayColumn: {
    flex: 1,
    padding: 2,
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  allDayEvent: {
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  timelineRow: {
    height: TOTAL_HEIGHT,
    flexDirection: 'row',
  },
  hourLabels: {
    width: LABEL_COLUMN_WIDTH,
    height: TOTAL_HEIGHT,
    position: 'relative',
  },
  hourLabel: {
    ...typography.helper,
    position: 'absolute',
    right: spacing.sm,
    color: colors.textSecondary,
    fontSize: 11,
  },
  dayColumn: {
    flex: 1,
    height: TOTAL_HEIGHT,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.brand,
    zIndex: 3,
  },
  eventBlock: {
    position: 'absolute',
    zIndex: 2,
    minWidth: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  eventTitle: {
    ...typography.helper,
    fontSize: 11,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 10,
    opacity: 0.9,
  },
});
