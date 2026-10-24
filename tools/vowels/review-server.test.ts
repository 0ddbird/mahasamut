/// <reference types="node" />
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startVowelReviewServer } from './review-server';
import type { ReviewServer } from './review-server';
import { writeManifest } from './takes';

describe('tools/vowels/review-server', () => {
  let tempDir: URL;
  let publicDir: URL;
  let server: ReviewServer;

  beforeEach(async () => {
    const root = `${tmpdir()}/vowels-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    mkdirSync(`${root}public/`, { recursive: true });
    mkdirSync(`${root}takes/`, { recursive: true });
    tempDir = pathToFileURL(root);
    publicDir = new URL('public/', tempDir);

    // Populate a sample file in public/ and take in takes/
    writeFileSync(new URL('a.mp3', publicDir), Buffer.from('audio-current-a'));
    writeFileSync(new URL('takes/a-1.mp3', tempDir), Buffer.from('audio-take-1-a'));
    writeManifest(new URL('takes/', tempDir), {
      a: [
        {
          n: 1,
          file: 'a-1.mp3',
          text: 'สระ อะ',
          voice: 'v',
          md5: 'take-md5',
          recordedAt: '2026-10-24',
        },
      ],
    });

    server = await startVowelReviewServer({
      dataDir: tempDir,
      publicDir,
      port: 0,
    });
  });

  afterEach(async () => {
    await server.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('serves the review HTML page on GET /', async () => {
    const res = await fetch(`${server.url}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Vowel Review');
  });

  it('returns state on GET /api/state', async () => {
    const res = await fetch(`${server.url}/api/state`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      vowels: unknown[];
      currentSounds: Record<string, { exists: boolean }>;
      takes: Record<string, unknown[]>;
    };
    expect(data.vowels).toHaveLength(28);
    expect(data.currentSounds.a.exists).toBe(true);
    expect(data.takes.a).toHaveLength(1);
  });

  it('streams current audio file', async () => {
    const res = await fetch(`${server.url}/audio/current/a.mp3`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    const buf = await res.arrayBuffer();
    expect(Buffer.from(buf).toString()).toBe('audio-current-a');
  });

  it('streams take audio file', async () => {
    const res = await fetch(`${server.url}/audio/take/a/1.mp3`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    const buf = await res.arrayBuffer();
    expect(Buffer.from(buf).toString()).toBe('audio-take-1-a');
  });

  it('saves a decision on POST /api/decision', async () => {
    const res = await fetch(`${server.url}/api/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'a', decision: 'take', take: 1 }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      success: boolean;
      entry: { decision: string; take: number };
    };
    expect(data.success).toBe(true);
    expect(data.entry.decision).toBe('take');
    expect(data.entry.take).toBe(1);
  });

  it('publishes a take on POST /api/publish', async () => {
    const res = await fetch(`${server.url}/api/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'a', take: 1 }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { published: string[] };
    expect(data.published).toEqual(['a']);
  });
});
