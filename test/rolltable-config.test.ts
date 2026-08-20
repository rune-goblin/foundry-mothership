import { describe, expect, it } from 'vitest';

import { tableSettings } from '../module/tables/tables.ts';

// RolltableConfigApp.js reads foundry.applications.api at module scope; stub it before the
// dynamic import below evaluates the module.
(globalThis as Record<string, unknown>).foundry = { applications: { api: { ApplicationV2: class {} } } };

const { ROLLTABLE_KEYS } = await import('../module/ui/settings/RolltableConfigApp.js');

describe('ROLLTABLE_KEYS', () => {
  it('names the same seven settings tableSettings() does', () => {
    expect([...ROLLTABLE_KEYS].sort()).toEqual(tableSettings().map((setting) => setting.setting).sort());
  });
});
