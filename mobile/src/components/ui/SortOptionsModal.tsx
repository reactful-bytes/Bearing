import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppIconName } from '../../design/icons';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppIcon } from './AppIcon';
import { AppModal } from './AppModal';
import { ModalHeaderAction } from './ModalHeaderAction';

export type SortOption<Value extends string> = {
  value: Value;
  label: string;
  icon: AppIconName;
};

type SortOptionsModalProps<Value extends string> = {
  visible: boolean;
  title: string;
  accessibilityLabelPrefix: string;
  selectedValue: Value;
  options: readonly SortOption<Value>[];
  onClose: () => void;
  onApply: (value: Value) => void;
};

export function SortOptionsModal<Value extends string>({
  visible,
  title,
  accessibilityLabelPrefix,
  selectedValue,
  options,
  onClose,
  onApply,
}: SortOptionsModalProps<Value>) {
  const styles = useThemedStyles(createStyles);
  const [draftValue, setDraftValue] = useState(selectedValue);

  useEffect(() => {
    if (visible) setDraftValue(selectedValue);
  }, [selectedValue, visible]);

  return (
    <AppModal
      visible={visible}
      title={title}
      onClose={onClose}
      dragToClose
      centeredHeader
      hideCloseButton
      headerAccessory={
        <ModalHeaderAction
          accessibilityLabel={`Apply ${title.toLowerCase()}`}
          onPress={() => onApply(draftValue)}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.options}>
          {options.map((option) => {
            const selected = draftValue === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${accessibilityLabelPrefix} ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setDraftValue(option.value)}
                style={({ pressed }) => [styles.optionRow, pressed ? styles.pressed : null]}
              >
                <AppIcon
                  name={option.icon}
                  size={18}
                  color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                  decorative
                />
                <Text style={styles.optionText}>{option.label}</Text>
                <AppIcon
                  name={selected ? 'active' : 'none'}
                  size={18}
                  color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                  decorative
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: spacing.lg, paddingBottom: spacing.sm },
    options: { gap: 0 },
    optionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 0,
      borderRadius: theme.radii.sm,
    },
    optionText: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    pressed: { opacity: 0.72 },
  });
