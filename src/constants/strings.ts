/**
 * strings.ts
 * 
 * Centralized string constants for the Wellness app.
 * All user-facing text is defined here for easy localization and maintenance.
 * 
 * Organization:
 * - HEADER: Main app title and subtitle
 * - MOODS: Mood option labels
 * - BUSY_LIST: Event listing section
 * - SUGGESTIONS: Free slot card section
 * - ALERTS: User confirmation and error messages
 * - BANNERS: Toast notification messages
 * - LABELS: Form and UI labels
 * - METADATA: Event information labels
 * - TIMING: Async operation feedback
 * - EMPTY_STATES: Messages when no data exists
 */

export const STRINGS = {
  // ========== HEADER ==========
  HEADER: {
    APP_TITLE: 'Wellness',
    APP_SUBTITLE: 'Match your day to your mood.',
  },

  // ========== MOODS ==========
  MOODS: {
    CALM: 'Calm',
    STRESSED: 'Stressed',
    ENERGETIC: 'Energetic',
  },

  // ========== BUSY LIST ==========
  BUSY_LIST: {
    HEADING: (dayLabel: string) => `Busy today (${dayLabel})`,
    DEFAULT_TITLE: 'Busy block',
    BADGE_APP: 'App',
    BUTTON_REMOVE: 'Remove',
  },

  // ========== SUGGESTIONS ==========
  SUGGESTIONS: {
    SECTION_TITLE: "Today's windows",
    CARD_TITLE_IDLE: 'Add a wellness pause',
    CARD_TITLE_ADDED: 'Locked in — nice!',
    CARD_META_IDLE: 'One tap to schedule',
    CARD_META_ADDED: 'Manage it from Busy list',
    LABEL_DURATION: 'Duration',
    LABEL_EXERCISE: 'Exercise',
    BUTTON_CHANGE_TIME: 'Change time',
    BUTTON_ADD: 'Add',
    BUTTON_ADDED: 'Added',
    TIME_PLACEHOLDER: (start: string, end: string) => `${start} → ${end}`,
  },

  // ========== ALERTS ==========
  ALERTS: {
    ALREADY_ADDED_TITLE: 'Already added',
    ALREADY_ADDED_MESSAGE: 'Manage removals from the Busy list.',
    CHOOSE_EXERCISE_TITLE: 'Choose exercise',
    CHOOSE_EXERCISE_MESSAGE: 'Pick an exercise for this slot before adding.',
    TOO_LATE_TITLE: 'Too late',
    TOO_LATE_MESSAGE: 'Pick a time in the future today.',
    TODAY_ONLY_TITLE: 'Today only',
    TODAY_ONLY_MESSAGE: 'You can only add events for today.',
    CONFLICT_TITLE: 'Conflict',
    CONFLICT_MESSAGE: 'This time overlaps with another event.',
    FUTURE_VALIDATION_TITLE: 'Too late',
    FUTURE_VALIDATION_MESSAGE: 'Pick a time in the future.',
    CALENDAR_ERROR_TITLE: 'Calendar error',
    CALENDAR_ERROR_MESSAGE: 'Could not update your calendar.',
    PERMISSIONS_DENIED: 'Calendar access denied. Please enable permissions.',
  },

  // ========== BANNERS ==========
  BANNERS: {
    ADDED: 'Added to your calendar',
    ADD_FAILED: 'Calendar add failed',
    REMOVED_AND_REFRESHED: 'Removed and refreshed',
    RESYNC_FAILED: 'Resync failed',
  },

  // ========== LABELS ==========
  LABELS: {
    DURATION_15M: '15m',
    DURATION_30M: '30m',
    EXERCISE: (name?: string) => name || 'Wellness practice',
    MOOD: (moodName: string) => moodName,
  },

  // ========== METADATA ==========
  METADATA: {
    EXERCISE_PREFIX: 'Exercise: ',
    MOOD_PREFIX: 'Mood: ',
    LOCATION_PREFIX: 'Location: ',
    CALENDAR_PREFIX: 'Calendar: ',
  },

  // ========== ASYNC FEEDBACK ==========
  ASYNC_FEEDBACK: {
    SYNCING: 'Syncing with your calendar…',
    UNABLE_TO_SYNC: 'Unable to sync calendar right now.',
  },

  // ========== EMPTY STATES ==========
  EMPTY_STATES: {
    NO_SUGGESTIONS: 'No available slots.',
  },

  // ========== TIME PICKER ==========
  TIME_PICKER: {
    MODAL_LABEL: 'Select time',
  },
} as const;

export default STRINGS;
