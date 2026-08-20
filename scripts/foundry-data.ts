import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const SYSTEM_ID = 'mothershiprpg';

export function detectFoundryData(): string | undefined {
  if (process.env.FOUNDRY_DATA) return process.env.FOUNDRY_DATA;

  const home = homedir();
  let base: string;
  if (process.platform === 'darwin') base = join(home, 'Library/Application Support');
  else if (process.platform === 'win32') base = process.env.LOCALAPPDATA ?? join(home, 'AppData/Local');
  else base = process.env.XDG_DATA_HOME ?? join(home, '.local/share');

  // v14 installs to a versioned folder; fall back to the unversioned one.
  for (const name of ['FoundryVTT-v14', 'FoundryVTT']) {
    const data = join(base, name, 'Data');
    if (existsSync(data)) return data;
  }
  return undefined;
}

/** A system can't be disabled like a module — opening a world here runs the working tree live. */
export function warnIfWorldsPresent(data: string): void {
  const worlds = join(data, 'worlds');
  if (!existsSync(worlds)) return;
  console.warn(
    `\n  ! ${worlds} holds real worlds.\n` +
      '    A system is always active in a world built on it, so in-progress schema edits are\n' +
      '    live against them and can trigger migration. Set FOUNDRY_DATA to a scratch data dir\n' +
      '    for schema work.',
  );
}
