import { describe, it, expect } from 'vitest';
import { MothershipItem } from '../module/documents/item.ts';

type Fake = { system: Record<string, unknown>; writes: Record<string, unknown>[] } & Partial<MothershipItem>;

function weapon(system: Record<string, unknown>): Fake {
  const writes: Record<string, unknown>[] = [];
  return {
    id: 'weapon1',
    name: 'Pulse Rifle',
    img: 'icons/weapon.png',
    type: 'weapon',
    system,
    writes,
    update: async (data: Record<string, unknown>) => {
      writes.push(data);
      Object.assign(system, data['system.curShots'] === undefined ? {} : { curShots: data['system.curShots'] });
      Object.assign(system, data['system.ammo'] === undefined ? {} : { ammo: data['system.ammo'] });
      return data;
    },
  };
}

const fire = (item: Fake) => MothershipItem.prototype.fire.call(item as unknown as MothershipItem);
const reload = (item: Fake) => MothershipItem.prototype.reload.call(item as unknown as MothershipItem);
const toChat = (item: Fake) => MothershipItem.prototype.toChat.call(item as unknown as MothershipItem);

describe('MothershipItem.fire', () => {
  it('decrements the magazine in one write', async () => {
    const item = weapon({ useAmmo: true, shots: 6, curShots: 6, ammo: 12, shotsPerFire: 2 });

    await expect(fire(item)).resolves.toMatchObject({ status: 'fired', spent: 2, curShots: 4 });
    expect(item.writes).toEqual([{ 'system.curShots': 4 }]);
  });

  it('writes nothing when the weapon tracks no ammunition', async () => {
    const item = weapon({ useAmmo: false, damage: '1d10' });

    await expect(fire(item)).resolves.toMatchObject({ status: 'fired', spent: 0 });
    expect(item.writes).toEqual([]);
  });

  it('writes nothing when it cannot fire', async () => {
    const empty = weapon({ useAmmo: true, shots: 6, curShots: 0, ammo: 0, shotsPerFire: 1 });
    const dry = weapon({ useAmmo: true, shots: 6, curShots: 0, ammo: 12, shotsPerFire: 1 });

    await expect(fire(empty)).resolves.toMatchObject({ status: 'out-of-ammo' });
    await expect(fire(dry)).resolves.toMatchObject({ status: 'needs-reload' });
    expect([...empty.writes, ...dry.writes]).toEqual([]);
  });

  // Audit F5: the sheet's damage button used to spend a shot, double-charging the attack that
  // already had. Only fire() spends, and only an attack calls fire().
  it('is the only method that spends a shot', async () => {
    const item = weapon({ useAmmo: true, shots: 6, curShots: 6, ammo: 12, shotsPerFire: 1 });

    toChat(item);
    await reload(item);
    expect(item.writes).toEqual([]);
    expect(item.system.curShots).toBe(6);
  });
});

describe('MothershipItem.reload', () => {
  it('moves the reserve into the magazine in one write', async () => {
    const item = weapon({ useAmmo: true, shots: 6, curShots: 2, ammo: 4, shotsPerFire: 1 });

    await expect(reload(item)).resolves.toMatchObject({ status: 'reloaded', loaded: 4 });
    expect(item.writes).toEqual([{ 'system.curShots': 6, 'system.ammo': 0 }]);
  });

  it('writes nothing when there is nothing to reload', async () => {
    const item = weapon({ useAmmo: true, shots: 6, curShots: 2, ammo: 0, shotsPerFire: 1 });

    await expect(reload(item)).resolves.toMatchObject({ status: 'out-of-ammo' });
    expect(item.writes).toEqual([]);
  });
});

describe('MothershipItem.toChat', () => {
  it('reports the item as data, with no markup in it', () => {
    const item = weapon({ description: '<p>Standard issue.</p>', roll: '' });

    expect(toChat(item)).toEqual({
      itemId: 'weapon1',
      name: 'Pulse Rifle',
      img: 'icons/weapon.png',
      type: 'weapon',
      description: '<p>Standard issue.</p>',
      roll: null,
    });
  });

  it("carries an ability's roll expression for the card to evaluate", () => {
    const item = weapon({ description: '', roll: '1d10' });

    expect(toChat(item).roll).toBe('1d10');
  });
});
