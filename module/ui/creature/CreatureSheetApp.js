import { mount, unmount, flushSync } from 'svelte';
import CreatureSheet from './CreatureSheet.svelte';
import { CreatureSettingsApp } from './CreatureSettingsApp.js';
import { createDocumentStore } from '../document-store.svelte.js';

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The creature sheet. ActorSheetV2 brings the drag-and-drop the AppV1 sheet configured by hand:
 * rows drag from `.draggable` (which `ItemRow` emits) and a dropped Item is created on the actor.
 *
 * Fields keep their `name="system.…"` attributes and Foundry's own form handling persists them,
 * exactly as the AppV1 sheet did with `submitOnChange: true`.
 */
export class MoshCreatureSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    // css/mosh.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mosh', 'sheet', 'actor', 'creature', 'themed', 'theme-light'],
    position: { width: 820, height: 770 },
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
    actions: { configureCreature: MoshCreatureSheet.#onConfigureCreature },
  };

  /** AppV1's ActorSheet titled the window with the bare actor name; keep that. */
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

  /** Everything the component needs that is not on the document, re-read on every render. */
  async _context() {
    const { TextEditor } = foundry.applications.ux;
    const enrich = (html) =>
      TextEditor.implementation.enrichHTML(html ?? '', { relativeTo: this.document });

    return {
      // The gear list's weight column is a world setting, not actor data. AppV1 wrote it onto
      // `system.settings`, a branch no schema declares, on every render.
      hideWeight: game.settings.get('mothershiprpg', 'hideWeight'),
      enriched: {
        description: await enrich(this.document.system.description),
        biography: await enrich(this.document.system.biography),
        // AppV1 never enriched this one, so the notes tab rendered empty however much was stored.
        notes: await enrich(this.document.system.notes),
      },
      items: this.document.items.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        img: item.img || CONST.DEFAULT_TOKEN,
        system: item.system,
      })),
    };
  }

  /**
   * AppV2 calls this on every render. Mount once and return the cached node, so a re-render
   * neither leaks a second component nor discards Svelte's state -- refresh the store instead.
   *
   * ActorSheetV2 binds its drag handlers to whatever `.draggable` elements exist when
   * `_onRender` runs, so a row added by this render has to be in the DOM by then. Svelte's own
   * microtask flush does land first today -- AppV2 awaits twice in between -- but that is
   * incidental scheduling, and the flush makes the ordering the code's own.
   */
  async _renderHTML() {
    const context = await this._context();
    if (this.#component) {
      this.#store.refresh(context);
      flushSync();
      return this.#root;
    }
    this.#store = createDocumentStore(this.document, context);
    this.#root = document.createElement('div');
    this.#root.className = 'mosh-sheet-root';
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
