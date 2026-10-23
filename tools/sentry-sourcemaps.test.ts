import { describe, expect, it, vi } from 'vitest';
import { siteSourceMaps, type SentryPluginFactory, type SourceMapsEnv } from './sentry-sourcemaps';

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
    expect(config.plugins).toEqual([[plugin]]);
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
      release: { name: 'abc1234', setCommits: false },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    });
  });
});
