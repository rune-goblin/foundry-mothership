import { mount, unmount } from 'svelte';
import ItemSheet from './ItemSheet.svelte';
import { createDocumentStore } from '../document-store.svelte.js';

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * The ApplicationV2 shell for the eight simple item types, and the base for the item sheets that
 * need more than they do. It owns the window; the Svelte component owns everything inside it.
 *
 * Fields keep their `name="system.…"` attributes and Foundry's own form handling persists them,
 * exactly as the AppV1 sheet did with `submitOnChange: true` -- no per-field update calls.
 */
export class MothershipItemSheet extends DocumentSheetV2 {
  /** Subclasses swap the component and extend `_context()`; the shell itself is unchanged. */
  static COMPONENT = ItemSheet;

  static DEFAULT_OPTIONS = {
    // css/mosh.css paints the content white and has no dark variant, so pin the light theme.
    // DocumentSheetV2 only appends the user's theme classes when "themed" is not already here.
    classes: ['mothership', 'mosh', 'sheet', 'item', 'themed', 'theme-light'],
    position: { width: 600, height: 500 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  /** AppV1's ItemSheet titled the window with the bare item name; keep that. */
  get title() {
    return this.document.name;
  }

  #component;
  #root;
  #store;

  /** Everything the component needs that is not on the document, re-read on every render. */
  async _context() {
    const { TextEditor } = foundry.applications.ux;
    return {
      enriched: {
        description: await TextEditor.implementation.enrichHTML(this.document.system.description ?? '', {
          relativeTo: this.document,
        }),
      },
    };
  }

  /**
   * AppV2 calls this on every render. Mount once and return the cached node, so a re-render
   * neither leaks a second component nor discards Svelte's state -- refresh the store instead.
   */
  async _renderHTML() {
    const context = await this._context();
    if (this.#component) {
      this.#store.refresh(context);
      return this.#root;
    }
    this.#store = createDocumentStore(this.document, context);
    this.#root = document.createElement('div');
    this.#root.className = 'mosh-sheet-root';
    this.#component = mount(this.constructor.COMPONENT, {
      target: this.#root,
      props: { store: this.#store, app: this },
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
    this.#store = undefined;
  }
}
