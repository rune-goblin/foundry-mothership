import { mount, unmount, flushSync } from 'svelte';
import CharacterSheet from './CharacterSheet.svelte';
import { WizardWindow } from '../generator/Wizard.svelte';
import { creationFinished, finishCreation } from '../generator/record.js';
import { chooseCreationMode } from './creation.js';
import { createDocumentStore } from '../document-store.svelte.js';

const { ActorSheetV2 } = foundry.applications.sheets;

// Document stays the source of truth, Foundry persists the form, component mounts once.
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
          // The generator makes a character; it has no second job on one already made. Read at the
          // moment the menu opens — ApplicationV2 builds its entries in the dropdown's `onOpen` —
          // so finishing a run takes the control away without the sheet re-rendering to do it.
          visible() {
            return !creationFinished(this.document);
          },
        },
      ],
    },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: { generateCharacter: MothershipCharacterSheet.#onGenerateCharacter },
  };

  get title() {
    return this.document.name;
  }

  static #onGenerateCharacter() {
    this.generateCharacter();
  }

  // On createActor render with no items yet (compendium imports already carry items), abort
  // synchronously before Foundry builds any DOM and prompt for creation mode. The later render
  // passes a private context so the prompt can't fire twice.
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
      const mode = await chooseCreationMode();
      if (mode === 'wizard') {
        this.#openGenerator({
          centreOnSheet: false,
          onComplete: () => this.render({ force: true }),
        });
        return;
      }
      // Choosing the blank sheet is the answer to the question the generator asks, so it closes
      // creation too. Dismissing the dialog answers nothing and leaves the control where it is.
      if (mode === 'blank') await finishCreation(this.document);
      await this.render({ force: true, renderContext: 'mothershipCreationChoice' });
    } finally {
      this.#choosingCreationMode = false;
    }
  }

  generateCharacter() {
    this.#openGenerator();
  }

  #openGenerator({ centreOnSheet = true, onComplete } = {}) {
    // Clamped to 0: the wizard is wider than the sheet, so half the difference can go negative.
    // A sheet with no position yet (initial creation) falls back to ApplicationV2's own centering.
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

  async _context() {
    const { TextEditor } = foundry.applications.ux;
    const enrich = (html) =>
      TextEditor.implementation.enrichHTML(html ?? '', { relativeTo: this.document });

    return {
      // World setting, not actor data — kept off system.settings, which no schema declares.
      hideWeight: game.settings.get('mothershiprpg', 'hideWeight'),
      enriched: {
        biography: await enrich(this.document.system.biography),
        notes: await enrich(this.document.system.notes),
      },
      // Enriched here rather than in the row: the sheet's disclosure prints it as HTML, and
      // enrichHTML is async where a Svelte template is not.
      items: await Promise.all(
        this.document.items.map(async (item) => ({
          id: item.id,
          type: item.type,
          name: item.name,
          system: item.system,
          description: await enrich(item.system.description),
        })),
      ),
    };
  }

  // flushSync puts rows in the DOM before _onRender binds dragstart to them.
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
