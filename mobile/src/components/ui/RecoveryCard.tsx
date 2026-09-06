import { StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';

type RecoveryCardProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

export function RecoveryCard({ title, description, onRetry }: RecoveryCardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <AppButton label="Try Again" variant="secondary" onPress={onRetry} />
    </AppCard>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: { gap: spacing.md },
    title: { ...typography.button, color: theme.colors.text },
    description: { ...typography.body, color: theme.colors.textPrimary },
  });
