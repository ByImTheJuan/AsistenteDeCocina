// The app has no Node.js types; these are the few calls this test needs.
declare const __dirname: string;
type DirEntry = { name: string; isDirectory(): boolean };
const {
  readdirSync,
  readFileSync,
}: {
  readdirSync(path: string, options: { withFileTypes: true }): DirEntry[];
  readFileSync(path: string, encoding: 'utf8'): string;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('node:fs');
const {
  join,
  relative,
  sep,
}: {
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  sep: string;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('node:path');

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
