import { afterEach, describe, expect, it, vi } from 'vitest';
import { playSound } from './playSound';

/** Stands in for the browser's Audio: it records what each sound went through. */
const fakeAudio = (play: () => Promise<void> = () => Promise.resolve()) => {
  const sounds: { src: string; events: string[] }[] = [];
  class FakeAudio {
    src: string;
    events: string[] = [];
    currentTime = 0;
    constructor(src: string) {
      this.src = src;
      sounds.push(this);
    }
    play() {
      this.events.push('play');
      return play();
    }
    pause() {
      this.events.push('pause');
    }
  }
  vi.stubGlobal('Audio', FakeAudio);
  return sounds;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('playSound', () => {
  it('plays the file', () => {
    const sounds = fakeAudio();
    playSound('/audio/vowels/aa.mp3');
    expect(sounds.map((s) => [s.src, s.events])).toEqual([['/audio/vowels/aa.mp3', ['play']]]);
  });

  it('stops the sound playing before the next one, so quick clicks do not pile up', () => {
    const sounds = fakeAudio();
    playSound('/audio/vowels/a.mp3');
    playSound('/audio/vowels/aa.mp3');
    expect(sounds[0]?.events).toEqual(['play', 'pause']);
    expect(sounds[1]?.events).toEqual(['play']);
  });

  it('stays silent, without an error, when the file cannot play', async () => {
    fakeAudio(() => Promise.reject(new Error('NotAllowedError')));
    expect(() => playSound('/audio/vowels/aa.mp3')).not.toThrow();
    // The rejected promise is handled: nothing reaches the unhandled rejections.
    await Promise.resolve();
  });

  it('does nothing where the browser has no audio', () => {
    vi.stubGlobal('Audio', undefined);
    expect(() => playSound('/audio/vowels/aa.mp3')).not.toThrow();
  });
});
