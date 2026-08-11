import { describe, it, expect } from 'vitest';
import { installFoundryFieldStubs, defaultsOf, templateDefaults, template, manifest, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();

const { ITEM_MODELS } = (await import('../module/data/item-models.js')) as {
  ITEM_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

describe('item DataModels reproduce template.json exactly', () => {
  for (const type of Object.keys(ITEM_MODELS)) {
    it(`${type} defaults match`, () => {
      expect(defaultsOf(ITEM_MODELS[type].defineSchema())).toEqual(templateDefaults('Item', type));
    });
  }

  it('covers every Item type the manifest declares', () => {
    expect(Object.keys(ITEM_MODELS).sort()).toEqual(Object.keys(manifest.documentTypes.Item).sort());
  });

  it('covers every Item type template.json declares', () => {
    expect(Object.keys(ITEM_MODELS).sort()).toEqual([...template.Item.types].sort());
  });

  it('every item carries the shared description field', () => {
    for (const type of Object.keys(ITEM_MODELS)) {
      expect(defaultsOf(ITEM_MODELS[type].defineSchema()).description).toBe('');
    }
  });
});
