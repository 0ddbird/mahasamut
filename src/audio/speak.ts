/**
 * Thai read aloud, for the games that let the player hear a sound.
 *
 * For now the browser's own speech synthesis reads it, with a Thai voice when
 * it has one: nothing to record or to host, but the voice depends on the
 * device, and some desktop browsers have no Thai voice at all. Sound files
 * recorded once with a cloud voice will replace it later; the games only
 * know `Speak`, so they will not change.
 */

/** Reads a Thai text aloud. */
export type Speak = (thai: string) => void;

const THAI = 'th-TH';

/**
 * Reads `thai` aloud with the browser's voice, after stopping any sound still
 * playing, so that quick clicks do not pile up. Does nothing where the browser
 * cannot speak: the game is then played in silence.
 */
export const speakThai: Speak = (thai) => {
  const synthesis = globalThis.speechSynthesis;
  if (synthesis === undefined || typeof SpeechSynthesisUtterance === 'undefined') return;

  const utterance = new SpeechSynthesisUtterance(thai);
  utterance.lang = THAI;
  const voice = synthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('th'));
  if (voice !== undefined) utterance.voice = voice;

  synthesis.cancel();
  synthesis.speak(utterance);
};
