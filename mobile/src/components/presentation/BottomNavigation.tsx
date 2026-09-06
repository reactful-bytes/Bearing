import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconName } from '../../design/icons';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';

export type BottomNavigationDestination = 'plan' | 'calendar' | 'notes' | 'profile';

const destinations: readonly {
  value: BottomNavigationDestination;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'plan', label: 'Plan', icon: 'goal' },
  { value: 'calendar', label: 'Calendar', icon: 'calendar' },
  { value: 'notes', label: 'Notes', icon: 'note' },
  { value: 'profile', label: 'Profile', icon: 'profile' },
];

type BottomNavigationProps = {
  activeDestination: BottomNavigationDestination;
  onSelectDestination: (destination: BottomNavigationDestination) => void;
  onPressCreate: () => void;
  variant?: 'bottom' | 'rail';
};

export function BottomNavigation({
  activeDestination,
  onSelectDestination,
  onPressCreate,
  variant = 'bottom',
}: BottomNavigationProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isRail = variant === 'rail';
  return (
    <View
      style={[
        styles.navigation,
        isRail ? styles.rail : [styles.bottom, { paddingBottom: insets.bottom }],
      ]}
    >
      {destinations.slice(0, 2).map((destination) => (
        <NavigationButton
          key={destination.value}
          destination={destination}
          active={destination.value === activeDestination}
          rail={isRail}
          onPress={() => onSelectDestination(destination.value)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create"
        onPress={onPressCreate}
        style={[styles.create, isRail ? styles.createRail : null]}
      >
        <AppIcon name="create" size={24} color={styles.createIcon.color} decorative />
        {isRail ? <Text style={styles.createLabel}>Create</Text> : null}
      </Pressable>
      {destinations.slice(2).map((destination) => (
        <NavigationButton
          key={destination.value}
          destination={destination}
          active={destination.value === activeDestination}
          rail={isRail}
          onPress={() => onSelectDestination(destination.value)}
        />
      ))}
    </View>
  );
}

function NavigationButton({
  destination,
  active,
  rail,
  onPress,
}: {
  destination: (typeof destinations)[number];
  active: boolean;
  rail: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={destination.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.destination,
        rail ? styles.destinationRail : null,
        active ? styles.destinationActive : null,
      ]}
    >
      <AppIcon
        name={destination.icon}
        size={22}
        color={active ? styles.activeIcon.color : styles.inactiveIcon.color}
        decorative
      />
      {rail ? (
        <Text style={[styles.label, active ? styles.labelActive : null]}>{destination.label}</Text>
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    navigation: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    bottom: {
      minHeight: theme.layout.tabBarHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    rail: {
      width: 152,
      flexDirection: 'column',
      gap: theme.spacing.sm,
      borderRightWidth: StyleSheet.hairlineWidth,
      padding: theme.spacing.md,
    },
    destination: {
      width: theme.layout.minimumTouchTarget,
      minHeight: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    destinationRail: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    destinationActive: { backgroundColor: theme.colors.surfaceBrand },
    label: { ...theme.typography.helper, color: theme.colors.textSecondary },
    labelActive: { color: theme.colors.text },
    inactiveIcon: { color: theme.colors.textSecondary },
    activeIcon: { color: theme.colors.brand },
    create: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: theme.colors.brand,
    },
    createRail: {
      width: '100%',
      height: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: theme.spacing.md,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
    },
    createIcon: { color: theme.colors.onBrand },
    createLabel: { ...theme.typography.button, color: theme.colors.onBrand },
  });
