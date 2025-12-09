/**
 * CalendarService: Manages all calendar operations for the Wellness app
 * Handles permissions, event fetching, free slot detection, and event creation/removal
 */
import RNCalendarEvents, { CalendarEventWritable } from 'react-native-calendar-events';

import { MoodKey } from '../types/mood';

/**
 * BusyEvent: Represents a calendar event (app-created or external)
 */
export type BusyEvent = {
  id: string;
  startDate: string;
  endDate: string;
  title?: string;
  isAppCreated?: boolean; // True if created by this app
  slotId?: string; // Links event back to original suggested slot
  exercise?: string; // Type of wellness exercise
  exerciseMood?: MoodKey; // Mood associated with exercise
  userMood?: MoodKey; // User's mood when event was created
  location?: string; // Event location (for external events)
  calendarName?: string; // Calendar source name (for external events)
};

/**
 * SuggestedSlot: Represents a free time window for wellness activities
 */
export type SuggestedSlot = {
  id: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  status: 'available' | 'added';
};

type FetchAllEventsOptions = {
  calendars?: string[]; // Optional calendar IDs to filter
};

/**
 * SaveEventOptions: Metadata to attach when creating wellness events
 */
type SaveEventOptions = {
  calendarId?: string;
  id?: string;
  alarms?: Array<{ date: number }>;
  notes?: string;
  exercise?: string; // Exercise type chosen by user
  exerciseMood?: MoodKey; // Mood associated with exercise
  slotId?: string; // Original slot ID for tracking
  userMood?: MoodKey; // User's current mood
};

/**
 * FreeSlotConfig: Configuration for free slot detection algorithm
 */
export type FreeSlotConfig = {
  days: number; // How many days to scan
  minMinutes: number; // Minimum slot duration
  maxMinutes: number; // Maximum slot duration
  dayStartHour: number; // Start of active hours (e.g., 7 AM)
  dayEndHour: number; // End of active hours (e.g., 9 PM)
};

const DEFAULT_FREE_SLOT_CONFIG: FreeSlotConfig = {
  days: 3,
  minMinutes: 15,
  maxMinutes: 30,
  dayStartHour: 7,
  dayEndHour: 21,
};

// Constants for wellness event creation
const EVENT_TITLE = 'Wellness reset';
const EVENT_NOTES = 'Scheduled via Wellness app. Adjust or move as needed for your day.';
const META_PREFIX = 'WellnessMeta:'; // Prefix for storing metadata in event notes

/**
 * ensurePermissions: Checks and requests calendar permissions if needed
 * @returns Promise<boolean> - true if permissions granted
 */
async function ensurePermissions(): Promise<boolean> {
  const status = await RNCalendarEvents.checkPermissions(false);
  if (status === 'authorized') return true;

  const nextStatus = await RNCalendarEvents.requestPermissions(false);
  return nextStatus === 'authorized';
}

/**
 * fetchBusyEvents: Retrieves all calendar events for specified days
 * Parses metadata from app-created events and includes external event details
 * @param days - Number of days to fetch
 * @param options - Optional calendar filters
 * @returns Promise<BusyEvent[]> - Sorted array of events
 */
async function fetchBusyEvents(
  days: number,
  options: FetchAllEventsOptions = {},
): Promise<BusyEvent[]> {
  const start = startOfDay(new Date());
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const calendars = options.calendars;
  const events = await RNCalendarEvents.fetchAllEvents(
    start.toISOString(),
    end.toISOString(),
    calendars,
  );

  return events
    .map((event) => {
      // Parse metadata from iOS `notes` or Android `description` (some devices use description)
      const meta = parseMeta((event.notes ?? (event as any).description) as string | null);
      const isApp =
        event.title === EVENT_TITLE ||
        (typeof event.notes === 'string' && event.notes.includes('Wellness app')) ||
        !!meta;

      return {
        id: event.id,
        startDate: event.startDate,
        endDate: event.endDate ?? event.startDate,
        title: event.title,
        isAppCreated: isApp,
        slotId: meta?.slotId,
        exercise: meta?.exercise,
        exerciseMood: meta?.exerciseMood as MoodKey | undefined,
        userMood: meta?.userMood as MoodKey | undefined,
        location: event.location,
        calendarName:
          // RNCalendarEvents returns a calendar object; prefer title, then name.
          (event.calendar && (event.calendar.title || (event.calendar as any).name)) || undefined,
      } as BusyEvent;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

/**
 * findFreeSlots: Detects free time windows between busy events
 * Algorithm: For each day, scan from start to end hour, finding gaps between events
 * @param busyEvents - Array of existing calendar events
 * @param config - Slot detection configuration
 * @returns SuggestedSlot[] - Array of available time slots (max 10)
 */
function findFreeSlots(
  busyEvents: BusyEvent[],
  config: FreeSlotConfig = DEFAULT_FREE_SLOT_CONFIG,
): SuggestedSlot[] {
  const slots: SuggestedSlot[] = [];
  const now = new Date();

  // Scan each day in the range
  for (let dayOffset = 0; dayOffset < config.days; dayOffset += 1) {
    const dayStart = startOfDay(addDays(now, dayOffset));
    const windowStart = setHour(dayStart, config.dayStartHour);
    const windowEnd = setHour(dayStart, config.dayEndHour);

    // Start scanning from whichever is later: windowStart or now.
    // - If it's 3 AM (before 7 AM window), start at 7 AM.
    // - If it's 9 AM (after 7 AM window), start at 9 AM.
    // - For future days, always start at windowStart.
    let cursor = dayOffset === 0 ? new Date(Math.max(now.getTime(), windowStart.getTime())) : windowStart;
    const todaysEvents = busyEvents.filter((event) =>
      isSameDay(new Date(event.startDate), dayStart),
    );

    todaysEvents.forEach((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // If there is a gap between the cursor and the next event, fill it
      // with one or more slots (sequentially) until the gap is exhausted
      // or we hit the global slot limit. This creates multiple 15/30m
      // suggestions within a large free window instead of a single slot.
      if (eventStart > cursor) {
        let gapStart = new Date(cursor);
        const gapEnd = eventStart;
        let remaining = diffMinutes(gapStart, gapEnd);

        while (remaining >= config.minMinutes && slots.length < 10) {
          const slotDuration = chooseDuration(remaining, config);
          if (!slotDuration) break;
          const slot = buildSlot(gapStart, slotDuration);
          if (slot.startDate >= now) slots.push(slot);
          // Advance gapStart by the duration we just used
          gapStart = new Date(gapStart.getTime() + slotDuration * 60000);
          remaining = diffMinutes(gapStart, gapEnd);
        }
      }

      if (eventEnd > cursor) {
        cursor = eventEnd;
      }
    });

    if (windowEnd > cursor) {
      let gapStart = new Date(cursor);
      const gapEnd = windowEnd;
      let remaining = diffMinutes(gapStart, gapEnd);
      while (remaining >= config.minMinutes && slots.length < 10) {
        const slotDuration = chooseDuration(remaining, config);
        if (!slotDuration) break;
        const slot = buildSlot(gapStart, slotDuration);
        if (slot.startDate >= now) slots.push(slot);
        gapStart = new Date(gapStart.getTime() + slotDuration * 60000);
        remaining = diffMinutes(gapStart, gapEnd);
      }
    }
  }

  return slots.slice(0, 10); // keep the list manageable
}

/**
 * hasConflict: Checks if a proposed time range overlaps with existing events
 * @param busyEvents - Array of existing calendar events
 * @param start - Proposed start time
 * @param end - Proposed end time
 * @returns boolean - true if there's an overlap
 */
function hasConflict(
  busyEvents: BusyEvent[],
  start: Date,
  end: Date,
): boolean {
  return busyEvents.some((event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    return rangesOverlap(start, end, eventStart, eventEnd);
  });
}

/**
 * addWellnessEvent: Creates a new wellness event in the calendar
 * Embeds metadata as JSON in event notes for later retrieval
 * @param slot - Time slot for the event
 * @param options - Event metadata (exercise, mood, etc.)
 * @returns Promise<string> - Created event ID
 */
async function addWellnessEvent(slot: SuggestedSlot, options?: SaveEventOptions) {
  const { calendarId, exercise, exerciseMood, slotId, userMood, notes, ...rest } = options ?? {};

  // Serialize metadata as JSON in notes field
  const meta = exercise || exerciseMood || slotId || userMood
    ? `${META_PREFIX}${JSON.stringify({
        exercise,
        exerciseMood,
        slotId,
        userMood,
      })}`
    : undefined;

  const mergedNotes = [notes ?? EVENT_NOTES, meta].filter(Boolean).join('\n');

  // On Android, we need to find a writable calendar if none is provided
  let targetCalendarId = calendarId;
  if (!targetCalendarId) {
    try {
      const calendars = await RNCalendarEvents.findCalendars();
      // Find first writable calendar (prefer local calendars)
      const writableCalendar = calendars.find(
        (cal) => cal.allowsModifications !== false && cal.isPrimary
      ) || calendars.find(
        (cal) => cal.allowsModifications !== false
      );
      if (writableCalendar) {
        targetCalendarId = writableCalendar.id;
      }
    } catch (err) {
      console.warn('Failed to enumerate calendars, will try without calendarId', err);
    }
  }

  const alarms: Array<{ date: number }> = [{ date: -5 }];

  const details: CalendarEventWritable = {
    startDate: slot.startDate.toISOString(),
    endDate: slot.endDate.toISOString(),
    notes: mergedNotes,
    description: mergedNotes, // for Android devices using description
    alarms,
    ...rest,
  };
  if (targetCalendarId) details.calendarId = targetCalendarId;

  try {
    const id = await RNCalendarEvents.saveEvent(EVENT_TITLE, details);
    return id;
  } catch (err) {
    console.warn('saveEvent failed, retrying without alarms', err);
    if (details.alarms) {
      // sometimes alarms cause failures (e.g., on certain Android devices)
      delete details.alarms;
      try {
        const id2 = await RNCalendarEvents.saveEvent(EVENT_TITLE, details);
        return id2;
      } catch (err2) {
        console.error('saveEvent retry without alarms also failed', err2);
        throw err2;
      }
    }
    throw err;
  }
}

/**
 * removeEvent: Deletes a calendar event by ID
 * @param eventId - Calendar event ID
 */
async function removeEvent(eventId: string) {
  return RNCalendarEvents.removeEvent(eventId);
}

/**
 * buildSlot: Constructs a SuggestedSlot object from start time and duration
 */
function buildSlot(anchor: Date, durationMinutes: number): SuggestedSlot {
  const endDate = new Date(anchor.getTime() + durationMinutes * 60 * 1000);
  return {
    id: `${anchor.getTime()}-${durationMinutes}`,
    startDate: anchor,
    endDate,
    durationMinutes,
    status: 'available',
  };
}

/**
 * chooseDuration: Determines optimal slot duration based on available gap
 * Returns null if gap is too small, otherwise returns max or min duration
 */
function chooseDuration(
  gapMinutes: number,
  config: FreeSlotConfig,
): number | null {
  if (gapMinutes < config.minMinutes) return null;
  if (gapMinutes >= config.maxMinutes) return config.maxMinutes;
  return config.minMinutes;
}

// ============ Date Utility Functions ============

/** Returns a new Date set to midnight (start of day) */
function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns a new Date with specified days added */
function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Returns a new Date set to specific hour (with minutes/seconds/ms zeroed) */
function setHour(date: Date, hour: number) {
  const copy = new Date(date);
  copy.setHours(hour, 0, 0, 0);
  return copy;
}

/** Calculates difference in minutes between two dates (non-negative) */
function diffMinutes(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

/** Checks if two dates are on the same calendar day */
function isSameDay(value: Date, reference: Date) {
  return (
    value.getFullYear() === reference.getFullYear() &&
    value.getMonth() === reference.getMonth() &&
    value.getDate() === reference.getDate()
  );
}

/** Checks if two time ranges overlap */
function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}

/**
 * parseMeta: Extracts and parses metadata JSON from event notes
 * @param notes - Event notes string
 * @returns Parsed metadata object or null
 */
function parseMeta(notes?: string | null) {
  if (!notes || typeof notes !== 'string') return null;
  const metaLine = notes
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(META_PREFIX));
  if (!metaLine) return null;
  const payload = metaLine.replace(META_PREFIX, '').trim();
  try {
    return JSON.parse(payload) as {
      exercise?: string;
      exerciseMood?: MoodKey;
      slotId?: string;
      userMood?: MoodKey;
    };
  } catch {
    return null;
  }
}

export default {
  ensurePermissions,
  fetchBusyEvents,
  findFreeSlots,
  hasConflict,
  addWellnessEvent,
  removeEvent,
};
