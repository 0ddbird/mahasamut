import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSourceMaps,
  siteSourceMaps,
  sourceMapsCleanup,
  type SentryPluginFactory,
  type SourceMapsEnv,
} from './sentry-sourcemaps';

// A made-up token and project: nothing here ever reaches Sentry, the plugin factory is a stand-in.
const ENV: SourceMapsEnv = {
  SENTRY_AUTH_TOKEN: 'fake-token',
  SENTRY_ORG: 'some-org',
  SENTRY_PROJECT: 'some-project',
  SENTRY_URL: 'https://de.sentry.io/',
  SENTRY_RELEASE: 'abc1234',
};

function fakeFactory() {
  const plugin = { name: 'fake-sentry-plugin' };
  const factory = vi.fn(() => [plugin]);
  const load = vi.fn(async () => factory as unknown as SentryPluginFactory);
  return { factory, load, plugin };
}

describe('siteSourceMaps', () => {
  it('changes nothing without a token', async () => {
    const { load } = fakeFactory();

    expect(await siteSourceMaps({ ...ENV, SENTRY_AUTH_TOKEN: undefined }, true, load)).toEqual({
      plugins: [],
    });
    expect(await siteSourceMaps({ ...ENV, SENTRY_AUTH_TOKEN: '' }, true, load)).toEqual({
      plugins: [],
    });
    // Without a token the plugin is not even loaded.
    expect(load).not.toHaveBeenCalled();
  });

  it('never runs outside the site build (dev server, tests, server build), token or not', async () => {
    const { load } = fakeFactory();

    expect(await siteSourceMaps(ENV, false, load)).toEqual({ plugins: [] });
    expect(load).not.toHaveBeenCalled();
  });

  it('writes hidden maps and adds the plugin when the build has a token', async () => {
    const { load, plugin } = fakeFactory();

    const config = await siteSourceMaps(ENV, true, load);

    expect(config.sourcemap).toBe('hidden');
    // Sentry's plugin first, our cleanup after it.
    expect(config.plugins).toEqual([[plugin], expect.objectContaining({ enforce: 'post' })]);
  });

  it('configures the plugin from the environment, with no telemetry', async () => {
    const { factory, load } = fakeFactory();

    await siteSourceMaps(ENV, true, load);

    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith({
      authToken: 'fake-token',
      org: 'some-org',
      project: 'some-project',
      url: 'https://de.sentry.io/',
      telemetry: false,
      errorHandler: expect.any(Function),
      release: { name: 'abc1234', setCommits: false },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    });
  });

  describe('the release', () => {
    const releaseOf = async (env: SourceMapsEnv) => {
      const { factory, load } = fakeFactory();
      await siteSourceMaps(env, true, load);
      return (factory.mock.calls[0] as unknown as [{ release: { name?: string } }])[0].release.name;
    };

    it('falls back to the one the SDK reports when SENTRY_RELEASE is not set', async () => {
      const env = { ...ENV, SENTRY_RELEASE: undefined, VITE_SENTRY_RELEASE: 'vite123' };

      expect(await releaseOf(env)).toBe('vite123');
      expect(await releaseOf({ ...env, SENTRY_RELEASE: '' })).toBe('vite123');
    });

    it('prefers SENTRY_RELEASE when both are set', async () => {
      expect(await releaseOf({ ...ENV, VITE_SENTRY_RELEASE: 'vite123' })).toBe('abc1234');
    });

    it('is left to the plugin when neither is set, or both are empty', async () => {
      expect(await releaseOf({ ...ENV, SENTRY_RELEASE: undefined })).toBeUndefined();
      expect(
        await releaseOf({ ...ENV, SENTRY_RELEASE: '', VITE_SENTRY_RELEASE: '' }),
      ).toBeUndefined();
    });
  });
});

describe('a failed upload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('only warns, so that the build and the deploy go on', async () => {
    const { factory, load } = fakeFactory();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await siteSourceMaps(ENV, true, load);
    const { errorHandler } = (
      factory.mock.calls[0] as unknown as [{ errorHandler: (e: Error) => void }]
    )[0];

    expect(() => errorHandler(new Error('Sentry is down'))).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Sentry is down'));
  });

  it('still leaves no map in the output folder', async () => {
    // The fake Sentry plugin fails its upload and deletes nothing: our own step is the only one left.
    const dir = await mkdtemp(join(tmpdir(), 'mahasamut-cleanup-'));
    try {
      await mkdir(join(dir, 'assets'));
      await writeFile(join(dir, 'index.html'), '<html></html>');
      await writeFile(join(dir, 'assets', 'index-abc.js'), 'console.log(1);');
      await writeFile(join(dir, 'assets', 'index-abc.js.map'), '{}');
      await writeFile(join(dir, 'assets', 'esm-def.js.map'), '{}');

      const { plugins } = await siteSourceMaps(ENV, true, fakeFactory().load);
      const cleanup = plugins.at(-1) as ReturnType<typeof sourceMapsCleanup>;
      // The hooks are called the way Vite does: the config is resolved, then the bundle closes.
      (cleanup.configResolved as (config: unknown) => void)({
        root: dir,
        build: { outDir: dir },
      });
      await (cleanup.closeBundle as { handler: () => Promise<void> }).handler();

      expect(await readdir(dir, { recursive: true })).toEqual(
        expect.arrayContaining(['index.html', join('assets', 'index-abc.js')]),
      );
      expect((await readdir(dir, { recursive: true })).filter((f) => f.endsWith('.map'))).toEqual(
        [],
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('deletes nothing, and does not fail, when the folder does not exist', async () => {
    await expect(
      deleteSourceMaps(join(tmpdir(), 'mahasamut-no-such-folder')),
    ).resolves.toBeUndefined();
  });

  it('fails when the folder cannot be read for another reason, so the build fails closed', async () => {
    // A file where the folder should be: a maps folder that could not be cleaned must not pass for a clean one.
    const dir = await mkdtemp(join(tmpdir(), 'mahasamut-cleanup-'));
    try {
      const file = join(dir, 'not-a-folder');
      await writeFile(file, '');

      await expect(deleteSourceMaps(file)).rejects.toMatchObject({ code: 'ENOTDIR' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
