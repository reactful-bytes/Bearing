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
  backgroundSource?: ImageSourcePropType;
  backgroundImageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

export function AppScreen({
  children,
  mode = 'static',
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  contentContainerStyle,
  backgroundSource,
  backgroundImageStyle,
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
