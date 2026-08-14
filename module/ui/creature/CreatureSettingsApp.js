import { mount, unmount } from 'svelte';
import CreatureSettings from './CreatureSettings.svelte';
import { createDocumentStore } from '../document-store.svelte.js';

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * The six stat toggles keep `name="system.stats.<stat>.enabled"` and ride Foundry's own form
 * handling via `submitOnChange`. The swarm toggle is deliberately unnamed -- see
 * CreatureSettings.svelte -- so it never lands in `formData` and does its own batched update.
 */
export class CreatureSettingsApp extends DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    // css/mosh.css paints the content white with no dark variant, so pin the light theme (see
    // MothershipItemSheet) or the window renders dark text on those light boxes.
    // `creature-settings` is what tells this window apart from the creature sheet underneath,
    // which is an ApplicationV2 carrying the same mosh/sheet/actor/creature classes.
    classes: ['mosh', 'sheet', 'actor', 'creature', 'creature-settings', 'themed', 'theme-light'],
    position: { width: 320, height: 150 },
    window: { resizable: false },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  get title() {
    return `${this.document.name}: Creature Settings`;
  }

  #component;
  #root;
  #store;

  async _renderHTML() {
    if (this.#component) {
      this.#store.refresh();
      return this.#root;
    }
    this.#store = createDocumentStore(this.document);
    this.#root = document.createElement('div');
    this.#root.className = 'mosh-sheet-root';
    this.#component = mount(CreatureSettings, { target: this.#root, props: { store: this.#store } });
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
    this.#store = undefined;
  }
}
