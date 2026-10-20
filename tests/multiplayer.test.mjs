import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkRoomManager } from '../.test-build/engine/NetworkRoomManager.js';
import { canAcceptTurnPacket, acceptNetworkMovement, applyNetworkState, RemoteMovementPlayback } from '../.test-build/engine/MultiplayerSync.js';
import { GameState } from '../.test-build/game/GameState.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';

class LocalChannel {
  static channels = new Set();
  constructor(name) { this.name = name; LocalChannel.channels.add(this); }
  postMessage(packet) {
    for (const channel of LocalChannel.channels) {
      if (channel !== this && channel.name === this.name) {
        const copy = structuredClone(packet);
        queueMicrotask(() => { if (LocalChannel.channels.has(channel)) channel.onmessage?.({ data: copy }); });
      }
    }
  }
  close() { LocalChannel.channels.delete(this); }
}
globalThis.BroadcastChannel = LocalChannel;
const flush = () => new Promise(resolve => setImmediate(resolve));
let serial = 0;
function manager() {
  sessionStorage.setItem('cf_client_session_id', `test-session-${++serial}`);
  return new NetworkRoomManager();
}
function packet(room, senderId, type, payload = {}) {
  return { packetId: `test-${++serial}`, roomCode: room.getRoomCode(), senderId, senderName: senderId, type, payload, timestamp: Date.now() };
}
async function roomWithGuests(t, count = 1) {
  const host = manager(); host.createRoom('Host');
  const guests = [];
  t.after(() => { for (const m of [host, ...guests]) m.leaveRoom(); });
  for (let i = 0; i < count; i++) {
    const guest = manager(); guests.push(guest); guest.joinRoom(host.getRoomCode(), `Guest ${i}`); await flush();
  }
  return { host, guests };
}

test('lobby synchronizes settings and profiles, including changes after joining', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  assert.equal(guest.getLocalPlayerIndex(), 1);
  assert.equal(guest.getRoomInfo().connectedPeers.length, 2);
  assert.equal(host.updateLobbySettings({ partySize: 4, gameMode: 'blitz' }), true);
  await flush();
  assert.equal(guest.getRoomInfo().partySize, 4);
  assert.equal(guest.getRoomInfo().gameMode, 'blitz');
  guest.updatePlayerProfile('Renamed', 'mage', 2); await flush();
  assert.equal(host.getRoomInfo().connectedPeers[1].classKey, 'mage');
  assert.equal(guest.getRoomInfo().connectedPeers[1].name, 'Renamed');
  assert.equal(guest.updateLobbySettings({ partySize: 2 }), false);
});

test('full rooms reject admission and cannot shrink below membership', async t => {
  const { host, guests } = await roomWithGuests(t, 2);
  assert.equal(host.updateLobbySettings({ partySize: 2 }), false);
  const extra = manager(); guests.push(extra);
  let error;
  extra.onPacket(p => { if (p.type === 'ROOM_ERROR') error = p.payload; });
  extra.joinRoom(host.getRoomCode()); await flush();
  assert.equal(host.getRoomInfo().connectedPeers.length, 3);
  assert.equal(error.peerId, extra.getMyPeerId());
});

test('lobby departure reassigns seats without duplicate indices', async t => {
  const { host, guests: [a, b] } = await roomWithGuests(t, 2);
  a.leaveRoom(); await flush();
  assert.equal(b.getLocalPlayerIndex(), 1);
  const c = manager(); t.after(() => c.leaveRoom()); c.joinRoom(host.getRoomCode()); await flush();
  assert.deepEqual(host.getRoomInfo().connectedPeers.map(p => p.playerIndex), [0, 1, 2]);
});

test('rejoin uses session identity, never a duplicate display name or claimed seat', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  const member = structuredClone(host.getRoomInfo().connectedPeers[1]);
  host.setStatus('playing'); guest.leaveRoom(); await flush();
  assert.equal(host.getRoomInfo().connectedPeers[1].isDisconnected, true);
  const restored = manager(); t.after(() => restored.leaveRoom());
  restored.rejoinRoom({ roomCode: host.getRoomCode(), clientSessionId: member.clientSessionId, myPeerId: member.id,
    playerName: member.name, classKey: member.classKey, skinVariant: 0, playerIndex: 0, status: 'playing' });
  await flush();
  assert.equal(restored.getLocalPlayerIndex(), 1);
  assert.equal(host.getRoomInfo().connectedPeers.length, 2);
  assert.equal(host.getRoomInfo().connectedPeers[0].id, 'host');
  const intruder = manager(); t.after(() => intruder.leaveRoom());
  intruder.rejoinRoom({ roomCode: host.getRoomCode(), clientSessionId: 'unknown', playerName: 'Host', playerIndex: 0, status: 'playing' });
  await flush();
  assert.equal(host.getRoomInfo().connectedPeers.length, 2);
  assert.equal(host.getRoomInfo().connectedPeers[0].id, 'host');
});

test('duplicate JOIN on second transport still sends authoritative roster', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  let acknowledgements = 0;
  guest.onPacket(p => { if (p.type === 'PEER_CONNECTED') acknowledgements++; });
  host.processIncomingPacket(packet(host, guest.getMyPeerId(), 'JOIN_ROOM', { peer: guest.getRoomInfo().connectedPeers[1] }), 'webrtc');
  await flush();
  assert.equal(acknowledgements, 1);
  assert.equal(host.getRoomInfo().connectedPeers.length, 2);
});

test('WebRTC incoming actions reach local tabs exactly once across both transports', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  let seen = 0; guest.onPacket(p => { if (p.type === 'CHAT_MSG') seen++; });
  const p = packet(host, guest.getMyPeerId(), 'CHAT_MSG', { text: 'Bridge' });
  // A different online member, represented by its logical room identity.
  host.getRoomInfo().connectedPeers.push({ id: 'online', isHost: false, name: 'Online', classKey: 'mage', skinVariant: 0, playerIndex: 2 });
  p.senderId = 'online';
  host.processIncomingPacket(p, 'webrtc'); await flush();
  host.processIncomingPacket(p, 'broadcast'); await flush();
  assert.equal(seen, 1);
});

test('guest cannot start the game or inject host membership packets', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  let starts = 0; host.onPacket(p => { if (p.type === 'START_GAME') starts++; });
  guest.broadcast(packet(host, guest.getMyPeerId(), 'START_GAME', { saveData: {} })); await flush();
  assert.equal(starts, 0);
  assert.equal(host.getRoomInfo().status, 'lobby');
});

test('late joins are rejected once playing; a restored host preserves reserved seats', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  host.setStatus('playing');
  const session = host.getActiveSession();
  const newHost = manager(); t.after(() => newHost.leaveRoom());
  host.leaveRoom(true); newHost.createRoom('Host', 'warrior', 0, session.roomCode); newHost.restoreRoster(session); newHost.setStatus('playing');
  assert.equal(newHost.getRoomInfo().connectedPeers[1].clientSessionId, session.connectedPeers[1].clientSessionId);
  assert.equal(newHost.getRoomInfo().connectedPeers[1].isDisconnected, true);
  const late = manager(); t.after(() => late.leaveRoom()); late.joinRoom(newHost.getRoomCode(), 'Late'); await flush();
  assert.equal(newHost.getRoomInfo().connectedPeers.length, 2);
});

test('invalid room codes do not destroy the existing room', t => {
  const host = manager(); t.after(() => host.leaveRoom()); host.createRoom();
  const code = host.getRoomCode();
  assert.equal(host.joinRoom('bad-code'), false);
  assert.equal(host.getRoomCode(), code);
});

test('both host and guest moves carry their dice budget even when dice delivery is missing', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  const game = new GameState();
  game.initGame([{ name: 'Host', classKey: 'warrior', isAI: false }, { name: 'Guest', classKey: 'cleric', isAI: false }]);
  for (const [seat, sender, receiver] of [[0, host, guest], [1, guest, host]]) {
    game.activePlayerIdx = seat;
    game.phase = 'BOARD_TURN'; game.remainingMoves = 0;
    const start = game.allNodes.find(n => n.id === game.activePlayer.nodeId);
    const path = [start.id, start.neighbors[0]];
    const move = packet(sender, sender.getMyPeerId(), 'MOVE_PATH', { playerIdx: seat, path, remainingMoves: 1, gameSpeed: 4 });
    let received;
    const unsubscribe = receiver.onPacket(p => { if (p.type === 'MOVE_PATH') received = p; });
    sender.broadcast(move); await flush(); unsubscribe();
    assert.deepEqual(acceptNetworkMovement(game, receiver.getRoomInfo(), received), path);
    assert.equal(game.remainingMoves, 1);
    assert.equal(received.payload.gameSpeed, 4);
    assert.equal(acceptNetworkMovement(game, receiver.getRoomInfo(), { ...received, senderId: 'intruder' }), null);
    assert.equal(acceptNetworkMovement(game, receiver.getRoomInfo(), { ...received, payload: { ...received.payload, remainingMoves: 6 } }), null);
    game.phase = 'MOVING';
    assert.equal(acceptNetworkMovement(game, receiver.getRoomInfo(), received), null);
  }
});

test('new joins from duplicated tabs get separate session identities and seats', async t => {
  const { host, guests: [guest] } = await roomWithGuests(t);
  const original = structuredClone(host.getRoomInfo().connectedPeers[1]);
  sessionStorage.setItem('cf_client_session_id', original.clientSessionId);
  const duplicate = new NetworkRoomManager();
  t.after(() => duplicate.leaveRoom());
  duplicate.joinRoom(host.getRoomCode(), 'Duplicate');
  await flush();
  assert.equal(host.getRoomInfo().connectedPeers.length, 3);
  assert.equal(guest.getLocalPlayerIndex(), 1);
  assert.equal(duplicate.getLocalPlayerIndex(), 2);
  assert.notEqual(host.getRoomInfo().connectedPeers[2].clientSessionId, original.clientSessionId);
  assert.equal(host.getRoomInfo().connectedPeers[1].id, original.id);
});

test('host can reconnect its signaling peer after losing the broker', t => {
  const host = manager(); host.createRoom();
  let reconnected = 0;
  host.peer = { disconnected: true, destroyed: false, reconnect() { reconnected++; }, destroy() {} };
  t.after(() => host.leaveRoom());
  host.reconnectWebRTC();
  assert.equal(reconnected, 1);
  assert.match(host.getOnlineMessage(), /กำลังเชื่อมต่อ/);
});

test('missing hosts report a connection timeout and leaving clears admission timers', t => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const pending = new Map(); let serial = 0;
  globalThis.setTimeout = callback => { pending.set(++serial, callback); return serial; };
  globalThis.clearTimeout = id => pending.delete(id);
  const guest = manager();
  t.after(() => { guest.leaveRoom(); globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; });
  guest.joinRoom('CF-0000');
  assert.equal(pending.size, 1);
  const timeout = [...pending.values()][0]; pending.clear(); timeout();
  assert.match(guest.getOnlineMessage(), /ยังเชื่อมต่อ Host ไม่สำเร็จ/);
  guest.reconnectWebRTC();
  assert.equal(pending.size, 1);
  guest.leaveRoom();
  assert.equal(pending.size, 0);
  assert.equal(guest.getOnlineMessage(), '');
});

test('remote walking follows each step without applying poison, economy or random events; snapshots cancel playback', t => {
  const game = new GameState();
  game.initGame([{ name: 'Remote', classKey: 'warrior', isAI: false }]);
  game.remainingMoves = 2; game.phase = 'CHOOSING_PATH';
  const player = game.activePlayer;
  player.poisonTurns = 3;
  const start = game.allNodes.find(n => n.id === player.nodeId);
  const next = game.allNodes.find(n => n.id === start.neighbors[0]);
  const last = game.allNodes.find(n => n.id === next.neighbors.find(id => id !== start.id));
  const path = [start.id, next.id, last.id];
  const original = { hp: player.hp, gold: player.gold, rng: game.world.rng };
  const previous = { raf: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame, now: Date.now };
  let now = 1000, serial = 0;
  const frames = new Map();
  Date.now = () => now;
  globalThis.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  t.after(() => { Date.now = previous.now; globalThis.requestAnimationFrame = previous.raf; globalThis.cancelAnimationFrame = previous.cancel; });
  const renderer = { centerCameraOn(x, y, z) { this.target = [x, y, z]; } };
  const playback = new RemoteMovementPlayback();
  playback.play(game, path, () => renderer.centerCameraOn(player.gridX, player.gridY, player.gridZ));
  assert.equal(game.phase, 'MOVING');
  for (let i = 0; i < 20 && frames.size; i++) {
    now += 100;
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
    assert.deepEqual(renderer.target, [player.gridX, player.gridY, player.gridZ]);
  }
  assert.equal(game.phase, 'TILE_EVENT');
  assert.equal(player.nodeId, last.id);
  assert.deepEqual(renderer.target, [last.gx, last.gy, last.gz]);
  assert.deepEqual({ hp: player.hp, gold: player.gold, rng: game.world.rng }, original);
  assert.equal(game.remainingMoves, 0);
  assert.equal(player.walkFrame, 0);
  playback.play(game, [last.id, next.id], () => {});
  const stale = [...frames.values()];
  playback.cancel();
  player.gridX = 999; now += 1000;
  stale.forEach(callback => callback(now));
  assert.equal(player.gridX, 999);
  assert.equal(frames.size, 0);
  assert.equal(player.walkFrame, 0);
});

test('human and AI handoffs replicate state to host and guests without losing movement phase', () => {
  const games = [new GameState(), new GameState(), new GameState()];
  const party = [{ name: 'Host', classKey: 'warrior', isAI: false }, { name: 'Guest', classKey: 'mage', isAI: false }, { name: 'Bot', classKey: 'thief', isAI: true }];
  games[0].initGame(party);
  for (const game of games.slice(1)) SaveManager.applySaveData(game, SaveManager.serializeGameState(games[0]), false);
  const room = { code: 'CF-1234', connectedPeers: [{ id: 'host', playerIndex: 0 }, { id: 'guest', playerIndex: 1 }] };
  for (let turn = 0; turn < 6; turn++) {
    const ownerIndex = games[0].activePlayerIdx;
    const owner = games[ownerIndex === 1 ? 1 : 0];
    owner.activePlayer.gold += 123;
    owner.endTurn();
    const p = { roomCode: room.code, senderId: ownerIndex === 1 ? 'guest' : 'host', payload: {
      playerIdx: ownerIndex, state: SaveManager.serializeGameState(owner), phase: owner.phase, remainingMoves: 0 } };
    for (const game of games.filter(g => g !== owner)) {
      assert.equal(canAcceptTurnPacket(game, room, p), true);
      assert.equal(canAcceptTurnPacket(game, room, { ...p, senderId: 'intruder' }), false);
      assert.equal(applyNetworkState(game, p.payload).success, true);
      assert.deepEqual(game.players.map(p => p.gold), owner.players.map(p => p.gold));
      assert.equal(game.activePlayerIdx, owner.activePlayerIdx);
      assert.equal(game.world.rng, owner.world.rng);
    }
  }
  const owner = games[0]; owner.phase = 'CHOOSING_PATH'; owner.remainingMoves = 4;
  assert.equal(applyNetworkState(games[1], { state: SaveManager.serializeGameState(owner), phase: 'CHOOSING_PATH', remainingMoves: 4 }).success, true);
  assert.equal(games[1].phase, 'CHOOSING_PATH');
  assert.equal(games[1].remainingMoves, 4);
  assert.deepEqual(games[1].highlightedNodes, owner.highlightedNodes.length ? owner.highlightedNodes : (owner.updateReachableHighlights(), owner.highlightedNodes));
});
