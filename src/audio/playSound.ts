/**
 * Recorded sounds, for the games that let the player hear one.
 *
 * The files are made once with a cloud voice (scripts/generate-vowel-sounds.mjs)
 * and served with the site; the browser's own speech synthesis read lone Thai
 * syllables too badly to teach from. The games only know `PlaySound`.
 */

/** Plays the sound file at `url`. */
export type PlaySound = (url: string) => void;

/** The sound playing, stopped when the next one starts. */
let current: HTMLAudioElement | null = null;

/**
 * Plays the file at `url`, after stopping the sound still playing, so that
 * quick clicks do not pile up. Where it cannot play (no audio, a missing file,
 * playback refused), it stays silent: the game goes on without the sound.
 */
export const playSound: PlaySound = (url) => {
  if (typeof Audio === 'undefined') return;
  current?.pause();
  current = new Audio(url);
  current.play().catch(() => {});
};
