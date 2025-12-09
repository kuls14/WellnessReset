/**
 * HomeScreen Component
 *
 * Main application screen that orchestrates:
 * - Mood selection and theme switching
 * - Calendar synchronization and event management
 * - Free slot detection and display
 * - Wellness event creation with validation
 * - Conflict detection and time adjustment
 *
 * State Management:
 * - mood: Current user mood (Calm/Stressed/Energetic)
 * - busyEvents: All calendar events for today
 * - slots: Suggested free time slots (max 3: morning/afternoon/evening)
 * - loading/error: Async operation states
 * - banner: Toast notifications for user feedback
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  AppState,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BusyList from '../components/BusyList';
import MoodScene from '../components/MoodScene';
import ScheduleSuggestions from '../components/ScheduleSuggestions';
import * as CONSTS from '../constants/app';
import { BANNER, COLORS } from '../constants/colors';
import { STRINGS } from '../constants/strings';
import CalendarService, {
  BusyEvent,
  SuggestedSlot,
} from '../services/CalendarService';
import { MOOD_THEMES, MoodKey } from '../types/mood';

const MOODS: MoodKey[] = ['Calm', 'Stressed', 'Energetic'];

/**
 * getBreathingDuration: Returns animation duration based on mood
 * Calm: 3.2s, Energetic: 1.8s, Stressed: 1.0s
 */
const getBreathingDuration = (mood: MoodKey): number => {
  switch (mood) {
    case 'Calm':
      return CONSTS.BREATHING_DURATION.CALM;
    case 'Energetic':
      return CONSTS.BREATHING_DURATION.ENERGETIC;
    case 'Stressed':
      return CONSTS.BREATHING_DURATION.STRESSED;
  }
};

type HeaderProps = {
  mood: MoodKey;
  onChangeMood: (next: MoodKey) => void;
};

/**
 * Header Component: App title, subtitle, and mood selector pills
 * Features breathing animation on active mood pill
 */
const Header = ({ mood, onChangeMood }: HeaderProps) => {
  const breathe = useRef(new Animated.Value(0)).current;
  const breatheDuration = getBreathingDuration(mood);

  // Start breathing loop on mount, restart when duration changes
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

  // Scale active pill from 1.0 to 1.05
  const breatheScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [CONSTS.SCALE.HEADER_PILL.MIN, CONSTS.SCALE.HEADER_PILL.MAX],
  });

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headline}>{STRINGS.HEADER.APP_TITLE}</Text>
        <Text style={styles.subhead}>{STRINGS.HEADER.APP_SUBTITLE}</Text>
      </View>
      <View style={styles.moodRow}>
        {MOODS.map(item => {
          const theme = MOOD_THEMES[item];
          const active = item === mood;
          return (
            <Animated.Text
              key={item}
              onPress={() => onChangeMood(item)}
              style={[
                styles.moodPill,
                { backgroundColor: theme.accent, borderColor: theme.primary },
                active && [
                  styles.moodPillActive,
                  { transform: [{ scale: breatheScale }] },
                ],
              ]}
            >
              {item}
            </Animated.Text>
          );
        })}
      </View>
    </View>
  );
};

const HomeScreen = () => {
  // ========== State ==========
  const [mood, setMood] = useState<MoodKey>('Calm');
  const [busyEvents, setBusyEvents] = useState<BusyEvent[]>([]);
  const [slots, setSlots] = useState<SuggestedSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<SuggestedSlot | null>(null); // For time picker
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [conflictSlotId, setConflictSlotId] = useState<string | null>(null); // For red flash animation
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerTone, setBannerTone] = useState<'success' | 'error'>('success');
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  /**
   * moodForExercise: Derives mood from exercise type
   * Used to theme wellness events based on their activity
   */
  const moodForExercise = useCallback(
    (exercise?: string): MoodKey => {
      if (!exercise) return mood;
      const match = (Object.keys(MOOD_THEMES) as MoodKey[]).find(key =>
        MOOD_THEMES[key].exercises.includes(exercise),
      );
      return match ?? mood;
    },
    [mood],
  );

  /**
   * showBanner: Displays toast notification
   */
  const showBanner = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      if (bannerTimer.current) {
        clearTimeout(bannerTimer.current);
        bannerTimer.current = null;
      }
      setBanner(message);
      setBannerTone(tone);
      bannerTimer.current = setTimeout(
        () => setBanner(null),
        CONSTS.TIMING.BANNER_DISPLAY,
      );
    },
    [],
  );

  // Cleanup banner timer on unmount
  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  /**
   * mergedBusyEvents: Enriches app-created events with exercise mood
   */ /**
   * mergedBusyEvents: Enriches app-created events with exercise mood
   */
  const mergedBusyEvents = useMemo<BusyEvent[]>(() => {
    return busyEvents.map(event => {
      if (!event.isAppCreated) return event;
      const exercise = event.exercise;
      const exerciseMood = event.exerciseMood ?? moodForExercise(exercise);
      return { ...event, exercise, exerciseMood };
    });
  }, [busyEvents, moodForExercise]);

  /**
   * addedEventIdsBySlot: Maps slot IDs to calendar event IDs
   * Used to show "Added" state and prevent duplicate additions
   */
  const addedEventIdsBySlot = useMemo<Record<string, string>>(() => {
    return busyEvents.reduce<Record<string, string>>((acc, event) => {
      if (event.isAppCreated && event.slotId) {
        acc[event.slotId] = event.id;
      }
      return acc;
    }, {});
  }, [busyEvents]);

  /**
   * getTimeOfDay: Determines current time period for background tinting
   */
  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < CONSTS.TIME_OF_DAY.MORNING_END) return 'morning';
    if (hour < CONSTS.TIME_OF_DAY.AFTERNOON_END) return 'afternoon';
    return 'evening';
  };

  /**
   * timeOfDay: Determines morning/afternoon/evening for background tinting
   */
  const timeOfDay: 'morning' | 'afternoon' | 'evening' = useMemo(() => {
    return getTimeOfDay();
  }, []);

  /**
   * syncCalendar: Fetches events and calculates free slots
   *
   * Algorithm:
   * 1. Request calendar permissions
   * 2. Fetch all events for next 1 day
   * 3. Find free slots (15-30 min) between 7 AM - 9 PM
   * 4. Filter to today only, min 15 min in future
   * 5. Group by daypart (morning/afternoon/evening)
   * 6. Keep earliest slot per daypart (max 3 total)
   */
  const syncCalendar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      // Request permissions
      const permitted = await CalendarService.ensurePermissions();
      if (!permitted) {
        setError(STRINGS.ALERTS.PERMISSIONS_DENIED);
        setLoading(false);
        return;
      }

      // Fetch busy events
      const busy = await CalendarService.fetchBusyEvents(1);
      const sortedEvents = [...busy].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      setBusyEvents(busy);

      // Find free slots
      const free = CalendarService.findFreeSlots(sortedEvents, {
        days: CONSTS.CALENDAR.DAYS_TO_FETCH,
        minMinutes: CONSTS.CALENDAR.MIN_DURATION_MINUTES,
        maxMinutes: CONSTS.CALENDAR.MAX_DURATION_MINUTES,
        dayStartHour: CONSTS.CALENDAR.DAY_START_HOUR,
        dayEndHour: CONSTS.CALENDAR.DAY_END_HOUR,
      });

      console.log({ free: JSON.stringify(free, null, 2) });

      // Filter to today, at least 15 min in future
      const now = new Date();
      const minStart = new Date(
        now.getTime() + CONSTS.CALENDAR.MIN_FUTURE_BUFFER_MINUTES * 60 * 1000,
      );
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      let filtered = free.filter(
        slot =>
          slot.startDate >= minStart &&
          slot.startDate >= startOfToday &&
          slot.endDate <= endOfToday,
      );

      console.log({ filtered: JSON.stringify(filtered, null, 2) });

      // Fallback: if no slots found, create one from now+15 to end of day (if ≥15 min remains)
      if (!filtered.length) {
        const minutesLeft = Math.floor(
          (endOfToday.getTime() - minStart.getTime()) / 60000,
        );
        const duration = Math.max(0, Math.min(30, minutesLeft));
        if (duration >= 15) {
          filtered = [
            {
              id: `${minStart.getTime()}-fallback`,
              startDate: minStart,
              endDate: new Date(minStart.getTime() + duration * 60000),
              durationMinutes: duration,
              status: 'available',
            },
          ];
        }
      }

      console.log({ filtered: JSON.stringify(filtered, null, 2) });

      // Group by daypart (morning/afternoon/evening), keep earliest 2 slots per bucket
      const byBucket = filtered.reduce<
        Record<'morning' | 'afternoon' | 'evening', SuggestedSlot[]>
      >(
        (acc, slot) => {
          const hour = slot.startDate.getHours();
          let bucket: 'morning' | 'afternoon' | 'evening' = 'evening';
          if (hour < CONSTS.TIME_OF_DAY.MORNING_END) {
            bucket = 'morning';
          } else if (hour < CONSTS.TIME_OF_DAY.AFTERNOON_END) {
            bucket = 'afternoon';
          }
          acc[bucket].push(slot);
          return acc;
        },
        { morning: [], afternoon: [], evening: [] },
      );

      // Keep earliest 2 slots from each bucket
      const condensed = [
        ...byBucket.morning.slice(0, 2),
        ...byBucket.afternoon.slice(0, 2),
        ...byBucket.evening.slice(0, 2),
      ];

      setSlots(condensed);
    } catch (caughtError) {
      console.warn('Unable to sync calendar', caughtError);
      setError(STRINGS.ASYNC_FEEDBACK.UNABLE_TO_SYNC);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        syncCalendar();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [syncCalendar]);

  // Initial sync on mount
  useEffect(() => {
    syncCalendar();
  }, [syncCalendar]);

  /**
   * handleAddSlot: Adds wellness event to calendar with validation
   *
   * Validation checks:
   * - Not already added
   * - Exercise selected
   * - Time is in future
   * - Time is today only
   * - No conflicts with existing events
   */
  const handleAddSlot = async (slot: SuggestedSlot, exercise?: string) => {
    const addedId = addedEventIdsBySlot[slot.id];
    const start = slot.startDate;
    const end = slot.endDate;

    if (addedId) {
      Alert.alert(
        STRINGS.ALERTS.ALREADY_ADDED_TITLE,
        STRINGS.ALERTS.ALREADY_ADDED_MESSAGE,
      );
      return;
    }

    if (!exercise) {
      Alert.alert(
        STRINGS.ALERTS.CHOOSE_EXERCISE_TITLE,
        STRINGS.ALERTS.CHOOSE_EXERCISE_MESSAGE,
      );
      return;
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    if (start < now) {
      Alert.alert(
        STRINGS.ALERTS.TOO_LATE_TITLE,
        STRINGS.ALERTS.TOO_LATE_MESSAGE,
      );
      return;
    }

    if (start < startOfToday || end > endOfToday) {
      Alert.alert(
        STRINGS.ALERTS.TODAY_ONLY_TITLE,
        STRINGS.ALERTS.TODAY_ONLY_MESSAGE,
      );
      return;
    }

    if (CalendarService.hasConflict(busyEvents, start, end)) {
      setConflictSlotId(slot.id);
      setTimeout(() => setConflictSlotId(null), CONSTS.TIMING.CONFLICT_RESET);
      Alert.alert(
        STRINGS.ALERTS.CONFLICT_TITLE,
        STRINGS.ALERTS.CONFLICT_MESSAGE,
      );
      return;
    }

    try {
      const exerciseMood = moodForExercise(exercise);
      await CalendarService.addWellnessEvent(slot, {
        exercise,
        exerciseMood,
        slotId: slot.id,
        userMood: mood,
      });
      setSlots([]);
      setConflictSlotId(null);
      showBanner(STRINGS.BANNERS.ADDED);
      syncCalendar();
    } catch (caughtError) {
      console.warn('Calendar update failed', caughtError);
      Alert.alert(
        STRINGS.ALERTS.CALENDAR_ERROR_TITLE,
        STRINGS.ALERTS.CALENDAR_ERROR_MESSAGE,
      );
      showBanner(STRINGS.BANNERS.ADD_FAILED, 'error');
    }
  };

  /**
   * handleChangeTime: Opens time picker modal for slot adjustment
   */
  const handleChangeTime = (slot: SuggestedSlot) => {
    setEditingSlot(slot);
    setPickerVisible(true);
  };

  /**
   * handleTimePicked: Processes time picker result
   * Validates new time and updates slot if valid
   */
  const handleTimePicked = async (_event: any, date?: Date) => {
    if (!editingSlot) return;
    if (!date) {
      setPickerVisible(false);
      setEditingSlot(null);
      return;
    }

    const startDate = new Date(editingSlot.startDate);
    startDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    const endDate = new Date(
      startDate.getTime() + editingSlot.durationMinutes * 60000,
    );

    if (startDate < new Date()) {
      Alert.alert(
        STRINGS.ALERTS.FUTURE_VALIDATION_TITLE,
        STRINGS.ALERTS.FUTURE_VALIDATION_MESSAGE,
      );
      setPickerVisible(false);
      setEditingSlot(null);
      return;
    }

    const existing = addedEventIdsBySlot[editingSlot.id];
    if (existing) {
      Alert.alert(
        STRINGS.ALERTS.ALREADY_ADDED_TITLE,
        'Remove it from the Busy list to change the time.',
      );
      setPickerVisible(false);
      setEditingSlot(null);
      return;
    }

    if (CalendarService.hasConflict(busyEvents, startDate, endDate)) {
      setConflictSlotId(editingSlot.id);
      setTimeout(() => setConflictSlotId(null), CONSTS.TIMING.CONFLICT_RESET);
      Alert.alert(
        STRINGS.ALERTS.CONFLICT_TITLE,
        STRINGS.ALERTS.CONFLICT_MESSAGE,
      );
      setPickerVisible(false);
      setEditingSlot(null);
      return;
    }

    const updatedSlot: SuggestedSlot = {
      ...editingSlot,
      startDate,
      endDate,
    };

    setSlots(prev =>
      prev.map(s => (s.id === editingSlot.id ? updatedSlot : s)),
    );

    setEditingSlot(null);
    setPickerVisible(false);
  };

  /**
   * handleRemoveBusy: Deletes wellness event and refreshes calendar
   * Only works for app-created events
   */
  const handleRemoveBusy = async (event: BusyEvent) => {
    if (!event.isAppCreated) return;
    try {
      await CalendarService.removeEvent(event.id);
    } catch (caughtError) {
      console.warn('Calendar remove failed', caughtError);
    }

    try {
      await syncCalendar();
      showBanner(STRINGS.BANNERS.REMOVED_AND_REFRESHED);
    } catch (caughtError) {
      console.warn('Calendar resync failed', caughtError);
      showBanner(STRINGS.BANNERS.RESYNC_FAILED, 'error');
    }
  };

  return (
    <MoodScene mood={mood} timeOfDay={timeOfDay}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={syncCalendar} />
        }
      >
        <Header mood={mood} onChangeMood={setMood} />
        <BusyList
          events={mergedBusyEvents}
          dayLabel={new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          onRemove={handleRemoveBusy}
          mood={mood}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {STRINGS.SUGGESTIONS.SECTION_TITLE}
          </Text>
          <ScheduleSuggestions
            mood={mood}
            slots={slots}
            onAdd={handleAddSlot}
            onChangeTime={handleChangeTime}
            addedEventIds={addedEventIdsBySlot}
            conflictSlotId={conflictSlotId}
            loading={loading}
            error={error}
          />
        </View>
      </ScrollView>
      {banner && (
        <View
          style={[
            styles.banner,
            bannerTone === 'success'
              ? styles.bannerSuccess
              : styles.bannerError,
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              bannerTone === 'success'
                ? styles.bannerTextSuccess
                : styles.bannerTextError,
            ]}
          >
            {banner}
          </Text>
        </View>
      )}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setPickerVisible(false)}
          />
          <View style={Platform.OS === 'ios' ? styles.modalCard : undefined}>
            {editingSlot && (
              <DateTimePicker
                mode="time"
                value={editingSlot.startDate}
                onChange={handleTimePicked}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              />
            )}
          </View>
        </View>
      </Modal>
    </MoodScene>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    paddingVertical: 16,
    gap: 10,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
  },
  subhead: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 15,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
  moodPillActive: {
    backgroundColor: COLORS.TEXT_PRIMARY,
    color: COLORS.TEXT_INVERSE,
  },
  section: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.BG_WHITE,
  },
  banner: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bannerSuccess: {
    backgroundColor: BANNER.SUCCESS_BG,
    borderWidth: 1,
    borderColor: BANNER.SUCCESS_BORDER,
  },
  bannerError: {
    backgroundColor: BANNER.ERROR_BG,
    borderWidth: 1,
    borderColor: BANNER.ERROR_BORDER,
  },
  bannerText: {
    fontWeight: '700',
  },
  bannerTextSuccess: {
    color: BANNER.SUCCESS_TEXT,
  },
  bannerTextError: {
    color: BANNER.ERROR_TEXT,
  },
});

export default HomeScreen;
