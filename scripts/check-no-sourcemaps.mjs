// Checks that the site's build, made without a Sentry token, leaves no source map
// behind: not as a file, and not as a `sourceMappingURL` comment that would send the
// browser looking for one. Run it with `npm run check:sourcemaps`.
//
// The build goes to a temporary folder (so `dist/` is left alone), with every SENTRY_
// variable removed from the environment. It needs neither the network nor a token.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = mkdtempSync(join(tmpdir(), 'mahasamut-sourcemaps-'));

const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.includes('SENTRY_')),
);

try {
  const build = spawnSync(
    'npx',
    ['--no-install', 'vite', 'build', '--outDir', outDir, '--emptyOutDir'],
    { env, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (build.status !== 0) {
    console.error(build.stdout, build.stderr);
    throw new Error('The build failed.');
  }

  const leaks = [];
  for (const entry of readdirSync(outDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    if (file.endsWith('.map')) leaks.push(`${file}: a source map file`);
    else if (/\.(js|css)$/.test(file) && /sourceMappingURL=/.test(readFileSync(file, 'utf8'))) {
      leaks.push(`${file}: a sourceMappingURL comment`);
    }
  }

  if (leaks.length > 0) {
    console.error(`The build without a token leaves source maps behind:\n${leaks.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('OK: the build without a Sentry token leaves no source map.');
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
