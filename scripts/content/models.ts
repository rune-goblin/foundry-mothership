import { installFoundryFieldStubs, type Stub } from '../model-schema.ts';

// item-models.js reads `foundry.data.fields` at module scope, so the stubs have to be in place
// before it is evaluated — hence a dynamic import, which static hoisting would defeat.
installFoundryFieldStubs();

const { ITEM_MODELS } = (await import('../../module/data/item-models.js')) as {
  ITEM_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

export const ITEM_SCHEMAS: Record<string, Record<string, Stub>> = Object.fromEntries(
  Object.entries(ITEM_MODELS).map(([type, model]) => [type, model.defineSchema()]),
);
