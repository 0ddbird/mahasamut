import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakThai } from './speak';

/** Stands in for the browser's utterance: it keeps what it was given. */
class FakeUtterance {
  lang = '';
  voice: { lang: string; name: string } | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

/** A browser speech engine that records the calls, with the given voices. */
const fakeSynthesis = (voices: { lang: string; name: string }[] = []) => {
  const calls: string[] = [];
  const spoken: FakeUtterance[] = [];
  return {
    calls,
    spoken,
    getVoices: () => voices,
    cancel: () => calls.push('cancel'),
    speak: (utterance: FakeUtterance) => {
      calls.push('speak');
      spoken.push(utterance);
    },
  };
};

const install = (synthesis: ReturnType<typeof fakeSynthesis>) => {
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('speakThai', () => {
  it('reads the text in Thai', () => {
    const synthesis = fakeSynthesis();
    install(synthesis);
    speakThai('อา');
    expect(synthesis.spoken.map((u) => [u.text, u.lang])).toEqual([['อา', 'th-TH']]);
  });

  it('picks a Thai voice when the browser has one', () => {
    const thai = { lang: 'th-TH', name: 'Thai' };
    const synthesis = fakeSynthesis([{ lang: 'en-US', name: 'English' }, thai]);
    install(synthesis);
    speakThai('อา');
    expect(synthesis.spoken[0]?.voice).toBe(thai);
  });

  it('stops the sound playing before the next one, so quick clicks do not pile up', () => {
    const synthesis = fakeSynthesis();
    install(synthesis);
    speakThai('อา');
    speakThai('อี');
    expect(synthesis.calls).toEqual(['cancel', 'speak', 'cancel', 'speak']);
  });

  // A wrong voice would teach a wrong sound: silence is better.
  it('stays silent when the browser has voices, but no Thai one', () => {
    const synthesis = fakeSynthesis([{ lang: 'en-US', name: 'English' }]);
    install(synthesis);
    speakThai('อา');
    expect(synthesis.spoken).toEqual([]);
  });

  it('still tries in Thai while the voices are not loaded yet', () => {
    const synthesis = fakeSynthesis([]);
    install(synthesis);
    speakThai('อา');
    expect(synthesis.spoken.map((u) => u.lang)).toEqual(['th-TH']);
  });

  it('does nothing, without an error, where the browser cannot speak', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => speakThai('อา')).not.toThrow();
  });
});
