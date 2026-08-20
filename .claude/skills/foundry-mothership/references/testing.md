# Authoring tests

Two tiers (commands in `CLAUDE.md`): vitest for anything testable without Foundry, e2e only
for what needs the live app. Reach for vitest first.

## vitest tier

Specs are `test/**/*.test.ts`, `environment: 'node'`. The trick that makes this run without
Foundry: `test/setup.ts` defines empty `globalThis.Actor`/`Item` so `module/documents/*.ts`
imports (`extends Actor` evaluates at import time). Specs construct a bare document, mock
the services beneath it, and assert the *dispatch*:

```ts
vi.mock('../module/checks/checks.ts', () => ({ runCheck: services.runCheck /* … */ }));
const { MothershipActor } = await import('../module/documents/actor.ts');
```

**Schema tests** use `test/field-stubs.ts`, which stubs `foundry.data.fields` so each field
records the default it would produce, then walks the real shipped schema and compares it to
what `template.json` composes. The assertions check the actual code — that is why
`template.json` is kept.

**Unit style:** call the method with a hand-built `this`; inputs → outputs; mock no more of
`game` than the setting or two the method reads.

## e2e tier

Full commands, preconditions and harness details: **`test/e2e/README.md`**. Conventions:

- One operation per file, so a failure names what broke.
- Use the `gmPage` fixture; name throwaway documents `__e2e_*` and delete them in `afterEach`.
- Close windows from `foundry.applications.instances`.

## Check the harness before trusting green

`global-setup` logs the system version, core version, world and pack list it exercised —
read that line. If a result surprises you in either direction, suspect the harness before
believing it.

## Mutation-test new assertions

A test that cannot fail is worse than no test. After writing specs, break the behaviour on
purpose (a `sed` flipping an operator, back up the file first), confirm the suite goes red,
revert. **Confirm the mutation actually changed the file** — a no-op `sed` here once
produced a false "surviving mutation" alarm.
