/**
 * App Constants
 * 
 * Only necessary magic numbers and configuration values.
 * Keep it lean - don't extract everything to constants.
 */

// ========== Animation Timings (milliseconds) ==========

// Breathing animation durations for each mood
export const BREATHING_DURATION = {
  CALM: 1800,
  ENERGETIC: 1013,
  STRESSED: 563,
  SUGGESTION_CALM: 2025,
  SUGGESTION_ENERGETIC: 1125,
  SUGGESTION_STRESSED: 675,
  BUSY_CALM: 2250,
  BUSY_ENERGETIC: 1350,
  BUSY_STRESSED: 788,
} as const;

// Key timeouts and transitions
export const TIMING = {
  BANNER_DISPLAY: 2200,
  CONFLICT_RESET: 1200,
  CONFLICT_PULSE: 180,
  GRADIENT_TRANSITION: 420,
} as const;

// ========== Scale & Transform Values ==========

export const SCALE = {
  HEADER_PILL: { MIN: 1, MAX: 1.05 },
  SUGGESTION_CARD: { MIN: 1, MAX: 1.015 },
  BUSY_CARD: { MIN: 1, MAX: 1.012 },
} as const;

export const SHADOW = {
  SUGGESTION_SHADOW: { MIN: 12, MAX: 16 },
} as const;

// ========== Calendar Configuration ==========

export const CALENDAR = {
  DAYS_TO_FETCH: 1,
  MIN_DURATION_MINUTES: 15,
  MAX_DURATION_MINUTES: 30,
  DAY_START_HOUR: 7,
  DAY_END_HOUR: 22,
  MIN_FUTURE_BUFFER_MINUTES: 15,
} as const;

// ========== Time of Day Thresholds ==========

export const TIME_OF_DAY = {
  MORNING_END: 12,
  AFTERNOON_END: 18,
} as const;

// ========== Duration Options ==========

export const DURATIONS = {
  SHORT: 15,
  LONG: 30,
} as const;

// ========== Dayparts ==========

export const DAYPARTS = ['morning', 'afternoon', 'evening'] as const;
export type Daypart = typeof DAYPARTS[number];

