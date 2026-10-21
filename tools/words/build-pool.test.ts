import { describe, expect, it } from 'vitest';
import type { Candidate } from './candidates';
import { poolTexts } from './build-pool';
import type { Review } from './review-state';

const candidate = (text: string, level: 1 | 2 = 1) => ({ text, level }) as Candidate;

const decidedAt = '2026-10-21T10:00:00.000Z';

describe('poolTexts', () => {
  it('keeps every level 1 text when nothing was reviewed', () => {
    expect(poolTexts([candidate('กา'), candidate('ขา')], {})).toEqual(['กา', 'ขา']);
  });

  it('drops the removed words and keeps the todo, validated and none ones', () => {
    const review: Review = {
      ขา: { decision: 'take', take: 2, note: '', decidedAt },
      คา: { decision: 'none', note: '', decidedAt },
      งา: { decision: 'remove', note: 'not a word', decidedAt },
    };
    const candidates = ['กา', 'ขา', 'คา', 'งา'].map((text) => candidate(text));
    expect(poolTexts(candidates, review)).toEqual(['กา', 'ขา', 'คา']);
  });

  it('leaves out the level 2 candidates', () => {
    expect(poolTexts([candidate('กา'), candidate('ตั๊ว', 2)], {})).toEqual(['กา']);
  });

  it('sorts the texts, whatever the order of the candidates', () => {
    const candidates = ['ขา', 'กา', 'คา'].map((text) => candidate(text));
    expect(poolTexts(candidates, {})).toEqual(['กา', 'ขา', 'คา']);
  });
});
