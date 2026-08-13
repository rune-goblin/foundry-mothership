import { describe, it, expect } from 'vitest';
import { ammoState, planFire, planReload, type AmmoState } from '../module/inventory/ammo.ts';

const weapon = (fields: Partial<AmmoState> = {}): AmmoState => ({
  useAmmo: true,
  shots: 6,
  curShots: 6,
  ammo: 12,
  shotsPerFire: 1,
  ...fields,
});

describe('ammoState', () => {
  it('reads the weapon fields the schema stores', () => {
    expect(ammoState({ useAmmo: true, shots: 6, curShots: 2, ammo: 12, shotsPerFire: 3 })).toEqual({
      useAmmo: true, shots: 6, curShots: 2, ammo: 12, shotsPerFire: 3,
    });
  });

  it('reads an item carrying none of them as tracking no ammunition', () => {
    expect(ammoState({ damage: '1d10' })).toEqual({
      useAmmo: false, shots: 0, curShots: 0, ammo: 0, shotsPerFire: 0,
    });
    expect(ammoState(null).useAmmo).toBe(false);
  });
});

describe('planFire', () => {
  it('spends what one pull of the trigger costs', () => {
    expect(planFire(weapon({ curShots: 6, shotsPerFire: 2 }))).toEqual({
      status: 'fired', spent: 2, curShots: 4,
    });
  });

  it('fires a weapon that tracks no ammunition without spending anything', () => {
    expect(planFire(weapon({ useAmmo: false, curShots: 0, ammo: 0 }))).toEqual({
      status: 'fired', spent: 0, curShots: 0,
    });
  });

  it('asks for a reload when the reserve could cover the shot but the magazine cannot', () => {
    expect(planFire(weapon({ curShots: 1, ammo: 12, shotsPerFire: 2 }))).toMatchObject({
      status: 'needs-reload', spent: 0, curShots: 1,
    });
  });

  it('counts what is left in the magazine towards the reload', () => {
    expect(planFire(weapon({ curShots: 1, ammo: 1, shotsPerFire: 2 })).status).toBe('needs-reload');
    expect(planFire(weapon({ curShots: 1, ammo: 0, shotsPerFire: 2 })).status).toBe('out-of-ammo');
  });

  it('is out of ammunition when neither magazine nor reserve can cover the shot', () => {
    expect(planFire(weapon({ curShots: 0, ammo: 0 }))).toEqual({
      status: 'out-of-ammo', spent: 0, curShots: 0,
    });
  });

  // Audit F5: the ammo pipeline has exactly one entry point, and it spends only on the way in.
  // Nothing here can be reached by asking for damage — the caller decides to fire.
  it('spends nothing on any answer but a fired shot', () => {
    const refused = [
      planFire(weapon({ curShots: 0, ammo: 12 })),
      planFire(weapon({ curShots: 0, ammo: 0 })),
    ];
    for (const outcome of refused) {
      expect(outcome.spent).toBe(0);
      expect(outcome.curShots).toBe(0);
    }
  });
});

describe('planReload', () => {
  it('fills the magazine from the reserve', () => {
    expect(planReload(weapon({ curShots: 0, ammo: 12 }))).toEqual({
      status: 'reloaded', curShots: 6, ammo: 6, loaded: 6,
    });
  });

  // A part-spent magazine goes back into the reserve first, so its rounds are not thrown away.
  it('keeps the rounds still in the magazine', () => {
    expect(planReload(weapon({ curShots: 2, ammo: 4 }))).toEqual({
      status: 'reloaded', curShots: 6, ammo: 0, loaded: 4,
    });
  });

  it('loads what the reserve has when it cannot fill the magazine', () => {
    expect(planReload(weapon({ curShots: 0, ammo: 3 }))).toEqual({
      status: 'reloaded', curShots: 3, ammo: 0, loaded: 3,
    });
  });

  it('empties the reserve exactly when it holds one magazine', () => {
    expect(planReload(weapon({ curShots: 0, ammo: 6 }))).toMatchObject({ curShots: 6, ammo: 0 });
  });

  it('refuses a full magazine and an empty reserve, moving nothing either way', () => {
    expect(planReload(weapon({ curShots: 6, ammo: 12 }))).toEqual({
      status: 'already-full', curShots: 6, ammo: 12, loaded: 0,
    });
    expect(planReload(weapon({ curShots: 2, ammo: 0 }))).toEqual({
      status: 'out-of-ammo', curShots: 2, ammo: 0, loaded: 0,
    });
  });

  it('has nothing to do for a weapon that tracks no ammunition', () => {
    expect(planReload(weapon({ useAmmo: false })).status).toBe('untracked');
  });
});
