/**
 * ScheduleSuggestions Component
 *
 * Displays free time slot cards with:
 * - Dynamic duration selection (15m or 30m)
 * - Mood-specific exercise options
 * - Breathing animations tied to current mood
 * - Conflict detection with visual feedback
 * - Time adjustment capability
 * - Add/remove functionality
 *
 * Each card maintains local state for exercise and duration selection,
 * ensuring independent behavior across multiple suggestion cards.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import * as CONSTS from '../constants/app';
import { COLORS } from '../constants/colors';
import { STRINGS } from '../constants/strings';
import { SuggestedSlot } from '../services/CalendarService';
import { MOOD_THEMES, MoodKey } from '../types/mood';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * getSuggestionBreathingDuration: Returns animation duration based on mood
 */
const getSuggestionBreathingDuration = (mood: MoodKey): number => {
  switch (mood) {
    case 'Calm':
      return CONSTS.BREATHING_DURATION.SUGGESTION_CALM;
    case 'Energetic':
      return CONSTS.BREATHING_DURATION.SUGGESTION_ENERGETIC;
    case 'Stressed':
      return CONSTS.BREATHING_DURATION.SUGGESTION_STRESSED;
  }
};

export type SuggestionListProps = {
  mood: MoodKey;
  slots: SuggestedSlot[];
  onAdd: (slot: SuggestedSlot, exercise?: string) => void;
  onChangeTime: (slot: SuggestedSlot) => void;
  addedEventIds: Record<string, string>; // Maps slot.id to calendar event ID
  conflictSlotId?: string | null; // Triggers red flash animation
  loading: boolean;
  error?: string;
};

/**
 * Formats Date to time string (e.g., "9:00 AM")
 */
const formatTime = (value: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
};

/**
 * ScheduleSuggestions: Container component that renders loading/error/empty states
 * or maps slots to SuggestionCard components
 */
const ScheduleSuggestions = ({
  mood,
  slots,
  onAdd,
  onChangeTime,
  addedEventIds,
  conflictSlotId,
  loading,
  error,
}: SuggestionListProps) => {
  // Loading state
  if (loading) {
    return (
      <View style={styles.stateRow}>
        <ActivityIndicator />
        <Text style={styles.stateText}>{STRINGS.ASYNC_FEEDBACK.SYNCING}</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.stateRow}>
        <Text style={[styles.stateText, styles.error]}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (!slots.length) {
    return (
      <View style={styles.stateRow}>
        <Text style={styles.stateText}>No free windows found today.</Text>
      </View>
    );
  }

  // Render suggestion cards
  return (
    <View style={styles.list}>
      {slots.map(slot => (
        <SuggestionCard
          key={slot.id}
          slot={slot}
          mood={mood}
          addedId={addedEventIds[slot.id]}
          onAdd={onAdd}
          onChangeTime={onChangeTime}
          isConflicted={conflictSlotId === slot.id}
        />
      ))}
    </View>
  );
};

type CardProps = {
  slot: SuggestedSlot;
  mood: MoodKey;
  addedId?: string; // If present, event was already added
  isConflicted: boolean; // Triggers red flash animation
  onAdd: (slot: SuggestedSlot, exercise?: string) => void;
  onChangeTime: (slot: SuggestedSlot) => void;
};

/**
 * SuggestionCard: Individual time slot card with local state management
 *
 * Features:
 * - Random initial duration (15m or 30m)
 * - Mood-specific exercise chips
 * - Breathing animation (scale + shadow)
 * - Gradient background matching mood theme
 * - Conflict detection with red flash
 * - Disabled state after adding
 */
const SuggestionCard = ({
  slot,
  mood,
  addedId,
  isConflicted,
  onAdd,
  onChangeTime,
}: CardProps) => {
  const theme = MOOD_THEMES[mood];

  // Animation values
  const pulse = useRef(new Animated.Value(0)).current; // For conflict flash
  const breathe = useRef(new Animated.Value(0)).current; // For breathing effect
  const gradientFade = useRef(new Animated.Value(1)).current; // For mood transitions

  // Local state (resets when slot changes)
  const [selectedExercise, setSelectedExercise] = useState<string | undefined>(
    undefined,
  );
  const [selectedDuration, setSelectedDuration] = useState<15 | 30>(() =>
    Math.random() < 0.5 ? 15 : 30,
  );
  const [gradients, setGradients] = useState(() => ({
    previous: theme.cardGradient,
    current: theme.cardGradient,
  }));

  // Mood-based breathing duration: Calm=3.6s, Energetic=2.0s, Stressed=1.2s
  const breatheDuration = getSuggestionBreathingDuration(mood);

  // Start breathing loop
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

  // Pulse animation on conflict
  useEffect(() => {
    if (isConflicted) {
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: CONSTS.TIMING.CONFLICT_PULSE,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: CONSTS.TIMING.CONFLICT_PULSE,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isConflicted, pulse]);

  // Update gradients on mood change
  useLayoutEffect(() => {
    setGradients({ previous: theme.cardGradient, current: theme.cardGradient });
    gradientFade.setValue(1);
  }, [mood, gradientFade, theme.cardGradient]);

  // Reset selections when slot changes
  useEffect(() => {
    setSelectedExercise(undefined);
    setSelectedDuration(Math.random() < 0.5 ? 15 : 30);
  }, [slot.id, slot.durationMinutes]);

  // Conflict background interpolation (normal → red)
  const conflictStyle = useMemo(() => {
    if (!isConflicted) return null;
    const background = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 241, 242, 0.9)', 'rgba(254, 226, 226, 1)'],
    });
    return {
      backgroundColor: background,
      borderWidth: 1,
      borderColor: '#F87171',
    };
  }, [isConflicted, pulse]);

  // Breathing scale (1.0 → 1.015)
  const breatheScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [
      CONSTS.SCALE.SUGGESTION_CARD.MIN,
      CONSTS.SCALE.SUGGESTION_CARD.MAX,
    ],
  });

  // Breathing shadow (12 → 16)
  const breatheShadow = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [
      CONSTS.SHADOW.SUGGESTION_SHADOW.MIN,
      CONSTS.SHADOW.SUGGESTION_SHADOW.MAX,
    ],
  });

  return (
    <Animated.View
      style={[
        styles.gradientCard,
        {
          transform: [{ scale: breatheScale }],
          shadowRadius: breatheShadow,
        },
      ]}
    >
      {/* Gradient backgrounds for smooth mood transitions */}
      <LinearGradient
        colors={gradients.previous}
        style={StyleSheet.absoluteFill}
      />
      <AnimatedLinearGradient
        colors={gradients.current}
        style={[StyleSheet.absoluteFill, { opacity: gradientFade }]}
      />
      <Animated.View
        style={[
          styles.card,
          addedId ? styles.cardAdded : styles.cardIdle,
          { borderColor: theme.primary },
          conflictStyle,
        ]}
      >
        {/* Time range display (updates with duration selection) */}
        <Text style={styles.timeLabel}>
          {formatTime(slot.startDate)} →{' '}
          {formatTime(
            new Date(slot.startDate.getTime() + selectedDuration * 60000),
          )}
        </Text>

        <Text style={styles.title}>
          {addedId
            ? STRINGS.SUGGESTIONS.CARD_TITLE_ADDED
            : STRINGS.SUGGESTIONS.CARD_TITLE_IDLE}
        </Text>
        <Text style={styles.meta}>
          {addedId
            ? STRINGS.SUGGESTIONS.CARD_META_ADDED
            : STRINGS.SUGGESTIONS.CARD_META_IDLE}
        </Text>

        {/* Duration selector: 15m or 30m chips */}
        <View style={styles.row}>
          <Text style={styles.label}>{STRINGS.SUGGESTIONS.LABEL_DURATION}</Text>
          <View style={styles.chipRow}>
            {[15, 30].map(duration => {
              const active = selectedDuration === duration;
              return (
                <Pressable
                  key={duration}
                  style={[styles.durationChip, active && styles.chipActive]}
                  onPress={() => setSelectedDuration(duration as 15 | 30)}
                  disabled={!!addedId} // Disable after adding
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {duration}m
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Exercise selector: Mood-specific activity chips */}
        <View style={styles.row}>
          <Text style={styles.label}>{STRINGS.SUGGESTIONS.LABEL_EXERCISE}</Text>
          <View style={styles.chipRow}>
            {MOOD_THEMES[mood].exercises.map(item => {
              const active = selectedExercise === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedExercise(item)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Action buttons: Change time (secondary) + Add (primary) */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.ghostButton, { borderColor: theme.primary }]}
            onPress={() => onChangeTime(slot)}
          >
            <Text style={[styles.ghostText, { color: theme.primary }]}>
              {STRINGS.SUGGESTIONS.BUTTON_CHANGE_TIME}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: theme.primary, shadowColor: theme.shadow },
              addedId && styles.primaryButtonDisabled,
            ]}
            onPress={() =>
              onAdd(
                {
                  ...slot,
                  durationMinutes: selectedDuration,
                  endDate: new Date(
                    slot.startDate.getTime() + selectedDuration * 60000,
                  ),
                },
                selectedExercise,
              )
            }
          >
            <Text style={styles.primaryText}>
              {STRINGS.SUGGESTIONS.BUTTON_ADD}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 18,
  },
  gradientCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  card: {
    padding: 16,
    borderRadius: 18,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardIdle: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: '#FFFFFF55',
  },
  cardAdded: {
    backgroundColor: 'rgba(231,248,239,0.92)',
    borderWidth: 1,
    borderColor: '#ffffff88',
  },
  timeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 6,
  },
  title: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_SECONDARY,
  },
  meta: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  row: {
    marginTop: 10,
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: COLORS.TEXT_TERTIARY,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  durationChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  chipActive: {
    backgroundColor: COLORS.TEXT_PRIMARY,
  },
  chipText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: COLORS.TEXT_INVERSE,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ghostButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: COLORS.TEXT_PRIMARY,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  ghostText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.TEXT_PRIMARY,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryText: {
    color: COLORS.TEXT_INVERSE,
    fontWeight: '800',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  stateText: {
    fontSize: 15,
    color: '#4B5563',
  },
  error: {
    color: '#DC2626',
  },
});

export default ScheduleSuggestions;
