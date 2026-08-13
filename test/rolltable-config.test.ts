import { describe, expect, it } from 'vitest';

import { tableSettings } from '../module/tables/tables.ts';

// `RolltableConfigApp.js` reads `foundry.applications.api` at module scope; stub it before the
// dynamic import below evaluates the module, the way `scripts/content/models.ts` stubs Foundry's
// field classes before its own dynamic import (`installFoundryFieldStubs`).
(globalThis as Record<string, unknown>).foundry = { applications: { api: { ApplicationV2: class {} } } };

const { ROLLTABLE_KEYS } = await import('../module/ui/settings/RolltableConfigApp.js');

/**
 * R5 wires the new `tables/tables.ts` tree in; until then this pins the two lists to each other
 * so the live UI's setting keys cannot quietly drift from the ones the remake now generates them
 * from — the failure this file is a placeholder against, not a dependency the R4b window takes on.
 */
describe('ROLLTABLE_KEYS', () => {
  it('names the same seven settings tableSettings() does', () => {
    expect([...ROLLTABLE_KEYS].sort()).toEqual(tableSettings().map((setting) => setting.setting).sort());
  });
});
