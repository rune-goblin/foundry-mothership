// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  ACTION_ATTRIBUTE,
  ACTION_PATTERN,
  actionButton,
  actionLabel,
  CHECK_SCOPES,
  enrichAction,
  formatAction,
  gainAddress,
  parseAction,
  registerEnrichers,
  type ChatAction,
} from '../module/chat/enrichers.ts';
import { clearFoundryStubs, installI18n } from './foundry-stubs.ts';
// Straight from the recorder rather than through `field-stubs.ts`, which reads `template.json`
// off disk — this spec runs in jsdom, where `import.meta.url` is not a file URL.
import { installFoundryFieldStubs } from '../scripts/model-schema.ts';

installFoundryFieldStubs();
const { ROLL_SCOPES } = (await import('../module/data/item-models.js')) as { ROLL_SCOPES: string[] };

afterEach(clearFoundryStubs);

const parsed = (text: string): ChatAction => {
  const result = parseAction(text);
  if (!result.ok) throw new Error(`${text}: ${result.fault} — ${result.detail}`);
  return result.action;
};

/**
 * The fifteen macro documents content actually references today — six condition descriptions and
 * the Panic table's eight condition results — as expressions. This table is the unit's contract
 * with R4: when the content stops linking macros, these are what it links instead.
 */
const CONTENT_ACTIONS: readonly (readonly [string, string, ChatAction])[] = [
  ['Bleeding', '@Gain[health -bleeding]', { verb: 'gain', field: 'health', leaf: 'value', amount: { kind: 'severity', condition: 'bleeding', sign: -1 } }],
  ['Coward', '@Check[fear]', { verb: 'check', scope: 'fear', advantage: 'none' }],
  ['Frightened, save', '@Check[fear -]', { verb: 'check', scope: 'fear', advantage: 'disadvantage' }],
  ['Frightened, stress', '@Gain[stress 1d5]', { verb: 'gain', field: 'stress', leaf: 'value', amount: { kind: 'roll', dice: '1d5' } }],
  ['Deflated', '@Gain[stress 1]', { verb: 'gain', field: 'stress', leaf: 'value', amount: { kind: 'amount', amount: 1 } }],
  ['Nightmares', '@Check[restSave -]', { verb: 'check', scope: 'restSave', advantage: 'disadvantage' }],
  ['Spiraling', '@Check[panicCheck -]', { verb: 'check', scope: 'panicCheck', advantage: 'disadvantage' }],
  ['Panic 5', '@Apply[coward]', { verb: 'apply', condition: 'coward', count: 1 }],
  ['Panic 6', '@Apply[frightened]', { verb: 'apply', condition: 'frightened', count: 1 }],
  ['Panic 7', '@Apply[nightmares]', { verb: 'apply', condition: 'nightmares', count: 1 }],
  ['Panic 8', '@Apply[loss-of-confidence]', { verb: 'apply', condition: 'loss-of-confidence', count: 1 }],
  ['Panic 9', '@Apply[deflated]', { verb: 'apply', condition: 'deflated', count: 1 }],
  ['Panic 10', '@Apply[doomed]', { verb: 'apply', condition: 'doomed', count: 1 }],
  ['Panic 12', '@Apply[haunted]', { verb: 'apply', condition: 'haunted', count: 1 }],
  ['Panic 17', '@Apply[spiraling]', { verb: 'apply', condition: 'spiraling', count: 1 }],
];

describe('the grammar covers what content links today', () => {
  for (const [name, text, action] of CONTENT_ACTIONS) {
    it(`${name}: ${text}`, () => {
      expect(parsed(text)).toEqual(action);
      expect(formatAction(action)).toBe(text);
    });
  }

  it('states each of the four verbs once, with the variation as arguments', () => {
    expect(new Set(CONTENT_ACTIONS.map(([, , action]) => action.verb))).toEqual(
      new Set(['check', 'gain', 'apply']),
    );
  });
});

describe('parsing', () => {
  it('reads a modifier as the advantage it means', () => {
    expect(parsed('@Check[body +]')).toMatchObject({ advantage: 'advantage' });
    expect(parsed('@Check[body -]')).toMatchObject({ advantage: 'disadvantage' });
    expect(parsed('@Check[body]')).toMatchObject({ advantage: 'none' });
  });

  it('reads a bound as the leaf it addresses, and writes it back', () => {
    expect(gainAddress(parsed('@Gain[stress 1]') as never)).toBe('system.other.stress.value');
    expect(gainAddress(parsed('@Gain[stress.min 1]') as never)).toBe('system.other.stress.min');
    expect(gainAddress(parsed('@Gain[stress.max -1d10]') as never)).toBe('system.other.stress.max');
    expect(gainAddress(parsed('@Gain[wounds 1]') as never)).toBe('system.hits.value');

    for (const text of ['@Gain[stress.min 1]', '@Gain[stress.max -1d10]', '@Gain[wounds -1]']) {
      expect(formatAction(parsed(text))).toBe(text);
    }
  });

  it('reads a severity by count, and a count by number', () => {
    expect(parsed('@Apply[bleeding 2]')).toEqual({ verb: 'apply', condition: 'bleeding', count: 2 });
    expect(formatAction({ verb: 'apply', condition: 'bleeding', count: 2 })).toBe('@Apply[bleeding 2]');
  });

  it('takes a label the way `@UUID` does', () => {
    const result = parseAction('@Gain[health -bleeding]{Take Bleeding Damage}');

    expect(result).toMatchObject({ ok: true, label: 'Take Bleeding Damage' });
  });

  it('refuses what it cannot mean, saying which half was wrong', () => {
    expect(parseAction('@Check[luck]')).toMatchObject({ ok: false, fault: 'argument' });
    expect(parseAction('@Gain[morale 1]')).toMatchObject({ ok: false, fault: 'argument' });
    expect(parseAction('@Gain[stress]')).toMatchObject({ ok: false, fault: 'argument' });
    expect(parseAction('@Gain[stress.middle 1]')).toMatchObject({ ok: false, fault: 'argument' });
    expect(parseAction('@Apply[coward 0]')).toMatchObject({ ok: false, fault: 'argument' });
    expect(parseAction('@Roll[fear]')).toMatchObject({ ok: false, fault: 'syntax' });
    expect(parseAction('')).toMatchObject({ ok: false, fault: 'syntax' });
  });

  // A Panic Check draws from a table and is judged against Stress. Two spellings for one action
  // is how a vocabulary starts to drift, so the parser names the one that exists.
  it('has one spelling for a Panic Check', () => {
    expect(parseAction('@Table[panic]')).toMatchObject({ ok: false, detail: 'a Panic Check is @Check[panicCheck]' });
    expect(parsed('@Table[gunshot -]')).toEqual({ verb: 'table', table: 'gunshot', advantage: 'disadvantage' });
  });

  // S8 gave conditions a `scope` enum so a condition modifies only the roll its text names. A
  // check names the same key space, so `@Check[restSave]` is the roll Nightmares talks about.
  it('names checks with the schema’s own scope vocabulary', () => {
    expect([...CHECK_SCOPES]).toEqual(ROLL_SCOPES);
  });
});

describe('the button', () => {
  it('carries the expression it was written as', () => {
    const button = actionButton(parsed('@Check[fear -]'));

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.dataset.action).toBe(ACTION_ATTRIBUTE);
    expect(button.dataset.moshAction).toBe('@Check[fear -]');
    expect(parsed(button.dataset.moshAction ?? '')).toEqual(parsed('@Check[fear -]'));
  });

  it('labels itself from the lang files, and yields to a label the content gives it', () => {
    installI18n({
      'Mosh.RollScope.fear': 'Fear Save',
      'Mosh.Chat.GainLabel': '{amount} {field}',
      'Mosh.Chat.ApplyLabel': '{count} {condition}',
      'Mosh.Chat.SufferLabel': 'Take {condition} Damage',
      'Mosh.Chat.BoundedField': '{bound} {field}',
      'Mosh.Minimum': 'Minimum',
      'Mosh.Stress': 'Stress',
      'Mosh.Table.gunshot': 'Gunshot Wound',
    });

    expect(actionLabel(parsed('@Check[fear -]'))).toBe('Fear Save [-]');
    expect(actionLabel(parsed('@Gain[stress 1d5]'))).toBe('+1d5 Stress');
    expect(actionLabel(parsed('@Gain[stress.min 1]'))).toBe('+1 Minimum Stress');
    expect(actionLabel(parsed('@Gain[health -bleeding]'))).toBe('Take Bleeding Damage');
    expect(actionLabel(parsed('@Apply[loss-of-confidence]'))).toBe('+1 Loss Of Confidence');
    expect(actionLabel(parsed('@Table[gunshot]'))).toBe('Gunshot Wound');
    expect(actionButton(parsed('@Apply[coward]'), '+1 Coward').textContent).toBe('+1 Coward');
  });
});

describe('enrichment', () => {
  it('matches every expression in a piece of content', () => {
    const text = 'Make a @Check[fear -] or gain @Gain[stress 1d5]{+1d5 Stress}.';

    expect([...text.matchAll(ACTION_PATTERN)].map((match) => match[0])).toEqual([
      '@Check[fear -]',
      '@Gain[stress 1d5]{+1d5 Stress}',
    ]);
  });

  it('leaves an expression it cannot read as text, so a typo is visible', () => {
    expect(enrichAction(['@Check[luck]', 'Check', 'luck'] as unknown as RegExpMatchArray)).toBeNull();
  });

  it('registers once, however often init runs', () => {
    const enrichers: unknown[] = [];
    (globalThis as Record<string, unknown>).CONFIG = { TextEditor: { enrichers } };

    registerEnrichers();
    registerEnrichers();

    expect(enrichers).toHaveLength(1);
  });
});
