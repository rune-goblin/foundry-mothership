import { mount, unmount, flushSync } from 'svelte';
import CharacterSheet from './CharacterSheet.svelte';
import { WizardWindow } from '../generator/Wizard.svelte';
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
   * Stop a newly created character before Foundry builds its first sheet frame. `createActor` is
   * the render context stamped by both the sidebar create dialog and
   * `Actor.create(…, {renderSheet: true})`; creature creation resolves to MothershipCreatureSheet
   * instead, so it never enters this branch.
   *
   * The empty-inventory guard is what keeps a compendium import, which arrives the same way but
   * already carrying its class and gear, from being asked whether it wants to be rolled up.
   *
   * `_canRender` is synchronous and Foundry honors `false` before preparing or inserting any DOM.
   * The dialog therefore runs beside the aborted render. A later render uses a private context so
   * choosing a blank sheet (or dismissing the choice, as before) cannot ask the question twice.
   */
  _canRender(options) {
    const allowed = super._canRender(options);
    if (allowed === false) return false;
    if (options.renderContext !== 'createActor') return allowed;
    if (this.document.items.size > 0) return allowed;
    if (!this.#choosingCreationMode) void this.#chooseInitialView();
    return false;
  }

  #choosingCreationMode = false;

  async #chooseInitialView() {
    this.#choosingCreationMode = true;
    try {
      if ((await chooseCreationMode()) === 'wizard') {
        this.#openGenerator({
          centreOnSheet: false,
          onComplete: () => this.render({ force: true }),
        });
        return;
      }
      await this.render({ force: true, renderContext: 'mothershipCreationChoice' });
    } finally {
      this.#choosingCreationMode = false;
    }
  }

  generateCharacter() {
    this.#openGenerator();
  }

  #openGenerator({ centreOnSheet = true, onComplete } = {}) {
    // Centred on the sheet it was opened from, and never off the left edge: the wizard is wider
    // than the sheet, so half the difference is negative. On initial creation the sheet has no
    // position yet, and ApplicationV2 centres the generator from its own default position.
    const { width } = WizardWindow.DEFAULT_OPTIONS.position;
    new WizardWindow({
      actor: this.document,
      onComplete,
      ...(centreOnSheet
        ? {
            position: {
              top: this.position.top + 40,
              left: Math.max(0, this.position.left + (this.position.width - width) / 2),
            },
          }
        : {}),
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
