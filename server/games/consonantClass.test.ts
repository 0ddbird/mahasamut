import { describe, expect, it } from 'vitest';
import { currentCard, newDeck, nextCard } from '../../src/games/shared/deck';
import type { RoomSettings } from '../../src/multiplayer/settings';
import { CONSONANTS } from '../../src/thai/consonants';
import { seededRng } from '../../src/thai/generator/seeded-rng.test-utils';
import { consonantClassGame } from './consonantClass';

const SETTINGS: RoomSettings = {
  game: 'consonantClass',
  secondsPerQuestion: 15,
  questionCount: 5,
  answerMode: 'detailed',
  password: null,
};

describe('consonantClassGame', () => {
  it('draws consonants in deck order', () => {
    const questions = consonantClassGame.drawQuestions(SETTINGS, seededRng(7));
    const rng = seededRng(7);
    let deck = newDeck(CONSONANTS, rng);

    expect(questions).toHaveLength(5);
    for (const question of questions) {
      const consonant = currentCard(deck);
      expect(question.view).toEqual({ game: 'consonantClass', text: consonant.char });
      expect(question.reveal).toEqual({
        game: 'consonantClass',
        consonantClass: consonant.consonantClass,
      });
      deck = nextCard(deck, rng);
    }
  });

  it('draws past one deck without repeating a card twice in a row', () => {
    const questions = consonantClassGame.drawQuestions(
      { ...SETTINGS, questionCount: 50 },
      seededRng(7),
    );
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i].view.text).not.toBe(questions[i - 1].view.text);
    }
  });

  it('grades the class and parses a valid answer only', () => {
    const [question] = consonantClassGame.drawQuestions(
      { ...SETTINGS, questionCount: 1 },
      seededRng(7),
    );
    const expected =
      question.reveal.game === 'consonantClass' ? question.reveal.consonantClass : 'mid';
    const wrong = expected === 'mid' ? 'high' : 'mid';

    expect(question.isCorrect({ game: 'consonantClass', consonantClass: expected })).toBe(true);
    expect(question.isCorrect({ game: 'consonantClass', consonantClass: wrong })).toBe(false);
    expect(question.isCorrect({ game: 'vowel', sound: 'a' })).toBe(false);

    expect(
      consonantClassGame.parseAnswer({ game: 'consonantClass', consonantClass: 'high' }, SETTINGS),
    ).toEqual({
      game: 'consonantClass',
      consonantClass: 'high',
    });
    expect(
      consonantClassGame.parseAnswer({ game: 'consonantClass', consonantClass: 'super' }, SETTINGS),
    ).toBeNull();
    expect(consonantClassGame.parseAnswer({ game: 'vowel', sound: 'a' }, SETTINGS)).toBeNull();
    expect(consonantClassGame.parseAnswer(null, SETTINGS)).toBeNull();
  });
});
