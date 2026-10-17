import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import { checkAnswers, gradedSteps, isComplete } from './check';
import type { GameAnswers } from './check';

// ไม่: low class, short vowel, sonorant final (ไ ends in /y/), live, ่ gives a falling tone.
const MAI: SyllableAnswers = {
  consonantClass: 'low',
  vowelLength: 'short',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'falling',
};
const MAI_GIVEN: GameAnswers = { ...MAI, toneMark: 'eek' };

// เกร, a homograph with no tone mark: ก + เ- + ร (sonorant final), or the cluster กร + เ-.
const KRE_WITH_FINAL: SyllableAnswers = {
  consonantClass: 'mid',
  vowelLength: 'long',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'mid',
};
const KRE_OPEN: SyllableAnswers = { ...KRE_WITH_FINAL, finalKind: 'none' };
const KRE = [KRE_WITH_FINAL, KRE_OPEN];

describe('gradedSteps', () => {
  it('grades the class, the mark and the tone only, when a tone mark is written', () => {
    expect(gradedSteps('eek')).toEqual(['consonantClass', 'toneMark', 'tone']);
  });

  it('grades all six steps when no tone mark is written', () => {
    expect(gradedSteps('none')).toEqual([
      'consonantClass',
      'toneMark',
      'vowelLength',
      'finalKind',
      'liveness',
      'tone',
    ]);
  });
});

describe('checkAnswers', () => {
  describe('a syllable with a tone mark', () => {
    it('is correct with the right class, mark and tone, the other steps unanswered', () => {
      const result = checkAnswers(
        { consonantClass: 'low', toneMark: 'eek', tone: 'falling' },
        [MAI],
        'eek',
      );
      expect(result.correct).toBe(true);
      expect(result.graded).toEqual(['consonantClass', 'toneMark', 'tone']);
    });

    it('ignores the other steps, even answered wrong', () => {
      const result = checkAnswers({ ...MAI_GIVEN, vowelLength: 'long' }, [MAI], 'eek');
      expect(result.correct).toBe(true);
      expect(result.steps.vowelLength).toBeUndefined();
    });

    it('is wrong with the wrong mark', () => {
      const result = checkAnswers({ ...MAI_GIVEN, toneMark: 'thoo' }, [MAI], 'eek');
      expect(result.correct).toBe(false);
      expect(result.steps.toneMark).toBe(false);
    });

    it('expects the mark of the syllable', () => {
      expect(checkAnswers(MAI_GIVEN, [MAI], 'eek').expected).toEqual(MAI_GIVEN);
    });
  });

  describe('a syllable with no tone mark', () => {
    it('is correct when all six steps are right', () => {
      const result = checkAnswers({ ...KRE_WITH_FINAL, toneMark: 'none' }, KRE, 'none');
      expect(result.correct).toBe(true);
      expect(result.graded).toHaveLength(6);
    });

    it('tells which step is wrong', () => {
      const result = checkAnswers(
        { ...KRE_WITH_FINAL, toneMark: 'none', tone: 'high' },
        KRE,
        'none',
      );
      expect(result.correct).toBe(false);
      expect(result.steps).toEqual({
        consonantClass: true,
        toneMark: true,
        vowelLength: true,
        finalKind: true,
        liveness: true,
        tone: false,
      });
    });

    it('counts the steps skipped after choosing a mark as wrong', () => {
      // The player saw a mark that is not there, so left the three middle steps out.
      const result = checkAnswers(
        { consonantClass: 'mid', toneMark: 'eek', tone: 'mid' },
        KRE,
        'none',
      );
      expect(result.correct).toBe(false);
      expect(result.steps.toneMark).toBe(false);
      expect(result.steps.vowelLength).toBe(false);
    });
  });

  describe('a homograph', () => {
    it.each([
      ['with a final', KRE_WITH_FINAL],
      ['without a final', KRE_OPEN],
    ])('accepts either reading: here, %s', (_reading, analysis) => {
      const given: GameAnswers = { ...analysis, toneMark: 'none' };
      const result = checkAnswers(given, KRE, 'none');
      expect(result.correct).toBe(true);
      expect(result.expected).toEqual(given);
    });

    it('compares with the reading closest to the answers', () => {
      // Right final for the open reading, but a wrong tone: 5 steps right against 4.
      const result = checkAnswers({ ...KRE_OPEN, toneMark: 'none', tone: 'rising' }, KRE, 'none');
      expect(result.expected.finalKind).toBe('none');
      expect(result.steps.finalKind).toBe(true);
    });

    it('compares with the first reading when both are as close', () => {
      const result = checkAnswers(
        { ...KRE_WITH_FINAL, toneMark: 'none', finalKind: 'stop' },
        KRE,
        'none',
      );
      expect(result.expected.finalKind).toBe('sonorant');
    });
  });

  it('keeps the answers it checked', () => {
    const given: GameAnswers = { ...MAI_GIVEN, tone: 'high' };
    expect(checkAnswers(given, [MAI], 'eek').given).toEqual(given);
  });

  it('throws when the syllable has no analysis', () => {
    expect(() => checkAnswers(MAI_GIVEN, [], 'eek')).toThrow(/no analysis/);
  });
});

describe('isComplete', () => {
  it('is false while the mark is not chosen', () => {
    expect(isComplete({ ...MAI })).toBe(false);
  });

  it('needs the class and the tone only, once a mark is chosen', () => {
    expect(isComplete({ consonantClass: 'low', toneMark: 'eek' })).toBe(false);
    expect(isComplete({ consonantClass: 'low', toneMark: 'eek', tone: 'falling' })).toBe(true);
  });

  it('needs all six steps with no mark', () => {
    const { tone: _tone, ...allButTone } = KRE_WITH_FINAL;
    expect(isComplete({ ...allButTone, toneMark: 'none' })).toBe(false);
    expect(isComplete({ ...KRE_WITH_FINAL, toneMark: 'none' })).toBe(true);
  });
});

describe('in tone-only mode', () => {
  it('grades the tone only, with or without a mark', () => {
    expect(gradedSteps('eek', 'toneOnly')).toEqual(['tone']);
    expect(gradedSteps('none', 'toneOnly')).toEqual(['tone']);
  });

  it('is complete once a tone is chosen', () => {
    expect(isComplete({ tone: 'falling' }, 'toneOnly')).toBe(true);
    expect(isComplete({}, 'toneOnly')).toBe(false);
    expect(isComplete({ tone: 'falling' })).toBe(false);
  });

  it('checks the tone only', () => {
    const right = checkAnswers({ tone: 'falling' }, [MAI], 'eek', 'toneOnly');
    expect(right.correct).toBe(true);
    expect(right.graded).toEqual(['tone']);
    expect(checkAnswers({ tone: 'high' }, [MAI], 'eek', 'toneOnly').correct).toBe(false);
  });

  it('accepts the tone of a homograph whatever the reading', () => {
    expect(checkAnswers({ tone: 'mid' }, KRE, 'none', 'toneOnly').correct).toBe(true);
  });
});
