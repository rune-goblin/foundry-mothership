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

// template.json has no oracle for an empty array's element shape, so walk the schema instead.
describe('the class adjustment lists', () => {
  const selected = () =>
    ITEM_MODELS.class.defineSchema().selected_adjustment.schema as Record<string, Stub>;

  it('describes one chosen stat as a modification and the stats it may be spent on', () => {
    expect(defaultsOf(selected().choose_stat.element!.schema!)).toEqual({ modification: 0, stats: [] });
  });

  it('describes a choose_skill_or option as a named pick-set plus its own skill list', () => {
    const option = selected().choose_skill_or.element!.element!.schema!;
    expect(defaultsOf(option)).toEqual({
      name: '',
      trained: 0,
      expert: 0,
      expert_full_set: 0,
      master: 0,
      master_full_set: 0,
      from_list: [],
    });
  });

  it('gives choose_skill_and the same pick-set keys, so one dialog reads both', () => {
    const option = selected().choose_skill_or.element!.element!.schema!;
    const picks = Object.keys(option).filter((key) => key !== 'name' && key !== 'from_list');
    expect(Object.keys(selected().choose_skill_and.schema!).sort()).toEqual(picks.sort());
  });
});
