import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNavigation, BottomNavigationDestination } from '../presentation/BottomNavigation';
import { CreateSheet } from '../presentation/CreateSheet';
import {
  GoalCard,
  GoalMilestones,
  GoalStatusTabs,
  GoalTimeline,
} from '../presentation/GoalPresentation';
import { EventCard, EventRow, EventSourceChip } from '../presentation/EventPresentation';
import { TaskRow } from '../presentation/TaskRow';
import { CalendarDisplayEvent } from '../../features/calendar/calendarTypes';
import { GoalFilter } from '../presentation/GoalPresentation';
import { GoalStepRecord, GoalWithSteps } from '../../features/goals/goalTypes';
import { TaskRecord } from '../../features/tasks/taskTypes';
import { useTheme } from '../../design/ThemeProvider';
import { icons } from '../../design/icons';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { AppHeader } from './AppHeader';
import { AppIcon } from './AppIcon';
import { AppModal } from './AppModal';
import { AppScreen } from './AppScreen';
import { BottomSheet } from './BottomSheet';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { FloatingActionButton } from './FloatingActionButton';
import { FormField } from './FormField';
import { ListItem } from './ListItem';
import { ProgressBar } from './ProgressBar';
import { RecoveryCard } from './RecoveryCard';
import { ScreenHeader } from './ScreenHeader';
import { SectionHeader } from './SectionHeader';
import { SectionHeading } from './SectionHeading';
import { SegmentedControl } from './SegmentedControl';
import { TextLink } from './TextLink';

const fixtureStep: GoalStepRecord = {
  id: 'gallery-step',
  userId: 'gallery-user',
  goalId: 'gallery-goal',
  title: 'Schedule three runs',
  description: 'Put sessions on the calendar.',
  starter: 'Choose two weekday runs and one weekend run.',
  estimatedFinishDate: new Date(2026, 4, 1),
  order: 0,
  status: 'pending',
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fixtureGoal: GoalWithSteps = {
  id: 'gallery-goal',
  userId: 'gallery-user',
  title: 'Run a comfortable 10k',
  description: 'Build a steady weekly practice.',
  smartMeta: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
  estimatedCompletionDate: new Date(2026, 8, 1),
  nextStepId: fixtureStep.id,
  status: 'active',
  isAiAssisted: false,
  aiPlanVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  steps: [fixtureStep],
  nextStep: fixtureStep,
  completedStepCount: 1,
  totalStepCount: 4,
  progressText: '1 of 4 steps completed',
};

const fixtureEvent: CalendarDisplayEvent = {
  id: 'gallery-event',
  title: 'Easy training run',
  description: 'Keep the pace conversational.',
  startAt: new Date(2026, 4, 7, 9),
  endAt: new Date(2026, 4, 7, 10),
  timezone: 'America/Chicago',
  allDay: false,
  location: '',
  recurrenceRule: null,
  alarms: [],
  availability: 'busy',
  url: null,
  status: 'scheduled',
  ownership: 'bearing',
  userId: 'gallery-user',
  goalId: fixtureGoal.id,
  stepId: fixtureStep.id,
  publication: {
    status: 'unpublished',
    markerId: null,
    commonHash: null,
    lastError: null,
    retryable: false,
    deletionIntent: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const iconNames = Object.keys(icons) as (keyof typeof icons)[];
const svgIconNames = iconNames.filter((name) => icons[name].kind === 'svg');
const featureIconNames = iconNames.filter((name) => icons[name].kind === 'image');

function formatIconName(name: string): string {
  const label = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bai\b/gi, 'AI')
    .replace(/^./, (letter) => letter.toUpperCase());
  return label.endsWith(' Svg') ? `${label.slice(0, -4)} SVG` : label;
}

export function FoundationGallery() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useTheme();
  const [capture, setCapture] = useState('');
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const [destination, setDestination] = useState<BottomNavigationDestination>('plan');
  const [task, setTask] = useState<TaskRecord>({
    id: 'gallery-task',
    userId: 'gallery-user',
    title: 'Lay out running clothes',
    description: '',
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [notice, setNotice] = useState('Select any control to preview its live behavior.');

  const announce = (message: string) => setNotice(message);
  const dismissOverlays = () => {
    setModalVisible(false);
    setSheetVisible(false);
    setCreateVisible(false);
  };

  return (
    <AppScreen
      mode="unmanaged"
      testID="foundation-gallery"
      style={styles.screen}
      contentContainerStyle={styles.unmanagedContent}
    >
      <ScrollView
        testID="foundation-gallery-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <AppHeader title="Foundation gallery" eyebrow="Bearing UI" showBearingMark />
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>

        <SectionHeader title="Theme" description="Persistent light and dark preferences." />
        <View style={styles.themeActions}>
          {(['dark', 'light'] as const).map((themePreference) => (
            <AppButton
              key={themePreference}
              label={themePreference === 'dark' ? 'Dark' : 'Light'}
              variant={preference === themePreference ? 'primary' : 'secondary'}
              onPress={() => {
                void setPreference(themePreference);
                announce(`${themePreference === 'dark' ? 'Dark' : 'Light'} theme selected.`);
              }}
              style={styles.themeButton}
            />
          ))}
        </View>

        <SectionHeader
          title="Headers"
          description="Screen and section hierarchy."
          actionLabel="Inspect"
          onPressAction={() => announce('Section header action pressed.')}
        />
        <ScreenHeader
          title="Today"
          eyebrow="Wednesday, May 7"
          description="Start with one clear move."
        />
        <SectionHeading title="Upcoming" description="Compatibility wrapper" />

        <SectionHeader
          title="SVG icon library"
          description="Every custom vector glyph from the approved icon-library mock."
          variant="uppercase-accent"
        />
        <View accessibilityLabel="Icon library" style={styles.iconGrid}>
          {svgIconNames.map((name) => (
            <View key={name} style={styles.iconCell}>
              <AppIcon name={name} size={30} accessibilityLabel={`${name} icon`} />
              <Text numberOfLines={1} style={styles.iconLabel}>
                {formatIconName(name)}
              </Text>
            </View>
          ))}
        </View>
        <SectionHeader
          title="Feature artwork"
          description="Approved full-color navigation and brand assets."
          variant="uppercase-accent"
        />
        <View accessibilityLabel="Feature artwork" style={styles.iconGrid}>
          {featureIconNames.map((name) => (
            <View key={name} style={styles.iconCell}>
              <AppIcon name={name} size={30} accessibilityLabel={`${name} icon`} />
              <Text numberOfLines={1} style={styles.iconLabel}>
                {formatIconName(name)}
              </Text>
            </View>
          ))}
        </View>

        <SectionHeader
          title="Actions and feedback"
          description="Buttons, links, cards, and progress."
        />
        <View style={styles.buttonGrid}>
          <AppButton label="Primary" onPress={() => announce('Primary action pressed.')} />
          <AppButton
            label="Secondary"
            variant="secondary"
            onPress={() => announce('Secondary action pressed.')}
          />
          <AppButton
            label="Danger"
            variant="danger"
            onPress={() => announce('Danger action pressed.')}
          />
        </View>
        <TextLink label="Open supporting detail" onPress={() => announce('Text link pressed.')} />
        <Card variant="standard" style={styles.card}>
          <Text style={styles.cardTitle}>Standard card</Text>
          <ProgressBar value={1} max={4} showPercentage accessibilityLabel="Standard progress" />
        </Card>
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Elevated card</Text>
          <ProgressBar
            value={3}
            max={5}
            accent="success"
            showPercentage
            accessibilityLabel="Weekly progress"
          />
        </Card>
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>App card</Text>
          <Text style={styles.copy}>Compatibility wrapper for standard cards.</Text>
        </AppCard>

        <SectionHeader
          title="Fields and selection"
          description="Controlled inputs and segmented states."
        />
        <FormField
          label="Quick capture"
          value={capture}
          placeholder="What needs attention?"
          helperText="A short note is enough."
          onChangeText={setCapture}
          trailingIcon="create"
          trailingIconLabel="Add capture"
          onPressTrailingIcon={() =>
            announce(capture ? `Captured: ${capture}` : 'Add a quick capture first.')
          }
        />
        <FormField
          label="Example validation"
          value=""
          placeholder="Required input"
          error="This shows the inline error treatment."
          onChangeText={() => undefined}
        />
        <FormField
          label="Reflection"
          value="A multiline field keeps longer notes comfortable."
          multiline
          onChangeText={() => undefined}
        />
        <SegmentedControl
          accessibilityLabel="Calendar view"
          value={view}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          onChange={(value) => {
            setView(value);
            announce(`${value} view selected.`);
          }}
        />

        <SectionHeader
          title="Lists and states"
          description="Rows, recovery, and compact empty states."
        />
        <ListItem
          title="Review weekly plan"
          description="Tap to preview a list interaction."
          trailingText="Today"
          onPress={() => announce('List item pressed.')}
        />
        <RecoveryCard
          title="Could not refresh"
          description="Recovery actions retain a clear next step."
          onRetry={() => announce('Retry requested.')}
        />
        <EmptyState
          icon="note"
          title="No pinned notes"
          description="Useful empty states keep the next action clear."
          presentation="compact"
          actionLabel="Add note"
          onPressAction={() => announce('Add note pressed.')}
        />

        <SectionHeader title="Overlays" description="Modal and bottom-sheet presentation." />
        <View style={styles.buttonGrid}>
          <AppButton label="Open modal" variant="secondary" onPress={() => setModalVisible(true)} />
          <AppButton label="Open sheet" variant="secondary" onPress={() => setSheetVisible(true)} />
        </View>
        <View style={styles.fabRow}>
          <FloatingActionButton
            icon="create"
            accessibilityLabel="Add a goal"
            onPress={() => setCreateVisible(true)}
          />
          <FloatingActionButton
            label="Create"
            icon="create"
            size="large"
            onPress={() => setCreateVisible(true)}
          />
        </View>

        <SectionHeader
          title="Domain presentation"
          description="Fixture data with live callbacks."
        />
        <GoalStatusTabs
          value={goalFilter}
          options={[
            { value: 'active', label: 'Active', count: 1 },
            { value: 'completed', label: 'Done', count: 2 },
            { value: 'all', label: 'All', count: 3 },
          ]}
          onChange={(value) => {
            setGoalFilter(value);
            announce(`${value} goal filter selected.`);
          }}
        />
        <GoalCard
          goal={fixtureGoal}
          formatDate={() => 'Sep 1, 2026'}
          onPress={() => announce('Goal card pressed.')}
        />
        <GoalTimeline
          steps={[fixtureStep]}
          onPressStep={(step) => announce(`Step selected: ${step.title}`)}
        />
        <GoalMilestones
          milestones={[{ title: 'First 5k', description: 'Build a dependable rhythm.' }]}
        />
        <TaskRow
          task={task}
          context="Today, 8:30 AM"
          onPress={() => announce('Task row pressed.')}
          onToggleComplete={() =>
            setTask((currentTask) => ({
              ...currentTask,
              status: currentTask.status === 'active' ? 'completed' : 'active',
              completedAt: currentTask.status === 'active' ? new Date() : null,
            }))
          }
        />
        <EventSourceChip label="Device calendar" tone="device" />
        <EventRow
          event={fixtureEvent}
          dateTime="Thursday, 9:00 AM"
          timezone="Central time"
          onPress={() => announce('Event row pressed.')}
        />
        <EventCard
          event={fixtureEvent}
          dateTime="May 7, 9:00 AM"
          timezone="CDT"
          onPress={() => announce('Event card pressed.')}
        />

        <SectionHeader title="Navigation" description="Bottom and rail responsive variants." />
        <BottomNavigation
          activeDestination={destination}
          onSelectDestination={(value) => {
            setDestination(value);
            announce(`${value} destination selected.`);
          }}
          onPressCreate={() => setCreateVisible(true)}
        />
        <BottomNavigation
          activeDestination={destination}
          onSelectDestination={(value) => {
            setDestination(value);
            announce(`${value} destination selected.`);
          }}
          onPressCreate={() => setCreateVisible(true)}
          variant="rail"
        />
      </ScrollView>
      <AppModal
        visible={modalVisible}
        title="Foundation modal"
        onClose={() => {
          setModalVisible(false);
          announce('Modal dismissed.');
        }}
      >
        <Text style={styles.copy}>This is the standard modal surface.</Text>
        <AppButton label="Close modal" onPress={dismissOverlays} />
      </AppModal>
      <BottomSheet
        visible={sheetVisible}
        onDismiss={dismissOverlays}
        accessibilityLabel="Foundation sheet"
      >
        <Text style={styles.sheetTitle}>Foundation sheet</Text>
        <Text style={styles.copy}>This is the reusable bottom-sheet surface.</Text>
        <AppButton label="Dismiss sheet" onPress={dismissOverlays} />
      </BottomSheet>
      <CreateSheet
        visible={createVisible}
        onDismiss={dismissOverlays}
        onCreateGoal={() => {
          dismissOverlays();
          announce('Create goal selected.');
        }}
        onCreateTask={() => {
          dismissOverlays();
          announce('Create task selected.');
        }}
        onCreateNote={() => {
          dismissOverlays();
          announce('Create note selected.');
        }}
        onCreateEvent={() => {
          dismissOverlays();
          announce('Create event selected.');
        }}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    unmanagedContent: { flex: 1, minHeight: 0 },
    scrollView: { flex: 1 },
    content: {
      gap: theme.spacing['2xl'],
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
      paddingBottom: theme.spacing['3xl'],
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    notice: { ...theme.typography.helper, color: theme.colors.textSecondary },
    themeActions: { flexDirection: 'row', gap: theme.spacing.sm },
    themeButton: { flex: 1 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    iconCell: {
      width: 86,
      minHeight: 76,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
    },
    iconLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    buttonGrid: { gap: theme.spacing.sm },
    card: { gap: theme.spacing.md },
    cardTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    copy: { ...theme.typography.body, color: theme.colors.textSecondary },
    fabRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
    sheetTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  });
