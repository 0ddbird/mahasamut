// The two calls to Google Cloud Text-to-Speech that the scripts share: the API
// key lookup and the synthesis of one text.
import { readFile } from 'node:fs/promises';

/** The voice the trials chose (.superpowers/tts-sample/COMPTE-RENDU.md). */
export const DEFAULT_VOICE = 'th-TH-Chirp3-HD-Leda';

/** The API key, from the environment or from .env.local; never printed. */
export const apiKey = async () => {
  if (process.env.GOOGLE_TTS_API_KEY) return process.env.GOOGLE_TTS_API_KEY;
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
  const line = env.split('\n').find((l) => l.startsWith('GOOGLE_TTS_API_KEY='));
  return line
    ?.slice('GOOGLE_TTS_API_KEY='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
};

/**
 * The MP3 of `text` said by `voice`. On a response that is not OK, throws an
 * error whose `status` is the HTTP status and whose message holds the body of
 * the response (never the key).
 */
export const synthesize = async (text, key, voice = DEFAULT_VOICE) => {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'th-TH', name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!response.ok) {
    throw Object.assign(new Error(`${response.status} ${await response.text()}`), {
      status: response.status,
    });
  }
  const { audioContent } = await response.json();
  return Buffer.from(audioContent, 'base64');
};
