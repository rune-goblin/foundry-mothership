import { mount, unmount } from 'svelte';
import RolltableConfig from './RolltableConfig.svelte';

const { ApplicationV2 } = foundry.applications.api;

/**
 * The 14 `table1e*` world settings, grouped and labelled the way the AppV1 template laid them
 * out. This is the single source both the component's markup and the submit handler read, so
 * the two can never drift the way `getData()`/`_updateObject()`'s hand-written lists could.
 * `null` marks a blank grid cell (the Death Save row centers its one field in a 4-column grid).
 */
export const ROLLTABLE_GROUPS = [
  {
    label: 'Panic Check',
    icon: 'fa-solid fa-bolt',
    columns: 4,
    fields: [
      { key: 'table1ePanicStressNormal', label: 'Stress, Normal (1e)' },
      { key: 'table1ePanicStressAndroid', label: 'Stress, Android (1e)' },
      { key: 'table1ePanicCalmNormal', label: 'Calm, Normal (1e)' },
      { key: 'table1ePanicCalmAndroid', label: 'Calm, Android (1e)' },
    ],
  },
  {
    label: 'Wound Check',
    icon: 'fa-solid fa-user-injured',
    columns: 5,
    fields: [
      { key: 'table1eWoundBluntForce', label: 'Blunt Force' },
      { key: 'table1eWoundBleeding', label: 'Bleeding' },
      { key: 'table1eWoundGunshot', label: 'Gunshot' },
      { key: 'table1eWoundFireExplosives', label: 'Fire & Explosives' },
      { key: 'table1eWoundGoreMassive', label: 'Gore & Massive' },
    ],
  },
  {
    label: 'Death Save',
    icon: 'fa-solid fa-heartbeat',
    columns: 4,
    fields: [null, { key: 'table1eDeath', label: 'Death Save (1e)' }, null],
  },
  {
    label: 'Ship Checks',
    icon: 'fa-solid fa-rocket',
    columns: 4,
    fields: [
      { key: 'table1eDistressSignal', label: 'Distress Signal' },
      { key: 'table1eMegadamageEffects', label: 'Megadamage Effects' },
      { key: 'table1eMaintenance', label: 'Maintenance Check' },
      { key: 'table1eBankruptcy', label: 'Bankruptcy Check' },
    ],
  },
];

export const ROLLTABLE_KEYS = ROLLTABLE_GROUPS.flatMap((group) =>
  group.fields.filter(Boolean).map((field) => field.key),
);

/**
 * Registered as a `game.settings.registerMenu` type (`module/settings.js`), so Foundry
 * constructs it with no arguments and calls `render(true)` -- unlike the document sheets, there
 * is no document backing this window; `game.settings` itself is the model.
 */
export class RolltableConfigApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'rolltable-modifiers',
    // A top-level <form> tag is what makes ApplicationV2 wire up the change/submit listeners
    // the `form` config below expects -- see DocumentSheetV2, which does the same.
    tag: 'form',
    // css/mosh.css paints the content white with no dark variant, so pin the light theme (see
    // MoshItemSheet) or the window renders dark text-on-dark against those light boxes.
    classes: ['mosh', 'themed', 'theme-light'],
    window: { title: 'Rolltable Configuration', icon: 'fa-solid fa-list', resizable: false },
    position: { width: 800, height: 'auto' },
    form: { handler: RolltableConfigApp.#onSubmit, submitOnChange: true, closeOnSubmit: false },
  };

  #component;
  #root;

  static async #onSubmit(_event, _form, formData) {
    await Promise.all(
      ROLLTABLE_KEYS.map((key) => game.settings.set('mothershiprpg', key, formData.object[key])),
    );
  }

  async _renderHTML() {
    if (this.#component) return this.#root;
    const values = Object.fromEntries(
      ROLLTABLE_KEYS.map((key) => [key, game.settings.get('mothershiprpg', key)]),
    );
    this.#root = document.createElement('div');
    this.#root.className = 'mosh-sheet-root';
    this.#component = mount(RolltableConfig, { target: this.#root, props: { app: this, values } });
    return this.#root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  async _preClose(options) {
    await super._preClose(options);
    if (!this.#component) return;
    unmount(this.#component);
    this.#component = undefined;
    this.#root = undefined;
  }
}
