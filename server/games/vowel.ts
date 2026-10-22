/**
 * Server adapter for Vowel sounds (`vowel`): draws vowels from a shuffled deck
 * along with four IPA choices so every player in the room sees the same options.
 */
import { currentCard, newDeck, nextCard } from '../../src/games/shared/deck';
import { vowelChoices } from '../../src/games/vowel/choices';
import type { GameAnswer } from '../../src/multiplayer/protocol';
import type { RoomSettings } from '../../src/multiplayer/settings';
import type { Rng } from '../../src/thai/generator';
import { VOWELS } from '../../src/thai/vowels';
import { VOWEL_IPA, vowelOnCarrier } from '../../src/thai/vowels/ipa';
import type { ServerGame, ServerQuestion } from './types';

const KNOWN_VOWEL_SOUNDS: ReadonlySet<string> = new Set(Object.values(VOWEL_IPA));

export const vowelGame: ServerGame = {
  drawQuestions(settings: RoomSettings, rng: Rng): ServerQuestion[] {
    let deck = newDeck(VOWELS, rng);
    const questions: ServerQuestion[] = [];
    for (let i = 0; i < settings.questionCount; i++) {
      const vowel = currentCard(deck);
      const choices = vowelChoices(vowel, rng);
      const expected = VOWEL_IPA[vowel.id];
      questions.push({
        view: { game: 'vowel', text: vowelOnCarrier(vowel), choices },
        reveal: { game: 'vowel', vowelId: vowel.id, expected },
        isCorrect(answer: GameAnswer): boolean {
          return answer.game === 'vowel' && answer.sound === expected;
        },
      });
      deck = nextCard(deck, rng);
    }
    return questions;
  },

  parseAnswer(raw: unknown): GameAnswer | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const { game, sound } = raw as Record<string, unknown>;
    if (game !== 'vowel') return null;
    if (typeof sound !== 'string' || !KNOWN_VOWEL_SOUNDS.has(sound)) return null;
    return { game: 'vowel', sound };
  },
};
