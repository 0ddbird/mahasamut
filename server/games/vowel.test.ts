import { describe, expect, it } from 'vitest';
import { currentCard, newDeck, nextCard } from '../../src/games/shared/deck';
import { vowelChoices } from '../../src/games/vowel/choices';
import type { RoomSettings } from '../../src/multiplayer/settings';
import { seededRng } from '../../src/thai/generator/seeded-rng.test-utils';
import { VOWELS } from '../../src/thai/vowels';
import { VOWEL_IPA, vowelOnCarrier } from '../../src/thai/vowels/ipa';
import { vowelGame } from './vowel';

const SETTINGS: RoomSettings = {
  game: 'vowel',
  secondsPerQuestion: 15,
  questionCount: 5,
  answerMode: 'detailed',
  password: null,
};

describe('vowelGame', () => {
  it('draws vowels in deck order with four IPA choices', () => {
    const questions = vowelGame.drawQuestions(SETTINGS, seededRng(9));
    const rng = seededRng(9);
    let deck = newDeck(VOWELS, rng);

    expect(questions).toHaveLength(5);
    for (const question of questions) {
      const vowel = currentCard(deck);
      const choices = vowelChoices(vowel, rng);
      expect(question.view).toEqual({
        game: 'vowel',
        text: vowelOnCarrier(vowel),
        choices,
      });
      expect(question.reveal).toEqual({
        game: 'vowel',
        vowelId: vowel.id,
        expected: VOWEL_IPA[vowel.id],
      });
      deck = nextCard(deck, rng);
    }
  });

  it('grades the chosen IPA sound and parses known vowel sounds only', () => {
    const [question] = vowelGame.drawQuestions({ ...SETTINGS, questionCount: 1 }, seededRng(9));
    const expected = question.reveal.game === 'vowel' ? question.reveal.expected : 'a';
    const wrong = expected === 'a' ? 'iː' : 'a';

    expect(question.isCorrect({ game: 'vowel', sound: expected })).toBe(true);
    expect(question.isCorrect({ game: 'vowel', sound: wrong })).toBe(false);
    expect(question.isCorrect({ game: 'consonantClass', consonantClass: 'mid' })).toBe(false);

    expect(vowelGame.parseAnswer({ game: 'vowel', sound: 'a' }, SETTINGS)).toEqual({
      game: 'vowel',
      sound: 'a',
    });
    expect(vowelGame.parseAnswer({ game: 'vowel', sound: 'not-a-sound' }, SETTINGS)).toBeNull();
    expect(
      vowelGame.parseAnswer({ game: 'consonantClass', consonantClass: 'mid' }, SETTINGS),
    ).toBeNull();
    expect(vowelGame.parseAnswer(null, SETTINGS)).toBeNull();
  });
});
