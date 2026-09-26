// Tests for the HTML escaping helper used wherever hero names, town names or prank
// nicknames are interpolated into innerHTML template literals.
//
// The module under test is compiled by `npm run pretest` (tsconfig.test.json).
import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml } from '../.test-build/util/Html.js';

test('escapes the characters that can break out of text or an attribute', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('neutralises a script injection attempt', () => {
  const attack = '<img src=x onerror="alert(1)">';
  const escaped = escapeHtml(attack);
  assert.ok(!escaped.includes('<'), 'must not emit a raw tag opener');
  assert.ok(!escaped.includes('>'), 'must not emit a raw tag closer');
  assert.ok(!escaped.includes('"'), 'must not emit a raw double quote');
  assert.equal(escaped, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('escapes the ampersand before the other entities it produces', () => {
  // A naive implementation that replaces < first would double-escape its own output.
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
  assert.equal(escapeHtml('<&>'), '&lt;&amp;&gt;');
});

test('leaves ordinary names untouched', () => {
  for (const name of ['Valeria', 'Lyra', 'นักรบ', 'Aria_2', 'Hero 1', '']) {
    assert.equal(escapeHtml(name), name);
  }
});

test('handles non-string input without throwing', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml(42), '42');
});

test('is idempotent only for text that needs no escaping', () => {
  // Escaping is not meant to be applied twice; this documents the behaviour so a future
  // double-escape regression is caught.
  const once = escapeHtml('<b>');
  assert.equal(once, '&lt;b&gt;');
  assert.equal(escapeHtml(once), '&amp;lt;b&amp;gt;');
});
