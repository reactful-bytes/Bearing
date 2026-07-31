import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { DayNavBar } from '../components/calendar/DayNavBar';
import { ViewModeToggle } from '../components/calendar/ViewModeToggle';
import { HourlyTimeline } from '../components/calendar/HourlyTimeline';
import { MonthGrid, MONTH_NAMES } from '../components/calendar/MonthGrid';
import { AddEventModal } from '../components/calendar/AddEventModal';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { FocusModeOverlay } from '../components/calendar/FocusModeOverlay';
import { colors, layout, spacing, typography } from '../design/tokens';
import {
  CalendarEvent,
  CalendarUiState,
  CreateEventInput,
  ViewMode,
} from '../features/calendar/calendarTypes';
import { useCalendarEvents } from '../features/calendar/useCalendarEvents';
import { CreateNoteInput as CreateNotePayload } from '../features/notes/noteTypes';
import { CalendarFocusLaunch } from '../navigation/navigationTypes';
import { getFirebaseAuth } from '../services/firebase/firebaseAuth';
import { useNotes } from '../features/notes/useNotes';

// ---------------------------------------------------------------------------
// Month carousel data
// ---------------------------------------------------------------------------

type MonthItem = { year: number; month: number };

const MONTH_RANGE = 12; // months before and after today

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

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

// ---------------------------------------------------------------------------
// Props (test overrides only)
// ---------------------------------------------------------------------------

export type CalendarScreenProps = {
  stateOverride?: CalendarUiState;
  eventsOverride?: CalendarEvent[];
  initialDateOverride?: Date;
  initialViewMode?: ViewMode;
  route?: {
    params?: {
      focusLaunch?: CalendarFocusLaunch;
    };
  };
  navigation?: {
    setParams?: (params: { focusLaunch?: CalendarFocusLaunch }) => void;
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarScreen({
  stateOverride,
  eventsOverride,
  initialDateOverride,
  initialViewMode = 'day',
  route,
  navigation,
}: CalendarScreenProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDateOverride ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [addEventVisible, setAddEventVisible] = useState(false);
  const [focusModeVisible, setFocusModeVisible] = useState(false);
  const [pendingFocusEvent, setPendingFocusEvent] = useState<CalendarEvent | null>(null);
  const [preferredFocusEventId, setPreferredFocusEventId] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // Real data from hook (test overrides only when eventsOverride provided)
  const {
    events: realEvents,
    eventsForDate,
    uiState: realUiState,
    createEvent,
    deleteEvent,
  } = useCalendarEvents(selectedDate);
  const { createNote } = useNotes();

  const uiState: CalendarUiState = stateOverride ?? realUiState;
  const calendarEvents = eventsOverride ?? realEvents;
  const dayEvents: CalendarEvent[] = eventsOverride
    ? calendarEvents.filter((event) => isSameCalendarDay(event.startAt, selectedDate))
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

    const userId = getFirebaseAuth().currentUser?.uid ?? 'unknown-user';
    const launchStartAt = new Date(focusLaunch.startAtIso);
    const launchEndAt = new Date(focusLaunch.endAtIso);

    setSelectedDate(launchStartAt);
    setViewMode('day');
    setPreferredFocusEventId(focusLaunch.eventId);
    setPendingFocusEvent({
      id: focusLaunch.eventId,
      userId,
      title: focusLaunch.title,
      description: focusLaunch.description,
      startAt: launchStartAt,
      endAt: launchEndAt,
      timezone: focusLaunch.timezone,
      source: 'local',
      externalEventId: null,
      calendarConnectionId: null,
      goalId: null,
      stepId: null,
      status: 'scheduled',
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

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function handlePrevDay(): void {
    setSelectedDate((d) => addDays(d, -1));
  }

  function handleNextDay(): void {
    setSelectedDate((d) => addDays(d, 1));
  }

  function handleSelectDate(date: Date): void {
    setSelectedDate(date);
    setViewMode('day');
  }

  function handlePrevMonth(): void {
    const newIndex = Math.max(0, visibleMonthIndex - 1);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  }

  function handleNextMonth(): void {
    const newIndex = Math.min(monthList.length - 1, visibleMonthIndex + 1);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  }

  async function handleAddEvent(input: CreateEventInput): Promise<void> {
    try {
      await createEvent(input);
      setAddEventVisible(false);
    } catch (error) {
      console.error('Failed to add event:', error);
      throw error;
    }
  }

  async function handleDeleteEvent(eventId: string): Promise<void> {
    try {
      await deleteEvent(eventId);
      setActiveEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  function handlePressAddEvent(): void {
    setAddEventVisible(true);
  }

  function handlePressFocusMode(): void {
    setFocusModeVisible(true);
  }

  function handleCloseFocusMode(): void {
    setFocusModeVisible(false);
    setPreferredFocusEventId(null);
  }

  function handlePressEvent(event: CalendarEvent): void {
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
    <View style={styles.screen}>
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />

      {viewMode === 'day' ? (
        <>
          <DayNavBar date={selectedDate} onPrev={handlePrevDay} onNext={handleNextDay} />
          <HourlyTimeline
            date={selectedDate}
            events={dayEvents}
            onPressEvent={handlePressEvent}
            uiState={uiState}
          />
        </>
      ) : (
        <View style={styles.monthContainer}>
          {/* Month nav header */}
          <View style={styles.monthNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={handlePrevMonth}
              style={({ pressed }) => [
                styles.monthArrow,
                pressed ? styles.monthArrowPressed : null,
              ]}
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </Pressable>
            {visibleMonth ? (
              <Text style={styles.monthNavTitle}>
                {MONTH_NAMES[visibleMonth.month]} {visibleMonth.year}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={handleNextMonth}
              style={({ pressed }) => [
                styles.monthArrow,
                pressed ? styles.monthArrowPressed : null,
              ]}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </Pressable>
          </View>

          {/* Horizontally pageable month grids */}
          <FlatList
            ref={flatListRef}
            data={monthList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialMonthIndex}
            keyExtractor={({ year, month }) => `${year}-${month}`}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onViewableItemsChanged={handleViewableItemsChanged}
            renderItem={({ item: { year, month } }) => {
              const eventDays = new Set<number>();
              realEvents.forEach((event) => {
                if (event.startAt.getFullYear() === year && event.startAt.getMonth() === month) {
                  eventDays.add(event.startAt.getDate());
                }
              });

              return (
                <MonthGrid
                  year={year}
                  month={month}
                  selectedDate={selectedDate}
                  eventDays={eventDays}
                  onSelectDate={handleSelectDate}
                  width={screenWidth}
                />
              );
            }}
          />
        </View>
      )}

      {/* Floating action button */}
      <View style={styles.fabContainer}>
        <FloatingActionButton
          label="Focus"
          labelColor="#153748"
          onPress={handlePressFocusMode}
          style={styles.secondaryFab}
        />
        <FloatingActionButton
          onPress={handlePressAddEvent}
          disabled={uiState === 'loading'}
          style={styles.primaryFab}
        />
      </View>

      {/* Modals */}
      <AddEventModal
        visible={addEventVisible}
        initialDate={selectedDate}
        onClose={() => setAddEventVisible(false)}
        onSave={handleAddEvent}
      />
      <EventDetailModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
        onDelete={handleDeleteEvent}
      />
      <FocusModeOverlay
        visible={focusModeVisible}
        events={mergedFocusEvents}
        preferredEventId={preferredFocusEventId}
        onClose={handleCloseFocusMode}
        onSaveIdeaDump={handleSaveIdeaDump}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  monthContainer: {
    flex: 1,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  monthArrow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 36,
    alignItems: 'center',
  },
  monthArrowPressed: {
    opacity: 0.6,
  },
  monthArrowText: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.brand,
    fontWeight: '300',
  },
  monthNavTitle: {
    ...typography.button,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: layout.pagePaddingVertical,
    right: layout.pagePaddingHorizontal,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  primaryFab: {
    alignSelf: 'flex-end',
  },
  secondaryFab: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
