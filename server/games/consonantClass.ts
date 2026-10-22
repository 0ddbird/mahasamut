/**
 * Server adapter for Consonant classes (`consonantClass`): draws consonants
 * from a shuffled deck and grades the chosen class.
 */
import { currentCard, newDeck, nextCard } from '../../src/games/shared/deck';
import type { GameAnswer } from '../../src/multiplayer/protocol';
import type { RoomSettings } from '../../src/multiplayer/settings';
import { CONSONANTS } from '../../src/thai/consonants';
import type { Rng } from '../../src/thai/generator';
import { CONSONANT_CLASSES } from '../../src/thai/types';
import type { ConsonantClass } from '../../src/thai/types';
import type { ServerGame, ServerQuestion } from './types';

export const consonantClassGame: ServerGame = {
  drawQuestions(settings: RoomSettings, rng: Rng): ServerQuestion[] {
    let deck = newDeck(CONSONANTS, rng);
    const questions: ServerQuestion[] = [];
    for (let i = 0; i < settings.questionCount; i++) {
      const consonant = currentCard(deck);
      questions.push({
        view: { game: 'consonantClass', text: consonant.char },
        reveal: { game: 'consonantClass', consonantClass: consonant.consonantClass },
        isCorrect(answer: GameAnswer): boolean {
          return (
            answer.game === 'consonantClass' && answer.consonantClass === consonant.consonantClass
          );
        },
      });
      deck = nextCard(deck, rng);
    }
    return questions;
  },

  parseAnswer(raw: unknown): GameAnswer | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const { game, consonantClass } = raw as Record<string, unknown>;
    if (game !== 'consonantClass') return null;
    if (!CONSONANT_CLASSES.includes(consonantClass as ConsonantClass)) return null;
    return { game: 'consonantClass', consonantClass: consonantClass as ConsonantClass };
  },
};
