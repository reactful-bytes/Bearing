import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useThemedStyles } from '../design/useThemedStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayNavBar } from '../components/calendar/DayNavBar';
import { ViewModeToggle } from '../components/calendar/ViewModeToggle';
import { HourlyTimeline } from '../components/calendar/HourlyTimeline';
import { WeekTimeline } from '../components/calendar/WeekTimeline';
import { MonthGrid, MONTH_NAMES, getMonthGridHeight } from '../components/calendar/MonthGrid';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { EventRow } from '../components/presentation/EventPresentation';
import { AppIcon } from '../components/ui/AppIcon';
import { IconButton } from '../components/ui/IconButton';
import { layout, radii, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import {
  CalendarDisplayEvent,
  CalendarEvent,
  CalendarUiState,
  CreateEventInput,
  CreateEventOptions,
  ViewMode,
  createUnpublishedMetadata,
  eventOverlapsCalendarDay,
} from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CreateNoteInput as CreateNotePayload } from '../features/notes/noteTypes';
import { AppTabParamList, CalendarFocusLaunch } from '../navigation/navigationTypes';
import { getFirebaseAuth } from '../services/firebase/firebaseAuth';
import { useCreateNote } from '../features/notes/useNotes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, formatClockTime } from '../features/profile/timeFormat';

// ---------------------------------------------------------------------------
// Month carousel data
// ---------------------------------------------------------------------------

type MonthItem = { year: number; month: number };

const MONTH_RANGE = 12; // months before and after today

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };
const DESKTOP_CALENDAR_BREAKPOINT = 1024;
const WEB_CONTENT_MAX_WIDTH = 860;

function buildMonthList(baseDate: Date): MonthItem[] {
  const items: MonthItem[] = [];
  for (let i = -MONTH_RANGE; i <= MONTH_RANGE; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    items.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return items;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getSundayWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getDefaultCalendarView(platform: string, width: number): ViewMode {
  return platform === 'web' && width >= DESKTOP_CALENDAR_BREAKPOINT ? 'week' : 'day';
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endYear = end.getFullYear();

  return startMonth === endMonth
    ? `${startMonth} ${start.getDate()}–${end.getDate()}, ${endYear}`
    : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${endYear}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ---------------------------------------------------------------------------
// Props (test overrides only)
// ---------------------------------------------------------------------------

export type CalendarScreenProps = {
  stateOverride?: CalendarUiState;
  eventsOverride?: CalendarDisplayEvent[];
  initialDateOverride?: Date;
  initialViewMode?: ViewMode;
  route?: {
    params?: {
      focusLaunch?: CalendarFocusLaunch;
      createEvent?: boolean;
      dateIso?: string;
    };
  };
  navigation?: {
    setParams?: (params: { focusLaunch?: CalendarFocusLaunch; createEvent?: boolean }) => void;
    navigate?: (
      route: 'CalendarSources' | 'CreateEvent' | 'EventDetail' | 'Plan',
      params?:
        | AppTabParamList['Plan']
        | { eventId: string; dateIso?: string }
        | { goalId?: string; stepId?: string; returnTo?: string }
        | undefined,
    ) => void;
    getParent?: () =>
      | {
          navigate?: (route: 'Plan', params: AppTabParamList['Plan']) => void;
        }
      | undefined;
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarScreen({
  stateOverride,
  eventsOverride,
  initialDateOverride,
  initialViewMode,
  route,
  navigation,
}: CalendarScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const calendarPageWidth =
    Platform.OS === 'web' ? Math.min(screenWidth, WEB_CONTENT_MAX_WIDTH) : screenWidth;
  const isDesktopCalendar = Platform.OS === 'web' && screenWidth >= DESKTOP_CALENDAR_BREAKPOINT;
  const [selectedDate, setSelectedDate] = useState<Date>(initialDateOverride ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialViewMode ?? getDefaultCalendarView(Platform.OS, screenWidth),
  );
  const [activeEvent, setActiveEvent] = useState<CalendarDisplayEvent | null>(null);
  const [addEventVisible, setAddEventVisible] = useState(false);
  const [focusModeVisible, setFocusModeVisible] = useState(false);
  const [pendingFocusEvent, setPendingFocusEvent] = useState<CalendarEvent | null>(null);
  const [preferredFocusEventId, setPreferredFocusEventId] = useState<string | null>(null);
  const [timelineFocusRequest, setTimelineFocusRequest] = useState(0);

  useEffect(() => {
    const dateIso = route?.params?.dateIso;
    if (!dateIso) return;

    const nextDate = new Date(dateIso);
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
    }
  }, [route?.params?.dateIso]);

  useEffect(() => {
    if (!route?.params?.createEvent) {
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate('CreateEvent');
    } else {
      setAddEventVisible(true);
    }
    navigation?.setParams?.({ createEvent: undefined });
  }, [navigation, route?.params?.createEvent]);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const weekStart = useMemo(() => getSundayWeekStart(selectedDate), [selectedDate]);
  const visibleRange = useMemo(() => {
    if (viewMode !== 'week') return undefined;
    const end = addDays(weekStart, 6);
    end.setHours(23, 59, 59, 999);
    return { start: weekStart, end };
  }, [viewMode, weekStart]);

  // Real data from hook (test overrides only when eventsOverride provided)
  const {
    events: realEvents,
    eventsForDate,
    uiState: realUiState,
    createEvent,
    updateEvent,
    deleteEvent,
    retryPublication,
    deviceError,
    publicationCalendarTitle,
  } = useCalendarEvents(selectedDate, undefined, visibleRange);
  const createNote = useCreateNote();
  const { profile } = useUserProfile();
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;

  const uiState: CalendarUiState = stateOverride ?? realUiState;
  const calendarEvents = eventsOverride ?? realEvents;
  const dayEvents: CalendarDisplayEvent[] = eventsOverride
    ? calendarEvents.filter((event) => eventOverlapsCalendarDay(event, selectedDate))
    : eventsForDate(selectedDate);

  // Month carousel
  const baseDate = initialDateOverride ?? new Date();
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth();
  const monthList = useMemo(
    () => buildMonthList(baseDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseYear, baseMonth],
  );
  const initialMonthIndex = MONTH_RANGE;

  const flatListRef = useRef<FlatList<MonthItem>>(null);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(initialMonthIndex);
  const focusEvents = useMemo(() => {
    const today = new Date();

    if (year !== today.getFullYear() || month !== today.getMonth()) {
      return [];
    }

    return calendarEvents.filter((event) => isSameCalendarDay(event.startAt, today));
  }, [calendarEvents, month, year]);
  const mergedFocusEvents = useMemo(() => {
    if (!pendingFocusEvent) {
      return focusEvents;
    }

    return [pendingFocusEvent, ...focusEvents.filter((event) => event.id !== pendingFocusEvent.id)];
  }, [focusEvents, pendingFocusEvent]);
  const focusLaunchToken = route?.params?.focusLaunch?.token;

  useEffect(() => {
    if (!isDesktopCalendar && viewMode === 'week' && initialViewMode === undefined) {
      setViewMode('day');
    }
  }, [initialViewMode, isDesktopCalendar, viewMode]);

  useEffect(() => {
    if (!pendingFocusEvent) {
      return;
    }

    if (focusEvents.some((event) => event.id === pendingFocusEvent.id)) {
      setPendingFocusEvent(null);
    }
  }, [focusEvents, pendingFocusEvent]);

  useEffect(() => {
    const focusLaunch = route?.params?.focusLaunch;
    if (!focusLaunch) {
      return;
    }

    const tabNavigation = navigation?.getParent?.();
    if (tabNavigation?.navigate) {
      tabNavigation.navigate('Plan', {
        screen: 'FocusMode',
        params: {
          eventId: focusLaunch.eventId,
          title: focusLaunch.title,
          description: focusLaunch.description,
          startAtIso: focusLaunch.startAtIso,
          endAtIso: focusLaunch.endAtIso,
          timezone: focusLaunch.timezone,
        },
      });
      navigation?.setParams?.({ focusLaunch: undefined });
      return;
    }

    const userId = getFirebaseAuth().currentUser?.uid ?? 'unknown-user';
    const launchStartAt = new Date(focusLaunch.startAtIso);
    const launchEndAt = new Date(focusLaunch.endAtIso);

    setSelectedDate(launchStartAt);
    setViewMode('day');
    setPreferredFocusEventId(focusLaunch.eventId);
    setPendingFocusEvent({
      ownership: 'bearing',
      id: focusLaunch.eventId,
      userId,
      title: focusLaunch.title,
      description: focusLaunch.description,
      startAt: launchStartAt,
      endAt: launchEndAt,
      timezone: focusLaunch.timezone,
      allDay: false,
      location: '',
      recurrenceRule: null,
      alarms: [],
      availability: 'busy',
      url: null,
      sourceTaskId: null,
      goalId: null,
      stepId: null,
      status: 'scheduled',
      publication: createUnpublishedMetadata(),
      createdAt: launchStartAt,
      updatedAt: launchStartAt,
    });
    setFocusModeVisible(true);
    navigation?.setParams?.({ focusLaunch: undefined });
  }, [focusLaunchToken, navigation, route?.params?.focusLaunch]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems[0]?.index != null) {
        setVisibleMonthIndex(viewableItems[0].index);
      }
    },
    [],
  );

  function handlePrevDay(): void {
    setSelectedDate((d) => addDays(d, -1));
  }

  function handleNextDay(): void {
    setSelectedDate((d) => addDays(d, 1));
  }

  function handleSelectDate(date: Date): void {
    setSelectedDate(date);
    if (viewMode !== 'month') {
      setViewMode('day');
    }
  }

  function handlePrevWeek(): void {
    setSelectedDate((date) => addDays(date, -7));
  }

  function handleNextWeek(): void {
    setSelectedDate((date) => addDays(date, 7));
  }

  function handleToday(): void {
    const today = new Date();
    setSelectedDate(today);
    if (isSameCalendarDay(selectedDate, today)) {
      setTimelineFocusRequest((current) => current + 1);
    }
  }

  function handlePrevMonth(): void {
    const newIndex = Math.max(0, visibleMonthIndex - 1);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  }

  function handleNextMonth(): void {
    const newIndex = Math.min(monthList.length - 1, visibleMonthIndex + 1);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  }

  async function handleAddEvent(
    input: CreateEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    try {
      await createEvent(input, options);
      setAddEventVisible(false);
    } catch (error) {
      console.error('Failed to add event:', error);
      throw error;
    }
  }

  async function handleUpdateEvent(
    event: CalendarDisplayEvent,
    input: CreateEventInput,
  ): Promise<void> {
    try {
      await updateEvent(event, input);
      setActiveEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async function handleDeleteEvent(event: CalendarDisplayEvent): Promise<void> {
    try {
      await deleteEvent(event);
      setActiveEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  function handleCloseFocusMode(): void {
    setFocusModeVisible(false);
    setPreferredFocusEventId(null);
  }

  function handlePressEvent(event: CalendarDisplayEvent): void {
    if (navigation?.navigate) {
      navigation.navigate('EventDetail', {
        eventId: event.id,
        dateIso: event.startAt.toISOString(),
      });
      return;
    }

    setActiveEvent(event);
  }

  async function handleSaveIdeaDump(input: CreateNotePayload): Promise<void> {
    try {
      await createNote(input);
    } catch (error) {
      console.error('Failed to save Idea Dump:', error);
      throw error;
    }
  }

  const visibleMonth = monthList[visibleMonthIndex];

  return (
    <SafeAreaView style={[styles.screen]} edges={['top', 'left', 'right']}>
      <View style={styles.calendarHeader}>
        <IconButton
          name="menu"
          accessibilityLabel="Open navigation"
          onPress={() => navigation?.navigate?.('Plan')}
        />
        <AppIcon name="bearingMark" size={34} decorative />
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.calendarToolbar}>
        <ViewModeToggle
          mode={viewMode}
          onChange={setViewMode}
          showWeek={isDesktopCalendar || initialViewMode === 'week'}
        />
        <View style={styles.toolbarActions} testID="calendar-toolbar-actions">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            onPress={handleToday}
            style={({ pressed }) => [styles.todayButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>
      </View>
      {deviceError ? (
        <Text style={styles.deviceErrorText}>Device events could not be refreshed.</Text>
      ) : null}

      {viewMode === 'day' ? (
        <>
          <DayNavBar date={selectedDate} onPrev={handlePrevDay} onNext={handleNextDay} />
          <HourlyTimeline
            date={selectedDate}
            events={dayEvents}
            focusCurrentTimeRequest={timelineFocusRequest}
            onPressEvent={handlePressEvent}
            uiState={uiState}
            timeFormat={timeFormat}
          />
        </>
      ) : viewMode === 'week' ? (
        <View style={styles.weekContainer}>
          <View style={styles.weekNavRow}>
            <View style={styles.weekNavControls} testID="week-navigation-controls">
              <IconButton
                name="back"
                accessibilityLabel="Previous week"
                onPress={handlePrevWeek}
                style={styles.weekNavButton}
              />
              <Text style={styles.weekRangeLabel}>{formatWeekRange(weekStart)}</Text>
              <IconButton
                name="back"
                accessibilityLabel="Next week"
                onPress={handleNextWeek}
                style={[styles.weekNavButton, styles.nextIcon]}
              />
            </View>
          </View>
          <WeekTimeline
            weekStart={weekStart}
            events={calendarEvents}
            focusCurrentTimeRequest={timelineFocusRequest}
            onPressEvent={handlePressEvent}
            onSelectDate={handleSelectDate}
            uiState={uiState}
            timeFormat={timeFormat}
          />
        </View>
      ) : (
        <View style={styles.monthContainer}>
          {/* Month nav header */}
          <View style={styles.monthNavRow}>
            <IconButton
              name="back"
              accessibilityLabel="Previous month"
              onPress={handlePrevMonth}
              style={styles.monthArrow}
            />
            {visibleMonth ? (
              <Text style={styles.monthNavTitle}>
                {MONTH_NAMES[visibleMonth.month]} {visibleMonth.year}
              </Text>
            ) : null}
            <IconButton
              name="back"
              accessibilityLabel="Next month"
              onPress={handleNextMonth}
              style={[styles.monthArrow, styles.nextIcon]}
            />
          </View>

          {/* Horizontally pageable month grids */}
          <FlatList
            ref={flatListRef}
            testID="month-carousel"
            data={monthList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={[
              styles.monthCarousel,
              visibleMonth
                ? { height: getMonthGridHeight(visibleMonth.year, visibleMonth.month) }
                : null,
            ]}
            initialScrollIndex={initialMonthIndex}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            keyExtractor={({ year, month }) => `${year}-${month}`}
            getItemLayout={(_, index) => ({
              length: calendarPageWidth,
              offset: calendarPageWidth * index,
              index,
            })}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onViewableItemsChanged={handleViewableItemsChanged}
            renderItem={({ item: { year, month } }) => {
              const eventDays = new Set<number>();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              for (let day = 1; day <= daysInMonth; day += 1) {
                if (
                  calendarEvents.some((event) =>
                    eventOverlapsCalendarDay(event, new Date(year, month, day)),
                  )
                ) {
                  eventDays.add(day);
                }
              }

              return (
                <MonthGrid
                  year={year}
                  month={month}
                  selectedDate={selectedDate}
                  eventDays={eventDays}
                  onSelectDate={handleSelectDate}
                  width={calendarPageWidth}
                />
              );
            }}
          />
          <View style={styles.monthAgenda} testID="month-selected-date-agenda">
            <View style={styles.monthAgendaHeader}>
              <Text style={styles.monthAgendaTitle}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.monthAgendaCount}>
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={[
                styles.monthAgendaContent,
                { paddingBottom: layout.pagePaddingVertical + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {dayEvents.length > 0 ? (
                dayEvents
                  .slice()
                  .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
                  .map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      dateTime={
                        event.allDay
                          ? 'All day'
                          : `${formatClockTime(event.startAt, timeFormat)} - ${formatClockTime(event.endAt, timeFormat)}`
                      }
                      timezone={event.timezone}
                      onPress={() => handlePressEvent(event)}
                    />
                  ))
              ) : (
                <Text style={styles.monthAgendaEmpty}>No events scheduled</Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modals */}
      <AddEventModal
        visible={addEventVisible && !navigation?.navigate}
        initialDate={selectedDate}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setAddEventVisible(false)}
        onSave={handleAddEvent}
      />
      <EventDetailModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onRetryPublication={retryPublication}
        locale={profile?.locale}
        timeFormat={timeFormat}
      />
      <FocusModeOverlay
        visible={focusModeVisible}
        events={mergedFocusEvents}
        preferredEventId={preferredFocusEventId}
        timerSoundId={profile?.alarmSoundId}
        onClose={handleCloseFocusMode}
        onSaveIdeaDump={handleSaveIdeaDump}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    calendarToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
    },
    calendarHeader: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerSpacer: {
      width: 40,
    },
    toolbarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    buttonPressed: {
      opacity: 0.65,
    },
    deviceErrorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
      paddingHorizontal: spacing.md,
    },
    monthContainer: {
      flex: 1,
    },
    weekContainer: {
      flex: 1,
    },
    weekNavRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    weekNavControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    weekNavButton: {
      width: 40,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextIcon: { transform: [{ rotate: '180deg' }] },
    todayButton: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
    },
    todayButtonText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    weekRangeLabel: {
      ...typography.button,
      minWidth: 190,
      color: theme.colors.text,
      textAlign: 'center',
    },
    monthNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    monthArrow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      minWidth: 36,
      alignItems: 'center',
    },
    monthNavTitle: {
      ...typography.sectionTitle,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    monthCarousel: {
      flexGrow: 0,
      flexShrink: 0,
    },
    monthAgenda: {
      flex: 1,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    monthAgendaHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    monthAgendaTitle: {
      ...typography.sectionTitle,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.text,
      flex: 1,
    },
    monthAgendaCount: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
    monthAgendaContent: {
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      paddingBottom: layout.pagePaddingVertical,
    },
    monthAgendaEmpty: {
      ...typography.body,
      color: theme.colors.textSecondary,
      paddingVertical: spacing.lg,
    },
  });
