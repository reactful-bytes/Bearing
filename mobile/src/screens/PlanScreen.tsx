import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { PlanStackParamList } from '../navigation/navigationTypes';

type PlanScreenProps = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Plan'>;
};

export function PlanScreen({ navigation }: PlanScreenProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="Plan"
        title="Plan"
        description="Move between your goals and unscheduled tasks while the Plan dashboard is being assembled."
      />
      <Card onPress={() => navigation.navigate('Goals')}>
        <Text style={styles.actionTitle}>Goals</Text>
        <Text style={styles.actionDescription}>
          Review active goals and their operational steps.
        </Text>
      </Card>
      <Card onPress={() => navigation.navigate('Tasks')}>
        <Text style={styles.actionTitle}>Tasks</Text>
        <Text style={styles.actionDescription}>
          Work through unscheduled tasks or start one now.
        </Text>
      </Card>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
      gap: theme.spacing.md,
    },
    actionTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    actionDescription: { ...theme.typography.body, color: theme.colors.textPrimary },
  });
