import { ReactNode } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  ImageStyle,
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
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';

export type AppScreenMode = 'static' | 'scroll' | 'unmanaged';

type AppScreenProps = {
  children: ReactNode;
  mode?: AppScreenMode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  backgroundSource?: ImageSourcePropType;
  backgroundImageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

export function AppScreen({
  children,
  mode = 'static',
  edges = ['right', 'left'],
  style,
  contentContainerStyle,
  backgroundSource,
  backgroundImageStyle,
  testID,
}: AppScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const topContentInset = edges.includes('top') ? 0 : insets.top;
  const content =
    mode === 'scroll' ? (
      <ScrollView
        testID={testID ? `${testID}-scroll` : undefined}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: styles.scrollContent.paddingVertical + topContentInset,
            paddingBottom: styles.scrollContent.paddingVertical + insets.bottom,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    ) : (
      <View
        testID={testID ? `${testID}-content` : undefined}
        style={
          mode === 'static'
            ? [
                styles.content,
              { paddingTop: styles.content.paddingVertical + topContentInset },
                { paddingBottom: styles.content.paddingVertical + insets.bottom },
                contentContainerStyle,
              ]
            : contentContainerStyle
        }
      >
        {children}
      </View>
    );

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView testID={testID} edges={edges} style={[styles.safeArea, style]}>
        {backgroundSource ? (
          <View pointerEvents="none" style={styles.backgroundLayer}>
            <ImageBackground
              source={backgroundSource}
              resizeMode="cover"
              style={styles.backgroundImage}
              imageStyle={backgroundImageStyle}
            />
          </View>
        ) : null}
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
    backgroundLayer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    backgroundImage: {
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
