import test from 'node:test';
import assert from 'node:assert/strict';

const classes = new Set();
globalThis.window = { innerWidth: 390, innerHeight: 844, addEventListener() {} };
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, value: { maxTouchPoints: 1, userAgent: 'test' },
});
globalThis.document = {
  body: { classList: {
    add: name => classes.add(name),
    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
  } },
  addEventListener() {}, getElementById() { return null; },
};
const { mobileDisplayManager } = await import('../.test-build/ui/MobileDisplayManager.js');

test('rotating a phone clears portrait layout and restores it when rotated back', () => {
  mobileDisplayManager.updateBodyClasses();
  assert.ok(classes.has('mobile-portrait-mode'));
  Object.assign(window, { innerWidth: 844, innerHeight: 390 });
  mobileDisplayManager.updateBodyClasses();
  assert.ok(classes.has('is-mobile-landscape'));
  assert.ok(!classes.has('mobile-portrait-mode'));
  assert.ok(!classes.has('is-mobile-portrait'));
  Object.assign(window, { innerWidth: 390, innerHeight: 844 });
  mobileDisplayManager.updateBodyClasses();
  assert.ok(classes.has('mobile-portrait-mode'));
  assert.ok(!classes.has('is-mobile-landscape'));
});

test('resizing back to a desktop clears all mobile layout classes', () => {
  navigator.maxTouchPoints = 0;
  Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
  mobileDisplayManager.updateBodyClasses();
  assert.equal(classes.size, 0);
});
