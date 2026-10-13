import { describe, expect, it } from 'vitest';
import { onset } from '../consonants/onsets';
import { render } from '../render';
import { vowel } from '../vowels';
import { syllableAnswers } from './index';
import type {
  ConsonantClass,
  FinalKind,
  Liveness,
  Tone,
  ToneMark,
  VowelId,
  VowelLength,
} from '../types';

type Answers = [ConsonantClass, VowelLength, FinalKind, Liveness, Tone];

// Word, onset, vowel, final, mark, then the answers: class, length, final, syllable, tone.
// @see examples.md
const EXAMPLES: [string, string, VowelId, string | null, ToneMark, Answers][] = [
  ['กะ', 'ก', 'a', null, 'none', ['mid', 'short', 'none', 'dead', 'low']],
  ['สุข', 'ส', 'u', 'ข', 'none', ['high', 'short', 'stop', 'dead', 'low']],
  ['มาก', 'ม', 'aa', 'ก', 'none', ['low', 'long', 'stop', 'dead', 'falling']],
  ['คะ', 'ค', 'a', null, 'none', ['low', 'short', 'none', 'dead', 'high']],
  ['ขาว', 'ข', 'aa', 'ว', 'none', ['high', 'long', 'sonorant', 'live', 'rising']],
  ['เดิน', 'ด', 'oee', 'น', 'none', ['mid', 'long', 'sonorant', 'live', 'mid']],
  ['คน', 'ค', 'o', 'น', 'none', ['low', 'short', 'sonorant', 'live', 'mid']],
  ['หมา', 'หม', 'aa', null, 'none', ['high', 'long', 'none', 'live', 'rising']],
  ['ปลา', 'ปล', 'aa', null, 'none', ['mid', 'long', 'none', 'live', 'mid']],
  ['บ้าน', 'บ', 'aa', 'น', 'thoo', ['mid', 'long', 'sonorant', 'live', 'falling']],
  ['เล่น', 'ล', 'e', 'น', 'eek', ['low', 'short', 'sonorant', 'live', 'falling']],
  ['โต๊ะ', 'ต', 'o', null, 'trii', ['mid', 'short', 'none', 'dead', 'high']],
  ['ไม่', 'ม', 'ai_malai', null, 'eek', ['low', 'short', 'sonorant', 'live', 'falling']],
  ['ใจ', 'จ', 'ai_muan', null, 'none', ['mid', 'short', 'sonorant', 'live', 'mid']],
  ['น้ำ', 'น', 'am', null, 'thoo', ['low', 'short', 'sonorant', 'live', 'high']],
  ['เขา', 'ข', 'ao', null, 'none', ['high', 'short', 'sonorant', 'live', 'rising']],
];

describe('syllableAnswers', () => {
  it.each(EXAMPLES)('%s', (word, onsetText, id, final, mark, answers) => {
    const parts = { onset: onset(onsetText), vowel: vowel(id), final, mark };
    const [consonantClass, vowelLength, finalKind, liveness, tone] = answers;

    // The word is only a label: check that the parts really spell it, so that the
    // expected answers, written for that word, are tested on the right syllable.
    expect(render(parts)).toBe(word);
    expect(syllableAnswers(parts)).toEqual({
      consonantClass,
      vowelLength,
      finalKind,
      liveness,
      tone,
    });
  });
});
