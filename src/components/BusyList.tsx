/**
 * BusyList Component
 *
 * Displays all calendar events for the current day, including:
 * - App-created wellness events (with exercise and mood info)
 * - External calendar events (with location and calendar source)
 *
 * Features:
 * - Mood-responsive breathing animations
 * - Gradient backgrounds for app events
 * - Remove functionality for wellness events
 * - Shows calendar metadata for external events
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { COLORS } from '../constants/colors';
import { STRINGS } from '../constants/strings';
import { BusyEvent } from '../services/CalendarService';
import { MOOD_THEMES, MoodKey } from '../types/mood';

/**
 * Formats date range for display (e.g., "9:00 AM → 10:30 AM")
 */
const formatRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatter.format(startDate)} → ${formatter.format(endDate)}`;
};

type Props = {
  events: BusyEvent[];
  dayLabel: string; // e.g., "Monday"
  onRemove?: (event: BusyEvent) => void;
  mood: MoodKey; // Current user mood for theming
};

const BusyList = ({ events, dayLabel, onRemove, mood }: Props) => {
  // Breathing animation value (0 to 1)
  const breathe = useRef(new Animated.Value(0)).current;

  // Mood-based breathing duration: Calm=4s, Energetic=2.4s, Stressed=1.4s
  const breatheDuration =
    mood === 'Calm' ? 4000 : mood === 'Energetic' ? 2400 : 1400;

  // Start breathing loop on mount
  useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: breatheDuration,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: breatheDuration,
          useNativeDriver: true,
        }),
      ]),
    );
    breatheLoop.start();
    return () => breatheLoop.stop();
  }, [breathe, breatheDuration]);

  /**
   * Derives mood from exercise type by matching against MOOD_THEMES
   */
  const deriveMoodFromExercise = (
    exercise?: string,
    fallbackMood?: MoodKey,
  ): MoodKey => {
    if (!exercise) return fallbackMood ?? mood;
    const match = (Object.keys(MOOD_THEMES) as MoodKey[]).find(key =>
      MOOD_THEMES[key].exercises.includes(exercise),
    );
    return match ?? fallbackMood ?? mood;
  };

  // Don't render if no events
  if (!events.length) {
    return null;
  }

  // Subtle scale animation for breathing effect (1.0 to 1.012)
  const breatheScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.012],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{STRINGS.BUSY_LIST.HEADING(dayLabel)}</Text>
      {events.map(event => {
        const exercise = event.exercise;
        const cardMood =
          event.exerciseMood ?? deriveMoodFromExercise(exercise, mood);
        const storedMood = event.userMood ?? cardMood;
        const theme = MOOD_THEMES[cardMood];

        return (
          <Animated.View
            key={event.id}
            style={[styles.cardShell, { transform: [{ scale: breatheScale }] }]}
          >
            <LinearGradient
              colors={
                event.isAppCreated ? theme.cardGradient : ['#F3F4F6', '#E5E7EB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.item,
                event.isAppCreated && { shadowColor: theme.primary },
              ]}
            >
              <View style={styles.itemInnerContent}>
                {/* Header: Title + Badge/Calendar name */}
                <View style={styles.itemHeader}>
                  <Text style={styles.title}>
                    {event.title || STRINGS.BUSY_LIST.DEFAULT_TITLE}
                  </Text>
                  {event.isAppCreated ? (
                    <View style={styles.badgeRow}>
                      <Text
                        style={[
                          styles.appBadge,
                          { borderColor: theme.primary, color: theme.primary },
                        ]}
                      >
                        {STRINGS.BUSY_LIST.BADGE_APP}
                      </Text>
                      {onRemove && (
                        <Text
                          style={styles.remove}
                          onPress={() => onRemove(event)}
                        >
                          {STRINGS.BUSY_LIST.BUTTON_REMOVE}
                        </Text>
                      )}
                    </View>
                  ) : (
                    !!event.calendarName && (
                      <Text style={styles.calendarLabel}>
                        {event.calendarName}
                      </Text>
                    )
                  )}
                </View>

                {/* Time range */}
                <Text style={styles.time}>
                  {formatRange(event.startDate, event.endDate)}
                </Text>

                {/* App event metadata */}
                {event.isAppCreated && (
                  <Text style={styles.exercise}>
                    {STRINGS.METADATA.EXERCISE_PREFIX}
                    {STRINGS.LABELS.EXERCISE(exercise)}
                  </Text>
                )}
                {event.isAppCreated && (
                  <Text style={styles.exercise}>
                    {STRINGS.METADATA.MOOD_PREFIX}
                    {storedMood}
                  </Text>
                )}

                {/* External event metadata */}
                {!event.isAppCreated && event.location && (
                  <Text style={styles.meta}>
                    {STRINGS.METADATA.LOCATION_PREFIX}
                    {event.location}
                  </Text>
                )}
                {!event.isAppCreated && event.calendarName && (
                  <Text style={styles.meta}>
                    {STRINGS.METADATA.CALENDAR_PREFIX}
                    {event.calendarName}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  heading: {
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    fontSize: 17,
  },
  cardShell: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginVertical: 3,
  },
  item: {
    borderRadius: 16,
  },
  itemInnerContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
  },
  remove: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.TEXT_ERROR,
    color: COLORS.TEXT_ERROR,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: '#FFFFFFDD',
  },
  time: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 13,
    marginTop: 2,
  },
  exercise: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
  },
  calendarLabel: {
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
});

export default BusyList;
