import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { HUD } from '../.test-build/ui/HUD.js';
import { pixelSprites } from '../.test-build/engine/PixelSpriteGenerator.js';

function context() {
  return {
    calls: { draw: 0, stroke: 0, clear: 0, fills: [] },
    drawImage() { this.calls.draw++; },
    clearRect() { this.calls.clear++; },
    fillRect(x, y, w, h) { this.calls.fills.push({ x, y, w, h, color: this.fillStyle }); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() { this.calls.stroke++; }
  };
}

class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.listeners = {}; this.dataset = {};
    this.className = ''; this.title = ''; this.textContent = ''; this.attributes = {};
    this.style = {}; this.width = 160; this.height = 110; this.htmlWrites = 0;
    this.classList = { add() {}, remove() {} }; this.ctx = context();
  }
  getContext() { return this.ctx; }
  set innerHTML(value) { this.html = value; this.htmlWrites++; }
  get innerHTML() { return this.html; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }
  append(...items) { items.forEach(item => this.insertBefore(item, null)); }
  insertBefore(item, sibling) {
    item.remove(); const index = sibling ? this.children.indexOf(sibling) : -1;
    this.children.splice(index < 0 ? this.children.length : index, 0, item); item.parent = this;
  }
  remove() { if (this.parent) { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; } }
  contains(item) { return item === this || this.children.some(child => child.contains(item)); }
  closest() { return this; }
  click() { for (const listener of this.listeners.click ?? []) listener({ target: this, stopPropagation() {} }); }
}

function fixture(t) {
  const savedDocument = globalThis.document;
  const elements = new Map(['minimapCanvas', 'hudAvatarCanvas', 'hudRosterButtonsContainer', 'questTrackerHUD', 'questTrackerList', 'hudCrisisCount'].map(id => [id, new Element(id.includes('Canvas') ? 'canvas' : 'div')]));
  globalThis.document = { getElementById: id => elements.get(id) ?? null, createElement: tag => new Element(tag) };
  t.after(() => { globalThis.document = savedDocument; });
  const first = { id: 1, displayName: 'Luna', avatar: '🌙', color: '#abcdef', gridX: 0, gridY: 0, nodeId: 0, classKey: 'cleric', equipment: {}, prank: {}, skinVariant: 0 };
  const second = { ...first, id: 2, displayName: 'Sol', avatar: '☀️', gridX: 10, gridY: 10 };
  const nodes = [
    { id: 0, gx: 0, gy: 0, type: 'blue', neighbors: [1] },
    { id: 1, gx: 10, gy: 10, type: 'boss', name: 'Guardian', neighbors: [0] },
    { id: 1000, gx: 90, gy: 90, type: 'blue', neighbors: [1001] },
    { id: 1001, gx: 100, gy: 100, type: 'boss', name: 'Ice Guardian', neighbors: [1000] }
  ];
  const game = { players: [first, second], activePlayer: first, allNodes: nodes, world: { defeatedBosses: [] } };
  const hud = new HUD(game);
  return { hud, game, elements };
}

test('roster preserves buttons and focus through updates and resolves current synchronized players', t => {
  const { hud, game, elements } = fixture(t), container = elements.get('hudRosterButtonsContainer');
  hud.updateRoster(); const [first, second] = container.children;
  hud.updateRoster(); assert.deepEqual(container.children, [first, second]);
  const replacement = { ...game.players[0], displayName: '<Updated hero>' };
  game.players[0] = replacement; game.activePlayer = game.players[1];
  let inspected; hud.onInspectPlayerCallback = player => { inspected = player; };
  hud.updateRoster(); first.click();
  assert.equal(inspected, replacement, 'click must not retain the pre-sync Player instance');
  assert.equal(first.children[1].textContent, '<Updated hero>');
  assert.equal(first.htmlWrites, 0, 'names are written safely without rebuilding HTML');
  assert.equal(second.attributes['aria-pressed'], 'true');
  game.players.reverse(); hud.updateRoster(); assert.deepEqual(container.children, [second, first]);
  game.players.pop(); hud.updateRoster(); assert.deepEqual(container.children, [second]);
});

test('quest tracker avoids unchanged DOM replacement and its delegated camera action uses current nodes', t => {
  const { hud, game, elements } = fixture(t), list = elements.get('questTrackerList');
  hud.updateQuestTracker(); hud.updateQuestTracker();
  assert.equal(list.htmlWrites, 1); assert.equal(list.listeners.click.length, 1);
  game.world.defeatedBosses.push(1); hud.updateQuestTracker(); assert.equal(list.htmlWrites, 2);
  const updated = { ...game.allNodes[3], name: 'Updated guardian' }; game.allNodes[3] = updated;
  const button = new Element('button'); button.dataset.nodeId = '1001'; list.append(button);
  let focused; hud.onFocusNodeCallback = node => { focused = node; };
  list.listeners.click[0]({ target: button, stopPropagation() {} });
  assert.equal(focused, updated);
});

test('minimap reuses its board while moving markers and invalidates for scene, resize and map edits', t => {
  const { hud, game, elements } = fixture(t), canvas = elements.get('minimapCanvas');
  hud.updateMapMarkers(); const boardStrokes = hud.minimapBaseCtx.calls.stroke;
  assert.equal(boardStrokes, 1); assert.equal(canvas.ctx.calls.draw, 1);
  hud.updateMapMarkers(); hud.renderMinimap();
  assert.equal(canvas.ctx.calls.draw, 1); assert.equal(hud.minimapBaseCtx.calls.stroke, boardStrokes);
  game.activePlayer.gridX = 4; hud.updateMapMarkers();
  assert.equal(canvas.ctx.calls.draw, 2); assert.equal(hud.minimapBaseCtx.calls.stroke, boardStrokes);
  game.activePlayer.isDarkling = true; hud.updateMapMarkers();
  assert.equal(canvas.ctx.calls.draw, 3);
  assert.ok(canvas.ctx.calls.fills.some(fill => fill.color === '#f43f5e'));
  game.allNodes = game.allNodes.map(node => ({ ...node })); hud.updateMapMarkers();
  assert.equal(hud.minimapBaseCtx.calls.stroke, boardStrokes, 'equivalent network snapshots retain the static map');
  game.activePlayer.nodeId = 1000; game.activePlayer.gridX = 90; game.activePlayer.gridY = 90; hud.updateMapMarkers();
  assert.equal(hud.minimapGroup, 1000); assert.equal(hud.minimapBaseCtx.calls.stroke, boardStrokes + 1);
  canvas.width = 220; hud.updateMapMarkers(); assert.equal(hud.minimapBase.width, 220);
  const afterResize = hud.minimapBaseCtx.calls.stroke;
  game.allNodes[2].gx = 85; hud.renderMinimap(); assert.equal(hud.minimapBaseCtx.calls.stroke, afterResize + 1);
  game.players = []; hud.updateMapMarkers(); assert.equal(canvas.ctx.calls.draw, 7, 'removing the last marker still restores the board');
});

test('avatar is redrawn only for appearance changes', t => {
  const { hud, game, elements } = fixture(t), avatar = elements.get('hudAvatarCanvas');
  const saved = pixelSprites.getHeroSprite; pixelSprites.getHeroSprite = () => ({});
  t.after(() => { pixelSprites.getHeroSprite = saved; });
  hud.renderAvatar(); hud.renderAvatar(); assert.equal(avatar.ctx.calls.draw, 1);
  game.activePlayer.prank.hasGraffiti = true; hud.renderAvatar(); assert.equal(avatar.ctx.calls.draw, 2);
  game.activePlayer.skinVariant++; hud.renderAvatar(); assert.equal(avatar.ctx.calls.draw, 3);
  game.activePlayer.hp = 1; hud.renderAvatar(); assert.equal(avatar.ctx.calls.draw, 3, 'health changes do not rerasterize the portrait');
});
