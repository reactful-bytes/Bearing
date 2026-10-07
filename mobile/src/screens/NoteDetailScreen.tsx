import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteDetailSection, NoteReadOnlyDetails } from '../components/notes/NoteReadOnlyDetails';
import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { AppIcon } from '../components/ui/AppIcon';
import { IconButton } from '../components/ui/IconButton';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { RowContextMenu } from '../components/ui/RowContextMenu';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { radii, spacing, typography } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { useUserProfile } from '../features/profile/useUserProfile';
import type { NotesStackParamList } from '../navigation/navigationTypes';

type NoteDetailScreenProps = NativeStackScreenProps<NotesStackParamList, 'NoteDetail'>;
type PendingAction = 'archive' | 'delete' | null;

export function NoteDetailScreen({ route, navigation }: NoteDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const { notes, uiState, updateNote, pinNote, archiveNote, deleteNote, retry } = useNotes();
  const note = notes.find((item) => item.id === route.params.noteId) ?? null;
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function handlePin(): Promise<void> {
    if (!note) return;
    setWorking(true);
    setError(null);
    try {
      await pinNote(note.id, !note.pinned);
    } catch {
      setError('Failed to update note pin.');
    } finally {
      setWorking(false);
    }
  }

  async function handleRestore(): Promise<void> {
    if (!note) return;
    setWorking(true);
    setError(null);
    try {
      await updateNote(note.id, {
        title: note.title,
        body: note.body,
        labels: note.labels,
        pinned: note.pinned,
        archived: false,
      });
      navigation.popTo('NotesHome', { resetView: true });
    } catch {
      setError('Failed to restore note.');
    } finally {
      setWorking(false);
    }
  }

  async function handleConfirmAction(): Promise<void> {
    if (!note || !pendingAction) return;
    setWorking(true);
    setError(null);
    try {
      if (pendingAction === 'archive') {
        await archiveNote(note.id, {
          title: note.title,
          body: note.body,
          labels: note.labels,
          pinned: note.pinned,
        });
      } else {
        await deleteNote(note.id);
      }
      setPendingAction(null);
      navigation.goBack();
    } catch {
      setError(pendingAction === 'archive' ? 'Failed to archive note.' : 'Failed to delete note.');
    } finally {
      setWorking(false);
    }
  }

  function openConversion(
    screen: 'CreateTaskFromNote' | 'CreateGoalFromNote' | 'CreateEventFromNote',
  ) {
    navigation.navigate(screen, { noteId: route.params.noteId });
  }

  return (
    <AppScreen
      mode="scroll"
      testID="note-detail-screen"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
      ]}
    >
      <ScreenHeader
        title="Note Details"
        onPressBack={navigation.goBack}
        backAccessibilityLabel="Back to notes"
        trailing={
          note ? (
            <View style={styles.headerActions}>
              <IconButton
                name={note.pinned ? 'pinned' : 'pin'}
                accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'}
                onPress={() => void handlePin()}
                disabled={working}
                color={note.pinned ? styles.activeActionIcon.color : styles.actionIcon.color}
              />
              <RowContextMenu
                accessibilityLabel="More note actions"
                menuAccessibilityLabel="Note actions menu"
                items={[
                  {
                    label: 'Edit',
                    accessibilityLabel: 'Edit note',
                    icon: 'edit',
                    onPress: () => navigation.navigate('NoteEditor', { noteId: note.id }),
                  },
                  {
                    label: note.pinned ? 'Unpin' : 'Pin',
                    accessibilityLabel: note.pinned ? 'Unpin note' : 'Pin note',
                    icon: note.pinned ? 'pinned' : 'pin',
                    onPress: () => void handlePin(),
                  },
                  {
                    label: note.archived ? 'Restore' : 'Archive',
                    accessibilityLabel: note.archived ? 'Restore note' : 'Archive note',
                    icon: note.archived ? 'refresh' : 'archive',
                    onPress: () => {
                      if (note.archived) void handleRestore();
                      else setPendingAction('archive');
                    },
                  },
                  {
                    label: 'Delete',
                    accessibilityLabel: 'Delete note',
                    icon: 'delete',
                    tone: 'danger',
                    onPress: () => setPendingAction('delete'),
                  },
                ]}
              />
            </View>
          ) : null
        }
      />

      {uiState === 'loading' && !note ? (
        <Text style={styles.stateTitle}>Loading note...</Text>
      ) : null}
      {uiState === 'error' && !note ? (
        <RecoveryCard
          title="Unable to load note."
          description="Check your connection, then retry."
          onRetry={retry}
        />
      ) : null}
      {uiState !== 'loading' && !note ? (
        <View style={styles.missingState}>
          <Text style={styles.stateTitle}>Note unavailable.</Text>
          <Text style={styles.stateDescription}>This note may have been deleted or archived.</Text>
          <AppButton label="Back to Notes" onPress={navigation.goBack} />
        </View>
      ) : null}

      {note ? (
        <>
          <NoteReadOnlyDetails note={note} locale={profile?.locale} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <NoteDetailSection
            icon="create"
            title="USE THIS NOTE"
            fullWidthContent
            testID="note-conversion-section"
          >
            <Text style={styles.sectionDescription}>
              Start a draft from this context, then edit it before committing.
            </Text>
            <View testID="note-conversion-actions" style={styles.conversionActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create task from note"
                onPress={() => openConversion('CreateTaskFromNote')}
                style={({ pressed }) => [
                  styles.conversionAction,
                  styles.taskConversionAction,
                  pressed ? styles.conversionActionPressed : null,
                ]}
              >
                <AppIcon name="task" size={22} color={styles.taskActionIcon.color} decorative />
                <Text style={[styles.conversionActionLabel, styles.taskActionLabel]}>Task</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create goal from note"
                onPress={() => openConversion('CreateGoalFromNote')}
                style={({ pressed }) => [
                  styles.conversionAction,
                  styles.goalConversionAction,
                  pressed ? styles.conversionActionPressed : null,
                ]}
              >
                <AppIcon name="goal" size={22} color={styles.goalActionIcon.color} decorative />
                <Text style={[styles.conversionActionLabel, styles.goalActionLabel]}>Goal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create event from note"
                onPress={() => openConversion('CreateEventFromNote')}
                style={({ pressed }) => [
                  styles.conversionAction,
                  styles.eventConversionAction,
                  pressed ? styles.conversionActionPressed : null,
                ]}
              >
                <AppIcon
                  name="calendar"
                  size={22}
                  color={styles.eventActionIcon.color}
                  decorative
                />
                <Text style={[styles.conversionActionLabel, styles.eventActionLabel]}>Event</Text>
              </Pressable>
            </View>
          </NoteDetailSection>
        </>
      ) : null}
      <ConfirmationModal
        visible={pendingAction !== null}
        title={pendingAction === 'archive' ? 'Archive note?' : 'Delete note?'}
        message={
          pendingAction === 'archive'
            ? 'This note will be removed from your active Notes list.'
            : 'Delete this note permanently?'
        }
        confirmLabel={pendingAction === 'archive' ? 'Archive' : 'Delete'}
        confirmVariant="danger"
        confirmAccessibilityLabel={
          pendingAction === 'archive' ? 'Confirm note archive' : 'Confirm note delete'
        }
        icon="delete"
        iconTone="danger"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: 0, flexGrow: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionIcon: { color: theme.colors.textSecondary },
    activeActionIcon: { color: theme.colors.brand },
    sectionDescription: { ...typography.body, color: theme.colors.textSecondary },
    conversionActions: { alignSelf: 'stretch', flexDirection: 'row', gap: spacing.sm },
    conversionAction: {
      flex: 1,
      minWidth: 0,
      minHeight: 72,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    taskConversionAction: { borderColor: theme.colors.brand },
    goalConversionAction: { borderColor: theme.colors.success },
    eventConversionAction: { borderColor: theme.colors.purple },
    conversionActionPressed: { opacity: 0.76 },
    conversionActionLabel: { ...typography.caption, fontWeight: '700', textAlign: 'center' },
    taskActionIcon: { color: theme.colors.brand },
    taskActionLabel: { color: theme.colors.brand },
    goalActionIcon: { color: theme.colors.success },
    goalActionLabel: { color: theme.colors.success },
    eventActionIcon: { color: theme.colors.purple },
    eventActionLabel: { color: theme.colors.purple },
    missingState: { gap: spacing.md },
    stateTitle: { ...typography.screenTitle, color: theme.colors.text },
    stateDescription: { ...typography.body, color: theme.colors.textSecondary },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
