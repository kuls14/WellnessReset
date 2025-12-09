import React, { ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '../constants/colors';
import { MOOD_THEMES, MoodKey } from '../types/mood';

type Props = {
  mood: MoodKey;
  children: ReactNode;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
};

const OverlayWave = ({ mood }: { mood: MoodKey }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    const theme = MOOD_THEMES[mood];
    pulse.value = withRepeat(
      withTiming(1, {
        duration: theme.paceMs,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [mood, pulse]);

  const style = useAnimatedStyle(() => {
    const theme = MOOD_THEMES[mood];
    const scale = 1 + (theme.amplitude / 100) * pulse.value;
    const opacity = 0.25 + 0.15 * pulse.value;
    return {
      transform: [{ scale }],
      opacity,
      shadowColor: theme.shadow,
      shadowOpacity: 0.6,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    };
  }, [mood]);

  return <Animated.View style={[styles.wave, style]} />;
};

const MoodScene = ({ mood, children, timeOfDay }: Props) => {
  const theme = MOOD_THEMES[mood];
  const gradientProgress = useSharedValue(0);

  useEffect(() => {
    gradientProgress.value = withTiming(1, { duration: 420 });
  }, [mood, gradientProgress]);

  const backgroundStyle = useAnimatedStyle(() => {
    const tint = timeOfDay === 'evening' ? '#FDE7C8' : COLORS.BG_WHITE;
    const secondaryTint = timeOfDay === 'morning' ? '#E3F2FD' : COLORS.BG_WHITE;

    return {
      backgroundColor: interpolateColor(
        gradientProgress.value,
        [0, 1],
        [secondaryTint, tint],
      ),
    };
  }, [theme, timeOfDay]);

  const accentStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        gradientProgress.value,
        [0, 1],
        [theme.gradient[0], theme.gradient[1]],
      ),
    };
  }, [theme]);

  return (
    <Animated.View style={[styles.container, backgroundStyle]}>
      <Animated.View style={[styles.accentBlob, accentStyle]} />
      <OverlayWave mood={mood} />
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  accentBlob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 200,
    top: -80,
    right: -60,
    opacity: 0.4,
  },
  wave: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 200,
    backgroundColor: COLORS.BG_WHITE,
  },
});

export default MoodScene;
