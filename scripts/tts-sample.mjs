// Trial of Google Cloud Text-to-Speech on the vowel game's sounds.
// Usage (WSL, from the repo root): node scripts/tts-sample.mjs [outDir], with GOOGLE_TTS_API_KEY set
// Writes one MP3 per text and voice, and an index.html to listen to them side by side.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = process.env.GOOGLE_TTS_API_KEY;
if (!KEY) {
  console.error('Set GOOGLE_TTS_API_KEY first.');
  process.exit(1);
}
const OUT = process.argv[2] ?? join(process.env.HOME, 'code/mahasamut/.superpowers/tts-sample');
const API = 'https://texttospeech.googleapis.com/v1';

// Each sound: its IPA, the text the game reads today (the vowel on อ), and
// real words to try where that form is not a word.
const SOUNDS = [
  ['a', 'อะ'],
  ['aː', 'อา'],
  ['i', 'อิ'],
  ['iː', 'อี'],
  ['ɯ', 'อึ'],
  ['ɯː', 'อือ'],
  ['u', 'อุ'],
  ['uː', 'อู'],
  ['e', 'เอะ'],
  ['eː', 'เอ'],
  ['ɛ', 'แอะ'],
  ['ɛː', 'แอ'],
  ['o', 'โอะ'],
  ['oː', 'โอ'],
  ['ɔ', 'เอาะ', 'เกาะ', 'เงาะ'],
  ['ɔː', 'ออ'],
  ['ɤ', 'เออะ'],
  ['ɤː', 'เออ'],
  ['ia', 'เอียะ', 'เกี๊ยะ'],
  ['iːa', 'เอีย'],
  ['ɯa', 'เอือะ'],
  ['ɯːa', 'เอือ'],
  ['ua', 'อัวะ', 'ผัวะ'],
  ['uːa', 'อัว'],
  ['am', 'อำ'],
  ['aj', 'ใอ', 'ไอ'],
  ['aw', 'เอา'],
];

const call = async (path, body) => {
  const response = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}key=${KEY}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
};

// The Thai voices this key can use, one of each kind (Standard, Wavenet, Neural2, Chirp...).
const { voices } = await call('voices?languageCode=th-TH');
const byKind = new Map();
for (const voice of voices) {
  const kind = voice.name.split('-')[2];
  if (!byKind.has(kind)) byKind.set(kind, voice.name);
}
const chosen = [...byKind.values()];
console.log(`Thai voices: ${voices.map((v) => v.name).join(', ')}`);
console.log(`Trying: ${chosen.join(', ')}`);

const rows = [];
for (const [ipa, ...texts] of SOUNDS) {
  const cells = [];
  for (const text of texts) {
    for (const name of chosen) {
      const { audioContent } = await call('text:synthesize', {
        input: { text },
        voice: { languageCode: 'th-TH', name },
        audioConfig: { audioEncoding: 'MP3' },
      });
      const file = `${name}/${encodeURIComponent(text)}.mp3`;
      await mkdir(join(OUT, name), { recursive: true });
      await writeFile(join(OUT, name, `${text}.mp3`), Buffer.from(audioContent, 'base64'));
      cells.push({ text, name, file });
    }
  }
  rows.push({ ipa, cells });
  process.stdout.write('.');
}

const header = `<tr><th>IPA</th><th>Text</th>${chosen.map((n) => `<th>${n}</th>`).join('')}</tr>`;
const body = rows
  .flatMap(({ ipa, cells }) =>
    [...new Set(cells.map((c) => c.text))].map(
      (text) =>
        `<tr><td>/${ipa}/</td><td lang="th">${text}</td>${chosen
          .map((name) => {
            const cell = cells.find((c) => c.text === text && c.name === name);
            return `<td><audio controls preload="none" src="${cell.file}"></audio></td>`;
          })
          .join('')}</tr>`,
    ),
  )
  .join('\n');
await writeFile(
  join(OUT, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Thai vowels, Google TTS</title>
<style>body{font-family:sans-serif;background:#121614;color:#f2f1ee}td,th{padding:4px 8px;border-bottom:1px solid #333}td[lang]{font-size:1.6rem}audio{height:32px}</style>
<h1>Thai vowels, Google TTS</h1><table>${header}\n${body}</table>`,
);
console.log(`\nDone: ${join(OUT, 'index.html')}`);
