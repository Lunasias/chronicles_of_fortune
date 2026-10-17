import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { DungeonSystem } from '../.test-build/game/DungeonSystem.js';
import { IsometricRenderer } from '../.test-build/engine/IsometricRenderer.js';
import { isometricTerrainEngine } from '../.test-build/engine/IsometricTerrainEngine.js';

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
    assert.equal(isometricTerrainEngine.terrainTiles.some(t => t.gx >= 140), false);
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
    renderer.clampCameraBounds();
    assert.equal(renderer.camera.targetY, target.y);
    dungeon.exitDungeon(player, game);
    assert.equal(player.nodeId, surfaceId);
    renderer.centerCameraOn(player.gridX, player.gridY, player.gridZ);
    assert.equal(renderer.camera.targetY, renderer.toScreen(player.gridX, player.gridY, player.gridZ).y);
    game.resetBoard();
    assert.throws(() => renderer.render(game.allNodes, [], null), err => err === drawn);
    assert.equal(isometricTerrainEngine.terrainTiles.some(t => t.gx >= 140), false);
  }
});
