// module/actor/actor.js declares `extends Actor`, which is a Foundry ambient global
// evaluated at import time. The specs never construct an actor — they call methods with a
// hand-built `this` — so an empty base class is enough to let the module load.
(globalThis as Record<string, unknown>).Actor = class {};

// Every roll path logs what it parsed. Useful in the console, noise in a test run.
globalThis.console.log = () => {};
