import { mount, unmount, flushSync } from 'svelte';
import CharacterSheet from './CharacterSheet.svelte';
import { GeneratorApp } from '../generator/GeneratorApp.js';
import { chooseCreationMode } from './creation.js';
import { createDocumentStore } from '../document-store.svelte.js';

const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The character sheet. Same shape as the creature's (module/ui/creature/CreatureSheetApp.js):
 * ActorSheetV2 brings drag-and-drop and form persistence, the document stays the source of truth,
 * and the component mounts once.
 */
export class MothershipCharacterSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    // css/mothership.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mothership', 'sheet', 'actor', 'character', 'themed', 'theme-light'],
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

  /**
   * Offer the wizard the moment a character is created. `createActor` is the render context
   * Foundry stamps on the sheet it opens for a document that has just been made — from the
   * sidebar's create dialog, and from any `Actor.create(…, {renderSheet: true})` behind it — so it
   * is the one signal that says "this sheet is new" without a hook that fires for every actor.
   *
   * The empty-inventory guard is what keeps a compendium import, which arrives the same way but
   * already carrying its class and gear, from being asked whether it wants to be rolled up.
   *
   * Not awaited: `_onFirstRender` is inside the render pipeline, and parking it on a dialog would
   * hold the frame half-built until the player answered.
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    if (options.renderContext !== 'createActor') return;
    if (this.document.items.size > 0) return;
    void this.#offerWizard();
  }

  async #offerWizard() {
    if ((await chooseCreationMode()) !== 'wizard') return;
    // The sheet stays open behind the wizard: it is where the finished character lands, and
    // Foundry re-renders it off the one update the draft writes.
    this.generateCharacter();
  }

  generateCharacter() {
    // Centred on the sheet it was opened from, and never off the left edge: the wizard is wider
    // than the sheet, so half the difference is negative.
    const { width } = GeneratorApp.DEFAULT_OPTIONS.position;
    new GeneratorApp({
      actor: this.document,
      position: {
        top: this.position.top + 40,
        left: Math.max(0, this.position.left + (this.position.width - width) / 2),
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
    this.#root.className = 'mothership-sheet-root';
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
