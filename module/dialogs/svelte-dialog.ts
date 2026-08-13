/**
 * One prompt, one promise. Five of legacy's dialogs wrapped `DialogV2` in `new Promise(resolve =>
 * …)` and never called `resolve` from any button, so every `await` on them parked for good and
 * the flows worked only because the callbacks acted on their own (audit F6). `DialogV2.wait`
 * already returns a real promise; this mounts a Svelte component as the dialog's content and
 * keeps that promise's contract: it resolves with the answer on every button, and with `null`
 * when the dialog is dismissed. The component is unmounted either way.
 *
 * The component owns what the user picked and reports it through `onchange`; the buttons turn
 * that value into the answer. So a dialog whose buttons *are* the answer needs no state at all,
 * and one that picks a row plus a modifier needs no second dialog.
 */

import { mount, unmount, type Component } from 'svelte';

export interface AnswerProps<V> {
  /** What the component starts on. */
  readonly value: V;
  readonly onchange: (value: V) => void;
}

export interface DialogButton<V, T> {
  readonly action: string;
  /** Already localized: this module never guesses at a key. */
  readonly label: string;
  readonly icon?: string;
  readonly class?: string;
  /** DialogV2 autofocuses the button carrying this — the condition preselect (§34). */
  readonly default?: boolean;
  readonly answer: (value: V) => T;
}

export interface SvelteDialogOptions<V, T, P extends object> {
  readonly component: Component<P & AnswerProps<V>>;
  readonly props: P;
  readonly title: string;
  readonly initial: V;
  readonly buttons: readonly DialogButton<V, T>[];
  readonly width?: number;
}

interface DialogInstance {
  readonly element: { querySelector(selector: string): Element | null };
}

interface DialogV2Button {
  readonly action: string;
  readonly label: string;
  readonly icon?: string;
  readonly class?: string;
  readonly default?: boolean;
  readonly callback: () => unknown;
}

interface DialogV2Options {
  readonly window: { readonly title: string };
  readonly classes: readonly string[];
  readonly position?: { readonly width: number };
  readonly content: string;
  readonly buttons: readonly DialogV2Button[];
  readonly rejectClose: false;
  readonly render: (event: unknown, dialog: DialogInstance) => void;
  readonly close: (event: unknown, dialog: DialogInstance) => void;
}

declare const foundry:
  | { readonly applications: { readonly api: { readonly DialogV2: { wait(options: DialogV2Options): Promise<unknown> } } } }
  | undefined;

/** The class the legacy dialogs carry, so `css/mosh.css` styles these the same way. */
const CLASSES = ['macro-popup-dialog'] as const;

const MOUNT_CLASS = 'mosh-dialog-root';

export async function svelteDialog<V, T, P extends object>(
  options: SvelteDialogOptions<V, T, P>,
): Promise<T | null> {
  if (typeof foundry === 'undefined') return null;

  let value = options.initial;
  let component: Record<string, unknown> | null = null;

  const answered = await foundry.applications.api.DialogV2.wait({
    window: { title: options.title },
    classes: CLASSES,
    ...(options.width === undefined ? {} : { position: { width: options.width } }),
    content: `<div class="${MOUNT_CLASS}"></div>`,
    buttons: options.buttons.map((button) => ({
      action: button.action,
      label: button.label,
      icon: button.icon,
      class: button.class,
      default: button.default,
      callback: () => ({ answer: button.answer(value) }),
    })),
    rejectClose: false,
    render: (_event, dialog) => {
      const target = dialog.element.querySelector(`.${MOUNT_CLASS}`);
      // ApplicationV2 renders more than once; the component is mounted on the first pass only.
      if (target === null || component !== null) return;
      const props = Object.assign({}, options.props, {
        value: options.initial,
        onchange: (next: V) => {
          value = next;
        },
      });
      component = mount(options.component, { target, props }) as Record<string, unknown>;
    },
    close: () => {
      // Returning anything here would become the dialog's answer, so the unmount is discarded.
      if (component !== null) void unmount(component);
      component = null;
    },
  });

  // A button answers with a wrapper, so an answer of `null` stays distinguishable from dismissal.
  return answered === null || answered === undefined ? null : (answered as { answer: T }).answer;
}
