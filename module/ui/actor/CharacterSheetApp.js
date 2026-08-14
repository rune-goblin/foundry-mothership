import { mount, unmount, flushSync } from 'svelte';
import CharacterSheet from './CharacterSheet.svelte';
import { GeneratorApp } from '../generator/GeneratorApp.js';
import { createDocumentStore } from '../document-store.svelte.js';

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The character sheet. Same shape as the creature's (module/ui/creature/CreatureSheetApp.js):
 * ActorSheetV2 brings drag-and-drop and form persistence, the document stays the source of truth,
 * and the component mounts once.
 */
export class MothershipCharacterSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    // css/mosh.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mosh', 'sheet', 'actor', 'character', 'themed', 'theme-light'],
    position: { width: 820, height: 820 },
    window: {
      resizable: true,
      controls: [
        {
          action: 'generateCharacter',
          icon: 'fas fa-cogs',
          label: 'Mothership.CharacterGenerator.name',
          ownership: 'OWNER',
        },
      ],
    },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: { generateCharacter: MothershipCharacterSheet.#onGenerateCharacter },
  };

  /** AppV1's ActorSheet titled the window with the bare actor name; keep that. */
  get title() {
    return this.document.name;
  }

  static #onGenerateCharacter() {
    this.generateCharacter();
  }

  generateCharacter() {
    new GeneratorApp({
      actor: this.document,
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
        biography: await enrich(this.document.system.biography),
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
   * Mount once and return the cached node, refreshing the store on later renders. `flushSync`
   * puts the rows in the DOM before `_onRender` binds dragstart to them.
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
    this.#component = mount(CharacterSheet, { target: this.#root, props: { store: this.#store } });
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
