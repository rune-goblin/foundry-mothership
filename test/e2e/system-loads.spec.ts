import { test, expect, SYSTEM_ID } from './fixtures/foundry-clients.ts';

// The base smoke: the built bundle actually loads and registers what it claims to. If this
// fails, nothing else in the suite is meaningful.
test.describe('system loads', () => {
  test('the built esmodule initialised and exposed its API', async ({ gmPage }) => {
    const api = await gmPage.evaluate(() => {
      const g = (window as any).game;
      return {
        system: g.system.id,
        api: Object.keys(g.mothershiprpg ?? {}).sort(),
        actorClass: g.actors?.documentClass?.name ?? null,
      };
    });
    expect(api.system).toBe(SYSTEM_ID);
    // mosh.js hangs the macro entry points off game.mothershiprpg during init.
    expect(api.api).toContain('rollItemMacro');
    expect(api.api).toContain('initRollTable');
    expect(api.actorClass).toBe('MothershipActor');
  });

  // v14 injects package styles as `@import "…" layer(system)` inside an inline <style>, not as
  // a <link>. Rules behind an @import are not in the parent sheet's cssRules, so counting them
  // means descending into each CSSImportRule.
  test('the built stylesheet is imported into the system layer and its rules are live', async ({ gmPage }) => {
    const css = await gmPage.evaluate(() => {
      const imports: string[] = [];
      let moshRules = 0;
      const walk = (sheet: CSSStyleSheet) => {
        let rules: CSSRuleList;
        try { rules = sheet.cssRules; } catch { return; }
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSImportRule) {
            imports.push(rule.href ?? '');
            if (rule.styleSheet) walk(rule.styleSheet);
          } else if ((rule as CSSStyleRule).selectorText?.includes('.mosh')) {
            moshRules += 1;
          }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) walk(sheet as CSSStyleSheet);
      return { imports, moshRules };
    });

    expect(css.imports.some((h) => h.includes(`systems/${SYSTEM_ID}/dist/mothershiprpg.css`))).toBe(true);
    // The hand-authored stylesheet carries 247 selectors, most of them under `.mosh`.
    expect(css.moshRules).toBeGreaterThan(100);
  });

  test('every declared document type has a registered DataModel', async ({ gmPage }) => {
    const models = await gmPage.evaluate(() => ({
      actor: Object.keys((window as any).CONFIG.Actor.dataModels ?? {}).sort(),
      item: Object.keys((window as any).CONFIG.Item.dataModels ?? {}).sort(),
    }));
    expect(models.actor).toEqual(['character', 'creature', 'ship']);
    expect(models.item).toEqual(
      ['ability', 'armor', 'class', 'condition', 'crew', 'item', 'module', 'repair', 'skill', 'weapon'],
    );
  });

  test('no 0e compendium is registered any more', async ({ gmPage }) => {
    const packs = await gmPage.evaluate(() => {
      const g = (window as any).game;
      return (Array.from(g.packs.values()) as any[])
        .filter((p) => p.metadata.packageName === g.system.id)
        .map((p) => p.metadata.name);
    });
    expect(packs.filter((n: string) => n.endsWith('_0e'))).toEqual([]);
    expect(packs.sort()).toEqual([
      'conditions_1e', 'items_maintenance_1e', 'macros_hotbar_1e', 'macros_triggered_1e', 'rolltables_1e',
    ]);
  });
});
