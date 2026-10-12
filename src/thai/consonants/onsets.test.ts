import { describe, expect, it } from 'vitest';
import { CONSONANTS, consonant } from './index';
import { ONSETS, onset } from './onsets';
import type { ConsonantClass, OnsetKind } from '../types';

const CLUSTERS: [string, ConsonantClass][] = [
  ['กร', 'mid'],
  ['กล', 'mid'],
  ['กว', 'mid'],
  ['ขร', 'high'],
  ['ขล', 'high'],
  ['ขว', 'high'],
  ['คร', 'low'],
  ['คล', 'low'],
  ['คว', 'low'],
  ['ตร', 'mid'],
  ['ปร', 'mid'],
  ['ปล', 'mid'],
  ['พร', 'low'],
  ['พล', 'low'],
];

const LEADING_HO = ['หง', 'หญ', 'หน', 'หม', 'หย', 'หร', 'หล', 'หว'];

const textsOf = (kind: OnsetKind) => ONSETS.filter((o) => o.kind === kind).map((o) => o.text);

describe('onsets', () => {
  it('contains 42 single consonants, 14 clusters, 8 leading ห and 1 leading อ', () => {
    expect(textsOf('single')).toHaveLength(42);
    expect(textsOf('cluster')).toHaveLength(14);
    expect(textsOf('leadingHo')).toHaveLength(8);
    expect(textsOf('leadingO')).toHaveLength(1);
    expect(ONSETS).toHaveLength(65);
  });

  it('has no duplicate onset', () => {
    expect(new Set(ONSETS.map((o) => o.text)).size).toBe(ONSETS.length);
  });

  describe('single consonants', () => {
    it.each(CONSONANTS.map((c) => [c.char, c.consonantClass]))(
      '%s keeps its own class (%s)',
      (char, cls) => {
        expect(onset(char)).toEqual({ text: char, kind: 'single', consonantClass: cls });
      },
    );
  });

  describe('clusters', () => {
    it('lists exactly the supported clusters', () => {
      expect(textsOf('cluster')).toEqual(CLUSTERS.map(([text]) => text));
    });

    it.each(CLUSTERS)('%s takes the class of its first consonant (%s)', (text, cls) => {
      expect(onset(text)).toEqual({ text, kind: 'cluster', consonantClass: cls });
      expect(consonant(text[0]).consonantClass).toBe(cls);
    });
  });

  describe('leading ห (ห นำ)', () => {
    it('lists ห before each low sonorant: ง ญ น ม ย ร ล ว', () => {
      expect(textsOf('leadingHo')).toEqual(LEADING_HO);
    });

    it.each(LEADING_HO)('%s is high class', (text) => {
      expect(onset(text)).toEqual({ text, kind: 'leadingHo', consonantClass: 'high' });
      expect(consonant(text[1]).consonantClass).toBe('low');
    });
  });

  describe('leading อ (อ นำ)', () => {
    it('makes ย mid class', () => {
      expect(onset('อย')).toEqual({ text: 'อย', kind: 'leadingO', consonantClass: 'mid' });
    });
  });

  it.each(['ทร', 'จร', 'ซร', 'ศร', 'สร', 'ฟร', 'บร', 'ดร', 'หณ', 'อน', 'ฃ', 'x', ''])(
    'rejects %j, which is not a supported onset',
    (text) => {
      expect(() => onset(text)).toThrow(/Unknown onset/);
    },
  );
});
