import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { Player } from '../.test-build/game/Player.js';
import { movementRoutes, isLegalMovementPath } from '../.test-build/game/Movement.js';

const road = [
  { id: 0, neighbors: [1] },
  { id: 1, neighbors: [0, 2] },
  { id: 2, neighbors: [1, 3, 4] },
  { id: 3, neighbors: [2, 5] },
  { id: 4, neighbors: [2] },
  { id: 5, neighbors: [3] },
].map(n => ({ ...n, gx: n.id, gy: 0, gz: 0, type: 'empty' }));

function gameOnRoad(moves = 1) {
  const game = new GameState();
  const player = new Player(1, 'Hero', 'warrior', '#fff', false);
  player.nodeId = 2; player.prevNodeId = 1;
  game.players = [player]; game.allNodes = road;
  game.remainingMoves = moves; game.phase = 'CHOOSING_PATH';
  game.updateReachableHighlights();
  return game;
}

test('a new turn can start both forward and backward, including the road used last turn', () => {
  const game = gameOnRoad();
  assert.deepEqual(new Set(game.highlightedNodes), new Set([1, 3, 4]));
  assert.deepEqual(game.findPathToTarget(1), [2, 1]);
  assert.deepEqual(game.findPathToTarget(3), [2, 3]);
});

test('backward travel respects the exact roll; flexible travel includes intermediate stops', () => {
  const game = gameOnRoad(2);
  assert.deepEqual(game.findPathToTarget(0), [2, 1, 0]);
  assert.equal(game.findPathToTarget(1), null);
  game.activePlayer.hasFlexibleMovement = true;
  game.updateReachableHighlights();
  assert.deepEqual(game.findPathToTarget(1), [2, 1]);
  assert.deepEqual(game.findPathToTarget(0), [2, 1, 0]);
});

test('mid-route U-turns are rejected at crossroads and allowed at dead ends', () => {
  assert.equal(isLegalMovementPath(road, 1, 3, false, [1, 2, 1, 0]), false);
  assert.equal(isLegalMovementPath(road, 2, 3, false, [2, 4, 2, 1]), true);
  assert.equal(isLegalMovementPath(road, 2, 3, false, [2, 1, 0, 1]), true);
});

test('invalid or stale routes have no side effects and cannot start a second move', () => {
  const game = gameOnRoad(2);
  let steps = 0;
  game.executeSingleStep = () => { steps++; };
  const arrival = () => assert.fail('invalid path arrived');
  for (const path of [[], [2], [1, 2, 3], [2, 5, 3], [2, 1], [2, 1, 999]]) {
    game.executePath(path, () => {}, arrival);
    assert.equal(game.phase, 'CHOOSING_PATH');
    assert.equal(game.activePlayer.nodeId, 2);
    assert.equal(steps, 0);
  }
  game.executePath([2, 1, 0], () => {}, () => {});
  assert.equal(game.phase, 'MOVING'); assert.equal(steps, 1);
  game.executePath([2, 1, 0], () => {}, () => {});
  assert.equal(steps, 1);
});

test('every highlighted destination has an executable route throughout the real world', () => {
  const game = gameOnRoad();
  const realGame = new GameState();
  for (const node of realGame.allNodes.filter((_, i) => i % 23 === 0)) {
    for (const flexible of [false, true]) {
      const routes = movementRoutes(realGame.allNodes, node.id, 6, flexible);
      assert.ok(routes.size > 0);
      for (const [target, path] of routes) {
        assert.equal(path.at(-1), target);
        assert.equal(isLegalMovementPath(realGame.allNodes, node.id, 6, flexible, path), true);
      }
    }
  }
  assert.deepEqual([...movementRoutes(game.allNodes, 2, 0, false)], []);
});
