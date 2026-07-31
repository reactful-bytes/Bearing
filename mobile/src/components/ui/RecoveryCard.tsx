import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';

type RecoveryCardProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

export function RecoveryCard({ title, description, onRetry }: RecoveryCardProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <AppButton label="Try Again" variant="secondary" onPress={onRetry} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: { ...typography.button, color: colors.text },
  description: { ...typography.body, color: colors.textPrimary },
});
