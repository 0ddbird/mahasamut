/**
 * Server adapter for Find the tone (`syllable`): draws real words from the
 * pool, hides their analyses until the question closes, and grades with
 * `checkAnswers` in the room's `answerMode` (`detailed` or `toneOnly`).
 */
import { checkAnswers, isComplete, STEPS } from '../../src/games/syllable/check';
import type { GameAnswers, PlayerAnswers, Step } from '../../src/games/syllable/check';
import type { GameAnswer } from '../../src/multiplayer/protocol';
import type { RoomSettings } from '../../src/multiplayer/settings';
import { generateSyllable } from '../../src/thai/generator';
import type { Rng } from '../../src/thai/generator';
import {
  CONSONANT_CLASSES,
  FINAL_KINDS,
  LIVENESSES,
  TONE_MARKS,
  TONES,
  VOWEL_LENGTHS,
} from '../../src/thai/types';
import { wordGroups } from '../../src/thai/words';
import type { ServerGame, ServerQuestion } from './types';

const ALLOWED_VALUES: Record<Step, readonly string[]> = {
  consonantClass: CONSONANT_CLASSES,
  toneMark: TONE_MARKS,
  vowelLength: VOWEL_LENGTHS,
  finalKind: FINAL_KINDS,
  liveness: LIVENESSES,
  tone: TONES,
};

const STEP_SET: ReadonlySet<string> = new Set(STEPS);

export const syllableGame: ServerGame = {
  drawQuestions(settings: RoomSettings, rng: Rng): ServerQuestion[] {
    const groups = wordGroups();
    const questions: ServerQuestion[] = [];
    for (let i = 0; i < settings.questionCount; i++) {
      const syllable = generateSyllable(rng, groups);
      questions.push({
        view: { game: 'syllable', text: syllable.text },
        reveal: {
          game: 'syllable',
          analyses: syllable.analyses,
          mark: syllable.parts.mark,
        },
        isCorrect(answer: GameAnswer): boolean {
          if (answer.game !== 'syllable') return false;
          return checkAnswers(
            answer.answers,
            syllable.analyses,
            syllable.parts.mark,
            settings.answerMode,
          ).correct;
        },
      });
    }
    return questions;
  },

  parseAnswer(raw: unknown, settings: RoomSettings): GameAnswer | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const { game, answers } = raw as Record<string, unknown>;
    if (game !== 'syllable') return null;
    if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return null;

    const record = answers as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!STEP_SET.has(key)) return null;
    }

    const parsed: PlayerAnswers = {};
    for (const step of STEPS) {
      const value = record[step];
      if (value === undefined) continue;
      if (typeof value !== 'string' || !ALLOWED_VALUES[step].includes(value)) return null;
      (parsed as Record<Step, GameAnswers[Step]>)[step] = value as GameAnswers[Step];
    }

    if (!isComplete(parsed, settings.answerMode)) return null;
    return { game: 'syllable', answers: parsed };
  },
};
