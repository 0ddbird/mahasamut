/**
 * The recorded sound of the pool's words: the take the reviewer chose for each
 * validated word, in public/audio/words, named by the word's id. sounds.json
 * lists the words that have one; `npm run words:sounds` writes both.
 */
import { wordId } from './ids';
import withSound from './sounds.json';

const WORDS_WITH_SOUND = new Set<string>(withSound as readonly string[]);

/** Where the sound of `text` is served, or `null` if the word has none yet. */
export function wordSoundUrl(text: string): string | null {
  if (!WORDS_WITH_SOUND.has(text)) return null;
  return `${import.meta.env.BASE_URL}audio/words/${wordId(text)}.mp3`;
}
