import { describe, expect, it } from 'vitest';
import { validSyllables } from '../../src/thai/generator/syllables';
import type { Syllable } from '../../src/thai/generator/syllables';
import {
  commonWordsByToneCase,
  RARE_CASE_WORDS,
  selectCandidates,
  toneCaseKey,
  toneCaseOf,
} from './candidates';
import { wordId } from './ids';
import { readSources } from './sources';
import type { Sources } from './sources';

const syllables = validSyllables();
const keyOf = (syllable: Syllable) => toneCaseKey(toneCaseOf(syllable));
const textsOf = (candidates: { text: string }[]) => candidates.map((c) => c.text);

/** Hand-made sources: only what is given exists. */
function sources(parts: { dictionary?: string[]; frequency?: Record<string, number> }): Sources {
  return {
    dictionary: new Set(parts.dictionary ?? []),
    frequency: new Map(Object.entries(parts.frequency ?? {})),
  };
}

/**
 * Sources where the tone case of `word` is well filled: RARE_CASE_WORDS other
 * spellings of that case are common dictionary words, so the case is not rare.
 */
function wellFilledAround(word: string, parts: Parameters<typeof sources>[0]): Sources {
  const key = keyOf(syllables.find((s) => s.text === word)!);
  const fillers = [
    ...new Set(syllables.filter((s) => keyOf(s) === key && s.text !== word).map((s) => s.text)),
  ].slice(0, RARE_CASE_WORDS);
  return sources({
    dictionary: [...fillers, ...(parts.dictionary ?? [])],
    frequency: { ...Object.fromEntries(fillers.map((f) => [f, 100])), ...parts.frequency },
  });
}

describe('wordId', () => {
  it('writes the code points in hexadecimal, joined by hyphens', () => {
    expect(wordId('ไม่')).toBe('0e44-0e21-0e48');
  });
});

describe('selectCandidates on small sources', () => {
  it('takes a common dictionary word of a well-filled case, and leaves out a less common one', () => {
    const common = wellFilledAround('มา', { dictionary: ['มา'], frequency: { มา: 100 } });
    const [candidate] = selectCandidates(common, syllables).filter((c) => c.text === 'มา');
    expect(candidate).toMatchObject({ text: 'มา', level: 1, source: 'dictionary', frequency: 100 });

    const uncommon = wellFilledAround('มา', { dictionary: ['มา'], frequency: { มา: 99 } });
    expect(textsOf(selectCandidates(uncommon, syllables))).not.toContain('มา');
  });

  it('takes every dictionary word of a rare case, even a word the corpus never saw', () => {
    const [candidate] = selectCandidates(sources({ dictionary: ['มา'] }), syllables);
    expect(candidate).toMatchObject({ text: 'มา', level: 1, source: 'dictionary', frequency: 0 });
  });

  it('takes a corpus-only word of a rare case from 5 occurrences, at level 2', () => {
    const [candidate] = selectCandidates(sources({ frequency: { มา: 5 } }), syllables);
    expect(candidate).toMatchObject({ text: 'มา', level: 2, source: 'corpus', frequency: 5 });

    expect(selectCandidates(sources({ frequency: { มา: 4 } }), syllables)).toEqual([]);
  });

  it('leaves out a corpus-only word of a well-filled case, whatever its frequency', () => {
    const filled = wellFilledAround('มา', { frequency: { มา: 1_000_000 } });
    expect(textsOf(selectCandidates(filled, syllables))).not.toContain('มา');
  });

  it('counts only common dictionary words towards a case', () => {
    // ตา is common; มา is in a case of its own and below 100; ปา is not in the dictionary.
    const counts = commonWordsByToneCase(
      sources({ dictionary: ['มา', 'ตา'], frequency: { มา: 99, ตา: 100, ปา: 100 } }),
      syllables,
    );
    expect(counts.get('mid live long none')).toBe(1);
    expect(counts.get('low live long none')).toBe(0);
  });

  it('never takes a spelling the generator does not write', () => {
    const irregular = sources({ dictionary: ['ก็'], frequency: { ก็: 1_000_000 } });
    expect(selectCandidates(irregular, syllables)).toEqual([]);
  });

  it('keeps a homograph as one candidate with both analyses', () => {
    const [candidate, ...others] = selectCandidates(sources({ dictionary: ['แขว'] }), syllables);
    expect(others).toEqual([]);
    expect(candidate?.text).toBe('แขว');
    expect(candidate?.analyses).toHaveLength(2);
  });

  it('orders by tone case key, then by frequency descending, then by text', () => {
    const picked = selectCandidates(
      sources({
        dictionary: ['กา', 'ตา', 'ปา', 'ขา', 'มา'],
        frequency: { กา: 10, ตา: 50, ปา: 50, ขา: 7, มา: 3 },
      }),
      syllables,
    );
    expect(picked.map((c) => [toneCaseKey(c.toneCase), c.text])).toEqual([
      ['high live long none', 'ขา'],
      ['low live long none', 'มา'],
      ['mid live long none', 'ตา'],
      ['mid live long none', 'ปา'],
      ['mid live long none', 'กา'],
    ]);
  });
});

describe('selectCandidates on the real sources', () => {
  const real = readSources(new URL('../../data/words/sources/', import.meta.url));
  const candidates = selectCandidates(real, syllables);

  it('finds 44 tone cases, 19 of them rare', () => {
    const counts = commonWordsByToneCase(real, syllables);
    expect(counts.size).toBe(44);
    expect([...counts.values()].filter((n) => n < RARE_CASE_WORDS)).toHaveLength(19);
  });

  it('has the expected number of candidates at each level', () => {
    const level1 = candidates.filter((c) => c.level === 1).length;
    const level2 = candidates.filter((c) => c.level === 2).length;
    // The selection is deterministic: these are the numbers measured on 2026-10-21.
    expect(level1).toBe(3366);
    expect(level2).toBe(375);
  });

  it('has no duplicate text, and an id for each', () => {
    expect(new Set(textsOf(candidates)).size).toBe(candidates.length);
    expect(candidates.every((c) => c.id === wordId(c.text))).toBe(true);
  });

  it('gives every level 1 homograph analyses that agree on the tone', () => {
    const homographs = candidates.filter((c) => c.level === 1 && c.analyses.length > 1);
    expect(homographs.length).toBeGreaterThan(0);
    for (const candidate of homographs) {
      expect(candidate.analyses.every((a) => a.tone === candidate.tone)).toBe(true);
    }
  });
});
