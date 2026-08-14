import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CheckActor, CheckItem, ItemCollection } from '../module/checks/actor.ts';
import {
  critFormula,
  damageFlavor,
  rollDamage,
  weaponDamage,
  woundEffectActions,
} from '../module/checks/damage.ts';
import { CRIT_DAMAGE_CHOICES } from '../module/checks/settings.ts';
import { clearFoundryStubs, installChat, installI18n, installRoll, installSettings } from './foundry-stubs.ts';

afterEach(clearFoundryStubs);

const fire = vi.fn(async () => ({ status: 'fired' as const, spent: 1, curShots: 4 }));
const reload = vi.fn(async () => ({ status: 'reloaded' as const, curShots: 5, ammo: 0, loaded: 5 }));

function weapon(system: Record<string, unknown> = {}): CheckItem {
  return {
    id: 'wpn1',
    name: 'Revolver',
    img: 'revolver.png',
    type: 'weapon',
    system: { damage: '1d10', critDmg: '10', description: '<p>Six shots.</p>', woundEffect: '', ...system },
    fire,
    reload,
    toChat: () => ({ itemId: 'wpn1', name: 'Revolver', img: 'revolver.png', type: 'weapon', description: '', roll: null }),
  };
}

function actor(strength = 40, items: readonly CheckItem[] = []): CheckActor & { updates: object[] } {
  const updates: object[] = [];
  const system = {
    stats: { strength: { value: strength, mod: 0, label: 'Strength', rollLabel: 'Strength Check' } },
  };
  const collection: ItemCollection = {
    [Symbol.iterator]: () => items[Symbol.iterator](),
    get: (id) => items.find((item) => item.id === id),
  };

  return {
    id: 'actor1',
    name: 'Sarah',
    img: 'sarah.png',
    type: 'character',
    system,
    items: collection,
    token: null,
    updates,
    toObject: () => ({ system }),
    update: async (data: Record<string, number>) => {
      updates.push(data);
      return data;
    },
  };
}

function stubs(settings: Record<string, unknown> = {}) {
  installI18n({
    'Mothership.Chat.DamageDealt': 'You inflict {damage} points of damage.',
    'Mothership.Chat.UnarmedDamage': 'You strike your target for {damage} damage.',
  });
  installSettings({ critDamage: 'advantage', damageDiceTheme: '', ...settings });
  installRoll([]);
  return installChat();
}

describe('the damage a weapon deals', () => {
  it('is the weapon’s own, until a caller overrides it', () => {
    expect(weaponDamage(weapon())).toBe('1d10');
    expect(weaponDamage(weapon(), '3d10')).toBe('3d10');
    expect(weaponDamage(weapon(), '')).toBe('1d10');
  });

  it('is stated as arithmetic when it is the wielder’s Strength', () => {
    stubs();
    expect(damageFlavor(actor(45), weapon({ damage: 'Str/10' }))).toBe(
      'You strike your target for <strong>[[floor(45/10)]]</strong> damage.',
    );
  });

  it('wears the colorset the GM chose for damage dice', () => {
    stubs({ damageDiceTheme: 'damage' });
    expect(damageFlavor(actor(), weapon())).toBe('You inflict [[1d10[damage]]] points of damage.');
  });
});

describe('what a critical hit does to it', () => {
  it.each([
    ['advantage', '{1d10,1d10}kh'],
    ['doubleDamage', '1d10 * 2'],
    ['doubleDice', '1d10 + 1d10'],
    ['maxDamage', '1 * 10'],
    ['weaponValue', '1d10 + 10'],
    ['none', '1d10'],
  ] as const)('%s', (mode, expected) => {
    expect(critFormula('1d10', mode, '10')).toBe(expected);
  });

  it('covers every choice the setting offers', () => {
    for (const mode of CRIT_DAMAGE_CHOICES) expect(critFormula('1d10', mode, '10')).not.toBe('');
  });

  it('leaves the damage alone when a weapon names no critical damage of its own', () => {
    expect(critFormula('1d10', 'weaponValue', '')).toBe('1d10');
  });

  it('reaches the card only on a critical', () => {
    stubs({ critDamage: 'doubleDamage' });
    expect(damageFlavor(actor(), weapon(), { critical: true })).toContain('[[1d10 * 2]]');
    expect(damageFlavor(actor(), weapon(), { critical: false })).toContain('[[1d10]]');
  });
});

describe('the wound a weapon names', () => {
  // Audit F13/F20/C2: legacy turned this same string into `@UUID` links to fifteen macro
  // documents by way of a lang-file lookup, so a translation could break the link.
  it('becomes the table action for that wound', () => {
    expect(woundEffectActions('Gunshot')).toBe('@Table[gunshot]');
    expect(woundEffectActions('Bleeding [+]')).toBe('@Table[bleeding +]');
    expect(woundEffectActions('Fire & Explosives [-]')).toBe('@Table[fire-explosives -]');
    expect(woundEffectActions('Gore & Massive')).toBe('@Table[gore-massive]');
    expect(woundEffectActions('Blunt Force [+] Gunshot')).toBe('@Table[blunt-force +] @Table[gunshot]');
  });

  it('leaves text naming no table as the text it is', () => {
    expect(woundEffectActions('Target is deafened')).toBe('Target is deafened');
    expect(woundEffectActions('')).toBe('');
  });
});

describe('the damage card', () => {
  it('is posted as a damage card, with the weapon and its wound', async () => {
    const chat = stubs();
    const gun = weapon({ woundEffect: 'Gunshot' });

    await rollDamage(actor(40, [gun]), gun);

    expect(chat.cards).toHaveLength(1);
    expect(chat.cards[0].template).toBe('systems/mothershiprpg/templates/chat/rollCheck.html');
    expect(chat.cards[0].data).toMatchObject({
      specialRoll: 'damage',
      msgHeader: 'Revolver',
      woundEffect: '@Table[gunshot]',
      flavorText: 'You inflict [[1d10]] points of damage.',
    });
  });

  it('takes the caller’s damage when it has one — a swarm’s scaled dice', async () => {
    const chat = stubs();
    const gun = weapon();

    await rollDamage(actor(40, [gun]), gun, { override: '4d10' });

    expect(chat.cards[0].data).toMatchObject({ flavorText: 'You inflict [[4d10]] points of damage.' });
  });
});

/**
 * Audit F5, stated literally. The sheet's damage button spent ammunition because the ammo block
 * ran for any call carrying a weapon, before the damage branch was reached — so attack-then-damage
 * decremented `curShots` twice per shot. The rule is now structural rather than a branch order:
 * nothing the damage flow can reach is able to write shots.
 */
describe('the damage flow never touches the magazine', () => {
  it('calls neither fire nor reload, and writes nothing', async () => {
    stubs();
    fire.mockClear();
    reload.mockClear();
    const gun = weapon({ useAmmo: true, curShots: 6, shots: 6, ammo: 12, shotsPerFire: 1 });
    const sarah = actor(40, [gun]);

    await rollDamage(sarah, gun, { critical: true });

    expect(fire).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(sarah.updates).toEqual([]);
    expect((gun.system as { curShots: number }).curShots).toBe(6);
  });

  const root = fileURLToPath(new URL('../module', import.meta.url));
  const IMPORT = /^\s*import\s+(?!type\b)(?:[^'";]*?from\s+)?'([^']+)'/gm;

  /** Every module reachable from an entry by a *runtime* import; `import type` is erased. */
  function graph(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];

    while (queue.length > 0) {
      const file = queue.pop() as string;
      if (seen.has(file) || !file.endsWith('.ts')) continue;
      seen.add(file);

      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(IMPORT)) {
        if (!match[1].startsWith('.')) continue;
        queue.push(resolve(dirname(file), match[1]));
      }
    }
    return seen;
  }

  it('has no path to the modules that can spend a shot', () => {
    const reached = [...graph(`${root}/checks/damage.ts`)].map((file) => relative(root, file));

    expect(reached).toContain('checks/damage.ts');
    expect(reached).not.toContain('inventory/ammo.ts');
    expect(reached).not.toContain('documents/item.ts');
    // The attack path is the one that does reach them, or this assertion proves nothing.
    const attack = [...graph(`${root}/checks/checks.ts`)].map((file) => relative(root, file));
    expect(attack).toContain('checks/damage.ts');
    expect(attack).toContain('checks/actor.ts');
  });

  it('names no part of the magazine in its own source', () => {
    const source = readFileSync(`${root}/checks/damage.ts`, 'utf8');

    for (const field of ['curShots', 'shotsPerFire', 'useAmmo', '.fire(', '.reload(']) {
      expect(source).not.toContain(field);
    }
  });
});
