import { MOOD_COLORS } from '../constants/colors';

export type MoodKey = 'Calm' | 'Stressed' | 'Energetic';

export type MoodTheme = {
  key: MoodKey;
  title: string;
  gradient: [string, string];
  cardGradient: [string, string];
  primary: string;
  accent: string;
  shadow: string;
  paceMs: number;
  amplitude: number;
  exercises: string[];
};

export const MOOD_THEMES: Record<MoodKey, MoodTheme> = {
  Calm: {
    key: 'Calm',
    title: 'Calm',
    gradient: [MOOD_COLORS.CALM.GRADIENT_START, MOOD_COLORS.CALM.GRADIENT_END],
    cardGradient: [MOOD_COLORS.CALM.CARD_GRADIENT_START, MOOD_COLORS.CALM.CARD_GRADIENT_END],
    primary: MOOD_COLORS.CALM.PRIMARY,
    accent: MOOD_COLORS.CALM.ACCENT,
    shadow: MOOD_COLORS.CALM.SHADOW,
    paceMs: 2800,
    amplitude: 6,
    exercises: ['Breathwork', 'Light Stretch', 'Calm Walk'],
  },
  Stressed: {
    key: 'Stressed',
    title: 'Stressed',
    gradient: [MOOD_COLORS.STRESSED.GRADIENT_START, MOOD_COLORS.STRESSED.GRADIENT_END],
    cardGradient: [MOOD_COLORS.STRESSED.CARD_GRADIENT_START, MOOD_COLORS.STRESSED.CARD_GRADIENT_END],
    primary: MOOD_COLORS.STRESSED.PRIMARY,
    accent: MOOD_COLORS.STRESSED.ACCENT,
    shadow: MOOD_COLORS.STRESSED.SHADOW,
    paceMs: 900,
    amplitude: 12,
    exercises: ['Box Breathing', 'Slow Walk', 'Neck Release'],
  },
  Energetic: {
    key: 'Energetic',
    title: 'Energetic',
    gradient: [MOOD_COLORS.ENERGETIC.GRADIENT_START, MOOD_COLORS.ENERGETIC.GRADIENT_END],
    cardGradient: [MOOD_COLORS.ENERGETIC.CARD_GRADIENT_START, MOOD_COLORS.ENERGETIC.CARD_GRADIENT_END],
    primary: MOOD_COLORS.ENERGETIC.PRIMARY,
    accent: MOOD_COLORS.ENERGETIC.ACCENT,
    shadow: MOOD_COLORS.ENERGETIC.SHADOW,
    paceMs: 1400,
    amplitude: 14,
    exercises: ['HIIT Burst', 'Dance Break', 'Power Walk'],
  },
};
