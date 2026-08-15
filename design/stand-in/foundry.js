// The gallery mounts the system's own components with no Foundry around them, so the few globals
// they reach for have to exist before any `module/` file is evaluated — `import './stand-in/foundry.js'`
// is the first statement in main.js, and the first in the smoke spec, for that reason.
//
// Nothing here reimplements Foundry. Each entry is the smallest thing that lets a component load
// and render: the localizer reads the real lang file, and everything else is inert. A specimen
// that would need working Foundry behaviour is a specimen this app cannot honestly show.
import en from '../../lang/en.json';

/** Foundry stores translations nested and looks them up by dot path. */
function flatten(node, prefix = '', into = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, into);
    else into[path] = String(value);
  }
  return into;
}

const strings = flatten(en);

const i18n = {
  localize: (key) => strings[key] ?? key,
  format: (key, data) =>
    (strings[key] ?? key).replace(/\{(\w+)\}/g, (whole, name) => String(data?.[name] ?? whole)),
  has: (key) => key in strings,
};

/** The `<prose-mirror>` element's stand-in: the enriched HTML, read-only, in the same wrapper. */
class ProseMirrorStandIn {
  static create({ value, enriched }) {
    const host = document.createElement('div');
    host.className = 'editor prosemirror';
    host.innerHTML = enriched || value || '';
    host.dataset.standIn = 'prose-mirror';
    return host;
  }
}

const unavailable = (what) => () => {
  console.info(`[design] ${what} is a stand-in here — the gallery does not run it.`);
};

/**
 * Real dice for `NdM+K`, so the generator's d20s answer when clicked. Anything more elaborate than
 * that formula is Foundry's own parser's job and returns null rather than a plausible wrong number.
 */
class RollStandIn {
  constructor(formula) {
    this.formula = formula;
    this.total = null;
  }

  async roll() {
    const parsed = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/.exec(this.formula);
    if (!parsed) return this;

    const count = Number(parsed[1] || 1);
    const faces = Number(parsed[2]);
    const offset = Number((parsed[3] ?? '0').replace(/\s+/g, ''));

    let total = offset;
    for (let die = 0; die < count; die++) total += 1 + Math.floor(Math.random() * faces);
    this.total = total;
    return this;
  }

  async toMessage({ flavor } = {}) {
    console.info(`[design] ${flavor ?? this.formula}: ${this.total}`);
  }
}

Object.assign(globalThis, {
  game: {
    i18n,
    // Both are read only from handlers the gallery never fires; an empty world answers honestly.
    settings: { get: () => undefined, set: unavailable('game.settings.set') },
    packs: new Map(),
    actors: new Map(),
    items: new Map(),
    user: { isGM: true },
  },

  foundry: {
    applications: {
      // RolltableConfigApp.js destructures this at module scope, and RolltableConfig.svelte
      // imports its field groups from that file.
      api: { ApplicationV2: class {}, DocumentSheetV2: class {}, DialogV2: class {} },
      sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} },
      elements: { HTMLProseMirrorElement: ProseMirrorStandIn },
      ux: {
        TextEditor: {
          implementation: {
            enrichHTML: async (html) => html ?? '',
            getDragEventData: () => ({}),
          },
        },
      },
    },
    // The DataModels are declared at module scope — `extends foundry.abstract.TypeDataModel`, with
    // a `fields.XField` per key — and a specimen that reaches one transitively evaluates all of it.
    // The gallery never validates anything, so a constructible shell per field name is enough.
    abstract: { TypeDataModel: class {}, DataModel: class {} },
    data: {
      fields: new Proxy({}, { get: (cache, name) => (cache[name] ??= class {}) }),
    },
    utils: { randomID: () => Math.random().toString(36).slice(2, 18) },
  },

  // `extends Actor` / `extends Item` name these when their module loads.
  Actor: class {},
  Item: class {},
  Roll: RollStandIn,
  fromUuid: async () => null,
  Hooks: { on: () => {}, once: () => {}, callAll: () => {}, call: () => true },
  CONFIG: { Actor: { dataModels: {} }, Item: { dataModels: {} } },
  ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
});
