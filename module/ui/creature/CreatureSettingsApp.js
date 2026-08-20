import { mount, unmount } from 'svelte';
import CreatureSettings from './CreatureSettings.svelte';
import { createDocumentStore } from '../document-store.svelte.js';

const { DocumentSheetV2 } = foundry.applications.api;

// Swarm toggle is deliberately unnamed (see CreatureSettings.svelte) so it stays out of formData.
export class CreatureSettingsApp extends DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    // Pin the light theme: css/mothership.css paints the content white with no dark variant.
    // `creature-settings` tells this window apart from the creature sheet underneath, which
    // carries the same mothership/sheet/actor/creature classes.
    classes: ['mothership', 'sheet', 'actor', 'creature', 'creature-settings', 'themed', 'theme-light'],
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
    this.#root.className = 'mothership-sheet-root';
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
