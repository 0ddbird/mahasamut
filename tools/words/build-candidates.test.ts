import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCandidates, mergeCorpusCsv } from './build-candidates';
import type { Candidate } from './candidates';
import { wordId } from './ids';

const HEADER = 'word,frequency,tone_case,tone,link,exists';

/** A level 2 candidate, with only what the CSV shows filled in properly. */
function level2(text: string, frequency = 7): Candidate {
  return {
    text,
    id: wordId(text),
    level: 2,
    source: 'corpus',
    frequency,
    toneCase: { consonantClass: 'mid', liveness: 'dead', vowelLength: 'short', mark: 'trii' },
    tone: 'high',
    analyses: [],
  };
}

describe('mergeCorpusCsv', () => {
  it('writes the header, then one row per word with an empty answer', () => {
    expect(mergeCorpusCsv(null, [level2('อั๊ว', 12)])).toBe(
      `${HEADER}\nอั๊ว,12,mid dead short trii,high,https://en.wiktionary.org/wiki/อั๊ว,\n`,
    );
  });

  it('keeps the answers already given, and leaves the new words empty', () => {
    const previous =
      `${HEADER}\n` +
      'อั๊ว,12,mid dead short trii,high,https://en.wiktionary.org/wiki/อั๊ว,yes\n' +
      'ก๊อ,9,mid dead short trii,high,https://en.wiktionary.org/wiki/ก๊อ,no\n';
    const merged = mergeCorpusCsv(previous, [level2('อั๊ว', 14), level2('ตั๊ว')]);

    const rows = merged.trimEnd().split('\n').slice(1);
    expect(rows.map((row) => row.split(',')[0])).toEqual(['อั๊ว', 'ตั๊ว']);
    expect(rows[0]!.endsWith(',yes')).toBe(true);
    expect(rows[0]!.split(',')[1]).toBe('14');
    expect(rows[1]!.endsWith(',')).toBe(true);
  });

  it('quotes a field that holds a comma, and reads it back', () => {
    const first = mergeCorpusCsv(null, [level2('ก,ข')]);
    expect(first.split('\n')[1]!.startsWith('"ก,ข",7,')).toBe(true);

    const answered = first.replace(/,\n$/, ',yes\n');
    expect(mergeCorpusCsv(answered, [level2('ก,ข')])).toBe(answered);
  });
});

describe('buildCandidates', () => {
  const dirs: string[] = [];
  const tempDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'candidates-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('refuses to overwrite the frozen list', () => {
    const outDir = tempDir();
    writeFileSync(join(outDir, 'candidates.json'), 'frozen');

    expect(() => buildCandidates({ outDir, force: false })).toThrow(/--force/);
    expect(readFileSync(join(outDir, 'candidates.json'), 'utf8')).toBe('frozen');
  });

  it('writes both files, and replaces the list with --force', () => {
    const outDir = tempDir();
    const counts = buildCandidates({ outDir, force: false });

    const written = JSON.parse(readFileSync(join(outDir, 'candidates.json'), 'utf8')) as {
      generated: string;
      candidates: Candidate[];
    };
    expect(written.generated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(written.candidates.filter((c) => c.level === 1)).toHaveLength(counts.level1);
    expect(written.candidates.filter((c) => c.level === 2)).toHaveLength(counts.level2);
    const csv = readFileSync(join(outDir, 'corpus-check.csv'), 'utf8');
    expect(csv.startsWith(`${HEADER}\n`)).toBe(true);
    expect(csv.trimEnd().split('\n')).toHaveLength(counts.level2 + 1);

    expect(buildCandidates({ outDir, force: true })).toEqual(counts);
  });
});
