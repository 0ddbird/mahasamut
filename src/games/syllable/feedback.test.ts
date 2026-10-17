import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import { checkAnswers } from './check';
import { rowFeedback } from './feedback';

// เกร, a homograph: ก + เ- + ร (sonorant final) or the cluster กร + เ- (no final).
const KRE_WITH_FINAL: SyllableAnswers = {
  consonantClass: 'mid',
  vowelLength: 'long',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'mid',
};
const KRE_OPEN: SyllableAnswers = { ...KRE_WITH_FINAL, finalKind: 'none' };
const KRE = [KRE_WITH_FINAL, KRE_OPEN];

// ไม่: low class, ่ gives a falling tone.
const MAI: SyllableAnswers = {
  consonantClass: 'low',
  vowelLength: 'short',
  finalKind: 'sonorant',
  liveness: 'live',
  tone: 'falling',
};

describe('rowFeedback', () => {
  it('takes the choice, the closest analysis and every accepted value of the step', () => {
    const result = checkAnswers({ ...KRE_OPEN, toneMark: 'none', finalKind: 'stop' }, KRE, 'none');
    expect(rowFeedback('finalKind', result, KRE)).toEqual({
      chosen: 'stop',
      expected: 'sonorant',
      accepted: ['sonorant', 'none'],
    });
  });

  it('lists an accepted value once, when the analyses agree on the step', () => {
    const result = checkAnswers({ ...KRE_OPEN, toneMark: 'none' }, KRE, 'none');
    expect(rowFeedback('tone', result, KRE)?.accepted).toEqual(['mid']);
  });

  it('accepts the mark of the syllable only', () => {
    const result = checkAnswers({ ...MAI, toneMark: 'thoo' }, [MAI], 'eek');
    expect(rowFeedback('toneMark', result, [MAI])).toEqual({
      chosen: 'thoo',
      expected: 'eek',
      accepted: ['eek'],
    });
  });

  it('gives no feedback for a step that is not graded', () => {
    const result = checkAnswers({ ...MAI, toneMark: 'eek' }, [MAI], 'eek');
    expect(rowFeedback('vowelLength', result, [MAI])).toBeUndefined();
  });
});
