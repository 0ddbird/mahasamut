/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VOWEL_IDS } from '../../thai/types';
import { vowel } from '../../thai/vowels';
import { vowelOnCarrier } from '../../thai/vowels/ipa';

// The script runs in plain Node, outside the app, so it keeps its own copy of
// the spellings: this test keeps that copy in step with the game.
const SCRIPT = readFileSync(
  new URL('../../../scripts/generate-vowel-sounds.mjs', import.meta.url),
  'utf8',
);
const SPELLINGS_BLOCK = SCRIPT.slice(
  SCRIPT.indexOf('const SPELLINGS = {'),
  SCRIPT.indexOf('};', SCRIPT.indexOf('const SPELLINGS = {')),
);
const SPELLINGS = new Map(
  [...SPELLINGS_BLOCK.matchAll(/^\s+(\w+): '([^']+)',$/gm)].map(([, id, spelling]) => [
    id,
    spelling,
  ]),
);

describe('scripts/generate-vowel-sounds.mjs', () => {
  it('records every vowel as the game writes it, on อ', () => {
    expect([...SPELLINGS.keys()].sort()).toEqual([...VOWEL_IDS].sort());
    for (const id of VOWEL_IDS) expect(SPELLINGS.get(id)).toBe(vowelOnCarrier(vowel(id)));
  });

  it('uses the voice and the wording chosen in the trials', () => {
    expect(SCRIPT).toContain("'th-TH-Chirp3-HD-Leda'");
    expect(SCRIPT).toContain('`สระ ${');
  });
});
