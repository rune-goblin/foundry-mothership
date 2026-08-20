// Specs never construct a document, only call methods with a hand-built `this`,
// so empty base classes satisfy the `extends Actor`/`extends Item` at module load.
(globalThis as Record<string, unknown>).Actor = class {};
(globalThis as Record<string, unknown>).Item = class {};

globalThis.console.log = () => {};
