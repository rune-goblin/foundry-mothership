import { mount, unmount } from 'svelte';
import ShipSetup from './ShipSetup.svelte';

const { ApplicationV2 } = foundry.applications.api;

/**
 * A one-shot popout opened from the SBT ship sheet: it rolls the starting-condition table and
 * closes. Nothing here is edited, so this is a plain ApplicationV2 with no document store and no
 * form -- `actor` is passed straight through as a prop.
 */
export class ShipSetupApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'mosh-ship-setup',
    // css/mosh.css paints the content white and has no dark variant, so pin the light theme.
    classes: ['mosh', 'sheet', 'actor', 'ship', 'themed', 'theme-light'],
    window: { resizable: false },
    position: { width: 320, height: 'auto' },
  };

  #component;
  #root;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  get title() {
    return `${this.actor.name}: Ship Setup`;
  }

  async _renderHTML() {
    if (!this.#component) {
      this.#root = document.createElement('div');
      this.#component = mount(ShipSetup, { target: this.#root, props: { actor: this.actor, app: this } });
    }
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
