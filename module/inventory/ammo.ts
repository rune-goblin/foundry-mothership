/**
 * A weapon's magazine, as `module/data/item-models.js` stores it: `shots` is how much the
 * magazine holds, `curShots` what is in it, `ammo` the reserve behind it, and `shotsPerFire`
 * what one pull of the trigger costs. The arithmetic is here, pure; `documents/item.ts` is the
 * only thing that writes it (audit F15).
 */

export interface AmmoState {
  readonly useAmmo: boolean;
  readonly shots: number;
  readonly curShots: number;
  readonly ammo: number;
  readonly shotsPerFire: number;
}

export interface FireOutcome {
  readonly status: 'fired' | 'needs-reload' | 'out-of-ammo';
  /** Shots taken from the magazine — zero unless the weapon fired and tracks ammunition. */
  readonly spent: number;
  readonly curShots: number;
}

export interface ReloadOutcome {
  readonly status: 'reloaded' | 'already-full' | 'out-of-ammo' | 'untracked';
  readonly curShots: number;
  readonly ammo: number;
  /** Rounds moved into the magazine. */
  readonly loaded: number;
}

function count(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function ammoState(system: unknown): AmmoState {
  const fields = (typeof system === 'object' && system !== null ? system : {}) as Record<string, unknown>;
  return {
    useAmmo: fields.useAmmo === true,
    shots: count(fields.shots),
    curShots: count(fields.curShots),
    ammo: count(fields.ammo),
    shotsPerFire: count(fields.shotsPerFire),
  };
}

/** One pull of the trigger. A weapon that tracks no ammunition fires and spends nothing. */
export function planFire(state: AmmoState): FireOutcome {
  const { useAmmo, curShots, ammo, shotsPerFire } = state;

  if (!useAmmo) return { status: 'fired', spent: 0, curShots };
  if (curShots >= shotsPerFire) {
    return { status: 'fired', spent: shotsPerFire, curShots: curShots - shotsPerFire };
  }
  if (curShots + ammo >= shotsPerFire) return { status: 'needs-reload', spent: 0, curShots };
  return { status: 'out-of-ammo', spent: 0, curShots };
}

export function planReload(state: AmmoState): ReloadOutcome {
  const { useAmmo, shots, curShots, ammo } = state;

  if (!useAmmo) return { status: 'untracked', curShots, ammo, loaded: 0 };
  if (curShots >= shots) return { status: 'already-full', curShots, ammo, loaded: 0 };
  if (ammo <= 0) return { status: 'out-of-ammo', curShots, ammo, loaded: 0 };

  // What is left in the magazine goes back to the reserve first, so a part-spent box is not lost.
  const pool = ammo + curShots;
  const magazine = Math.min(pool, shots);
  return { status: 'reloaded', curShots: magazine, ammo: pool - magazine, loaded: magazine - curShots };
}
