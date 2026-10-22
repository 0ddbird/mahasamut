/**
 * How the settings are shown: the choices of the settings page, and the short
 * description of a game's settings on its results. The labels live here so
 * that a translation can replace them later.
 */
import type { Option } from '../../components/AnswerRow/option';
import { ANSWER_MODE, PLAY_MODE } from './settings';
import type { AnswerMode, GameSettings, PlayMode } from './settings';

export const PLAY_MODE_OPTIONS: readonly Option<PlayMode>[] = [
  { value: PLAY_MODE.Solo, label: 'Alone' },
  { value: PLAY_MODE.Multi, label: 'In a lobby' },
];

/** The length of a game, as the settings page asks it before the number of questions. */
export type LengthChoice = 'endless' | 'series';

export const LENGTH_OPTIONS: readonly Option<LengthChoice>[] = [
  { value: 'endless', label: 'Endless' },
  { value: 'series', label: 'Series' },
];

/** The time of a game, as the settings page asks it before the seconds per question. */
export type TimeChoice = 'free' | 'timed';

export const TIME_OPTIONS: readonly Option<TimeChoice>[] = [
  { value: 'free', label: 'Untimed' },
  { value: 'timed', label: 'Timed' },
];

const ANSWER_MODE_LABELS: Record<AnswerMode, string> = {
  [ANSWER_MODE.Detailed]: 'Full reasoning',
  [ANSWER_MODE.ToneOnly]: 'Tone only',
};

export const ANSWER_MODE_OPTIONS: readonly Option<AnswerMode>[] = [
  { value: ANSWER_MODE.Detailed, label: ANSWER_MODE_LABELS[ANSWER_MODE.Detailed] },
  { value: ANSWER_MODE.ToneOnly, label: ANSWER_MODE_LABELS[ANSWER_MODE.ToneOnly] },
];

/** The learning mode, as the settings page asks it: off or on. */
export type LearningChoice = 'off' | 'on';

export const LEARNING_MODE_OPTIONS: readonly Option<LearningChoice>[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

/**
 * The settings of a game in one line, e.g. "Series of 10 · 15 s per question ·
 * Tone only".
 *
 * @param withAnswerMode whether the game has an answer mode (the syllable game).
 */
export function describeSettings(settings: GameSettings, withAnswerMode: boolean): string {
  const parts = [
    settings.questionCount === null ? 'Endless' : `Series of ${settings.questionCount}`,
    settings.secondsPerQuestion === null
      ? 'Untimed'
      : `${settings.secondsPerQuestion} s per question`,
  ];
  if (withAnswerMode) parts.push(ANSWER_MODE_LABELS[settings.answerMode]);
  if (settings.learningMode) parts.push('Learning mode');
  return parts.join(' · ');
}
