import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BottomSheet({
  visible,
  onDismiss,
  children,
  accessibilityLabel = 'Bottom sheet',
  style,
  testID,
}: BottomSheetProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${accessibilityLabel}`}
          onPress={onDismiss}
          style={styles.backdrop}
        />
        <SafeAreaView
          testID={testID}
          accessibilityViewIsModal
          accessible
          accessibilityLabel={accessibilityLabel}
          edges={['bottom', 'left', 'right']}
          style={[styles.sheet, style]}
        >
          <View style={styles.handle} />
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.text,
      opacity: 0.42,
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    handle: {
      alignSelf: 'center',
      width: theme.spacing['3xl'],
      height: theme.spacing.xs,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.border,
    },
  });
