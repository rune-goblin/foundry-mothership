import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChatActions, runChatAction } from '../module/chat/actions.ts';
import { parseAction, type ChatAction } from '../module/chat/enrichers.ts';
import type { CheckActor, CheckItem, ItemCollection } from '../module/checks/actor.ts';
import { registerCheckActions, REGISTERED_VERBS, runAction } from '../module/checks/actions.ts';
import { TABLES } from '../module/tables/tables.ts';
import {
  clearFoundryStubs,
  installChat,
  installI18n,
  installNotifications,
  installRoll,
  installSettings,
  type ChatLog,
  type RollLog,
} from './foundry-stubs.ts';

const prompts = vi.hoisted(() => ({
  chooseAdvantage: vi.fn(),
  chooseAttribute: vi.fn(),
  chooseSkill: vi.fn(),
  askReload: vi.fn(),
  outOfAmmo: vi.fn(),
  chooseCover: vi.fn(),
  noCharacter: vi.fn(),
}));

vi.mock('../module/dialogs/prompts.ts', () => prompts);

const action = (text: string): ChatAction => {
  const parsed = parseAction(text);
  if (!parsed.ok) throw new Error(text);
  return parsed.action;
};

function condition(name: string, severity: number): CheckItem {
  return {
    id: `cond-${name}`,
    name,
    img: 'condition.png',
    type: 'condition',
    system: { severity, modifiers: [] },
    fire: async () => ({ status: 'fired', spent: 0, curShots: 0 }),
    reload: async () => ({ status: 'untracked', curShots: 0, ammo: 0, loaded: 0 }),
    toChat: () => ({ itemId: null, name, img: '', type: 'condition', description: '', roll: null }),
  };
}

interface FakeActor extends CheckActor {
  readonly updates: Record<string, number>[];
}

function character(items: readonly CheckItem[] = []): FakeActor {
  const updates: Record<string, number>[] = [];
  const system = {
    health: { value: 9, min: 0, max: 10, label: 'Health' },
    hits: { value: 0, min: 0, max: 2, label: 'Wounds' },
    other: { stress: { value: 4, min: 2, max: 20, label: 'Stress' } },
    class: { value: '' },
    stats: {
      fear: { value: 30, mod: 0, min: 0, max: 99, label: 'Fear', rollLabel: 'Fear Save' },
      combat: { value: 30, mod: 0, min: 0, max: 99, label: 'Combat', rollLabel: 'Combat Check' },
    },
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
    toObject: () => ({ system: JSON.parse(JSON.stringify(system)) as typeof system }),
    update: async (data: Record<string, number>) => {
      updates.push(data);
      return data;
    },
  };
}

const table = {
  name: 'Gunshot Wound',
  img: 'table.png',
  formula: '1d10-1',
  getResultsForRoll: (value: number) => [
    { _id: `row${value}`, type: 'text', img: '', description: `Result ${value}.`, range: [value, value] },
  ],
};

let rolls: RollLog;
let chat: ChatLog;

function stubs(dice: { faces: number; result: number }[]): void {
  installI18n({
    'Mosh.Chat.FieldChanged': '{field} {direction} from {from} to {to}.',
    'Mosh.Chat.Increased': 'increased',
    'Mosh.Chat.Decreased': 'decreased',
  });
  installSettings({ autoStress: true, critDamage: 'advantage', damageDiceTheme: '', panicDieTheme: '' });
  rolls = installRoll(dice);
  chat = installChat();
  const globals = globalThis as unknown as Record<string, Record<string, unknown>>;
  globals.game.tables = { get: (id: string) => (id === TABLES.gunshot.id ? table : undefined) };
  globals.game.packs = [];
}

beforeEach(() => {
  clearChatActions();
  for (const prompt of Object.values(prompts)) prompt.mockReset();
  prompts.chooseSkill.mockResolvedValue({ skill: null, advantage: 'none' });
  prompts.chooseAdvantage.mockResolvedValue('none');
});

afterEach(clearFoundryStubs);

describe('the verbs checks/ answers for', () => {
  it('claims check, table and gain — apply is R4’s, once conditions are documents', () => {
    expect(REGISTERED_VERBS).toEqual(['check', 'table', 'gain']);
  });

  it('routes a click to the flow, against every actor the click was aimed at', async () => {
    stubs([{ faces: 100, result: 10 }]);
    const sarah = character();
    registerCheckActions(() => [sarah]);

    await runChatAction(action('@Check[fear -]'), {
      event: new Event('click') as MouseEvent,
      button: { dataset: {} } as unknown as HTMLElement,
    });

    expect(rolls.formulas).toEqual(['{1d100,1d100}kh']);
    expect(chat.cards[0].data).toMatchObject({ msgHeader: 'Fear Save' });
  });

  it('leaves the verb it cannot serve for the registry to report', async () => {
    stubs([]);
    installI18n({ 'Mosh.Chat.ActionUnavailable': 'Not available yet.' });
    const notices = installNotifications();
    registerCheckActions(() => []);

    runChatAction(action('@Apply[bleeding]'), {
      event: new Event('click') as MouseEvent,
      button: { dataset: {} } as unknown as HTMLElement,
    });

    expect(notices.warnings).toEqual(['Not available yet.']);
  });
});

describe('@Check', () => {
  // §34 — content naming no modifier leaves the choice open, and the prompt is where a condition
  // preselects the button it argues for. Content that states one is an instruction.
  it('opens the prompt when the expression names no modifier', async () => {
    stubs([{ faces: 100, result: 10 }]);
    await runAction(action('@Check[fear]'), [character()]);

    expect(prompts.chooseSkill).toHaveBeenCalledWith(expect.objectContaining({ advantage: true }));
  });

  it('takes the modifier the expression states, without asking', async () => {
    stubs([{ faces: 100, result: 10 }]);
    await runAction(action('@Check[fear +]'), [character()]);

    expect(prompts.chooseSkill).toHaveBeenCalledWith(expect.objectContaining({ advantage: false }));
    expect(rolls.formulas).toEqual(['{1d100,1d100}kl']);
  });
});

describe('@Table', () => {
  // No condition names a Wound table, so there is nothing a dialog could add.
  it('rolls straight away, on the table’s own die', async () => {
    stubs([{ faces: 10, result: 3 }]);
    const sarah = character();

    await runAction(action('@Table[gunshot]'), [sarah]);

    expect(prompts.chooseAdvantage).not.toHaveBeenCalled();
    expect(rolls.formulas).toEqual(['1d10']);
    expect(sarah.updates).toEqual([{ 'system.hits.value': 1 }]);
  });

  it('takes the modifier the expression states', async () => {
    stubs([
      { faces: 10, result: 3 },
      { faces: 10, result: 8 },
    ]);
    await runAction(action('@Table[gunshot -]'), [character()]);

    expect(rolls.formulas).toEqual(['{1d10,1d10}kh']);
  });
});

describe('@Gain', () => {
  it('applies a flat amount and posts what it did', async () => {
    stubs([]);
    const sarah = character();

    await runAction(action('@Gain[stress 1]'), [sarah]);

    expect(sarah.updates).toEqual([{ 'system.other.stress.value': 5 }]);
    expect(chat.cards[0].template).toBe('systems/mothershiprpg/templates/chat/modifyActor.html');
    expect(chat.cards[0].data).toMatchObject({
      msgOutcome: 'Stress increased from <strong>4</strong> to <strong>5</strong>.',
    });
  });

  // Divergence R1-5: a rolled amount is the roll's own arithmetic, not the kept die.
  it('rolls the dice an expression names, and shows them on the card', async () => {
    stubs([{ faces: 5, result: 4 }]);
    const sarah = character();

    await runAction(action('@Gain[stress 1d5]'), [sarah]);

    expect(rolls.formulas).toEqual(['1d5']);
    expect(sarah.updates).toEqual([{ 'system.other.stress.value': 8 }]);
    expect(chat.cards[0].data).toMatchObject({ modRollString: '1d5' });
    expect((chat.cards[0].data as { parsedRollResult: { total: number } }).parsedRollResult.total).toBe(4);
  });

  it('takes the severity of a condition the actor is carrying', async () => {
    stubs([]);
    const sarah = character([condition('Bleeding', 3)]);

    await runAction(action('@Gain[health -bleeding]'), [sarah]);

    expect(sarah.updates).toEqual([{ 'system.health.value': 6 }]);
  });

  it('is worth nothing when the actor carries no such condition', async () => {
    stubs([]);
    const sarah = character();

    await runAction(action('@Gain[health -bleeding]'), [sarah]);

    expect(sarah.updates).toEqual([{ 'system.health.value': 9 }]);
  });
});
