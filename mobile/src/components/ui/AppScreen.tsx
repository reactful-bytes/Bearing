import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type AppScreenMode = 'static' | 'scroll' | 'unmanaged';

type AppScreenProps = {
  children: ReactNode;
  mode?: AppScreenMode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  testID?: string;
};

export function AppScreen({
  children,
  mode = 'static',
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  contentContainerStyle,
  testID,
}: AppScreenProps) {
  const styles = useThemedStyles(createStyles);
  const content =
    mode === 'scroll' ? (
      <ScrollView
        testID={testID ? `${testID}-scroll` : undefined}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    ) : (
      <View
        testID={testID ? `${testID}-content` : undefined}
        style={mode === 'static' ? [styles.content, contentContainerStyle] : contentContainerStyle}
      >
        {children}
      </View>
    );

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView testID={testID} edges={edges} style={[styles.safeArea, style]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
    },
  });
