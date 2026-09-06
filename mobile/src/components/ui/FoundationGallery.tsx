import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNavigation } from '../presentation/BottomNavigation';
import { CreateSheet } from '../presentation/CreateSheet';
import { useTheme } from '../../design/ThemeProvider';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from './AppButton';
import { AppHeader } from './AppHeader';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { FormField } from './FormField';
import { ProgressBar } from './ProgressBar';
import { SectionHeader } from './SectionHeader';

export function FoundationGallery() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useTheme();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Foundation gallery" eyebrow="Bearing UI" showBearingMark />
        <View style={styles.themeActions}>
          {(['dark', 'light'] as const).map((themePreference) => (
            <AppButton
              key={themePreference}
              label={themePreference === 'dark' ? 'Dark' : 'Light'}
              variant={preference === themePreference ? 'primary' : 'secondary'}
              onPress={() => void setPreference(themePreference)}
              style={styles.themeButton}
            />
          ))}
        </View>
        <SectionHeader title="Daily direction" description="Shared primitives under both themes." />
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Make progress visible</Text>
          <ProgressBar value={3} max={5} showPercentage accessibilityLabel="Weekly progress" />
        </Card>
        <FormField
          label="Quick capture"
          value=""
          placeholder="What needs attention?"
          onChangeText={() => undefined}
          trailingIcon="create"
          trailingIconLabel="Add capture"
          onPressTrailingIcon={() => undefined}
        />
        <EmptyState
          icon="note"
          title="No pinned notes"
          description="Useful empty states keep the next action clear."
          presentation="compact"
          actionLabel="Add note"
          onPressAction={() => undefined}
        />
      </ScrollView>
      <BottomNavigation
        activeDestination="plan"
        onSelectDestination={() => undefined}
        onPressCreate={() => undefined}
      />
      <CreateSheet
        visible={false}
        onDismiss={() => undefined}
        onCreateGoal={() => undefined}
        onCreateTask={() => undefined}
        onCreateNote={() => undefined}
        onCreateEvent={() => undefined}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      gap: theme.spacing['2xl'],
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    themeActions: { flexDirection: 'row', gap: theme.spacing.sm },
    themeButton: { flex: 1 },
    card: { gap: theme.spacing.md },
    cardTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
  });
