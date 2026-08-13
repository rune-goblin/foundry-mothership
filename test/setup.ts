// `extends Actor` / `extends Item` name Foundry ambient globals, evaluated when the module
// loads. The specs never construct a document — they call methods with a hand-built `this` —
// so empty base classes are enough to let actor.js and documents/item.ts load.
(globalThis as Record<string, unknown>).Actor = class {};
(globalThis as Record<string, unknown>).Item = class {};

// Every roll path logs what it parsed. Useful in the console, noise in a test run.
globalThis.console.log = () => {};
