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
  // Ties the settings defaults to the registry that mints them: re-mint an id and this fails
  // before a world does.
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

  // The die belongs to the table, not the dialog that asks for it — there is nothing left to guess.
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
      '<span data-mothership-voice="human">HEART ATTACK</span><span data-mothership-voice="android">SHORT CIRCUIT</span>. Ouch.',
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

  // Identity is the key; the name is only ever printed, so renaming or translating a table
  // cannot change how it behaves.
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

  // Reading system.class.value on any actor would throw for a creature panicking to 19 instead
  // of reading its result.
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

  it('substitutes by the voice marker, not by matching English text — a translated row still works', () => {
    const translated =
      '<span data-mothership-voice="human">ATAQUE CARDÍACO</span><span data-mothership-voice="android">CURTO-CIRCUITO</span>. Ai.';

    expect(androidSubstitution(translated, true, ANDROID_PANIC_RESULT)).toBe('CURTO-CIRCUITO. Ai.');
    expect(androidSubstitution(translated, false, ANDROID_PANIC_RESULT)).toBe('ATAQUE CARDÍACO. Ai.');
  });

  // Every other spec here writes the marker into its own fixture, so the emitter and the reader
  // could drift to two different attribute names and stay green together. This one reads the
  // shipped row, which is the only thing that proves they still agree.
  it('reads the marker the content pipeline actually emitted', () => {
    const panic = JSON.parse(
      readFileSync(fileURLToPath(new URL('../packs/_source/rolltables/Panic_Check.json', import.meta.url)), 'utf8'),
    ) as { results: { range: number[]; description: string }[] };
    const row = panic.results.find((result) => result.range[0] === ANDROID_PANIC_RESULT);
    if (row === undefined) throw new Error(`Panic ${ANDROID_PANIC_RESULT} is missing from the emitted table`);

    const android = androidSubstitution(row.description, true, ANDROID_PANIC_RESULT);
    const human = androidSubstitution(row.description, false, ANDROID_PANIC_RESULT);

    expect(android).toContain('SHORT CIRCUIT');
    expect(android).not.toContain('HEART ATTACK');
    expect(human).toContain('HEART ATTACK');
    expect(human).not.toContain('SHORT CIRCUIT');
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

  // Covers a hand-built character with no embedded class item: deleting this fallback would turn
  // every Android already in a world back into a human on Panic 19, with no migration to fix it.
  it('falls back to the stored class name when no class item is embedded', () => {
    expect(isRobotic(character({ class: { value: 'Android' } }))).toBe(true);
    expect(isRobotic(character({ class: { value: 'Teamster' } }))).toBe(false);
  });

  // A generated character carries one class item; a hand-built one may have collected two, and
  // the flag is what decides — not whichever document the collection happens to iterate first.
  it('reads the flag off any class item the actor holds', () => {
    const both = character({ class: { value: '' } }, [
      { type: 'class', system: { robotic: false } },
      { type: 'class', system: { robotic: true } },
    ]);

    expect(isRobotic(both)).toBe(true);
  });

  it('ignores the stored name once a class item says otherwise', () => {
    expect(isRobotic(character({ class: { value: 'Android' } }, [{ type: 'class', system: {} }]))).toBe(
      false,
    );
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
