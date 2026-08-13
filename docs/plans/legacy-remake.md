# MoSh Legacy Remake — the plan

Written 2026-08-13, from the findings in `docs/audits/architecture-audit.md`. **This supersedes
that audit's Part III wave sequence** (its Waves 1–3 assumed incremental refactoring) and the
"`actor.js` split" item on S9's trailing list. The audit's findings themselves remain the
triage record: findings resolved by the remake get `[done]` with a pointer here; UI-layer
findings (U-series) stay with S9.

---

## Status — start here

| | |
|---|---|
| **Decided** | The legacy core is **remade, not refactored**: proper services and domains, written fresh. Big-bang cutover (one swap commit), **TypeScript runtime** for the new modules, **the PSG book is the spec** — the audit's bug list dies in the remake. |
| **Scope** | `module/actor/actor.js` (2,394 lines), `module/mosh.js` (619), `module/item/item.js`, `module/settings.js`, `templates/` (9 Handlebars files), and the macro catalog `content/books/psg/macros.ts` (regenerated onto the new API). |
| **Not in scope** | `css/mosh.css`, the DataModels (clean — they port as-is), the content pipeline machinery, the test harnesses. **No schema reshaping.** The UI layer is touched twice, deliberately: R5 swaps call sites mechanically; R7 — the secondary task — has the sheets genuinely adopt the new interfaces, absorbing S9's service-facing items (U4, U5, U10). S9 keeps the rest of the U-series (rows/mixin/a11y/i18n). |
| **Next** | See the **progress ledger** in the Orchestration section — it is the authoritative state. |

## The five decisions, and what each implies

**1. Big-bang, not strangler.** The replacement is built in-tree but inert — new modules land on
master with their unit tests running, wired to nothing — and one swap commit (R5) rewires `init`
from legacy to new. Until R5, the shipped system runs legacy untouched. This keeps CI covering
the new code throughout while honouring a single cutover: there is no façade plumbing, no
per-surface routing, and no period where master doesn't ship a working system.

**2. TypeScript runtime — a deliberate amendment to the "JS for runtime" hard rule, for new
files only.** Vite compiles `.ts` entries natively; the work is adding `module/**/*.ts` to the
`npm run check` surface (R0). The point is the audit's dominant bug class: stringly-typed
dispatch, sentinel arguments, seven-slot positional nulls, and dotted addresses all become
compile errors, the same bet that paid off in the content catalogs. Legacy `.js` files are never
converted — they are deleted at the swap. **On landing R0, record the amended rule in CLAUDE.md
and the `foundry-mosh` skill.**

**3. The book is the spec.** New services implement the PSG. The audit's ten-bug list is a
ledger of known divergences (below); each gets a test asserting *book* behaviour, and the
remake ships with all ten dead. The existing parser suites (`test/parse-roll-string.test.ts`,
`test/parse-roll-result.test.ts`) carry over — they already encode the book's roll rules and
are the porting contract for the roll domain.

**4. Macros are user interface; services are the system.** Measured (2026-08-13): of the 104
shipped macros, only **15 are referenced by any content** (6 condition descriptions, the Panic
Check table's result rows) — they exist because table and condition text needed something
clickable. The other ~80 triggered macros (the stat/save/wound × advantage cross-product) are
referenced by nothing: they are an API substitute, functions shipped as draggable documents
because the community had no service layer. The remake inverts this:

- **Anything the system triggers is a service call, never a macro execution** — wound-on-table,
  bleeding damage, auto-stress all go through `checks/`/`mutation/` directly.
- **Clickable text becomes system-handled actions, not macro documents.** A custom text
  enricher (`chat/enrichers.ts`) renders semantic actions — `@Check[fear -]`,
  `@Gain[stress 1d5]`, `@Apply[bleeding]` — as buttons; a delegated chat-log listener
  (`chat/actions.ts`) routes clicks to services. Conditions and table results then reference
  *meanings*, not document ids: the dangling-id bug class (audit C2, C10) becomes structurally
  impossible, and `MACRO_LABEL` dies with it.
- **Variation is an argument, never a new function.** Measured: the 95 triggered macros call
  exactly **four verbs** — `initModifyActor` (33: seven bleed amounts, stress ticks, wound
  adjustments), `initRollCheck` (23: stats/saves × advantage), `initRollTable` (20: the three
  Blunt Force Wound macros and their siblings — one table × normal/[+]/[-]), `initModifyItem`
  (15) — plus four bespoke. Ninety-five documents encode four functions' argument grids. The
  new API states each verb **once**, with arguments: `rollTable(woundTable('blunt-force'),
  {advantage})`, `modify('system.hits.value', {amount})`. No per-variant functions exist
  anywhere in the API, and the pipeline generates macro-pack entries as verb + argument
  tuples, never as distinct command bodies.
- **Macros shrink to genuine user entry points.** The 9 hotbar macros stay as one-line calls
  into the new API (their embedded 120-line dialogs move into `dialogs/`). The cross-product
  pack is kept as a *generated* convenience — each entry a one-liner like
  `game.mothershiprpg.rollStat('body', {advantage: 'disadvantage'})` for GMs who drag checks
  to the hotbar — and is droppable later without touching the system.

**5. Interfaces are free to change — including the sheets', and sheet updates are a secondary
task.** The new services' interfaces are designed on merit; today's UI call shapes carry **no**
compatibility weight (only user-imported macros do, via the shim). In particular, Svelte 5
runes were unknown when the community code — and even the S4–S7 conversions, which deliberately
kept AppV1-era shapes — were built; the remake may use runes-based reactive state where it is
the right architecture, including `.svelte.ts` service modules whose state sheets consume
directly instead of today's snapshot-refresh relay. The cutover discipline follows from this
split: **R5 touches the sheets only enough to compile against the new API** (mechanical
call-site swaps), and **R7 is the secondary task** where the sheets genuinely adopt the new
interfaces — absorbing the service-facing halves of S9's U-series (U4, U5, U10) and free to
evolve `document-store.svelte.js` itself.

## The compatibility surface — smaller than it looks

The 104 shipped compendium macros are generated from `content/books/psg/macros.ts` — **we own
both sides**, so the new API is designed freely and the macro content regenerates onto it in
the same unit (R4). The only true compatibility surface is **copies users have already imported
into worlds and hotbars**, which call:

- `game.mothershiprpg.initRollTable / initRollCheck / initModifyActor / initModifyItem / rollItemMacro / noCharSelected`
- actor methods directly: `modifyActor`, `takeBleedingDamage`, `chooseCover`, `printDescription`
- dotted field addresses as strings: `'system.other.stress.value'`

One shim module (`module/api/legacy.ts`, R4) maps that exact surface — old names, old positional
signatures, dotted strings — onto the new API, logs a one-line deprecation, and is the *only*
place old shapes survive. Everything else about the legacy surface (the `rollStatSelect` ghost,
`formatCreditsNumber`, the `repair` branch) is confirmed uncalled and does not carry over.

## Target architecture

```
module/
  index.js                     entry: css + init (unchanged shape)
  init.ts                      Hooks registration ONLY — imports downward, exports nothing
  documents/
    actor.ts                   MothershipActor: derivation (ported — it is clean) +
                               thin named methods delegating to services
    item.ts                    MothershipItem: fire(), reload(), toChat() — the item
                               owns its own fields (audit F15)
  data/                        the DataModels, moved as-is (actor-models, item-models)
  rules.ts                     the game's numbers, once: CRIT_DOUBLES, AUTOFAIL_AT = 90,
                               PANIC_DIE, XP_PIPS = 15, RANK_BONUS, STR_CAPACITY_DIVISOR,
                               WOUND_ROLLOVER… (F21, U5's document-side landing zone)
  rolls/
    spec.ts                    RollSpec — the parse-once record: {die, count, sign,
                               advantage, aim} (F11); CheckKind discriminated union:
                               'stat' | 'skill' | 'weapon-attack' | 'weapon-damage' |
                               'rest-save' | 'panic' | 'table' (F14)
    parse.ts                   string → RollSpec → Foundry formula (parseRollString's heir)
    resolve.ts                 evaluated Roll → Outcome record {kept, total, success,
                               critical} — pure, never mutates the Roll (F8, F19)
  checks/
    checks.ts                  orchestration: resolve target, apply skill, run the roll,
                               hand Outcome to chat, apply autoStress — per CheckKind,
                               no sentinels (F9, F14)
    damage.ts                  weapon damage incl. wound chain; asks item.fire() (F5, F15)
  tables/
    tables.ts                  table rolls; table identity is DATA (settings key or table
                               flag), never a munged display name (F13); android check
                               reads the class item's robotic flag
  mutation/
    address.ts                 dotted string → typed accessor {path, pod{value,min,max,label}}
                               at the boundary, typed inside (F12)
    mutate.ts                  the modifyActor engine, once: clamp, rollover, ONE awaited
                               update built from object literals (F7, F10)
  chat/
    cards.ts                   all card rendering; owns templates/chat/*.html (kept
                               Handlebars — they are live and data-driven); asset paths
                               from one constant (F4)
    enrichers.ts               the semantic-action text enricher: @Check[fear -],
                               @Gain[stress 1d5], @Apply[bleeding] render as buttons in
                               chat, conditions, and table results (decision 4)
    actions.ts                 one delegated chat-log listener routing data-action clicks
                               to services — replaces the 15 content-referenced macros
  dialogs/
    svelte-dialog.ts           mount-a-Svelte-component-in-DialogV2 helper; every prompt
                               returns a REAL promise via DialogV2.wait (F6, F23, U10)
    ChooseAttribute.svelte / ChooseSkill.svelte / ChooseAdvantage.svelte / Reload.svelte /
    Cover.svelte / NoCharacter.svelte
  api/
    api.ts                     game.mothershiprpg: typed entry points — rollStat(key),
                               rollSkill(id), rollWeapon(id, opts), rollPanic(),
                               rollRestSave(), rollTable(ref), modify(address, change),
                               forTargetActors(fn) once (RC6, U4)
    legacy.ts                  the shim for imported macros (above)
  lookup.ts                    typed resolver: fromUuid first, O(1) world get by collection
                               map; null ⇒ ui.notifications error, never a deep crash
                               (RC8, F18)
  settings.ts                  registration with Mosh.* i18n keys; table defaults GENERATED
                               from content/ids.json (RC13, RC14)
  ui/                          untouched by this plan except R5's call-site swap
```

**Dependency rule, enforced in review:** new modules import new modules and `foundry.*` only.
Nothing new imports legacy; legacy is never edited (it is deleted at R5). `init.ts` is the only
module with registration side effects (RC7's cycle becomes impossible).

**Cross-cutting rules for all new code:** every user-visible string is a `Mosh.*` key (the
`pt-BR` translation is updated in the same unit that adds a key); no `console.log` — one
namespaced debug channel gated on a flag (F26, RC12); every document write is awaited before
its result is read (F10); Foundry internals are never mutated (F19).

## The divergence ledger — book behaviour the remake must assert

Each is a test first, then the implementation that passes it:

| Audit id | Legacy behaviour | Book behaviour the remake ships |
|---|---|---|
| C1 | Death Save buttons throw (`"mosh"` namespace) | Death Save rolls the death table (regenerated macro calls the new API) |
| RC1 | Token bars broken, characters sightless | Bars show health/wounds; characters get vision (`sight.enabled`) — e2e asserts a created actor's `prototypeToken` |
| RC3 | Gear hotbar macros crash | Every item type's hotbar macro posts its card — e2e executes one per type |
| RC5 | `rollStatMacro` throws | Gone; `rollStat(key)` is the real entry point |
| F2 | Any table without a roll string prompts "Panic Check", d20 | The prompt names the table and its die |
| F5 | Damage button spends ammo | Only an attack calls `item.fire()`; damage never touches shots |
| F4 | Broken images in bleeding/radiation cards | Cards render from `chat/cards.ts` with real paths |
| F22 | Creature on panic 19 crashes | Android substitution keys off the class item's `robotic` flag; creatures pass through |
| C2 | Wound Roll hard-codes five bare ids | The wound chooser is a `dialogs/` component resolving tables through `tables/` — no ids in macro strings anywhere (decision 4) |
| U14 | XP stores 16 on a 15-pip track | `rules.ts` XP_PIPS drives both clamp and track |

### Divergences found in execution

Behavioural differences from legacy discovered while building, beyond the audit's ten — each
implemented book-side (decision 3) and pinned by a test:

| Id | Legacy behaviour | Book behaviour shipped | Pinned by |
|---|---|---|---|
| R1-1 | `min`/`max` addresses clamp against themselves — raising `stress.max` was a no-op | A bound resolves unbounded; the three shipped max/min macros now work | `test/mutation-address.test.ts` |
| R1-2 | The health rollover narrates "take a wound" but never writes `hits` | One multi-field update moves health and wounds together | `test/mutate.test.ts` |
| R1-3 | Surplus damage carries over one bar only; a big hit leaves negative health and death is unreachable | Each emptied bar spends a Wound; the one past the last sets `dead` with the unabsorbed overflow | `test/mutate.test.ts` |
| R1-4 | Mutations read the derived `system` — a swarm creature's multiplied Combat would persist | Mutations read `toObject().system` | `test/mutate.test.ts` |
| R1-5 | Rolled amounts use the kept-die total, zero-basing a rolled 10 to 0 | Rolled amounts use `roll.total` | `test/mutate.test.ts` |
| R1-6 | Taking the **last** Wound leaves health at 0 (`hits.value + 1 < hits.max` guard) | The last Wound is survivable: the bar refills (PSG 28) | `test/mutate.test.ts` |

## Units

Each unit lands on master, green through `npm run check` + `npm test` (+ e2e where it touches
wired surface). Delegation and gating follow `docs/plans/run-to-the-end.md`'s standing rules.
Until R5, nothing new is registered — the new tree is compiled, type-checked, and unit-tested,
but inert.

**R0 — TypeScript runtime wiring, `rules.ts`, and the roll domain.**
Add `module/**/*.ts` to the check surface and prove a `.ts` module bundles through Vite.
Write `rules.ts` and `rolls/` (spec, parse, resolve). **Gate:** the two existing parser suites,
retargeted at `rolls/`, pass unchanged — they are the spec; new unit tests cover RollSpec
round-tripping and the Outcome record. Record the amended language rule in CLAUDE.md and the
skill.

**R1 — mutation and inventory.**
`mutation/` (address, mutate) and `documents/item.ts` (`fire`, `reload`, `toChat`).
**Gate:** unit tests for clamp/rollover/wound-chain arithmetic (pure, no Foundry), including
the F7 branch-drift cases and the F5 no-spend-on-damage rule.

**R2 — tables, lookup, chat.**
`tables/`, `lookup.ts`, `chat/` (cards, enrichers, actions) + the settings/ids generation
(RC13). **Gate:** unit tests for table identity (rename a table, behaviour unchanged — F13's
proof), enricher parse/render tests for each action verb, the divergence tests for F2/F22/F4
written and passing against the new modules.

**R3 — checks and dialogs.**
`checks/`, `dialogs/` (the Svelte-in-DialogV2 helper and the six prompts). **Gate:** unit tests
per CheckKind; every dialog helper returns a promise that resolves on every button and on
dismissal (F6's proof is a test, not a review note).

**R4 — the API and the content regeneration.**
`api/api.ts`, `api/legacy.ts`, `settings.ts`, `init.ts` (written but not yet the entry). Then
the content moves off macro-as-plumbing (decision 4): condition descriptions and the Panic
Check table's results switch from `@UUID[…Macro…]` links to enricher actions, so the 15
content-referenced macros retire; the hotbar macros become one-line API calls (their dialogs
now live in `dialogs/`); the cross-product pack regenerates as **typed one-liner records**
(audit C3/C9). C1 and C2 die at the source. Extend the pipeline guard to verify `settings.get`
namespaces and enricher verbs in emitted text. **Gate:** `npm run content` build green with
every integrity check; content tests updated for the new counts; the shim's surface pinned by
a unit test enumerating the old signatures.

**R5 — the swap.**
One commit: `module/index.js` imports `init.ts`; the sheets change **only enough to compile
against the new API** — mechanical call-site swaps to the named entry points, nothing
structural (that is R7); legacy files
(`actor/actor.js`, `mosh.js`, `item/item.js`, old `settings.js`) are **deleted from master and
preserved on `archive/legacy-core`** (branch + tag, the §25 precedent — parked, not lingering).
**Gate:** the full gauntlet — `check`, all vitest, `packs.sh pack` → `npm run setup` → all
e2e — plus the new e2e specs this plan adds: one executed macro per family against a `__e2e_`
actor (audit T1), roll-through-to-ChatMessage assertions for success/crit/panic (T2), the
`prototypeToken` assertion (RC1), and every divergence-ledger test now running against the
live system.

**R6 — record and close the core.**
MODERNIZATION.md §35 records the remake; the audit's findings resolved here get `[done]` tags
with resolution notes; S9's list drops "the `actor.js` split" and the items R7 absorbs; the
`test:e2e` npm script gains the missing `npm run setup` step (audit C5) and the build-freshness
spec lands (C4) so the pipeline's commit boundary is guarded.

**R7 — the sheets adopt the services (the secondary task).**
With the core stable, the sheets move from compiling-against to designed-for: business rules
leave the components for the documents/services (U5), the seven-null legacy call shapes are
gone entirely (U4), dialog-by-string dies (U10), and the reactive plumbing is rethought with
runes as a first-class tool — `document-store.svelte.js` may become (or yield to) `.svelte.ts`
service state the components consume directly, rather than the snapshot-refresh relay the
AppV1-era conversions preserved. This unit deliberately overlaps S9: whatever S9 U-series items
the new interfaces make cheaper to fix here (U1's shared rows, U2's mixin) may land here
instead — decided at the time, recorded in whichever list they leave. **Gate:** the sheet e2e
suites (character, creature, class, skill, item, generator) green throughout; no `$effect`
creep; `svelte-check` clean.

## Orchestration — running this as a long-running process

This plan is designed to execute across many fresh sessions with no shared memory: **the plan
is the state, and this section is the protocol.** Nothing about progress lives anywhere else.

### The execution model

**Primary mode (decided 2026-08-13): one long-running Fable orchestration session runs the
plan end-to-end until the ledger is done and the full gauntlet is clean.** The orchestrator
does not write the units itself: it delegates each unit to executor subagents on the model the
policy table names (Opus for design-establishing work, Sonnet for mechanical work), reviews
through `wave-reviewer`, verifies through `test-verifier`, performs the Fable checkpoints
directly, commits each gated unit with its ledger update, and proceeds to the next unit
without waiting to be asked.

**Recovery mode:** if the orchestration session is lost, any fresh session resumes from the
ledger with this kickoff prompt (the plan is the state — nothing lives in the lost session):

> Read `docs/plans/legacy-remake.md` in full. Execute the next `pending` unit from its
> progress ledger, following the Orchestration section. Stop at the unit's gate — do not
> start the next unit.

Whether orchestrated or resumed, the execution of a unit follows the same steps:

1. **Read the briefing:** this plan in full; `docs/audits/architecture-audit.md` Part I plus
   the findings its unit resolves; `docs/plans/run-to-the-end.md`, whose ten standing rules
   and review gate govern execution (its wave order is superseded — this ledger replaces it).
   The `foundry-mosh` skill loads itself. R7 additionally loads the Svelte skills.
2. **Mark the unit `in-progress`** in the ledger (one commit-safe edit) before writing code.
3. **Execute the unit** — delegate to `wave-executor` where the unit decomposes, review with
   `wave-reviewer` before declaring the gate met. The repo's hard rule stands: nothing is
   done on an untested edit; a surprising green run means suspect the harness.
4. **Close the unit:** run the unit's gate, commit, then update the ledger row (`done`,
   commit hash, one-line note — including anything the next unit must know), and update the
   audit's finding tags (`[done]` + resolution line) for findings the unit resolved.
5. **Stop.** The next unit belongs to the next session.

If a unit is interrupted, the ledger shows `in-progress` with no commit: the next session
resumes it by diffing the working tree against the unit's description before continuing.

### Progress ledger — the authoritative state

| Unit | Model | Status | Commit | Notes |
|---|---|---|---|---|
| R0 — TS wiring, rules, rolls | Opus | done | `R0: rules and the roll domain…` | 344 vitest (baseline 273), dual-run proves legacy equivalence per assertion; Vite bundles runtime .ts (proven out-of-tree; R5 wires `init.ts` into `index.js`, no config change needed). `Outcome.total` is the KEPT DIE, not formula arithmetic — damage totals read `roll.total`. |
| R0-review — foundation interfaces | Fable | done | (same commit) | Approved: RollSpec/Outcome/CheckKind/CHECK_SEMANTICS sound; panic crit-exception now pinned by discriminating tests both implementations pass. Advisories parked: AUTOFAIL scope → R3, rank normalization → R1. |
| R1 — mutation, inventory | Opus | done | `R1: the mutation engine…` | 416 vitest; 25 mutants, 0 survivors; divergences R1-1…R1-6 recorded above. Pod contract documented in `mutation/address.ts` header — R2/R3 read it before touching fields. Rank normalizer landed in `rules.ts` (`skillRank`/`rankBonus`). XP stays unbounded here — the U14 clamp is R7's, via a rules-side bound. |
| R2 — tables, lookup, chat | Opus | pending | — | Owes: `Mosh.HealthZeroMessage2` is the correct key (F7's string half); decide whether legacy `chatDesc`'s trinket/patch name↔description swap survives in the card renderer. |
| R3 — checks, dialogs | Opus | pending | — | Owes: decide `AUTOFAIL_AT` scope — legacy applies ≥90 to every comparison/die; the book scopes it to d100 stat/save checks. No reachable roll differs today. Also owes the literal F5 end-to-end spec: the damage flow calls nothing that touches shots (structural pin landed in R1; the flow-level spec needs `checks/damage.ts` to exist). |
| R4 — API, content regen | Opus (API) / Sonnet (catalog regen) | pending | — | — |
| R5 — the swap | Opus | pending | — | Fable on call if the gate fails twice |
| R6 — record and close | Sonnet | pending | — | — |
| R7 — sheets adopt services | Opus | pending | — | — |

### Model policy

- **Opus** executes every design-establishing unit (R0–R3, R5, R7, and R4's API half): these
  create the interfaces everything downstream inherits.
- **Sonnet** executes pattern-following and mechanical work: R4's catalog regeneration (the
  shapes exist by then), R6's recording, and any `recipe-sweeper`-style sub-delegation inside
  a unit.
- **Fable is a checkpoint, not an overseer.** Continuous oversight is what the plan, the
  gates, and `wave-reviewer` are for. Fable is used at exactly the points where extra
  thinking power pays: **(a)** the R0-review row — a one-session design review of RollSpec,
  the Outcome record, `CheckKind`, and the mutation-address contract *before* R1 builds on
  them, since a wrong foundation interface is the one mistake the big-bang structure makes
  expensive; **(b)** escalation, triggered mechanically: a unit's gate fails twice for the
  same cause, or an executor concludes the plan itself needs amending. Amendments to this
  plan are made in the doc, dated, in a Fable session — executors follow the plan; they do
  not quietly diverge from it.

### Ground rules for every session

- The ledger and the plan text are updated **in the same commit as the work** — a reader of
  `master` always sees a consistent state.
- Commits follow the repo's existing message style; one unit may land as several commits, but
  the ledger records the last (gate-passing) one.
- The build/pack sequence gotchas in CLAUDE.md (pack → setup → e2e; stale locks) bind every
  session; R-units that touch content must run the full three-step sequence, not part of it.
- MODERNIZATION.md is updated by R6, not incrementally — the ledger is the running record
  until then.

## Risks, named

- **The swap commit is large.** Mitigation: R5 contains only rewiring and deletion — every
  behaviour it enables was already unit-tested in R0–R4, and the e2e suite is written *before*
  the swap (R4 lands the specs marked `fixme` until R5 flips them on).
- **Imported-macro breakage in existing worlds.** Mitigation: the `legacy.ts` shim is pinned by
  a test enumerating the old surface; it stays for one release cycle past the swap and its
  removal is a deliberate future decision.
- **Behavioural drift nobody listed.** The book-as-spec choice accepts this consciously: where
  legacy and book disagree beyond the ten-bug ledger, the book wins, and the divergence is added
  to the ledger when found — the ledger is the changelog for players.
- **Two `MothershipActor`s during construction.** Never: the new `documents/actor.ts` exists
  but is registered by nothing until R5; `test/setup.ts`'s `globalThis.Actor` stub serves the
  new class the way it served the old.
