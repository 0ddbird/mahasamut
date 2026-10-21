import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeFileAtomic } from './files';

describe('writeFileAtomic', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'atomic-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a file, and replaces the content of an existing one', () => {
    const file = join(dir, 'list.json');
    writeFileAtomic(file, 'first');
    expect(readFileSync(file, 'utf8')).toBe('first');

    writeFileAtomic(file, 'second, longer');
    expect(readFileSync(file, 'utf8')).toBe('second, longer');
  });

  it('leaves no temporary file behind', () => {
    writeFileAtomic(join(dir, 'a.txt'), 'a');
    writeFileAtomic(join(dir, 'a.txt'), 'b');
    expect(readdirSync(dir)).toEqual(['a.txt']);
  });

  it('writes bytes, and accepts a URL', () => {
    const file = join(dir, 'bytes.bin');
    writeFileAtomic(pathToFileURL(file), new Uint8Array([1, 2, 3]));
    expect([...readFileSync(file)]).toEqual([1, 2, 3]);
  });

  it('keeps the old content and leaves no temporary file when the write fails', () => {
    const file = join(dir, 'kept.txt');
    writeFileSync(file, 'old');
    mkdirSync(join(dir, 'folder'));
    // A folder cannot be replaced by a file: the rename fails.
    expect(() => writeFileAtomic(join(dir, 'folder'), 'new')).toThrow();
    expect(readFileSync(file, 'utf8')).toBe('old');
    expect(readdirSync(dir).sort()).toEqual(['folder', 'kept.txt']);
  });
});
