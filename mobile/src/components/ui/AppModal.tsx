import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { CreateFabGroup } from '../presentation/CreateFabGroup';
import { useCreateFab } from '../presentation/CreateFabContext';

import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type AppModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  closeLabel?: string;
  headerAccessory?: ReactNode;
  fullScreen?: boolean;
  hideHeader?: boolean;
  embedded?: boolean;
  children: ReactNode;
};

export function AppModal({
  visible,
  title,
  onClose,
  closeLabel = 'Close',
  headerAccessory,
  fullScreen = false,
  hideHeader = false,
  embedded = false,
  children,
}: AppModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const createFab = useCreateFab();
  const accessibleTitle = title || 'Modal';

  if (embedded) {
    return <>{children}</>;
  }

  // Android renders a translucent window per mounted <Modal>, even when `visible={false}`;
  // keeping closed modals out of the tree avoids stray dark bars stacking behind the tab bar.
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      accessibilityLabel={`${accessibleTitle} modal`}
    >
      <KeyboardAvoidingView
        accessibilityViewIsModal={!fullScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.backdrop, fullScreen && styles.fullScreenBackdrop]}
      >
        {!fullScreen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${accessibleTitle}`}
            style={styles.backdropPressArea}
            onPress={onClose}
          />
        ) : null}
        <SafeAreaView
          edges={fullScreen ? [] : ['top', 'right', 'bottom', 'left']}
          style={[fullScreen ? styles.fullScreenSheet : styles.sheet]}
        >
          {!hideHeader ? (
            <View style={styles.header}>
              {fullScreen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${closeLabel} ${accessibleTitle}`}
                  onPress={onClose}
                  style={styles.closeIconButton}
                >
                  <AppIcon name="back" size={20} decorative />
                </Pressable>
              ) : null}
              {title ? (
                <Text
                  accessibilityRole="header"
                  accessibilityLabel={title}
                  style={[styles.title, fullScreen && styles.fullScreenTitle]}
                >
                  {title}
                </Text>
              ) : null}
              <View style={styles.headerActions}>
                {headerAccessory}
                {!fullScreen ? (
                  <AppButton
                    label={closeLabel}
                    variant="secondary"
                    accessibilityLabel={`${closeLabel} ${accessibleTitle}`}
                    onPress={onClose}
                    style={styles.closeButton}
                    textStyle={styles.closeButtonText}
                  />
                ) : (
                  <View style={styles.headerPlaceholder} />
                )}
              </View>
            </View>
          ) : null}
          <View style={[styles.body, fullScreen && styles.fullScreenBody]}>{children}</View>
        </SafeAreaView>
        {!fullScreen && createFab ? (
          <CreateFabGroup
            visible={createFab.visible}
            bottomOffset={insets.bottom + spacing.md}
            rightOffset={spacing.md}
            onPress={createFab.open}
            onDismiss={createFab.dismiss}
            onCreateGoal={() => createFab.create('goal')}
            onCreateTask={() => createFab.create('task')}
            onCreateNote={() => createFab.create('note')}
            onCreateEvent={() => createFab.create('event')}
            onCreateFocus={() => createFab.create('focus')}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.scrim,
    },
    backdropPressArea: {
      ...StyleSheet.absoluteFill,
    },
    fullScreenBackdrop: {
      backgroundColor: theme.colors.background,
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing['2xl'],
      paddingTop: spacing['2xl'],
      paddingBottom: spacing['3xl'],
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...typography.screenTitle,
      color: theme.colors.text,
      flex: 1,
    },
    fullScreenTitle: {
      ...typography.label,
      color: theme.colors.brand,
      textAlign: 'center',
    },
    closeIconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerPlaceholder: {
      width: 44,
      height: 44,
    },
    closeButton: {
      minWidth: 44,
      minHeight: 44,
    },
    closeButtonText: {
      ...typography.helper,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    body: {
      flexShrink: 1,
      minHeight: 0,
      gap: spacing.md,
    },
    fullScreenSheet: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
    fullScreenBody: {
      flex: 1,
    },
  });
