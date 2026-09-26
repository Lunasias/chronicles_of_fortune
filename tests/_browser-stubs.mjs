// Minimal browser surface for running the game's logic modules under node:test.
//
// GameState and SaveManager are pure logic, but their import graph reaches the renderers
// (Player -> PixelSpriteGenerator -> CustomIsometricHeroRenderer) and the Web Audio engine,
// which touch `Image`, `window` and `localStorage` at module load or during a turn. These
// stubs make those calls harmless no-ops so the rules can be exercised headlessly.
//
// Import this module for its side effects before importing any compiled game module:
//   import './_browser-stubs.mjs';
//
// Nothing here simulates rendering - the tests only assert on game state.

const store = new Map();

globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
  key: index => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  }
};

/** Sprite sheets never load: onload/onerror simply never fire, which is fine. */
globalThis.Image = class {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
  }
  set src(value) {
    this._src = value;
  }
  get src() {
    return this._src;
  }
  addEventListener() {}
  removeEventListener() {}
};

globalThis.CustomEvent = class {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

// Every property is callable and every property of that is callable too, so any Web Audio
// chain (ctx.createGain().gain.setValueAtTime(...)) resolves without special-casing.
const makeAudioMock = () =>
  new Proxy(function () {}, {
    get: (_target, prop) => {
      if (prop === 'currentTime') return 0;
      if (prop === 'state') return 'running';
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === 'then') return undefined;
      return makeAudioMock();
    },
    apply: () => makeAudioMock(),
    set: () => true
  });

const audioMock = makeAudioMock();

globalThis.window = {
  AudioContext: function () {
    return audioMock;
  },
  webkitAudioContext: function () {
    return audioMock;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  // No-op timers so the BGM scheduler cannot keep the process alive.
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {}
};

// GameState.addLog guards its DOM writes with `typeof document !== 'undefined'`.
globalThis.document = undefined;

// Walk animations are not driven in tests; a single synchronous frame is never requested.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

export {};
