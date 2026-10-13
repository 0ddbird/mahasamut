import { describe, expect, it } from 'vitest';
import type { FinalKind, Tone } from '../../thai/types';
import { optionFeedback } from './feedback';
import type { RowFeedback } from './feedback';

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

  it('points at the right answer of a step left unanswered', () => {
    const row: RowFeedback<Tone> = { expected: 'mid', accepted: ['mid'] };
    expect(optionFeedback('mid', row)).toBe('expected');
    expect(optionFeedback('low', row)).toBe('none');
  });

  it('with two accepted answers chosen right, shows the other as also accepted', () => {
    const row: RowFeedback<FinalKind> = {
      chosen: 'none',
      expected: 'none',
      accepted: ['sonorant', 'none'],
    };
    expect(finalOptions(row)).toEqual(['right', 'alsoAccepted', 'none']);
  });

  it('with two accepted answers chosen wrong, shows the expected one and the other', () => {
    const row: RowFeedback<FinalKind> = {
      chosen: 'stop',
      expected: 'sonorant',
      accepted: ['sonorant', 'none'],
    };
    expect(finalOptions(row)).toEqual(['alsoAccepted', 'expected', 'wrong']);
  });
});
