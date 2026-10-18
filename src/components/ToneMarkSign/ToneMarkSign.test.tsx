import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MARKS_BOTTOM, MARKS_TOP, TONE_MARK_OUTLINES } from './outlines';
import type { WrittenToneMark } from './outlines';
import { ToneMarkSign } from './ToneMarkSign';

const MARKS = Object.keys(TONE_MARK_OUTLINES) as WrittenToneMark[];

/** The viewBox of the drawing of `mark`, as numbers: x, y, width, height. */
const viewBoxOf = (mark: WrittenToneMark) => {
  const { container } = render(<ToneMarkSign mark={mark} />);
  const svg = container.querySelector('svg');
  return { svg, box: (svg?.getAttribute('viewBox') ?? '').split(' ').map(Number) };
};

describe('ToneMarkSign', () => {
  it('draws each of the four marks from its outline, hidden from screen readers', () => {
    expect(MARKS).toEqual(['eek', 'thoo', 'trii', 'djattawaa']);
    for (const mark of MARKS) {
      const { svg } = viewBoxOf(mark);
      expect(svg?.getAttribute('aria-hidden'), mark).toBe('true');
      expect(svg?.querySelector('path')?.getAttribute('d'), mark).toBe(TONE_MARK_OUTLINES[mark].d);
    }
  });

  it('gives the four marks the same height, so that they line up in a row', () => {
    const heights = MARKS.map((mark) => viewBoxOf(mark).box[3]);
    expect(new Set(heights)).toEqual(new Set([heights[0]]));
    expect(heights[0]).toBeGreaterThanOrEqual(MARKS_TOP - MARKS_BOTTOM);
  });

  it('fits the width of each mark', () => {
    const width = (mark: WrittenToneMark) => viewBoxOf(mark).box[2] ?? 0;
    expect(width('thoo')).toBeGreaterThan(width('eek'));
    for (const mark of MARKS) {
      const { minX, maxX } = TONE_MARK_OUTLINES[mark];
      expect(width(mark), mark).toBeGreaterThanOrEqual(maxX - minX);
    }
  });
});
