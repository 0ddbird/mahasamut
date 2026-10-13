import { describe, expect, it } from 'vitest';
import type { SyllableAnswers } from '../../thai/answers';
import type { FinalKind, Tone } from '../../thai/types';
import { checkAnswers } from './check';
import { optionFeedback, rowFeedback } from './feedback';
import type { RowFeedback } from './feedback';

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

const FINALS: FinalKind[] = ['none', 'sonorant', 'stop'];

/** The feedback of each final option, in display order. */
const finalOptions = (row: RowFeedback<FinalKind>) =>
  FINALS.map((value) => optionFeedback(value, row));

describe('optionFeedback', () => {
  it('marks a right choice as right, and leaves the other options alone', () => {
    const row: RowFeedback<Tone> = { chosen: 'mid', expected: 'mid', accepted: ['mid'] };
    expect(optionFeedback('mid', row)).toBe('right');
    expect(optionFeedback('low', row)).toBe('none');
  });

  it('marks a wrong choice as wrong, and points at the right answer', () => {
    const row: RowFeedback<Tone> = { chosen: 'high', expected: 'mid', accepted: ['mid'] };
    expect(optionFeedback('high', row)).toBe('wrong');
    expect(optionFeedback('mid', row)).toBe('expected');
    expect(optionFeedback('low', row)).toBe('none');
  });

  it('for a homograph chosen right, shows the other reading as also accepted', () => {
    const row: RowFeedback<FinalKind> = {
      chosen: 'none',
      expected: 'none',
      accepted: ['sonorant', 'none'],
    };
    expect(finalOptions(row)).toEqual(['right', 'alsoAccepted', 'none']);
  });

  it('for a homograph chosen wrong, shows the closest reading and the other one', () => {
    const row: RowFeedback<FinalKind> = {
      chosen: 'stop',
      expected: 'sonorant',
      accepted: ['sonorant', 'none'],
    };
    expect(finalOptions(row)).toEqual(['alsoAccepted', 'expected', 'wrong']);
  });
});

describe('rowFeedback', () => {
  it('takes the choice, the closest analysis and every accepted value of the step', () => {
    const result = checkAnswers({ ...KRE_OPEN, finalKind: 'stop' }, KRE);
    expect(rowFeedback('finalKind', result, KRE)).toEqual({
      chosen: 'stop',
      expected: 'sonorant',
      accepted: ['sonorant', 'none'],
    });
  });

  it('lists an accepted value once, when the analyses agree on the step', () => {
    const result = checkAnswers(KRE_OPEN, KRE);
    expect(rowFeedback('tone', result, KRE).accepted).toEqual(['mid']);
  });
});
