import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { layout, radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  CalendarDisplayEvent,
  CalendarUiState,
  EventStatus,
  eventOverlapsCalendarDay,
} from '../../features/calendar/calendarTypes';
import { getEventCalendarLabel, getEventKindLabel } from '../presentation/EventPresentation';
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
const EVENT_GAP = 2;
const TIMELINE_PADDING_TOP = spacing.sm;
const COMPACT_EVENT_HEIGHT = 56;
const COMPACT_CALENDAR_EVENT_HEIGHT = 44;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type PositionedEvent = {
  event: CalendarDisplayEvent;
  lane: number;
  laneCount: number;
};

function positionOverlappingEvents(events: CalendarDisplayEvent[]): PositionedEvent[] {
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

function getEventTop(startAt: Date, visibleDate: Date): number {
  const dayStart = new Date(
    visibleDate.getFullYear(),
    visibleDate.getMonth(),
    visibleDate.getDate(),
  );
  const visibleStart = Math.max(startAt.getTime(), dayStart.getTime());
  return ((visibleStart - dayStart.getTime()) / 3_600_000) * HOUR_HEIGHT;
}

function getEventHeight(startAt: Date, endAt: Date, visibleDate: Date): number {
  const dayStart = new Date(
    visibleDate.getFullYear(),
    visibleDate.getMonth(),
    visibleDate.getDate(),
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const visibleStart = Math.max(startAt.getTime(), dayStart.getTime());
  const visibleEnd = Math.min(endAt.getTime(), dayEnd.getTime());
  const durationMs = Math.max(visibleEnd - visibleStart, 0);
  const durationHours = durationMs / 3_600_000;
  return Math.max(durationHours * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
}

function formatHourLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === '24-hour') return `${String(hour).padStart(2, '0')}:00`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function getEventBgColor(
  status: EventStatus,
  ownership: CalendarDisplayEvent['ownership'],
  theme: Theme,
): string {
  if (status === 'completed') return theme.colors.textSecondary;
  if (status === 'canceled') return theme.colors.surfaceMuted;
  if (ownership === 'device') return theme.colors.importedCyan;
  return theme.colors.brand;
}

function getEventTextColor(status: EventStatus, theme: Theme): string {
  return status === 'canceled' ? theme.colors.textSecondary : '#F4F8FA';
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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const now = new Date();
  const isToday = isSameCalendarDay(date, now);
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const allDayEvents = events.filter((event) => event.allDay);
  const timedEvents = events.filter(
    (event) => !event.allDay && eventOverlapsCalendarDay(event, date),
  );
  const positionedTimedEvents = positionOverlappingEvents(timedEvents);
  const timelinePaddingBottom = layout.pagePaddingVertical + insets.bottom;

  useEffect(() => {
    if (uiState === 'loading' || uiState === 'error' || viewportHeight === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const currentTime = new Date();
      const latestCurrentTimeTop =
        (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT;
      const contentHeight = TOTAL_HEIGHT + TIMELINE_PADDING_TOP + timelinePaddingBottom;
      const maxScrollTop = Math.max(contentHeight - viewportHeight, 0);
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
  }, [focusCurrentTimeRequest, selectedDay, timelinePaddingBottom, uiState, viewportHeight]);

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
                  : getEventBgColor(event.status, event.ownership, theme);
              const textColor = getEventTextColor(event.status, theme);
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
                  <Text style={[styles.eventKind, { color: textColor }]} numberOfLines={1}>
                    {getEventKindLabel(event) || getEventCalendarLabel(event)}
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
        contentContainerStyle={{
          paddingTop: TIMELINE_PADDING_TOP,
          paddingBottom: timelinePaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        testID="hourly-timeline-scroll"
      >
        <View style={styles.timelineContainer}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <View key={hour} style={[styles.hourRow, { top: hour * HOUR_HEIGHT }]}>
              <Text style={styles.hourLabel}>{formatHourLabel(hour, timeFormat)}</Text>
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
          {(uiState === 'ready' || uiState === 'empty') && positionedTimedEvents.length > 0 ? (
            <View style={styles.eventArea}>
              {positionedTimedEvents.map(({ event, lane, laneCount }) => {
                const bgColor =
                  event.ownership === 'device' && event.calendarColor
                    ? event.calendarColor
                    : getEventBgColor(event.status, event.ownership, theme);
                const textColor = getEventTextColor(event.status, theme);
                const eventHeight = getEventHeight(event.startAt, event.endAt, date);
                const isCompact = eventHeight < COMPACT_EVENT_HEIGHT;
                const showCompactDetails = eventHeight >= COMPACT_CALENDAR_EVENT_HEIGHT;
                return (
                  <View
                    key={event.id}
                    style={[
                      styles.eventLane,
                      {
                        top: getEventTop(event.startAt, date),
                        height: eventHeight,
                        left: `${(lane / laneCount) * 100}%`,
                        width: `${100 / laneCount}%`,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={event.title}
                      onPress={() => onPressEvent(event)}
                      testID={`timed-event-${event.id}`}
                      style={({ pressed }) => [
                        styles.eventBlock,
                        isCompact ? styles.compactEventBlock : null,
                        { backgroundColor: bgColor },
                        event.status === 'canceled' ? styles.eventBlockCanceled : null,
                        pressed ? styles.eventBlockPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventTitle,
                          isCompact ? styles.compactEventTitle : null,
                          { color: textColor },
                        ]}
                        numberOfLines={1}
                      >
                        {event.title}
                      </Text>
                      {!isCompact || showCompactDetails ? (
                        <Text
                          style={[
                            styles.eventKind,
                            showCompactDetails ? styles.compactEventKind : null,
                            { color: textColor },
                          ]}
                          numberOfLines={1}
                        >
                          {getEventKindLabel(event) || getEventCalendarLabel(event)}
                        </Text>
                      ) : null}
                      {!isCompact || showCompactDetails ? (
                        <Text
                          style={[
                            styles.eventTime,
                            isCompact ? styles.compactEventTime : null,
                            { color: textColor },
                          ]}
                          numberOfLines={1}
                        >
                          {formatClockTime(event.startAt, timeFormat)} –{' '}
                          {formatClockTime(event.endAt, timeFormat)}
                        </Text>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    errorText: {
      color: theme.colors.dangerText,
    },
    scrollView: {
      flex: 1,
    },
    allDaySection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: EVENT_PADDING_H,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surfaceRaised,
    },
    allDayLabel: {
      ...typography.helper,
      fontSize: 11,
      color: theme.colors.textSecondary,
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
    eventArea: {
      position: 'absolute',
      top: 0,
      right: EVENT_PADDING_H,
      bottom: 0,
      left: LABEL_COL_WIDTH + EVENT_PADDING_H,
    },
    eventLane: {
      position: 'absolute',
      overflow: 'hidden',
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
      color: theme.colors.textSecondary,
      width: LABEL_COL_WIDTH,
      paddingRight: spacing.sm,
      textAlign: 'right',
      marginTop: -7,
    },
    hourLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginTop: 0,
    },
    currentTimeLine: {
      position: 'absolute',
      left: LABEL_COL_WIDTH,
      right: 0,
      height: 2,
      backgroundColor: theme.colors.brand,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1,
    },
    currentTimeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.brand,
      marginLeft: -5,
    },
    eventBlock: {
      position: 'absolute',
      top: EVENT_GAP,
      right: EVENT_GAP,
      bottom: EVENT_GAP,
      left: EVENT_GAP,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      overflow: 'hidden',
      zIndex: 2,
    },
    compactEventBlock: {
      paddingVertical: 0,
    },
    eventBlockCanceled: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    eventBlockPressed: {
      opacity: 0.8,
    },
    eventTitle: {
      ...typography.helper,
      fontWeight: '600',
      fontSize: 12,
    },
    compactEventTitle: {
      fontSize: 11,
      lineHeight: 14,
    },
    eventKind: {
      ...typography.helper,
      fontSize: 10,
      opacity: 0.9,
    },
    compactEventKind: {
      fontSize: 10,
      lineHeight: 12,
    },
    eventTime: {
      fontSize: 11,
      opacity: 0.9,
    },
    compactEventTime: {
      fontSize: 10,
      lineHeight: 12,
    },
  });
