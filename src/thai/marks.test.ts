import { describe, expect, it } from 'vitest';
import { TONE_MARK_CHAR } from './marks';

/** Code points of a string, so tests check exact characters rather than look-alike glyphs. */
const codePoints = (text: string) => [...text].map((char) => char.codePointAt(0));

describe('tone marks', () => {
  it('maps each tone mark to its Unicode character', () => {
    expect(codePoints(TONE_MARK_CHAR.none)).toEqual([]);
    expect(codePoints(TONE_MARK_CHAR.eek)).toEqual([0x0e48]);
    expect(codePoints(TONE_MARK_CHAR.thoo)).toEqual([0x0e49]);
    expect(codePoints(TONE_MARK_CHAR.trii)).toEqual([0x0e4a]);
    expect(codePoints(TONE_MARK_CHAR.djattawaa)).toEqual([0x0e4b]);
  });
});
