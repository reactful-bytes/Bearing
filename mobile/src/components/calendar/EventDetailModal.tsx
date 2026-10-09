import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppIconName } from '../../design/icons';
import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppIcon } from '../ui/AppIcon';
import { AppModal } from '../ui/AppModal';
import { RowContextMenu } from '../ui/RowContextMenu';
import { ScreenHeader } from '../ui/ScreenHeader';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  BearingEvent,
  CalendarDeletionScope,
  CalendarDisplayEvent,
  CalendarUpdateScope,
  CreateEventInput,
} from '../../features/calendar/calendarTypes';
import { EventEditForm } from './EventEditForm';
import { EventUpdateScopePrompt } from './EventUpdateScopePrompt';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  formatClockTime,
} from '../../features/profile/timeFormat';

type EventDetailModalProps = {
  event: CalendarDisplayEvent | null;
  onClose: () => void;
  onUpdate: (
    event: CalendarDisplayEvent,
    input: CreateEventInput,
    scope?: CalendarUpdateScope,
  ) => Promise<void>;
  onDelete: (event: CalendarDisplayEvent, scope: CalendarDeletionScope) => Promise<void>;
  supportedDeleteScopes?: CalendarDeletionScope[];
  supportedUpdateScopes?: CalendarUpdateScope[];
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

function EventDetailSection({
  icon,
  title,
  children,
}: {
  icon: AppIconName;
  title: string;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailIconFrame}>
        <AppIcon name={icon} size={17} color={styles.detailIcon.color} decorative />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

function DetailValue({ value, helper }: { value: string; helper?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detailValueGroup}>
      <Text style={styles.detailValue}>{value}</Text>
      {helper ? <Text style={styles.detailHelper}>{helper}</Text> : null}
    </View>
  );
}

export function EventDetailModal({
  event,
  onClose,
  onUpdate,
  onDelete,
  supportedDeleteScopes = ['instance', 'following', 'series'],
  supportedUpdateScopes = ['instance', 'following', 'series'],
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
  const [choosingUpdateScope, setChoosingUpdateScope] = useState(false);
  const [selectedUpdateScope, setSelectedUpdateScope] = useState<CalendarUpdateScope | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedDeleteScope, setSelectedDeleteScope] = useState<CalendarDeletionScope | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retryingPublication, setRetryingPublication] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  useEffect(() => {
    setEditing(false);
    setChoosingUpdateScope(false);
    setSelectedUpdateScope(null);
    setUpdateError(null);
    setConfirmingDelete(false);
    setSelectedDeleteScope(null);
    setDeleteError(null);
    setPublicationError(null);
  }, [event]);

  function handleClose(): void {
    setEditing(false);
    setChoosingUpdateScope(false);
    setSelectedUpdateScope(null);
    setUpdateError(null);
    setConfirmingDelete(false);
    setSelectedDeleteScope(null);
    setDeleteError(null);
    onClose();
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!event) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(event, selectedDeleteScope ?? 'series');
      handleClose();
    } catch {
      setDeleteError('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpdate(input: CreateEventInput): Promise<void> {
    if (!event) return;
    if (event.recurrenceRule && !choosingUpdateScope) {
      setSelectedUpdateScope(null);
      setUpdateError(null);
      setChoosingUpdateScope(true);
      return;
    }
    if (choosingUpdateScope && !selectedUpdateScope) return;
    if (!event.recurrenceRule) {
      await onUpdate(event, input);
      setEditing(false);
      return;
    }

    try {
      await onUpdate(event, input, selectedUpdateScope ?? undefined);
      setEditing(false);
      setChoosingUpdateScope(false);
      setSelectedUpdateScope(null);
    } catch {
      setUpdateError('Failed to update event. Please try again.');
    }
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
          saveLabel={choosingUpdateScope ? 'Yes, update' : 'Update Event'}
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
          beforeSave={
            choosingUpdateScope ? (
              <>
                <EventUpdateScopePrompt
                  supportedScopes={supportedUpdateScopes}
                  selectedScope={selectedUpdateScope}
                  onSelect={setSelectedUpdateScope}
                />
                {updateError ? <Text style={styles.errorText}>{updateError}</Text> : null}
              </>
            ) : null
          }
          cancelSave={{
            accessibilityLabel: 'Cancel edit event',
            onPress: handleClose,
          }}
          saveDisabled={choosingUpdateScope && selectedUpdateScope === null}
          saveAccessibilityLabel={choosingUpdateScope ? 'Confirm recurring update' : 'Save event'}
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
            trailing={
              mutable ? (
                <RowContextMenu
                  accessibilityLabel="More event actions"
                  menuAccessibilityLabel="Event actions menu"
                  items={[
                    {
                      label: 'Edit',
                      accessibilityLabel: 'Edit event',
                      icon: 'edit',
                      onPress: () => (onEdit ? onEdit() : setEditing(true)),
                    },
                    {
                      label: 'Delete',
                      accessibilityLabel: 'Delete event',
                      icon: 'delete',
                      tone: 'danger',
                      onPress: () => {
                        setDeleteError(null);
                        setSelectedDeleteScope(null);
                        setConfirmingDelete(true);
                      },
                    },
                  ]}
                />
              ) : undefined
            }
          />

          <View style={styles.eventHero}>
            <View style={styles.heroTopline}>
              <View style={styles.eventIconFrame}>
                <AppIcon name="event" size={20} color={styles.eventIcon.color} decorative />
              </View>
              <Text style={styles.eyebrow}>EVENT</Text>
            </View>
            <Text accessibilityRole="header" style={styles.eventTitle}>
              {event.title}
            </Text>
            <Text style={event.description.trim() ? styles.description : styles.detailHelper}>
              {event.description.trim() ? event.description : 'No description added.'}
            </Text>
          </View>

          <EventDetailSection icon="time" title="DATE & TIME">
            <View style={styles.timeGrid}>
              <View style={styles.timeEntry}>
                <Text style={styles.timeEntryLabel}>Start</Text>
                <Text style={styles.detailValue}>
                  {formatEventTime(event.startAt, event.allDay, timeFormat)}
                </Text>
                <Text style={styles.detailHelper}>{formatFullDate(event.startAt, locale)}</Text>
              </View>
              <View style={styles.timeEntry}>
                <Text style={styles.timeEntryLabel}>End</Text>
                <Text style={styles.detailValue}>
                  {formatEventTime(event.endAt, event.allDay, timeFormat)}
                </Text>
                <Text style={styles.detailHelper}>{formatFullDate(event.endAt, locale)}</Text>
              </View>
            </View>
            <View style={styles.timezoneRow}>
              <AppIcon name="time" size={14} color={styles.detailHelper.color} decorative />
              <Text style={styles.detailHelper}>Timezone</Text>
              <Text style={styles.detailValue}>{event.timezone}</Text>
            </View>
          </EventDetailSection>

          <EventDetailSection icon="calendar" title="CALENDAR">
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
              <Text style={styles.detailValue}>
                {event.ownership === 'bearing' ? 'Bearing' : event.calendarTitle}
              </Text>
            </View>
            <Text style={styles.detailHelper}>
              {event.ownership === 'bearing' ? 'Bearing calendar' : event.sourceLabel}
            </Text>
          </EventDetailSection>

          <EventDetailSection icon="location" title="LOCATION">
            <DetailValue value={event.location || 'No location'} />
          </EventDetailSection>

          <EventDetailSection icon="timeline" title="REPEATS">
            <DetailValue value={formatRecurrence(event)} />
          </EventDetailSection>

          <EventDetailSection icon="notifications" title="ALERTS">
            <DetailValue
              value={
                event.alarms.length > 0 ? event.alarms.map(formatAlert).join(', ') : 'No alerts'
              }
            />
          </EventDetailSection>

          <EventDetailSection icon="info" title="AVAILABILITY">
            <DetailValue value={formatAvailability(event.availability)} />
          </EventDetailSection>

          <EventDetailSection icon="externalLink" title="URL">
            <DetailValue value={event.url || 'No URL'} />
          </EventDetailSection>

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
          {mutable && confirmingDelete ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>
                {event.recurrenceRule ? 'Delete which events?' : 'Delete this event permanently?'}
              </Text>
              {event.recurrenceRule ? (
                <View style={styles.deleteScopeOptions}>
                  {(
                    [
                      ['instance', 'This event only'],
                      ['following', 'This and following'],
                      ['series', 'All events'],
                    ] as const
                  ).map(([scope, label]) => (
                    <AppButton
                      key={scope}
                      label={
                        supportedDeleteScopes.includes(scope)
                          ? label
                          : `${label} (not supported here)`
                      }
                      accessibilityLabel={`Delete ${label.toLowerCase()}${supportedDeleteScopes.includes(scope) ? '' : ' (not supported here)'}`}
                      accessibilityState={{ selected: selectedDeleteScope === scope }}
                      variant={selectedDeleteScope === scope ? 'danger' : 'secondary'}
                      disabled={!supportedDeleteScopes.includes(scope)}
                      onPress={() => setSelectedDeleteScope(scope)}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.actionRow}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  accessibilityLabel="Cancel delete"
                  onPress={() => {
                    setConfirmingDelete(false);
                    setSelectedDeleteScope(null);
                  }}
                  style={styles.flexButton}
                />
                <AppButton
                  label="Yes, Delete"
                  variant="danger"
                  accessibilityLabel="Confirm delete"
                  onPress={() => void handleConfirmDelete()}
                  disabled={Boolean(event.recurrenceRule) && selectedDeleteScope === null}
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
      flexGrow: 1,
      paddingBottom: spacing.xl,
    },
    eventHero: {
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    heroTopline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    eventIconFrame: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    eventIcon: { color: theme.colors.brand },
    eyebrow: { ...typography.caption, color: theme.colors.brand, fontWeight: '700' },
    eventTitle: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    description: { ...typography.body, color: theme.colors.textPrimary },
    detailSection: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    detailIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    detailIcon: { color: theme.colors.brand },
    detailCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    detailTitle: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    detailValueGroup: { gap: spacing.xs },
    detailValue: {
      ...typography.body,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    detailHelper: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    timeGrid: { flexDirection: 'row', gap: spacing.md },
    timeEntry: { flex: 1, minWidth: 0, gap: spacing.xs },
    timeEntryLabel: { ...typography.label, color: theme.colors.textSecondary },
    timezoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    calendarValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    sourceDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
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
    deleteScopeOptions: {
      gap: spacing.sm,
    },
    confirmText: {
      ...typography.body,
      color: theme.colors.text,
    },
  });
