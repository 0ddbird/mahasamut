import { readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Plugin, PluginOption } from 'vite';

/** The Sentry plugin factory, as `@sentry/vite-plugin` exports it. */
export type SentryPluginFactory = typeof import('@sentry/vite-plugin').sentryVitePlugin;

/** What the production build reads from its environment. */
export interface SourceMapsEnv {
  SENTRY_AUTH_TOKEN?: string;
  SENTRY_ORG?: string;
  SENTRY_PROJECT?: string;
  SENTRY_URL?: string;
  /** The version of the site, which the SDK also reports (`VITE_SENTRY_RELEASE`). */
  SENTRY_RELEASE?: string;
}

/** What the site build gets from the source maps, to merge into the Vite config. */
export interface SourceMapsConfig {
  plugins: PluginOption[];
  /** Set only when the maps are uploaded; otherwise the build keeps Vite's default (no maps). */
  sourcemap?: 'hidden';
}

/** Where the site build writes its files. The maps are deleted from here once uploaded (or not). */
const SITE_OUT_DIR = 'dist';

/**
 * Loads the plugin only when it is used: the plugin pulls in Sentry's CLI, which
 * would slow down every Vite start and every test run for nothing.
 */
const loadSentryPlugin = async (): Promise<SentryPluginFactory> =>
  (await import('@sentry/vite-plugin')).sentryVitePlugin;

/** Removes every `.map` file under `dir`. A missing folder is not an error: there is nothing to remove. */
export async function deleteSourceMaps(dir: string): Promise<void> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.map'))
      .map((entry) => rm(join(entry.parentPath, entry.name), { force: true })),
  );
}

/**
 * The last word on the maps: once the whole build is over, whatever Sentry's plugin
 * did (uploaded, failed, skipped its own deletion), none is left in the output
 * folder, so none can be served.
 */
export function sourceMapsCleanup(): Plugin {
  let outDir = SITE_OUT_DIR;
  return {
    name: 'mahasamut-delete-sourcemaps',
    apply: 'build',
    // After Sentry's plugin (which is `pre`) and after the other plugins' own closeBundle hooks.
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: 'post',
      handler: () => deleteSourceMaps(outDir),
    },
  };
}

/**
 * Source maps for the site's production build, so that the stacks Sentry receives
 * are readable.
 *
 * They exist only when the build has `SENTRY_AUTH_TOKEN` (the VPS, once the infra
 * provides it): the plugin uploads them to Sentry and then deletes them from
 * `dist/`, so a map is never served. A failed upload only warns, so that Sentry
 * being down never makes the site undeployable; the maps are then deleted anyway.
 * Without a token, or outside the site's
 * production build (dev server, tests, the server's SSR build), nothing changes:
 * no map is written at all.
 */
export async function siteSourceMaps(
  env: SourceMapsEnv,
  isSiteBuild: boolean,
  load: () => Promise<SentryPluginFactory> = loadSentryPlugin,
): Promise<SourceMapsConfig> {
  if (!isSiteBuild || !env.SENTRY_AUTH_TOKEN) return { plugins: [] };

  const sentryVitePlugin = await load();
  return {
    // "hidden" writes the maps without the `sourceMappingURL` comment that points a browser at them.
    sourcemap: 'hidden',
    plugins: [
      sentryVitePlugin({
        authToken: env.SENTRY_AUTH_TOKEN,
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        url: env.SENTRY_URL,
        // The plugin would otherwise report its own errors and timings to Sentry.
        telemetry: false,
        // The plugin throws by default, which would fail the build and the deploy with it.
        errorHandler: (error) =>
          console.warn(`Source maps were not uploaded to Sentry: ${error.message}`),
        // Same string as the SDK's `release` (VITE_SENTRY_RELEASE), so that an event finds its release.
        // No commit association: it needs a repository integration and a git checkout on the VPS.
        release: { name: env.SENTRY_RELEASE, setCommits: false },
        // Every map of the build is uploaded, the lazy-loaded Sentry chunk's included.
        sourcemaps: { filesToDeleteAfterUpload: [`./${SITE_OUT_DIR}/**/*.map`] },
      }),
      sourceMapsCleanup(),
    ],
  };
}
