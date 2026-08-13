import { mount, unmount } from 'svelte';
import Generator from './Generator.svelte';
import { CharacterDraft } from './draft.svelte.js';
import { localize } from '../../i18n.ts';

const { ApplicationV2 } = foundry.applications.api;

/**
 * The character generator's window. ApplicationV2 rather than DocumentSheetV2 on purpose: nothing
 * here is a field of the actor, so there is no form for Foundry to persist. The draft holds the
 * state and writes the actor once, when the player saves.
 */
export class GeneratorApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    // css/mosh.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mosh', 'sheet', 'actor', 'character', 'themed', 'theme-light'],
    position: { width: 800, height: 'auto' },
    window: { resizable: true },
  };

  #actor;
  #draft;
  #component;
  #root;

  constructor({ actor, ...options } = {}) {
    super({ id: `mosh-generator-${actor.id}`, ...options });
    this.#actor = actor;
    this.#draft = new CharacterDraft(actor);
  }

  get title() {
    return `${this.#actor.name}: ${localize('Mosh.CharacterGenerator.name')}`;
  }

  /** For specs and macros: the live draft, so a generated character can be asserted on. */
  get draft() {
    return this.#draft;
  }

  async _renderHTML() {
    if (this.#component) return this.#root;
    await this.#draft.load();
    this.#root = document.createElement('div');
    this.#root.className = 'mosh-sheet-root';
    this.#component = mount(Generator, {
      target: this.#root,
      props: { draft: this.#draft, close: () => this.close() },
    });
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
