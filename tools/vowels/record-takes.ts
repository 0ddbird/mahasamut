/**
 * Command: records Google TTS takes of Thai vowels into data/vowels/takes/.
 *
 *   npm run vowels:takes [-- --only ue,uee] [--count 3] [--more]
 */
import { pathToFileURL } from 'node:url';
import { apiKey, DEFAULT_VOICE, synthesize } from '../../scripts/google-tts.mjs';
import { additionalTakes, readManifest, recordTakes, takesToRecord } from './takes';
import type { Job } from './takes';
import { VOWELS_BY_ID, VOWELS_LIST } from './vowels-data';
import type { VowelItem } from './vowels-data';

const TAKES_DIR = new URL('../../data/vowels/takes/', import.meta.url);

export interface Args {
  only: string[] | undefined;
  count: number;
  more: boolean;
}

export function parseArgs(args: readonly string[]): Args {
  let only: string[] | undefined;
  let count = 3;
  let more = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--more') {
      more = true;
    } else if (arg === '--count') {
      count = Number(args[++i]);
      if (!Number.isInteger(count) || count < 1) {
        throw new Error('--count must be a positive integer.');
      }
    } else if (arg === '--only') {
      const list = args[++i];
      if (!list) throw new Error('--only requires a comma-separated list of vowel IDs.');
      only = list.split(',').map((s) => s.trim());
      for (const id of only) {
        if (!VOWELS_BY_ID.has(id as never)) {
          throw new Error(`Unknown vowel ID "${id}".`);
        }
      }
    } else {
      throw new Error(`Unknown argument "${arg}". Accepted: --only, --count, --more.`);
    }
  }

  return { only, count, more };
}

export function selectJobs(vowels: readonly VowelItem[], dir: URL, args: Args): Job[] {
  const filtered = args.only ? vowels.filter((v) => args.only!.includes(v.id)) : [...vowels];
  const manifest = readManifest(dir);

  if (args.more) {
    return additionalTakes(filtered, manifest, args.count);
  }
  return takesToRecord(filtered, manifest, args.count);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const key = await apiKey();
    if (!key) throw new Error('No GOOGLE_TTS_API_KEY in the environment or in .env.local.');

    const jobs = selectJobs(VOWELS_LIST, TAKES_DIR, args);
    if (jobs.length === 0) {
      console.log('All requested vowel takes are already recorded.');
      process.exit(0);
    }

    console.log(
      `Recording ${jobs.length} take(s) across ${new Set(jobs.map((j) => j.id)).size} vowel(s)...`,
    );

    const { done } = await recordTakes(jobs, {
      dir: TAKES_DIR,
      synthesize: (text) => synthesize(text, key, DEFAULT_VOICE),
      voice: DEFAULT_VOICE,
      retries: 5,
      delayMs: 2000,
      onProgress: ({ done, total, job }) => {
        console.log(`[${done}/${total}] Recorded take ${job.n} for ${job.id} (${job.text})`);
      },
    });

    console.log(`Done! ${done} vowel takes recorded in data/vowels/takes/.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
