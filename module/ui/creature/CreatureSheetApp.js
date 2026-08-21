import { mount, unmount, flushSync } from 'svelte';
import CreatureSheet from './CreatureSheet.svelte';
import { CreatureSettingsApp } from './CreatureSettingsApp.js';
import { createDocumentStore } from '../document-store.svelte.js';

const { ActorSheetV2 } = foundry.applications.sheets;

export class MothershipCreatureSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    // css/mothership.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mothership', 'sheet', 'actor', 'creature', 'themed', 'theme-light'],
    position: { width: 820, height: 720 },
    window: {
      resizable: true,
      controls: [
        {
          action: 'configureCreature',
          icon: 'fas fa-tasks',
          label: 'Mothership.CreatureSettings',
          ownership: 'OWNER',
        },
      ],
    },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: { configureCreature: MothershipCreatureSheet.#onConfigureCreature },
  };

  get title() {
    return this.document.name;
  }

  static #onConfigureCreature() {
    this.configureCreature();
  }

  configureCreature() {
    new CreatureSettingsApp({
      document: this.document,
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2,
      },
    }).render({ force: true });
  }

  #component;
  #root;
  #store;

  async _context() {
    const { TextEditor } = foundry.applications.ux;
    const enrich = (html) =>
      TextEditor.implementation.enrichHTML(html ?? '', { relativeTo: this.document });

    return {
      // Only `description` reaches the sheet: the UCR stat block has no biography and no notes,
      // and the schema keeps both fields only so older creatures lose nothing on load.
      enriched: { description: await enrich(this.document.system.description) },
      items: this.document.items.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        img: item.img || CONST.DEFAULT_TOKEN,
        system: item.system,
      })),
    };
  }

  // ActorSheetV2 binds drag handlers to `.draggable` elements present when _onRender runs;
  // flushSync guarantees a newly rendered row is in the DOM by then.
  async _renderHTML() {
    const context = await this._context();
    if (this.#component) {
      this.#store.refresh(context);
      flushSync();
      return this.#root;
    }
    this.#store = createDocumentStore(this.document, context);
    this.#root = document.createElement('div');
    this.#root.className = 'mothership-sheet-root';
    this.#component = mount(CreatureSheet, { target: this.#root, props: { store: this.#store } });
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
