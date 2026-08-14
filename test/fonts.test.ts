// A missing face falls back to the browser default and every sheet still renders, so nothing
// else in any tier notices. Both halves of the link are checked: the stylesheet's URLs against
// the files on disk, and the four include-lists that decide whether fonts/ ships at all.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const css = readFileSync(join(REPO, 'css/mosh.css'), 'utf8');

const referenced = [...css.matchAll(/url\('\/systems\/mothershiprpg\/fonts\/([^']+)'\)/g)].map(
  (m) => m[1],
);

describe('self-hosted fonts', () => {
  const onDisk = readdirSync(join(REPO, 'fonts')).filter((f) => f.endsWith('.woff2'));

  it('references a file that exists for every @font-face', () => {
    expect(referenced.length).toBe(css.match(/@font-face/g)?.length);
    expect([...referenced].sort()).toEqual([...onDisk].sort());
  });

  it('declares no family the stylesheet never asks for', () => {
    const declared = new Set(
      [...css.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]),
    );
    const used = new Set(
      [...css.matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    for (const family of declared) expect(used).toContain(family);
  });

  it('ships every licence the OFL requires alongside the faces', () => {
    const licences = readdirSync(join(REPO, 'fonts')).filter((f) => f.startsWith('OFL-'));
    expect(licences).toHaveLength(2);
    for (const file of licences) {
      expect(readFileSync(join(REPO, 'fonts', file), 'utf8')).toContain('SIL OPEN FONT LICENSE');
    }
  });

  it.each([
    ['scripts/setup.ts', /LINKED = \[([^\]]+)\]/],
    ['scripts/deploy.ts', /DIRS = \[([^\]]+)\]/],
    ['vite.config.ts', /\^\/systems\/\$\{id\}\/\(([^)]+)\)\//],
    ['.github/workflows/release.yml', /zip -r [\s\S]*?\n((?:.*\n){2})/],
  ])('carries fonts/ through %s', (file, pattern) => {
    const list = readFileSync(join(REPO, file), 'utf8').match(pattern);
    expect(list?.[1]).toContain('fonts');
  });
});
