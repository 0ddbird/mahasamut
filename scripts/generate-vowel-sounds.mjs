// Records the sound of each vowel with Google Cloud Text-to-Speech, into
// public/audio/vowels/<id>.mp3, the files the vowel game plays.
//
// Usage, from the repo root:
//   node scripts/generate-vowel-sounds.mjs                 every vowel
//   node scripts/generate-vowel-sounds.mjs --only ue,uee   only these vowels
//
// The API key is read from GOOGLE_TTS_API_KEY, or from that line of .env.local.
// The voice and the wording come from the trials (.superpowers/tts-sample/COMPTE-RENDU.md):
// Chirp3-HD-Leda, saying "สระ" then the vowel, as Thai pupils recite them, which
// keeps the voice from reading a lone vowel as an interjection.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const VOICE = 'th-TH-Chirp3-HD-Leda';
const OUT = new URL('../public/audio/vowels/', import.meta.url);

// Each vowel written on อ, as the game shows it; a test keeps this list in step
// with src/thai/vowels.
const SPELLINGS = {
  a: 'อะ',
  aa: 'อา',
  i: 'อิ',
  ii: 'อี',
  ue: 'อึ',
  uee: 'อือ',
  u: 'อุ',
  uu: 'อู',
  e: 'เอะ',
  ee: 'เอ',
  ae: 'แอะ',
  aee: 'แอ',
  o: 'โอะ',
  oo: 'โอ',
  or: 'เอาะ',
  oor: 'ออ',
  oe: 'เออะ',
  oee: 'เออ',
  ia: 'เอียะ',
  iia: 'เอีย',
  uea: 'เอือะ',
  ueea: 'เอือ',
  ua: 'อัวะ',
  uua: 'อัว',
  am: 'อำ',
  ai_muan: 'ใอ',
  ai_malai: 'ไอ',
  ao: 'เอา',
};

/** The API key, from the environment or from .env.local; never printed. */
const apiKey = async () => {
  if (process.env.GOOGLE_TTS_API_KEY) return process.env.GOOGLE_TTS_API_KEY;
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
  const line = env.split('\n').find((l) => l.startsWith('GOOGLE_TTS_API_KEY='));
  return line
    ?.slice('GOOGLE_TTS_API_KEY='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
};

const key = await apiKey();
if (!key) {
  console.error('No GOOGLE_TTS_API_KEY in the environment or in .env.local.');
  process.exit(1);
}

const onlyAt = process.argv.indexOf('--only');
const ids = onlyAt === -1 ? Object.keys(SPELLINGS) : (process.argv[onlyAt + 1] ?? '').split(',');
const unknown = ids.filter((id) => !(id in SPELLINGS));
if (unknown.length > 0) {
  console.error(
    `Unknown vowels: ${unknown.join(', ')}. Known: ${Object.keys(SPELLINGS).join(', ')}`,
  );
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
for (const id of ids) {
  const text = `สระ ${SPELLINGS[id]}`;
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'th-TH', name: VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!response.ok) {
    console.error(`${id}: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  const { audioContent } = await response.json();
  await writeFile(new URL(`${id}.mp3`, OUT), Buffer.from(audioContent, 'base64'));
  console.log(`${id}: ${text}`);
}
