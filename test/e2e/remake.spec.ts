import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// docs/plans/legacy-remake.md's Risks section asks R4 to land these before the swap, `test.fixme`
// until it: `game.mothershiprpg` is still the legacy module (module/mosh.js) until R5 rewires
// `init.ts` in, so every one of these would fail today for a reason that has nothing to do with
// what it is testing. R5 removes `.fixme` from each title — nothing else here is provisional.
//
// audit T1: one executed macro per verb family, against a real actor, reading the write back —
// this is exactly the tier that would have caught C1 (a macro that throws on click), RC3 (an item
// macro that throws on `.id`) and RC5 (a macro naming a method defined nowhere).

const TRIGGERED = `mothershiprpg.macros_triggered_1e`;

const create = (page: Page, system: Record<string, unknown> = {}, name = '__e2e_remake') =>
  page.evaluate(
    async ({ s, n }: { s: Record<string, unknown>; n: string }) => {
      const actor = await (window as any).Actor.create({ name: n, type: 'character', system: s });
      // The macros target `game.user.character` by default (macroTarget's shipped setting).
      await (window as any).game.user.update({ character: actor.id });
      return actor.uuid as string;
    },
    { s: system, n: name },
  );

const stored = (page: Page, uuid: string, path: string) =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
  );

/** A compendium macro, executed the way a player clicking it in the hotbar would. */
const runMacro = (page: Page, pack: string, name: string) =>
  page.evaluate(
    async ({ pk, n }: { pk: string; n: string }) => {
      const source = (await (window as any).game.packs.get(pk).getDocuments()).find(
        (d: any) => d.name === n,
      );
      if (!source) throw new Error(`no macro named "${n}" in ${pk}`);
      const [macro] = await (window as any).Macro.createDocuments([source.toObject()]);
      try {
        await macro.execute();
      } finally {
        await macro.delete();
      }
    },
    { pk: pack, n: name },
  );

/**
 * Forces every die this rig covers to read `n`. A plain (no advantage) check rolls exactly one
 * die, so this is deterministic without needing to fight the advantage/disadvantage pool's kh/kl.
 *
 * `DiceTerm.prototype.roll` is an own property, not one inherited from further up the chain, and
 * `Die` (what `1d20`/`1d100`/`1d10` all resolve to) may or may not shadow it with its own — so
 * this patches both and remembers whichever function was actually there first. `unrigDie` puts
 * those exact functions back; a `delete` here would remove the patch and leave `roll` undefined
 * on the prototype rather than restore Foundry's real implementation, breaking every later die in
 * the worker (`gmPage` is worker-scoped, so that damage would outlive this test entirely).
 */
const rigDie = (page: Page, n: number) =>
  page.evaluate((result: number) => {
    const w = window as any;
    const targets = [w.foundry.dice.terms.DiceTerm.prototype, w.foundry.dice.terms.Die.prototype];
    w.__unrigDie = targets.map((proto: any) => [proto, proto.roll] as const);
    const rigged = function (this: { results: unknown[] }) {
      const term = { result, active: true };
      this.results.push(term);
      return term;
    };
    for (const proto of targets) proto.roll = rigged;
  }, n);

const unrigDie = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    for (const [proto, original] of w.__unrigDie ?? []) proto.roll = original;
    delete w.__unrigDie;
  });

const lastMessageText = (page: Page) =>
  page.evaluate(() => {
    const messages = (window as any).game.messages.contents;
    return String(messages[messages.length - 1]?.content ?? '');
  });

test.describe('the remade core, executed live', () => {
  test.afterEach(async ({ gmPage }) => {
    await unrigDie(gmPage);
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      await g.user.update({ character: null });
      const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
    });
  });

  test.fixme('a stat check macro that fails costs the Stress the book charges — Strength Check', async ({ gmPage }) => {
    const uuid = await create(gmPage, { stats: { strength: { value: 10 } }, other: { stress: { value: 2 } } });
    await rigDie(gmPage, 95); // 95 ≥ 10: a failure, not a double, so no crit muddies the assertion.

    await runMacro(gmPage, TRIGGERED, 'Strength Check');

    expect(await stored(gmPage, uuid, 'system.other.stress.value')).toBe(3);
  });

  test.fixme('a table roll macro spends the Wound the book charges — Gunshot Wound', async ({ gmPage }) => {
    const uuid = await create(gmPage, { hits: { value: 0, max: 3 } });

    await runMacro(gmPage, TRIGGERED, 'Gunshot Wound');

    expect(await stored(gmPage, uuid, 'system.hits.value')).toBe(1);
  });

  test.fixme('a modify macro writes the field it names — +1 Stress', async ({ gmPage }) => {
    const uuid = await create(gmPage, { other: { stress: { value: 4 } } });

    await runMacro(gmPage, TRIGGERED, '+1 Stress');

    expect(await stored(gmPage, uuid, 'system.other.stress.value')).toBe(5);
  });

  test.fixme('an item grant macro raises the condition it names — +1 Bleeding', async ({ gmPage }) => {
    const uuid = await create(gmPage);

    await runMacro(gmPage, TRIGGERED, '+1 Bleeding');

    const severity = await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      return actor.items.find((i: any) => i.name === 'Bleeding')?.system.severity ?? null;
    }, uuid);
    expect(severity).toBe(1);
  });

  // audit T2: a roll all the way to the ChatMessage it posts, for each outcome a Stat Check can
  // reach — the verdict line `chat/cards.ts`'s `outcomeHtml` renders, read back from the log.
  for (const [label, roll, verdict] of [
    ['succeeds', 5, 'SUCCESS!'],
    ['crits', 11, 'CRITICAL SUCCESS!'],
  ] as const) {
    test.fixme(`a Strength Check that ${label} posts a ChatMessage saying so`, async ({ gmPage }) => {
      await create(gmPage, { stats: { strength: { value: 60 } } });
      await rigDie(gmPage, roll);

      await runMacro(gmPage, TRIGGERED, 'Strength Check');

      expect(await lastMessageText(gmPage)).toContain(verdict);
    });
  }

  test.fixme('a Panic Check that fails posts a Panic result, not a generic table row', async ({ gmPage }) => {
    await create(gmPage, { other: { stress: { value: 2 } } });
    await rigDie(gmPage, 19); // The Panic Die is a d20; 19 is PSG 21.1's own named result.

    await runMacro(gmPage, `mothershiprpg.macros_hotbar_1e`, 'Panic Check');

    expect(await lastMessageText(gmPage)).toContain('HEART ATTACK');
  });

  // RC1: `preCreateActor` wrote token-bar and vision fields the schema discarded, so every created
  // actor shipped with broken bars and no sight. A created character's own prototype proves it.
  test.fixme('a created character gets working health bars and vision on its token', async ({ gmPage }) => {
    const uuid = await create(gmPage);

    const token = await stored(gmPage, uuid, 'prototypeToken');

    expect((token as { bar1: { attribute: string } }).bar1.attribute).toBe('health');
    expect((token as { sight: { enabled: boolean } }).sight.enabled).toBe(true);
  });
});
