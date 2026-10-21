/** Small file helpers shared by the word tools. */
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Writes a file so that a reader (or a crash) never sees it half written: the
 * data goes to a temporary file in the same folder, which then replaces the
 * target in one step.
 */
export function writeFileAtomic(file: URL | string, data: string | Uint8Array): void {
  const target = file instanceof URL ? fileURLToPath(file) : file;
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, data);
    renameSync(temporary, target);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
