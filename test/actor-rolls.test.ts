import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  runCheck: vi.fn(async () => null),
  promptCheck: vi.fn(async () => null),
  promptSkillCheck: vi.fn(async () => null),
  checkOf: vi.fn(),
  runTable: vi.fn(async () => null),
}));

vi.mock('../module/checks/checks.ts', () => ({
  runCheck: services.runCheck,
  promptCheck: services.promptCheck,
  promptSkillCheck: services.promptSkillCheck,
  checkOf: services.checkOf,
}));

vi.mock('../module/checks/tables.ts', () => ({ runTable: services.runTable }));

const { MothershipActor } = await import('../module/documents/actor.ts');

const actor = () => new MothershipActor();

beforeEach(() => {
  for (const service of Object.values(services)) service.mockClear();
});

describe('the roll methods', () => {
  it('rolls a stat against the stat that was named', async () => {
    const sarah = actor();
    await sarah.rollStat('body', { advantage: 'disadvantage' });

    expect(services.runCheck).toHaveBeenCalledWith(sarah, { kind: 'stat', stat: 'body' }, {
      advantage: 'disadvantage',
    });
  });

  it('asks which stat when nobody has named one', async () => {
    const sarah = actor();
    await sarah.promptCheck();

    expect(services.promptCheck).toHaveBeenCalledWith(sarah, {});
    expect(services.runCheck).not.toHaveBeenCalled();
  });

  it('rolls a skill by its id, leaving the stat to the prompt', async () => {
    const sarah = actor();
    await sarah.rollSkill('skill1');

    expect(services.promptSkillCheck).toHaveBeenCalledWith(sarah, 'skill1', {});
  });

  it('attacks with a weapon by default', async () => {
    const sarah = actor();
    await sarah.rollWeapon('wpn1');

    expect(services.runCheck).toHaveBeenCalledWith(sarah, { kind: 'weapon-attack', itemId: 'wpn1' }, {});
  });

  it('rolls damage as its own kind, carrying an override the caller states', async () => {
    const sarah = actor();
    await sarah.rollWeapon('wpn1', { roll: 'damage', damage: '3d10' });

    expect(services.runCheck).toHaveBeenCalledWith(
      sarah,
      { kind: 'weapon-damage', itemId: 'wpn1', damage: '3d10' },
      { damage: '3d10' },
    );
  });

  it('rolls a Panic Check and a Rest Save as themselves', async () => {
    const sarah = actor();
    await sarah.rollPanic();
    await sarah.rollRestSave({ advantage: 'advantage' });

    expect(services.runCheck).toHaveBeenNthCalledWith(1, sarah, { kind: 'panic' }, {});
    expect(services.runCheck).toHaveBeenNthCalledWith(2, sarah, { kind: 'rest-save' }, {
      advantage: 'advantage',
    });
  });

  it('rolls a table by key', async () => {
    const sarah = actor();
    await sarah.rollTable('gunshot', { advantage: 'disadvantage' });

    expect(services.runTable).toHaveBeenCalledWith(sarah, 'gunshot', { advantage: 'disadvantage' });
  });
});
