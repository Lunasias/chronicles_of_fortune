import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { DungeonSystem } from '../.test-build/game/DungeonSystem.js';
import { IsometricRenderer } from '../.test-build/engine/IsometricRenderer.js';
import { isometricTerrainEngine } from '../.test-build/engine/IsometricTerrainEngine.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';

test('late-loaded dungeons rebuild terrain and remain reachable by focus, resize and return', () => {
  const drawn = new Error('camera/cache preparation complete');
  const ctx = { clearRect() { throw drawn; } };
  const canvas = { width: 1280, height: 720, getContext: () => ctx };
  const renderer = new IsometricRenderer(canvas);
  for (const [realm, entrance] of [['abyss', 1000], ['sunfire', 1100], ['frostpeak', 1200]]) {
    const game = new GameState();
    game.initGame([{ name: 'Explorer', classKey: 'cleric', isAI: false }]);
    const player = game.activePlayer;
    const surfaceId = player.nodeId;
    const dungeon = new DungeonSystem();
    renderer.initBoardCache(game.allNodes);
    assert.equal(renderer.nodeScreenCache.has(1000), false);
    dungeon.enterDungeon(player, game, realm);
    assert.equal(player.nodeId, entrance);
    const target = renderer.toScreen(player.gridX, player.gridY, player.gridZ);
    assert.ok(target.y > 4400, 'regression requires an entrance beyond the old fixed clamp');
    renderer.focusOnPlayer(player.gridX, player.gridY, player.gridZ);
    renderer.clampCameraBounds();
    assert.equal(renderer.camera.targetY, target.y);
    assert.throws(() => renderer.render(game.allNodes, game.players, player), err => err === drawn);
    assert.equal(renderer.camera.x, target.x);
    assert.equal(renderer.camera.y, target.y);
    assert.ok(isometricTerrainEngine.terrainTiles.some(t => t.gx === player.gridX && t.gy === player.gridY));
    assert.equal(renderer.nodeScreenCache.size, 7, 'only the current dungeon is drawn');
    assert.ok(isometricTerrainEngine.terrainTiles.every(t => Math.abs(t.gx - player.gridX) <= 10));
    renderer.clampCameraBounds();
    assert.equal(renderer.camera.targetY, target.y);
    const surface = game.allNodes.find(n => n.id === surfaceId);
    renderer.centerCameraOn(surface.gx, surface.gy, surface.gz);
    assert.throws(() => renderer.render(game.allNodes, game.players, player), err => err === drawn);
    assert.ok(renderer.nodeScreenCache.has(surfaceId), 'roster focus can inspect a surface player from inside a dungeon');
    assert.equal(renderer.nodeScreenCache.has(1000), false);
    renderer.centerCameraOn(player.gridX, player.gridY, player.gridZ);
    assert.throws(() => renderer.render(game.allNodes, game.players, player), err => err === drawn);
    dungeon.exitDungeon(player, game);
    assert.equal(player.nodeId, surfaceId);
    renderer.centerCameraOn(player.gridX, player.gridY, player.gridZ);
    assert.equal(renderer.camera.targetY, renderer.toScreen(player.gridX, player.gridY, player.gridZ).y);
    game.resetBoard();
    assert.throws(() => renderer.render(game.allNodes, [], null), err => err === drawn);
    assert.equal(renderer.nodeScreenCache.has(1000), false);
  }
});

test('every dungeon end portal returns to its original surface node after saving and reloading', () => {
  for (const [realm, exit] of [['abyss', 1006], ['sunfire', 1106], ['frostpeak', 1206]]) {
    const game = new GameState();
    game.initGame([{ name: 'Explorer', classKey: 'cleric', isAI: false }]);
    const origin = game.allNodes.find(n => n.id === 18);
    Object.assign(game.activePlayer, { nodeId: origin.id, gridX: origin.gx, gridY: origin.gy, gridZ: origin.gz });
    const dungeon = new DungeonSystem();
    dungeon.enterDungeon(game.activePlayer, game, realm);
    const portal = game.allNodes.find(n => n.id === exit);
    Object.assign(game.activePlayer, { nodeId: exit, gridX: portal.gx, gridY: portal.gy, gridZ: portal.gz });
    assert.equal(dungeon.isExitNode(exit), true);
    assert.equal(dungeon.isExitNode(exit - 1), false);
    assert.equal(SaveManager.save(game), true);
    const restored = new GameState();
    assert.equal(SaveManager.load(restored).success, true);
    assert.ok(restored.allNodes.some(n => n.id === exit));
    const reloadedDungeon = new DungeonSystem();
    reloadedDungeon.exitDungeon(restored.activePlayer, restored);
    assert.equal(restored.activePlayer.nodeId, origin.id);
    assert.equal(restored.activePlayer.gridX, origin.gx);
    assert.equal(restored.activePlayer.gridY, origin.gy);
    assert.equal(restored.activePlayer.dungeonReturnNodeId, null);
  }
});
