/**
 * Maps the rounds of a finished room to the lines of the recap, so that the
 * final screen lists them the way the solo results do.
 */
import { consonantClassEntry, syllableEntry, vowelEntry } from '../games/shared/recap';
import type { RecapEntry, RecapResult } from '../games/shared/recap';
import type { RecapRoundView } from './protocol';

/**
 * The line of one round. `soundOf` finds the recording of a word, if it has
 * one: the server does not send it, as the client already knows the words.
 */
export function roundEntry(
  round: RecapRoundView,
  soundOf: (text: string) => string | null,
): RecapEntry {
  const { question, reveal, answer } = round;
  const result: RecapResult = answer === null ? 'timeUp' : round.correct ? 'right' : 'wrong';

  switch (reveal.game) {
    case 'vowel':
      return vowelEntry(
        reveal.vowelId,
        question.text,
        answer?.game === 'vowel' ? answer.sound : null,
        result,
      );
    case 'consonantClass':
      return consonantClassEntry(
        question.text,
        reveal.consonantClass,
        answer?.game === 'consonantClass' ? answer.consonantClass : null,
        result,
      );
    case 'syllable':
      return syllableEntry(
        question.text,
        reveal.analyses[0].tone,
        answer?.game === 'syllable' ? (answer.answers.tone ?? null) : null,
        result,
        soundOf(question.text),
      );
  }
}
