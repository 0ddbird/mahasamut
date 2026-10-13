import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import { checkAnswers, isComplete } from './check';

// ไม่: low class, short vowel, sonorant final (ไ ends in /y/), live, falling tone.
const MAI: SyllableAnswers = {
  consonantClass: 'low',
  vowelLength: 'short',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'falling',
};

// เกร, a homograph: ก + เ- + ร (sonorant final) or the cluster กร + เ- (no final).
const KRE_WITH_FINAL: SyllableAnswers = {
  consonantClass: 'mid',
  vowelLength: 'long',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'mid',
};
const KRE_OPEN: SyllableAnswers = { ...KRE_WITH_FINAL, finalKind: 'none' };

describe('checkAnswers', () => {
  it('is correct when every step is right', () => {
    const result = checkAnswers(MAI, [MAI]);

    expect(result.correct).toBe(true);
    expect(Object.values(result.steps)).toEqual([true, true, true, true, true]);
    expect(result.expected).toEqual(MAI);
  });

  it('is wrong when one step is wrong, and tells which one', () => {
    const result = checkAnswers({ ...MAI, tone: 'high' }, [MAI]);

    expect(result.correct).toBe(false);
    expect(result.steps).toEqual({
      consonantClass: true,
      vowelLength: true,
      finalKind: true,
      liveness: true,
      tone: false,
    });
    expect(result.expected).toEqual(MAI);
  });

  it.each([
    ['with a final', KRE_WITH_FINAL],
    ['without a final', KRE_OPEN],
  ])('accepts either reading of a homograph: here, %s', (_reading, given) => {
    const result = checkAnswers(given, [KRE_WITH_FINAL, KRE_OPEN]);

    expect(result.correct).toBe(true);
    expect(result.expected).toEqual(given);
  });

  it('compares with the reading closest to the answers', () => {
    // Right final for the open reading, but a wrong tone: 4 steps right against 3.
    const given: SyllableAnswers = { ...KRE_OPEN, tone: 'rising' };
    const result = checkAnswers(given, [KRE_WITH_FINAL, KRE_OPEN]);

    expect(result.correct).toBe(false);
    expect(result.expected).toEqual(KRE_OPEN);
    expect(result.steps.finalKind).toBe(true);
    expect(result.steps.tone).toBe(false);
  });

  it('compares with the first reading when both are as close', () => {
    const given: SyllableAnswers = { ...KRE_WITH_FINAL, finalKind: 'stop' };
    const result = checkAnswers(given, [KRE_WITH_FINAL, KRE_OPEN]);

    expect(result.correct).toBe(false);
    expect(result.expected).toEqual(KRE_WITH_FINAL);
    expect(result.steps.finalKind).toBe(false);
  });

  it('throws when the syllable has no analysis', () => {
    expect(() => checkAnswers(MAI, [])).toThrow(/no analysis/);
  });
});

describe('isComplete', () => {
  it('is false while a step has no answer', () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete({ consonantClass: 'low', vowelLength: 'short', finalKind: 'none' })).toBe(
      false,
    );
  });

  it('is true once every step has an answer', () => {
    expect(isComplete({ ...MAI })).toBe(true);
  });
});
