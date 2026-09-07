import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../components/ui/AppIcon';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';

type NavigationPlaceholderScreenProps = {
  navigation?: NativeStackNavigationProp<Record<string, object | undefined>>;
  route?: { name?: string };
};

export function NavigationPlaceholderScreen({
  navigation,
  route,
}: NavigationPlaceholderScreenProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => navigation?.goBack()}
        style={styles.backButton}
      >
        <AppIcon name="back" size={20} color={styles.backIcon.color} decorative />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <ScreenHeader
        eyebrow="Bearing"
        title={route?.name ?? 'Bearing'}
        description="This destination is ready for its feature flow."
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: theme.layout.pagePaddingHorizontal,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.lg,
    },
    backButton: {
      alignSelf: 'flex-start',
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    backIcon: { color: theme.colors.brand },
    backLabel: { ...theme.typography.button, color: theme.colors.brand },
  });
