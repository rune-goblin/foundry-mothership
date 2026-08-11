import { describe, it, expect } from 'vitest';
import { installFoundryFieldStubs, defaultsOf, templateDefaults, template, manifest, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();

const { ACTOR_MODELS } = (await import('../module/data/actor-models.js')) as {
  ACTOR_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

describe('actor DataModels reproduce template.json exactly', () => {
  for (const type of Object.keys(ACTOR_MODELS)) {
    it(`${type} defaults match`, () => {
      expect(defaultsOf(ACTOR_MODELS[type].defineSchema())).toEqual(templateDefaults('Actor', type));
    });
  }

  it('covers every Actor type the manifest declares', () => {
    expect(Object.keys(ACTOR_MODELS).sort()).toEqual(Object.keys(manifest.documentTypes.Actor).sort());
  });

  it('covers every Actor type template.json declares', () => {
    expect(Object.keys(ACTOR_MODELS).sort()).toEqual([...template.Actor.types].sort());
  });
});

// The three types share a `base` template; a model that dropped it would still match its
// own type's defaults only because templateDefaults merges base in too, so assert the
// shared pools explicitly.
describe('every actor carries the shared base pools', () => {
  for (const type of Object.keys(ACTOR_MODELS)) {
    it(`${type} has health, hits, netHP and bleeding`, () => {
      const d = defaultsOf(ACTOR_MODELS[type].defineSchema());
      expect(d.health).toEqual({ value: 10, min: 0, max: 10, label: 'Health' });
      expect(d.hits).toEqual({ value: 0, min: 0, max: 2, label: 'Wounds' });
      expect(d.netHP).toEqual({ value: 20, min: 0, max: 20, label: 'Net HP' });
      expect(d.bleeding).toEqual({ value: 0, min: 0, label: 'Bleeding' });
    });
  }
});
