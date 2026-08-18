import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import {
  BearingEvent,
  CalendarDisplayEvent,
  CreateEventInput,
} from '../../features/calendar/calendarTypes';
import { EventForm } from './EventForm';
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
};

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatTimeRange(startAt: Date, endAt: Date, timeFormat: TimeFormat): string {
  return `${formatClockTime(startAt, timeFormat)} – ${formatClockTime(endAt, timeFormat)}`;
}

function formatFullDate(date: Date): string {
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function statusLabel(status: CalendarDisplayEvent['status']): string {
  if (status === 'completed') return 'Completed';
  if (status === 'canceled') return 'Canceled';
  return 'Scheduled';
}

export function EventDetailModal({
  event,
  onClose,
  onUpdate,
  onDelete,
  onRetryPublication,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
}: EventDetailModalProps) {
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
    >
      {event && editing ? (
        <EventForm
          active
          initialDate={event.startAt}
          initialValues={event}
          saveLabel="Update Event"
          locale={locale}
          timeFormat={timeFormat}
          onSave={handleUpdate}
        />
      ) : event ? (
        <>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Calendar</Text>
            <Text style={styles.metaValue}>
              {event.ownership === 'bearing'
                ? 'Bearing'
                : `${event.calendarTitle} · ${event.sourceLabel}`}
            </Text>
          </View>

          {event.ownership === 'bearing' ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Device copy</Text>
              <Text style={styles.metaValue}>
                {event.publication.status === 'published'
                  ? 'Linked'
                  : event.publication.status === 'publishing'
                    ? 'Publishing'
                    : event.publication.status === 'failed'
                      ? 'Needs attention'
                      : 'Not linked'}
              </Text>
            </View>
          ) : null}

          {event.ownership === 'bearing' &&
          event.publication.retryable &&
          !event.publication.deletionIntent &&
          onRetryPublication ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry device publication"
              disabled={retryingPublication}
              onPress={handleRetryPublication}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && !retryingPublication ? styles.actionButtonPressed : null,
                retryingPublication ? styles.retryButtonDisabled : null,
              ]}
            >
              <Text style={styles.retryButtonText}>
                {retryingPublication ? 'Retrying...' : 'Retry Device Copy'}
              </Text>
            </Pressable>
          ) : null}

          {publicationError ? <Text style={styles.errorText}>{publicationError}</Text> : null}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatFullDate(event.startAt)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>
              {formatTimeRange(event.startAt, event.endAt, timeFormat)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text
              style={[
                styles.metaValue,
                event.status === 'completed'
                  ? { color: colors.brand }
                  : event.status === 'canceled'
                    ? { color: colors.dangerText }
                    : { color: colors.textSecondary },
              ]}
            >
              {statusLabel(event.status)}
            </Text>
          </View>

          {event.description ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Description</Text>
              <Text style={styles.metaValue}>{event.description}</Text>
            </View>
          ) : null}

          {!mutable ? (
            <Text style={styles.readOnlyText}>This device calendar event is read-only.</Text>
          ) : null}

          {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

          {mutable && !confirmingDelete ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit event"
                onPress={() => setEditing(true)}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete event"
                onPress={() => setConfirmingDelete(true)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          ) : mutable ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete this event permanently?</Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel delete"
                  onPress={() => setConfirmingDelete(false)}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed ? styles.cancelButtonPressed : null,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete"
                  onPress={deleting ? undefined : handleConfirmDelete}
                  style={({ pressed }) => [
                    styles.confirmDeleteButton,
                    deleting ? styles.confirmDeleteButtonDisabled : null,
                    pressed && !deleting ? styles.confirmDeleteButtonPressed : null,
                  ]}
                >
                  <Text style={styles.confirmDeleteButtonText}>
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  eventTitle: {
    ...typography.button,
    fontSize: 18,
    color: colors.text,
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  readOnlyText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  retryButton: {
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.brand,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
  },
  editButtonText: {
    ...typography.button,
    color: colors.brand,
  },
  deleteButton: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonText: {
    ...typography.button,
    color: colors.dangerText,
  },
  confirmRow: {
    gap: spacing.sm,
  },
  confirmText: {
    ...typography.body,
    color: colors.text,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  confirmDeleteButton: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.5,
  },
  confirmDeleteButtonPressed: {
    opacity: 0.8,
  },
  confirmDeleteButtonText: {
    ...typography.button,
    color: colors.dangerText,
  },
});
