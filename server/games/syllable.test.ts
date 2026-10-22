import { describe, expect, it } from 'vitest';
import { checkAnswers } from '../../src/games/syllable/check';
import type { PlayerAnswers } from '../../src/games/syllable/check';
import type { RoomSettings } from '../../src/multiplayer/settings';
import { generateSyllable } from '../../src/thai/generator';
import { seededRng } from '../../src/thai/generator/seeded-rng.test-utils';
import { wordGroups } from '../../src/thai/words';
import { syllableGame } from './syllable';

const DETAILED: RoomSettings = {
  game: 'syllable',
  secondsPerQuestion: 15,
  questionCount: 10,
  answerMode: 'detailed',
  password: null,
};

const TONE_ONLY: RoomSettings = {
  ...DETAILED,
  answerMode: 'toneOnly',
};

const rightAnswersFor = (seed: number): PlayerAnswers => {
  const syllable = generateSyllable(seededRng(seed), wordGroups());
  return { ...syllable.analyses[0], toneMark: syllable.parts.mark };
};

describe('syllableGame', () => {
  it('draws real words from the pool, showing only their text', () => {
    const questions = syllableGame.drawQuestions(DETAILED, seededRng(3));
    const expectedRng = seededRng(3);

    expect(questions).toHaveLength(10);
    for (const question of questions) {
      const syllable = generateSyllable(expectedRng, wordGroups());
      expect(question.view).toEqual({ game: 'syllable', text: syllable.text });
    }
  });

  it('reveals every analysis and the mark', () => {
    // Seed 1 draws up to a homograph in the word pool if we search for one.
    let seed = 1;
    while (generateSyllable(seededRng(seed), wordGroups()).analyses.length < 2) {
      seed++;
    }
    const [question] = syllableGame.drawQuestions(
      { ...DETAILED, questionCount: 1 },
      seededRng(seed),
    );
    expect(question.reveal.game).toBe('syllable');
    if (question.reveal.game === 'syllable') {
      expect(question.reveal.analyses).toHaveLength(2);
    }
  });

  it('grades with checkAnswers in detailed mode and in tone-only mode', () => {
    const [detailedQuestion] = syllableGame.drawQuestions(
      { ...DETAILED, questionCount: 1 },
      seededRng(4),
    );
    const full = rightAnswersFor(4);
    expect(detailedQuestion.isCorrect({ game: 'syllable', answers: full })).toBe(true);
    expect(
      detailedQuestion.isCorrect({
        game: 'syllable',
        answers: { ...full, tone: full.tone === 'mid' ? 'low' : 'mid' },
      }),
    ).toBe(false);
    expect(detailedQuestion.isCorrect({ game: 'consonantClass', consonantClass: 'mid' })).toBe(
      false,
    );

    const [toneOnlyQuestion] = syllableGame.drawQuestions(
      { ...TONE_ONLY, questionCount: 1 },
      seededRng(4),
    );
    expect(toneOnlyQuestion.isCorrect({ game: 'syllable', answers: { tone: full.tone } })).toBe(
      true,
    );
    expect(
      toneOnlyQuestion.isCorrect({
        game: 'syllable',
        answers: { tone: full.tone === 'mid' ? 'low' : 'mid' },
      }),
    ).toBe(false);
  });

  it('parses a complete answer for the room answerMode and nothing else', () => {
    const unmarked: PlayerAnswers = {
      consonantClass: 'mid',
      toneMark: 'none',
      vowelLength: 'long',
      finalKind: 'none',
      liveness: 'live',
      tone: 'mid',
    };
    expect(syllableGame.parseAnswer({ game: 'syllable', answers: unmarked }, DETAILED)).toEqual({
      game: 'syllable',
      answers: unmarked,
    });

    const marked: PlayerAnswers = {
      consonantClass: 'mid',
      toneMark: 'eek',
      tone: 'low',
    };
    expect(syllableGame.parseAnswer({ game: 'syllable', answers: marked }, DETAILED)).toEqual({
      game: 'syllable',
      answers: marked,
    });

    expect(
      syllableGame.parseAnswer({ game: 'syllable', answers: { tone: 'mid' } }, DETAILED),
    ).toBeNull();
    expect(
      syllableGame.parseAnswer({ game: 'syllable', answers: { tone: 'mid' } }, TONE_ONLY),
    ).toEqual({
      game: 'syllable',
      answers: { tone: 'mid' },
    });

    expect(
      syllableGame.parseAnswer(
        { game: 'syllable', answers: { ...unmarked, tone: 'very-high' } },
        DETAILED,
      ),
    ).toBeNull();
    expect(
      syllableGame.parseAnswer(
        { game: 'syllable', answers: { ...unmarked, extra: 'x' } },
        DETAILED,
      ),
    ).toBeNull();
    expect(
      syllableGame.parseAnswer({ game: 'consonantClass', consonantClass: 'mid' }, DETAILED),
    ).toBeNull();
    expect(syllableGame.parseAnswer(null, DETAILED)).toBeNull();
    expect(syllableGame.parseAnswer('x', DETAILED)).toBeNull();
    expect(checkAnswers).toBeDefined();
  });
});
