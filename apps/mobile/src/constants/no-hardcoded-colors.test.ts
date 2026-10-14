import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const src = join(__dirname, '..');

// Leftovers of the Expo template behind the Home tab, outside the design
// system until the main screen is built.
const templateFiles = ['components/animated-icon.tsx'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

it('keeps colour values in the theme tokens', () => {
  const offenders = sourceFiles(src)
    .map((path) => relative(src, path).split(sep).join('/'))
    .filter((path) => !path.startsWith('constants/') && !templateFiles.includes(path))
    .filter((path) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(join(src, path), 'utf8')));

  expect(offenders).toEqual([]);
});
