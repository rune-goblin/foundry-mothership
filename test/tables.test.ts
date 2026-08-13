import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { parseRollSpec } from '../module/rolls/parse.ts';
import { ANDROID_PANIC_RESULT } from '../module/rules.ts';
import {
  androidSubstitution,
  isRobotic,
  isTableKey,
  rollOnTable,
  TABLES,
  TABLE_KEYS,
  tableId,
  tableSettings,
  tableSpec,
  WOUND_TABLE_KEYS,
  type TableDocument,
} from '../module/tables/tables.ts';
import { clearFoundryStubs, installRoll } from './foundry-stubs.ts';

const ids = JSON.parse(
  readFileSync(fileURLToPath(new URL('../content/ids.json', import.meta.url)), 'utf8'),
) as { packs: { rolltables: { documents: Record<string, { id: string }> } } };

afterEach(clearFoundryStubs);

describe('table identity is data, not a display name', () => {
  // Audit RC13: the seven settings defaults were bare ids with nothing tying them to the registry
  // that mints them. This join is that tie: re-mint an id and this fails before a world does.
  it('every key names the document content/ids.json minted for it', () => {
    for (const key of TABLE_KEYS) {
      expect(ids.packs.rolltables.documents[TABLES[key].contentId]?.id).toBe(TABLES[key].id);
    }
  });

  it('claims exactly the seven tables the system rolls on', () => {
    expect(TABLE_KEYS).toHaveLength(7);
    expect(WOUND_TABLE_KEYS).toEqual(['bleeding', 'blunt-force', 'fire-explosives', 'gore-massive', 'gunshot']);
    expect(isTableKey('panic')).toBe(true);
    expect(isTableKey('Panic Check')).toBe(false);
  });

  it('reproduces the seven world settings, defaults included', () => {
    expect(tableSettings()).toEqual([
      { key: 'panic', setting: 'table1ePanicStressNormal', default: 'ypcoikqHLhnc9tNs' },
      { key: 'death', setting: 'table1eDeath', default: 'W36WFIpCfMknKgHy' },
      { key: 'bleeding', setting: 'table1eWoundBleeding', default: 'ata3fRz3uoPfNCLh' },
      { key: 'blunt-force', setting: 'table1eWoundBluntForce', default: '31YibfjueXuZdNLb' },
      { key: 'fire-explosives', setting: 'table1eWoundFireExplosives', default: 'lqiaWwh5cGcJhvnu' },
      { key: 'gore-massive', setting: 'table1eWoundGoreMassive', default: 'uVfC1CqYdojaJ7yR' },
      { key: 'gunshot', setting: 'table1eWoundGunshot', default: 'XjDU2xFOWEasaZK0' },
    ]);
  });

  it('takes the GM’s table when a setting names one, and the shipped table when it does not', () => {
    (globalThis as Record<string, unknown>).game = {
      settings: { get: (_ns: string, key: string) => (key === 'table1eDeath' ? 'someOtherTable' : '') },
    };

    expect(tableId('death')).toBe('someOtherTable');
    expect(tableId('panic')).toBe(TABLES.panic.id);
  });

  // Audit F2: a table asked for without a roll string got a dialog titled "Panic Check" and a
  // d20, whatever table it was. The die belongs to the table, so there is nothing left to guess.
  it('asks for the die the book gives the table, aimed the way that table is read', () => {
    expect(tableSpec('panic', 'advantage')).toMatchObject({ dice: '1d20', aim: 'high', advantage: 'advantage' });
    expect(tableSpec('gunshot')).toMatchObject({ dice: '1d10', aim: 'low', advantage: 'none' });

    for (const key of TABLE_KEYS) {
      expect(tableSpec(key).dice).toBe(key === 'panic' ? '1d20' : '1d10');
    }
  });
});

const rows = [
  { _id: 'r01', type: 'text', img: 'row.png', description: 'A scratch.', range: [0, 0] },
  { _id: 'r02', type: 'text', img: 'row.png', description: 'A gash.', range: [1, 1] },
  {
    _id: 'r19',
    type: 'text',
    img: 'row.png',
    description:
      '<span data-mosh-voice="human">HEART ATTACK</span><span data-mosh-voice="android">SHORT CIRCUIT</span>. Ouch.',
    range: [19, 19],
  },
];

function table(name = 'Blunt Force Wound'): TableDocument {
  return {
    name,
    img: 'systems/mothershiprpg/images/icons/ui/rolltables/wounds_blunt_force.png',
    formula: '1d10-1',
    getResultsForRoll: (value) => rows.filter((row) => value >= row.range[0] && value <= row.range[1]),
  };
}

describe('rollOnTable', () => {
  it('rolls the spec through the roll domain and reads the row it lands on', async () => {
    const log = installRoll([{ faces: 10, result: 1 }]);

    const draw = await rollOnTable(table(), { key: 'blunt-force', spec: tableSpec('blunt-force') });

    expect(log.formulas).toEqual(['1d10']);
    expect(draw.outcome.total).toBe(1);
    expect(draw.rows).toEqual([
      { _id: 'r02', type: 'text', img: 'row.png', description: 'A gash.', documentUuid: null, range: [1, 1] },
    ]);
    expect(draw.rowType).toBe('text');
    expect(draw.wound).toBe(true);
  });

  it('builds the pool a modifier asks for', async () => {
    const log = installRoll([
      { faces: 10, result: 4 },
      { faces: 10, result: 1 },
    ]);

    const draw = await rollOnTable(table(), {
      key: 'gunshot',
      spec: tableSpec('gunshot', 'advantage'),
    });

    expect(log.formulas).toEqual(['{1d10,1d10}kl']);
    expect(draw.outcome.total).toBe(1);
  });

  // Audit F13: legacy decided a table was a Wound table by the last five letters of its *name*,
  // and that it was the Panic Check by comparing the whole name. Renaming a table — or shipping a
  // translated one — changed the game. Identity is the key now, so the name is only ever printed.
  it('behaves the same when the table is renamed', async () => {
    installRoll([{ faces: 10, result: 0 }]);
    const renamed = await rollOnTable(table('Tabela de Ferimentos'), {
      key: 'blunt-force',
      spec: tableSpec('blunt-force'),
    });

    expect(renamed.name).toBe('Tabela de Ferimentos');
    expect(renamed.wound).toBe(true);
    expect(renamed.rows[0]._id).toBe('r01');
  });

  it('judges a Panic Check against Stress and a lookup table against nothing', async () => {
    installRoll([{ faces: 20, result: 19 }]);
    const panic = await rollOnTable(table('Panic Check'), {
      key: 'panic',
      spec: tableSpec('panic'),
      target: 5,
    });

    expect(panic.outcome.success).toBe(true);
    expect(panic.wound).toBe(false);

    installRoll([{ faces: 10, result: 0 }]);
    const wound = await rollOnTable(table(), { key: 'blunt-force', spec: tableSpec('blunt-force') });
    expect(wound.outcome.target).toBeNull();
    expect(wound.outcome.success).toBe(false);
  });

  // Audit F22: the android line was chosen by reading `system.class.value` on any actor, so a
  // creature that panicked to 19 threw instead of reading its result.
  it('keeps one half of the Panic 19 result, and lets a creature through', async () => {
    const draw = async (robotic: boolean) => {
      installRoll([{ faces: 20, result: 19 }]);
      const result = await rollOnTable(table('Panic Check'), {
        key: 'panic',
        spec: tableSpec('panic'),
        target: 20,
        robotic,
      });
      return result.rows[0].description;
    };

    expect(await draw(true)).toBe('SHORT CIRCUIT. Ouch.');
    expect(await draw(false)).toBe('HEART ATTACK. Ouch.');
  });

  it('leaves every other row alone', () => {
    expect(androidSubstitution('You freeze up.', true, 4)).toBe('You freeze up.');
    // Even at the right roll, text carrying no voice marker is untouched.
    expect(androidSubstitution('You freeze up.', true, ANDROID_PANIC_RESULT)).toBe('You freeze up.');
  });

  // The old version matched the active locale's English against text baked in at build time, so a
  // translated world's Panic 19 never substituted (it only ever worked by English coincidence).
  it('substitutes by the voice marker, not by matching English text — a translated row still works', () => {
    const translated =
      '<span data-mosh-voice="human">ATAQUE CARDÍACO</span><span data-mosh-voice="android">CURTO-CIRCUITO</span>. Ai.';

    expect(androidSubstitution(translated, true, ANDROID_PANIC_RESULT)).toBe('CURTO-CIRCUITO. Ai.');
    expect(androidSubstitution(translated, false, ANDROID_PANIC_RESULT)).toBe('ATAQUE CARDÍACO. Ai.');
  });
});

const character = (system: object, items: object[] = []) => ({ type: 'character', system, items });

describe('isRobotic', () => {
  it('reads the class item’s flag', () => {
    const android = character({ class: { value: '' } }, [{ type: 'class', system: { robotic: true } }]);
    const marine = character({ class: { value: '' } }, [{ type: 'class', system: { robotic: false } }]);

    expect(isRobotic(android)).toBe(true);
    expect(isRobotic(marine)).toBe(false);
  });

  it('falls back to the stored class name when no class item is embedded', () => {
    expect(isRobotic(character({ class: { value: 'Android' } }))).toBe(true);
    expect(isRobotic(character({ class: { value: 'Teamster' } }))).toBe(false);
  });

  it('prefers the item over the name, because the flag is the machine-readable half', () => {
    const relabelled = character({ class: { value: 'Android' } }, [{ type: 'class', system: { robotic: false } }]);

    expect(isRobotic(relabelled)).toBe(false);
  });

  it('answers no for a creature instead of reading a field it has no schema for', () => {
    expect(isRobotic({ type: 'creature', system: {} })).toBe(false);
    expect(isRobotic({ type: 'creature' })).toBe(false);
    expect(isRobotic(null)).toBe(false);
  });

  // A class item dropped on a creature does not make it a crew member: the android line belongs
  // to the class a *character* took, and a creature's Panic result reads the way anyone else's does.
  it('answers no for a creature carrying a class item', () => {
    expect(isRobotic({ type: 'creature', system: {}, items: [{ type: 'class', system: { robotic: true } }] })).toBe(
      false,
    );
  });
});

describe('the roll a table asks for is the roll domain’s', () => {
  it('parses the same way `rolls/` parses everything else', () => {
    expect(tableSpec('death')).toEqual({ ...parseRollSpec('1d10', 'low'), advantage: 'none' });
  });
});
