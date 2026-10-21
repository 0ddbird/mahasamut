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

// Some browsers load their voices only once asked: asking now has them ready
// by the first click.
globalThis.speechSynthesis?.getVoices();

/**
 * Reads `thai` aloud with the browser's Thai voice, after stopping any sound
 * still playing, so that quick clicks do not pile up. Where the browser cannot
 * speak, or has voices but no Thai one, it does nothing: a wrong voice would
 * teach a wrong sound, and the game is played in silence. While the voices are
 * not loaded yet, it still asks for Thai, which the browser matches itself.
 */
export const speakThai: Speak = (thai) => {
  const synthesis = globalThis.speechSynthesis;
  if (synthesis === undefined || typeof SpeechSynthesisUtterance === 'undefined') return;

  const voices = synthesis.getVoices();
  const voice = voices.find((v) => v.lang.replace('_', '-').startsWith('th'));
  if (voices.length > 0 && voice === undefined) return;

  const utterance = new SpeechSynthesisUtterance(thai);
  utterance.lang = THAI;
  if (voice !== undefined) utterance.voice = voice;

  synthesis.cancel();
  synthesis.speak(utterance);
};
