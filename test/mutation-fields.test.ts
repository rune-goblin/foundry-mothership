import { describe, expect, it } from 'vitest';

import { addressOf, FIELD_KEYS, isFieldKey } from '../module/mutation/fields.ts';
import { parseFieldAddress } from '../module/mutation/address.ts';
import { installFoundryFieldStubs, leaves, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();
const { ACTOR_MODELS } = (await import('../module/data/actor-models.js')) as {
  ACTOR_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

const character = new Set(leaves(ACTOR_MODELS.character.defineSchema()));

describe('the fields content can name', () => {
  // A field key that names nothing would be discovered as a runtime AddressError in a player's
  // chat log. The schema is right here, so it is discovered by this instead.
  it('every one addresses a number the character schema declares', () => {
    for (const key of FIELD_KEYS) {
      for (const leaf of ['value', 'min', 'max'] as const) {
        expect(character.has(addressOf(key, leaf).replace('system.', ''))).toBe(true);
      }
    }
  });

  it('produces addresses the mutation engine parses', () => {
    expect(parseFieldAddress(addressOf('stress'))).toMatchObject({
      path: 'system.other.stress.value',
      pod: 'stress',
      leaf: 'value',
    });
    expect(parseFieldAddress(addressOf('wounds', 'max'))).toMatchObject({
      path: 'system.hits.max',
      pod: 'hits',
    });
  });

  // The book calls the track Wounds and the schema calls it `hits`; content writes the book's word.
  it('names the Wound track the way the book does', () => {
    expect(addressOf('wounds')).toBe('system.hits.value');
    expect(isFieldKey('hits')).toBe(false);
    expect(isFieldKey('wounds')).toBe(true);
  });
});
