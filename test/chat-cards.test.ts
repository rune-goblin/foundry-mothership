import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  asset,
  checkCard,
  descriptionCard,
  flavor,
  mutationCard,
  outcomeHtml,
  postCard,
  reloadCard,
  rollHtml,
  SYSTEM_ID,
  tableCard,
  templateOf,
  voiceOf,
  type CardSource,
} from '../module/chat/cards.ts';
import { mutate, type MutableDocument, type MutationResult } from '../module/mutation/mutate.ts';
import { parseRollSpec } from '../module/rolls/parse.ts';
import { resolveOutcome, type Outcome } from '../module/rolls/resolve.ts';
import { CHECK_SEMANTICS } from '../module/rolls/spec.ts';
import { tableSpec, type TableDraw } from '../module/tables/tables.ts';
import { clearFoundryStubs, installI18n } from './foundry-stubs.ts';

afterEach(clearFoundryStubs);

const SOURCE: CardSource = { actorId: 'actor1', actorImg: 'actor.png', tokenId: null };

const data = <T,>(card: { data: object }): T => card.data as T;

function outcome(spec: string, results: number[], target: number | null, kind: 'stat' | 'panic' = 'stat'): Outcome {
  const semantics = CHECK_SEMANTICS[kind];
  const parsed = parseRollSpec(spec, semantics.aim);
  return resolveOutcome(
    { total: results[0], dice: results.map((result) => ({ faces: 100, results: [{ result }] })) },
    { spec: parsed, kind, target, comparison: semantics.comparison, crits: semantics.crits, zeroBased: semantics.zeroBased },
  );
}

describe('asset paths', () => {
  it('name the system this system actually is', () => {
    expect(SYSTEM_ID).toBe('mothershiprpg');
    expect(asset('images/icons/ui/attributes/health.png')).toBe(
      'systems/mothershiprpg/images/icons/ui/attributes/health.png',
    );
    expect(templateOf('table')).toBe('systems/mothershiprpg/templates/chat/rollTable.html');
  });
});

describe('the verdict line', () => {
  it('names what happened, from the lang files', () => {
    installI18n({
      'Mothership.Chat.Success': 'SUCCESS!',
      'Mothership.Chat.Failure': 'FAILURE!',
      'Mothership.Chat.CriticalSuccess': 'CRITICAL SUCCESS!',
      'Mothership.Chat.CriticalFailure': 'CRITICAL FAILURE!',
    });

    expect(outcomeHtml(outcome('1d100', [30], 40))).toContain('SUCCESS!');
    expect(outcomeHtml(outcome('1d100', [50], 40))).toContain('FAILURE!');
    expect(outcomeHtml(outcome('1d100', [33], 40))).toContain('CRITICAL SUCCESS!');
    expect(outcomeHtml(outcome('1d100', [55], 40))).toContain('CRITICAL FAILURE!');
  });

  it('prints nothing for a roll with nothing to beat', () => {
    expect(outcomeHtml(outcome('1d100', [30], null))).toBe('');
  });
});

describe('the dice block', () => {
  it('shows the roll against its target', () => {
    const html = rollHtml(outcome('1d100', [30], 40), { spec: parseRollSpec('1d100', 'low'), comparison: '<' });

    expect(html).toContain('<div class="dice-formula">1d100 <i class="fas fa-less-than"></i> 40</div>');
    expect(html).toContain('<h4 class="dice-total">30</h4>');
    expect(html).toContain('<li class="roll die d10">30</li>');
  });

  it('marks a critical the way it landed, and never touches the Roll to do it', () => {
    const spec = parseRollSpec('1d100 [+]', 'low');

    expect(rollHtml(outcome('1d100 [+]', [33, 70], 40), { spec, comparison: '<' })).toContain(
      '<li class="roll die d10 max">33</li>',
    );
    expect(rollHtml(outcome('1d100 [+]', [55, 70], 40), { spec, comparison: '<' })).toContain(
      '<li class="roll die d10 min">55</li>',
    );
  });
});

describe('the check card', () => {
  it('gives the template every key it reads', () => {
    installI18n({
      'Mothership.Chat.Rolled': 'rolled',
      'Mothership.Chat.LessThan': 'less than',
      'Mothership.Chat.CheckSentenceSkill': 'You {verb} {comparison} your {attribute} plus {skill} skill bonus.',
    });
    const card = checkCard({
      source: SOURCE,
      outcome: outcome('1d100', [30], 40),
      spec: parseRollSpec('1d100', 'low'),
      comparison: '<',
      header: 'Body Save',
      image: asset('images/icons/ui/attributes/body.png'),
      attribute: 'Body',
      skill: 'Athletics',
      skillBonus: 10,
      flavor: 'You hold the airlock closed.',
    });

    expect(card.kind).toBe('check');
    expect(data<Record<string, unknown>>(card)).toMatchObject({
      actor: { _id: 'actor1', img: 'actor.png' },
      tokenId: null,
      msgHeader: 'Body Save',
      attribute: 'Body',
      skill: 'Athletics',
      skillValue: 10,
      // Assembled here, not glued together in the template, which `pt-BR` could not reach.
      checkSentence: 'You rolled less than your <strong>Body</strong> plus <strong>Athletics</strong> skill bonus.',
      showCheck: true,
      showWeapon: false,
      needsDesc: false,
      critFail: false,
    });
  });

  it('names a long header long, so the header pill can shrink its type', () => {
    const long = (header: string) =>
      data<{ longHeader: boolean }>(
        checkCard({
          source: SOURCE,
          outcome: outcome('1d100', [30], 40),
          spec: parseRollSpec('1d100', 'low'),
          comparison: '<',
          header,
          image: 'stat.png',
          attribute: 'Body',
        }),
      ).longHeader;

    expect(long('Body Save')).toBe(false);
    expect(long('Advanced Battle Dress Save')).toBe(true);
  });

  // A miss has nothing to describe.
  it('shows the weapon’s text on a hit and on a damage card, never on a miss', () => {
    const weapon = { _id: 'w1', name: 'Pulse Rifle', img: 'weapon.png', system: { description: '<p>Loud.</p>' } };
    const show = (hit: boolean, damage: boolean) =>
      data<{ showWeapon: boolean }>(
        checkCard({
          source: SOURCE,
          outcome: outcome('1d100', [hit ? 30 : 90], 40),
          spec: parseRollSpec('1d100', 'low'),
          comparison: '<',
          header: 'Pulse Rifle',
          image: 'weapon.png',
          attribute: 'Combat',
          weapon,
          damage,
        }),
      ).showWeapon;

    expect(show(true, false)).toBe(true);
    expect(show(false, false)).toBe(false);
    expect(show(false, true)).toBe(true);
  });

  it('marks a damage-only card, and asks for a description area when the weapon has one', () => {
    const card = checkCard({
      source: SOURCE,
      outcome: outcome('2d10', [7], null),
      spec: parseRollSpec('2d10', 'high'),
      comparison: '>',
      header: 'Pulse Rifle',
      image: 'weapon.png',
      attribute: 'Combat',
      damage: true,
      weapon: { _id: 'w1', name: 'Pulse Rifle', img: 'weapon.png', system: { description: '<p>Loud.</p>' } },
    });

    expect(data<Record<string, unknown>>(card)).toMatchObject({ showCheck: false, needsDesc: true });
  });
});

describe('the table card', () => {
  const draw = (key: TableDraw['key'], name: string): TableDraw => ({
    key,
    name,
    img: 'table.png',
    outcome: outcome('1d20', [19], 5, 'panic'),
    rows: [{ _id: 'r19', type: 'text', img: 'row.png', description: 'HEART ATTACK.', documentUuid: null, range: [19, 19] }],
    rowType: 'text',
    wound: false,
    roll: { total: 19, dice: [], toMessage: async () => null },
  });

  it('takes its prose from the key, not from the table’s name', () => {
    installI18n({
      'Mothership.table.panic_check.roll.human': 'Your heartbeat races.',
      'Mothership.table.panic_check.success.human': 'You regain your composure.',
    });

    const card = tableCard({
      source: SOURCE,
      draw: draw('panic', 'Tabela de Pânico'),
      spec: tableSpec('panic'),
      comparison: '>',
      voice: voiceOf(false),
    });

    expect(data<Record<string, unknown>>(card)).toMatchObject({
      tableName: 'Tabela de Pânico',
      msgDesc: 'Your heartbeat races.',
      flavorText: 'You regain your composure.',
      specialRoll: 'panicCheck',
      tableResultType: 'text',
    });
  });

  it('says nothing where the lang files say nothing', () => {
    installI18n({});
    const card = tableCard({
      source: SOURCE,
      draw: draw('gunshot', 'Gunshot Wound'),
      spec: tableSpec('gunshot'),
      comparison: '<',
      voice: voiceOf(false),
      woundText: 'Wounds increased from 0 to 1.',
    });

    expect(data<Record<string, unknown>>(card)).toMatchObject({
      flavorText: '',
      woundText: 'Wounds increased from 0 to 1.',
    });
  });
});

const FLAVOR = {
  'Mothership.attribute.health.decrease.human': 'You wince from the pain.',
  'Mothership.attribute.health.decreaseHeader.human': 'Health Lost',
  'Mothership.attribute.stress.pastFloor.human': 'You are already at your lowest Stress.',
  'Mothership.attribute.hits.increase.human': 'You take a wound.',
  'Mothership.attribute.hits.hitCeiling.human': 'You are dead.',
  'Mothership.attribute.stress.increase.human': 'Your nerves fray.',
  'Mothership.attribute.stress.increase.android': 'Your processes stall.',
  'Mothership.attribute.stress.increaseHeader.human': 'Stress Gained',
  'Mothership.attribute.stress.hitCeiling.human': 'You are at maximum Stress.',
  'Mothership.HealthZeroMessage2': 'Your health has hit zero and you must take a wound. Your health has been reset to ',
  'Mothership.Chat.FieldChanged': '{field} {direction} from {from} to {to}.',
  'Mothership.Chat.Increased': 'increased',
  'Mothership.Chat.Decreased': 'decreased',
  'Mothership.Chat.ReduceStatBySurplus': 'Reduce the most relevant Stat or Save by {amount}.',
  'Mothership.Maximum': 'Maximum',
};

function actor(system: object): MutableDocument & { writes: Record<string, number>[] } {
  const writes: Record<string, number>[] = [];
  return {
    writes,
    toObject: () => ({ system }),
    update: async (payload: Record<string, number>) => {
      writes.push(payload);
      return payload;
    },
  };
}

const character = () => ({
  health: { value: 10, min: 0, max: 10, label: 'Health' },
  hits: { value: 0, min: 0, max: 2, label: 'Wounds' },
  other: { stress: { value: 18, min: 2, max: 20, label: 'Stress' } },
});

async function changed(address: string, amount: number): Promise<MutationResult> {
  return mutate(actor(character()), address, { kind: 'amount', amount });
}

describe('the mutation card', () => {
  it('narrates the change with the field’s own label', async () => {
    installI18n(FLAVOR);
    const card = mutationCard({ source: SOURCE, result: await changed('system.health.value', -3), voice: 'human' });

    expect(data<Record<string, unknown>>(card)).toMatchObject({
      msgHeader: 'Health Lost',
      msgImgPath: 'systems/mothershiprpg/images/icons/ui/attributes/health.png',
      msgFlavor: 'You wince from the pain.',
      msgOutcome: 'Health decreased from <strong>10</strong> to <strong>7</strong>.',
      modRollString: '',
    });
  });

  it('speaks to an android in its own voice, falling back to the human line', async () => {
    installI18n(FLAVOR);
    const android = mutationCard({ source: SOURCE, result: await changed('system.other.stress.value', 1), voice: 'android' });
    const human = mutationCard({ source: SOURCE, result: await changed('system.other.stress.value', 1), voice: 'human' });

    expect(data<Record<string, string>>(android).msgFlavor).toBe('Your processes stall.');
    expect(data<Record<string, string>>(human).msgFlavor).toBe('Your nerves fray.');
    expect(data<Record<string, string>>(android).msgHeader).toBe('Stress Gained');
  });

  it('shows gaining Stress and relieving it as the two different things they are', async () => {
    installI18n(FLAVOR);
    const gained = mutationCard({ source: SOURCE, result: await changed('system.other.stress.value', 1), voice: 'human' });
    const relieved = mutationCard({ source: SOURCE, result: await changed('system.other.stress.value', -1), voice: 'human' });

    expect(data<Record<string, string>>(gained).msgImgPath).toBe(asset('images/icons/ui/macros/gain_stress.png'));
    expect(data<Record<string, string>>(relieved).msgImgPath).toBe(asset('images/icons/ui/macros/relieve_stress.png'));
  });

  it('names the health the bar came back with when a Wound is spent', async () => {
    installI18n(FLAVOR);
    const result = await mutate(actor(character()), 'system.health.value', { kind: 'amount', amount: -13 });
    const card = mutationCard({ source: SOURCE, result, voice: 'human' });

    expect(result.wounds).toEqual(expect.objectContaining({ from: 0, to: 1 }));
    expect(data<Record<string, string>>(card).msgOutcome).toBe(
      'Your health has hit zero and you must take a wound. Your health has been reset to <strong>7</strong>.' +
        '<br><br>You take a wound.',
    );
  });

  it('says the Wounds ran out', async () => {
    installI18n(FLAVOR);
    const spent = { ...character(), hits: { value: 2, min: 0, max: 2, label: 'Wounds' } };
    const result = await mutate(actor(spent), 'system.health.value', { kind: 'amount', amount: -20 });

    expect(data<Record<string, string>>(mutationCard({ source: SOURCE, result, voice: 'human' })).msgOutcome).toBe(
      'You are dead.',
    );
  });

  // PSG 20: Stress over the maximum is spent reducing a Stat or Save, even once Stress is
  // already sitting at maximum — not only while it overflows.
  it('always says what the Stress that did not fit costs', async () => {
    installI18n(FLAVOR);
    const overflowing = await mutate(actor(character()), 'system.other.stress.value', { kind: 'amount', amount: 4 });
    const atMaximum = await mutate(
      actor({ ...character(), other: { stress: { value: 20, min: 2, max: 20, label: 'Stress' } } }),
      'system.other.stress.value',
      { kind: 'amount', amount: 3 },
    );

    expect(data<Record<string, string>>(mutationCard({ source: SOURCE, result: overflowing, voice: 'human' })).msgOutcome).toBe(
      'Stress increased from <strong>18</strong> to <strong>20</strong>. Reduce the most relevant Stat or Save by 2.',
    );
    expect(data<Record<string, string>>(mutationCard({ source: SOURCE, result: atMaximum, voice: 'human' })).msgOutcome).toBe(
      'You are at maximum Stress. Reduce the most relevant Stat or Save by 3.',
    );
  });

  it('reports a change a bound refused outright', async () => {
    installI18n(FLAVOR);
    const floored = await mutate(
      actor({ ...character(), other: { stress: { value: 2, min: 2, max: 20, label: 'Stress' } } }),
      'system.other.stress.value',
      { kind: 'amount', amount: -2 },
    );

    expect(floored.field).toMatchObject({ from: 2, to: 2 });
    expect(data<Record<string, string>>(mutationCard({ source: SOURCE, result: floored, voice: 'human' })).msgOutcome).toBe(
      'You are already at your lowest Stress.',
    );
  });

  it('names the bound it changed, not the value behind it', async () => {
    installI18n(FLAVOR);
    const card = mutationCard({ source: SOURCE, result: await changed('system.other.stress.max', 1), voice: 'human' });

    expect(data<Record<string, string>>(card).msgHeader).toBe('Maximum Stress Gained');
    expect(data<Record<string, string>>(card).msgOutcome).toBe(
      'Maximum Stress increased from <strong>20</strong> to <strong>21</strong>.',
    );
  });
});

describe('the description card', () => {
  const item = {
    itemId: 'i1',
    name: 'Antique Company Scrip',
    img: 'icons/coin.png',
    type: 'item',
    description: '<p>Trinket</p>',
    roll: null,
  };

  // Guards against swapping the item's name for its description text on a `<p>Trinket</p>`-style
  // body — a quirk of the old AppV1 generator that no shipped document still triggers.
  it('shows the item’s own name, whatever its description says', () => {
    const card = descriptionCard(item, {}, SOURCE);

    expect(data<{ item: Record<string, unknown> }>(card).item).toMatchObject({
      _id: 'i1',
      name: 'Antique Company Scrip',
      system: { description: '<p>Trinket</p>' },
    });
    expect(JSON.stringify(card.data)).not.toContain('swapName');
  });

  it('carries the numbers the card prints beside the description', () => {
    const card = descriptionCard(item, { severity: 2, armorPoints: 3, damageReduction: 0 }, SOURCE);

    expect(data<{ item: { system: Record<string, unknown> } }>(card).item.system).toMatchObject({
      severity: 2,
      armorPoints: 3,
      damageReduction: null,
    });
  });
});

describe('the ammunition cards', () => {
  const weapon = { itemId: 'w1', name: 'Pulse Rifle', img: 'weapon.png', type: 'weapon', description: '', roll: null };

  it('speaks only when there is something to say', () => {
    installI18n({ 'Mothership.WeaponReloaded': 'Weapon reloaded', 'Mothership.OutOfAmmo': 'Out of ammo' });

    expect(reloadCard(weapon, { status: 'reloaded', curShots: 6, ammo: 0, loaded: 6 }, SOURCE)?.data).toEqual({
      actor: { _id: 'actor1', img: 'actor.png' },
      tokenId: null,
      item: { _id: 'w1', name: 'Pulse Rifle' },
      msgBody: 'Weapon reloaded',
    });
    expect(reloadCard(weapon, { status: 'already-full', curShots: 6, ammo: 6, loaded: 0 }, SOURCE)).toBeNull();
    expect(reloadCard(weapon, { status: 'untracked', curShots: 0, ammo: 0, loaded: 0 }, SOURCE)).toBeNull();
  });
});

describe('flavor', () => {
  it('is silent where legacy printed its own argument (audit F20)', () => {
    installI18n({});

    expect(flavor('human', 'attribute', 'health', 'increase')).toBe('');
  });
});

describe('postCard', () => {
  const speaker = { actor: 'actor1', token: null, alias: 'Sam' };

  function foundryStubs(): { renderTemplate: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } {
    const renderTemplate = vi.fn(async () => '<div>card</div>');
    const create = vi.fn(async (message: object) => message);
    (globalThis as Record<string, unknown>).foundry = { applications: { handlebars: { renderTemplate } } };
    (globalThis as Record<string, unknown>).ChatMessage = { create, applyMode: (message: object) => message };
    (globalThis as Record<string, unknown>).game = { user: { id: 'user1' } };
    return { renderTemplate, create };
  }

  it('renders the card’s own template and posts it', async () => {
    const { renderTemplate, create } = foundryStubs();

    await postCard({ kind: 'reload', data: { msgBody: 'Weapon reloaded' } }, { speaker });

    expect(renderTemplate).toHaveBeenCalledWith('systems/mothershiprpg/templates/chat/reload.html', {
      msgBody: 'Weapon reloaded',
    });
    expect(create).toHaveBeenCalledWith({ user: 'user1', speaker, content: '<div>card</div>' });
  });

  it('posts through the roll when there is one, so the dice come with it', async () => {
    const { create } = foundryStubs();
    const toMessage = vi.fn(async () => null);

    await postCard({ kind: 'table', data: {} }, { speaker, roll: { toMessage } });

    expect(toMessage).toHaveBeenCalledWith({ user: 'user1', speaker, content: '<div>card</div>' });
    expect(create).not.toHaveBeenCalled();
  });
});
