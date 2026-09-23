import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';
import { ListItem } from '../ui/ListItem';
import { ScreenHeader } from '../ui/ScreenHeader';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  BearingEvent,
  CalendarDisplayEvent,
  CreateEventInput,
} from '../../features/calendar/calendarTypes';
import { EventEditForm } from './EventEditForm';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  formatClockTime,
} from '../../features/profile/timeFormat';

type EventDetailModalProps = {
  event: CalendarDisplayEvent | null;
  onClose: () => void;
  onUpdate: (event: CalendarDisplayEvent, input: CreateEventInput) => Promise<void>;
  onDelete: (event: CalendarDisplayEvent) => Promise<void>;
  onRetryPublication?: (event: BearingEvent) => Promise<void>;
  locale?: string;
  timeFormat?: TimeFormat;
  embedded?: boolean;
  onEdit?: () => void;
};

function formatFullDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventTime(date: Date, allDay: boolean, timeFormat: TimeFormat): string {
  return allDay ? 'All day' : formatClockTime(date, timeFormat);
}

function formatRecurrence(event: CalendarDisplayEvent): string {
  const recurrence = event.recurrenceRule;
  if (!recurrence) return 'Does not repeat';

  const unit =
    recurrence.frequency === 'daily'
      ? 'day'
      : recurrence.frequency === 'weekly'
        ? 'week'
        : recurrence.frequency === 'monthly'
          ? 'month'
          : 'year';
  const repeatLabel = recurrence.interval === 1 ? unit : `${recurrence.interval} ${unit}s`;
  const weekdayLabel =
    recurrence.weekdays.length > 0
      ? ` on ${recurrence.weekdays.map((weekday) => weekday.slice(0, 3)).join(', ')}`
      : '';
  const endLabel = recurrence.occurrenceCount
    ? `, ${recurrence.occurrenceCount} times`
    : recurrence.endAt
      ? `, until ${formatFullDate(recurrence.endAt)}`
      : '';

  return `Every ${repeatLabel}${weekdayLabel}${endLabel}`;
}

function formatAvailability(availability: CalendarDisplayEvent['availability']): string {
  return availability === 'not-supported'
    ? 'Not supported'
    : availability.charAt(0).toUpperCase() + availability.slice(1);
}

function formatAlert(alarm: CalendarDisplayEvent['alarms'][number]): string {
  if (alarm.relativeOffsetMinutes === null) {
    return alarm.absoluteAt ? `At ${formatFullDate(alarm.absoluteAt)}` : 'Custom alert';
  }
  if (alarm.relativeOffsetMinutes === 0) return 'At event time';
  const minutes = Math.abs(alarm.relativeOffsetMinutes);
  const unit = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${unit} ${alarm.relativeOffsetMinutes < 0 ? 'before' : 'after'} event`;
}

export function EventDetailModal({
  event,
  onClose,
  onUpdate,
  onDelete,
  onRetryPublication,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  embedded = false,
  onEdit,
}: EventDetailModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retryingPublication, setRetryingPublication] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setConfirmingDelete(false);
    setDeleteError(null);
    setPublicationError(null);
  }, [event]);

  function handleClose(): void {
    setEditing(false);
    setConfirmingDelete(false);
    setDeleteError(null);
    onClose();
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!event) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(event);
      handleClose();
    } catch {
      setDeleteError('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpdate(input: CreateEventInput): Promise<void> {
    if (!event) return;
    await onUpdate(event, input);
    setEditing(false);
  }

  async function handleRetryPublication(): Promise<void> {
    if (!event || event.ownership !== 'bearing' || !onRetryPublication) return;
    setRetryingPublication(true);
    setPublicationError(null);
    try {
      await onRetryPublication(event);
    } catch {
      setPublicationError('Device publication failed again. Your Bearing event is unchanged.');
    } finally {
      setRetryingPublication(false);
    }
  }

  const mutable =
    event?.ownership === 'bearing' || (event?.ownership === 'device' && event.allowsModifications);

  return (
    <AppModal
      visible={event !== null}
      title={editing ? 'Edit Event' : 'Event Details'}
      onClose={handleClose}
      fullScreen
      hideHeader
      embedded={embedded}
    >
      {event && editing ? (
        <EventEditForm
          active
          initialDate={event.startAt}
          initialValues={event}
          saveLabel="Update Event"
          locale={locale}
          timeFormat={timeFormat}
          fullScreen
          header={
            <ScreenHeader
              title="Edit Event"
              onPressBack={() => setEditing(false)}
              backAccessibilityLabel="Back to event details"
            />
          }
          onSave={handleUpdate}
        />
      ) : event ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top,
              paddingBottom: spacing.xl + insets.bottom,
              paddingHorizontal: embedded ? spacing.lg : 0,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title="Event Details"
            onPressBack={handleClose}
            backAccessibilityLabel="Back to calendar"
          />

          <View style={styles.section}>
            <AppCard style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.description ? (
                <Text style={styles.description}>{event.description}</Text>
              ) : null}
            </AppCard>
          </View>

          <View style={styles.section}>
            <AppCard style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>Details</Text>
              <View style={styles.timelineRow}>
                <View accessibilityLabel="Event time" style={styles.timeline}>
                  <View style={styles.timelineConnector} />
                  <View style={styles.timelinePoint}>
                    <View style={styles.timelineMarker} />
                    <Text style={styles.timelineLabel}>Start</Text>
                    <Text style={styles.timelineTime}>
                      {formatEventTime(event.startAt, event.allDay, timeFormat)}
                    </Text>
                    <Text style={styles.timelineDate}>{formatFullDate(event.startAt, locale)}</Text>
                  </View>
                  <View style={styles.timelinePoint}>
                    <View style={styles.timelineMarker} />
                    <Text style={styles.timelineLabel}>End</Text>
                    <Text style={styles.timelineTime}>
                      {formatEventTime(event.endAt, event.allDay, timeFormat)}
                    </Text>
                    <Text style={styles.timelineDate}>{formatFullDate(event.endAt, locale)}</Text>
                  </View>
                </View>
                <Text style={styles.timezoneText}>{event.timezone}</Text>
              </View>
              <ListItem
                title="Calendar"
                variant="row"
                showDivider
                trailingContent={
                  <View style={styles.calendarValue}>
                    <View
                      style={[
                        styles.sourceDot,
                        {
                          backgroundColor:
                            event.ownership === 'device' && event.calendarColor
                              ? event.calendarColor
                              : theme.colors.brand,
                        },
                      ]}
                    />
                    <Text style={styles.calendarText}>
                      {event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle}
                    </Text>
                  </View>
                }
              />
              <ListItem
                title="Location"
                variant="row"
                showDivider
                trailingText={event.location || 'No location'}
                trailingTextColor={theme.colors.textSecondary}
              />
              <ListItem
                title="Repeats"
                variant="row"
                showDivider
                trailingText={formatRecurrence(event)}
                trailingTextColor={theme.colors.textSecondary}
              />
              <ListItem
                title="Alerts"
                variant="row"
                showDivider
                trailingText={
                  event.alarms.length > 0 ? event.alarms.map(formatAlert).join(', ') : 'No alerts'
                }
                trailingTextColor={theme.colors.textSecondary}
              />
              <ListItem
                title="Availability"
                variant="row"
                showDivider
                trailingText={formatAvailability(event.availability)}
                trailingTextColor={theme.colors.textSecondary}
              />
              <ListItem
                title="URL"
                variant="row"
                showDivider={false}
                trailingText={event.url || 'No URL'}
                trailingTextColor={theme.colors.textSecondary}
              />
            </AppCard>
          </View>

          {event.ownership === 'bearing' && event.publication.lastError ? (
            <Text style={styles.errorText}>{event.publication.lastError}</Text>
          ) : null}
          {event.ownership === 'bearing' &&
          event.publication.retryable &&
          !event.publication.deletionIntent &&
          onRetryPublication ? (
            <AppButton
              label="Retry Device Copy"
              accessibilityLabel="Retry device publication"
              onPress={() => void handleRetryPublication()}
              loading={retryingPublication}
              loadingLabel="Retrying..."
              variant="secondary"
            />
          ) : null}
          {publicationError ? <Text style={styles.errorText}>{publicationError}</Text> : null}
          {!mutable ? (
            <Text style={styles.readOnlyText}>This device calendar event is read-only.</Text>
          ) : null}
          {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
          {mutable && !confirmingDelete ? (
            <View style={styles.actionRow}>
              <AppButton
                label="Edit"
                variant="secondary"
                accessibilityLabel="Edit event"
                onPress={() => (onEdit ? onEdit() : setEditing(true))}
                style={styles.flexButton}
              />
              <AppButton
                label="Delete"
                variant="danger"
                accessibilityLabel="Delete event"
                onPress={() => setConfirmingDelete(true)}
                style={styles.flexButton}
              />
            </View>
          ) : mutable ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete this event permanently?</Text>
              <View style={styles.actionRow}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  accessibilityLabel="Cancel delete"
                  onPress={() => setConfirmingDelete(false)}
                  style={styles.flexButton}
                />
                <AppButton
                  label="Yes, Delete"
                  variant="danger"
                  accessibilityLabel="Confirm delete"
                  onPress={() => void handleConfirmDelete()}
                  loading={deleting}
                  loadingLabel="Deleting..."
                  style={styles.flexButton}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      gap: spacing.xl,
      paddingBottom: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    eventCard: {
      gap: spacing.sm,
    },
    detailsCard: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      gap: 0,
      overflow: 'hidden',
    },
    eventTitle: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    detailsHeading: {
      ...typography.label,
      color: theme.colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    description: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    calendarValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    calendarText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    sourceDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    timelineRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: spacing.sm,
    },
    timeline: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      position: 'relative',
    },
    timelinePoint: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
      alignItems: 'center',
    },
    timelineMarker: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.brand,
      marginBottom: spacing.xs,
      zIndex: 1,
    },
    timelineConnector: {
      position: 'absolute',
      left: '27%',
      right: '27%',
      height: 2,
      backgroundColor: theme.colors.borderStrong,
      marginTop: 5,
      zIndex: 0,
    },
    timelineLabel: {
      ...typography.label,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    timelineTime: {
      ...typography.button,
      color: theme.colors.text,
      textAlign: 'center',
    },
    timelineDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    timezoneText: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    infoValue: {
      ...typography.body,
      color: theme.colors.text,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    readOnlyText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    flexButton: {
      flex: 1,
    },
    confirmRow: {
      gap: spacing.sm,
    },
    confirmText: {
      ...typography.body,
      color: theme.colors.text,
    },
  });
