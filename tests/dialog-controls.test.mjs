import test from 'node:test';
import assert from 'node:assert/strict';
import { withDialogControls } from '../.test-build/ui/DialogControls.js';

test('native dialogs own all controller actions and keep game commands untouched', t => {
  const previous = { document: globalThis.document, button: globalThis.HTMLButtonElement };
  class Button { constructor() { this.hidden = false; } closest() { return null; } click() { this.clicked = true; } focus() { globalThis.document.activeElement = this; } }
  globalThis.HTMLButtonElement = Button;
  const buttons = [new Button(), new Button()];
  let visible = true, closed = '';
  const dialog = { querySelectorAll: () => buttons, close: value => { closed = value; visible = false; } };
  globalThis.document = { querySelector: () => visible ? dialog : null, activeElement: buttons[0] };
  t.after(() => { globalThis.document = previous.document; globalThis.HTMLButtonElement = previous.button; });
  const gameCalls = [];
  const callbacks = withDialogControls(Object.fromEntries(['onConfirm','onCancel','onSecondary','onSpecial','onStart','onSelect','onPan','onZoom','onDpadRight'].map(name => [name, (...args) => gameCalls.push([name, ...args])])));
  for (const name of ['onSecondary','onSpecial','onStart','onSelect','onPan','onZoom']) callbacks[name](1, 2);
  assert.deepEqual(gameCalls, []);
  callbacks.onDpadRight(); assert.equal(document.activeElement, buttons[1]);
  callbacks.onConfirm(); assert.equal(buttons[1].clicked, true); assert.deepEqual(gameCalls, []);
  callbacks.onCancel(); assert.equal(closed, 'cancel');
  callbacks.onPan(4, 5); assert.deepEqual(gameCalls, [['onPan', 4, 5]]);
});
