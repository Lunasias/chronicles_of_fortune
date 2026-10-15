/**
 * NetworkRoomManager.ts
 * P2P Room Code & Real-time Match Synchronization for Chronicles of Fortune
 * Supports dual-layer transport:
 * 1. WebRTC DataChannel (via PeerJS) for online internet/cross-device play using 6-character room codes.
 * 2. BroadcastChannel for zero-latency local multi-tab/window testing on the same computer.
 */

export type NetworkPacketType =
  | 'JOIN_ROOM'
  | 'PEER_CONNECTED'
  | 'PLAYER_UPDATE'
  | 'START_GAME'
  | 'DICE_ROLL'
  | 'MOVE_PATH'
  | 'USE_SPELL'
  | 'USE_SPINNER'
  | 'BATTLE_ACTION'
  | 'ADVANCE_TURN'
  | 'SYNC_STATE'
  | 'CHAT_MSG'
  | 'LEAVE_ROOM';

export interface NetworkPacket {
  packetId: string;
  type: NetworkPacketType;
  roomCode: string;
  senderId: string;
  senderName: string;
  payload: any;
  timestamp: number;
}

export interface ConnectedPeer {
  id: string; // 'host' or guest peer id
  name: string;
  classKey: string;
  skinVariant: number;
  isHost: boolean;
  isAI?: boolean;
  playerIndex?: number;
}

export interface RoomInfo {
  code: string;
  isHost: boolean;
  myPeerId: string;
  connectedPeers: ConnectedPeer[];
  channelName: string;
  status: 'lobby' | 'playing';
  gameMode?: string;
  partySize?: number;
  aiDifficulty?: string;
}

export class NetworkRoomManager {
  private channel: BroadcastChannel | null = null;
  private currentRoom: RoomInfo | null = null;
  private onPacketListeners: Array<(packet: NetworkPacket) => void> = [];
  private onStateChangeListeners: Array<(info: RoomInfo | null) => void> = [];

  // WebRTC PeerJS state
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private hostConnection: any = null;
  private seenPacketIds: Set<string> = new Set();
  private packetSeq = 0;
  private localPlayerIndex: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.leaveRoom();
      });
    }
  }

  /**
   * Generate a readable 6-character room code (e.g., 'CF-7842')
   */
  public generateRoomCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `CF-${num}`;
  }

  public isInRoom(): boolean {
    return this.currentRoom !== null;
  }

  public isHost(): boolean {
    return !!this.currentRoom?.isHost;
  }

  public getRoomCode(): string | null {
    return this.currentRoom?.code || null;
  }

  public getMyPeerId(): string {
    return this.currentRoom?.myPeerId || 'local';
  }

  public getLocalPlayerIndex(): number {
    return this.localPlayerIndex;
  }

  public setLocalPlayerIndex(idx: number): void {
    this.localPlayerIndex = Math.max(0, idx);
  }

  public getRoomInfo(): RoomInfo | null {
    return this.currentRoom;
  }

  /**
   * Host / Create a new multiplayer game room
   */
  public createRoom(
    hostPlayerName: string = 'Host',
    hostClassKey: string = 'warrior',
    hostSkinVariant: number = 0
  ): RoomInfo {
    this.leaveRoom();
    const code = this.generateRoomCode();
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${code}`;
    const myPeerId = 'host';
    this.localPlayerIndex = 0;

    const hostPeer: ConnectedPeer = {
      id: myPeerId,
      name: hostPlayerName,
      classKey: hostClassKey,
      skinVariant: hostSkinVariant,
      isHost: true,
      playerIndex: 0
    };

    this.currentRoom = {
      code,
      isHost: true,
      myPeerId,
      connectedPeers: [hostPeer],
      channelName,
      status: 'lobby',
      partySize: 3,
      gameMode: 'standard',
      aiDifficulty: 'tactical'
    };

    this.setupBroadcastChannel(channelName);
    this.initHostWebRTC(code, hostPlayerName);
    this.notifyStateChange();
    return this.currentRoom;
  }

  /**
   * Join an existing multiplayer room using room code
   */
  public joinRoom(
    roomCode: string,
    playerName: string = 'Guest',
    classKey: string = 'mage',
    skinVariant: number = 0
  ): boolean {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return false;

    this.leaveRoom();
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${cleanCode}`;
    const myPeerId = 'guest_' + Math.random().toString(36).substring(2, 8);
    this.localPlayerIndex = 1;

    const selfPeer: ConnectedPeer = {
      id: myPeerId,
      name: playerName,
      classKey,
      skinVariant,
      isHost: false,
      playerIndex: 1
    };

    this.currentRoom = {
      code: cleanCode,
      isHost: false,
      myPeerId,
      connectedPeers: [selfPeer],
      channelName,
      status: 'lobby'
    };

    this.setupBroadcastChannel(channelName);
    this.initGuestWebRTC(cleanCode, myPeerId, selfPeer);

    // Broadcast JOIN packet over local broadcast channel
    this.broadcast({
      packetId: this.nextPacketId(),
      type: 'JOIN_ROOM',
      roomCode: cleanCode,
      senderId: myPeerId,
      senderName: playerName,
      payload: {
        peer: selfPeer,
        joinedAt: Date.now()
      },
      timestamp: Date.now()
    });

    this.notifyStateChange();
    return true;
  }

  /**
   * Update local player profile (Name, Class, Skin) in Lobby
   */
  public updatePlayerProfile(name: string, classKey: string, skinVariant: number) {
    if (!this.currentRoom) return;

    const me = this.currentRoom.connectedPeers.find(p => p.id === this.currentRoom!.myPeerId);
    if (me) {
      me.name = name;
      me.classKey = classKey;
      me.skinVariant = skinVariant;
    }

    this.broadcast({
      packetId: this.nextPacketId(),
      type: 'PLAYER_UPDATE',
      roomCode: this.currentRoom.code,
      senderId: this.currentRoom.myPeerId,
      senderName: name,
      payload: {
        peerId: this.currentRoom.myPeerId,
        name,
        classKey,
        skinVariant
      },
      timestamp: Date.now()
    });

    this.notifyStateChange();
  }

  /**
   * Leave the current room and close all communication channels
   */
  public leaveRoom() {
    if (this.currentRoom) {
      try {
        this.broadcast({
          packetId: this.nextPacketId(),
          type: 'LEAVE_ROOM',
          roomCode: this.currentRoom.code,
          senderId: this.currentRoom.myPeerId,
          senderName: 'Player',
          payload: { peerId: this.currentRoom.myPeerId },
          timestamp: Date.now()
        });
      } catch {
        // Safe fallback
      }
    }

    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Safe fallback
      }
      this.channel = null;
    }

    // Close WebRTC connections
    this.connections.forEach(conn => {
      try {
        conn.close();
      } catch {
        // Safe fallback
      }
    });
    this.connections.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // Safe fallback
      }
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Safe fallback
      }
      this.peer = null;
    }

    this.currentRoom = null;
    this.seenPacketIds.clear();
    this.notifyStateChange();
  }

  /**
   * Broadcast a network packet to all connected peers via WebRTC and BroadcastChannel
   */
  public broadcast(packet: NetworkPacket) {
    if (!packet.packetId) {
      packet.packetId = this.nextPacketId();
    }
    this.markPacketSeen(packet.packetId);

    // 1. Post to local BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(packet);
      } catch (err) {
        console.warn('[NetworkRoomManager] BroadcastChannel error:', err);
      }
    }

    // 2. Transmit via WebRTC
    if (this.currentRoom?.isHost) {
      // Host transmits to all connected guests
      this.connections.forEach(conn => {
        try {
          if (conn.open) {
            conn.send(packet);
          }
        } catch (err) {
          console.warn('[NetworkRoomManager] WebRTC host broadcast error:', err);
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      // Guest transmits to host (who will relay to other peers)
      try {
        this.hostConnection.send(packet);
      } catch (err) {
        console.warn('[NetworkRoomManager] WebRTC guest send error:', err);
      }
    }
  }

  /**
   * Subscribe to incoming network packets
   */
  public onPacket(callback: (packet: NetworkPacket) => void): () => void {
    this.onPacketListeners.push(callback);
    return () => {
      this.onPacketListeners = this.onPacketListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to room status changes
   */
  public onStateChange(callback: (info: RoomInfo | null) => void): () => void {
    this.onStateChangeListeners.push(callback);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter(cb => cb !== callback);
    };
  }

  private nextPacketId(): string {
    this.packetSeq++;
    return `${this.getMyPeerId()}_${Date.now()}_${this.packetSeq}`;
  }

  private markPacketSeen(packetId: string): boolean {
    if (this.seenPacketIds.has(packetId)) return true;
    this.seenPacketIds.add(packetId);
    if (this.seenPacketIds.size > 200) {
      const first = this.seenPacketIds.values().next().value;
      if (first) this.seenPacketIds.delete(first);
    }
    return false;
  }

  private setupBroadcastChannel(channelName: string) {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event: MessageEvent) => {
        const packet = event.data as NetworkPacket;
        if (!packet || packet.roomCode !== this.currentRoom?.code) return;
        this.processIncomingPacket(packet, 'broadcast');
      };
    } catch (err) {
      console.warn('[NetworkRoomManager] BroadcastChannel init error:', err);
    }
  }

  private async initHostWebRTC(roomCode: string, hostPlayerName: string) {
    if (typeof window === 'undefined' || typeof (window as any).RTCPeerConnection === 'undefined') return;

    try {
      const mod = await import('peerjs');
      const PeerClass = (mod as any).Peer || (mod as any).default?.Peer || (mod as any).default;
      if (!PeerClass) return;

      const peerId = `cof-host-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      this.peer = new PeerClass(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id: string) => {
        console.log('[NetworkRoomManager] Host WebRTC Peer open:', id);
      });

      this.peer.on('connection', (conn: any) => {
        console.log('[NetworkRoomManager] Incoming peer connection from:', conn.peer);
        this.connections.set(conn.peer, conn);

        conn.on('data', (data: any) => {
          this.processIncomingPacket(data as NetworkPacket, 'webrtc');
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
          if (this.currentRoom) {
            this.currentRoom.connectedPeers = this.currentRoom.connectedPeers.filter(p => p.id !== conn.peer);
            this.notifyStateChange();
            this.broadcast({
              packetId: this.nextPacketId(),
              type: 'PEER_CONNECTED',
              roomCode: this.currentRoom.code,
              senderId: 'host',
              senderName: hostPlayerName,
              payload: { peers: this.currentRoom.connectedPeers },
              timestamp: Date.now()
            });
          }
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('[NetworkRoomManager] Host Peer error:', err);
      });
    } catch (err) {
      console.warn('[NetworkRoomManager] Could not init WebRTC Host:', err);
    }
  }

  private async initGuestWebRTC(roomCode: string, myPeerId: string, selfPeer: ConnectedPeer) {
    if (typeof window === 'undefined' || typeof (window as any).RTCPeerConnection === 'undefined') return;

    try {
      const mod = await import('peerjs');
      const PeerClass = (mod as any).Peer || (mod as any).default?.Peer || (mod as any).default;
      if (!PeerClass) return;

      const hostPeerId = `cof-host-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      this.peer = new PeerClass(`cof-guest-${Math.random().toString(36).substring(2, 9)}`, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        console.log('[NetworkRoomManager] Guest WebRTC connected to signaling broker. Connecting to host:', hostPeerId);
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          console.log('[NetworkRoomManager] WebRTC DataConnection to host opened!');
          // Send JOIN_ROOM packet
          const pkt: NetworkPacket = {
            packetId: this.nextPacketId(),
            type: 'JOIN_ROOM',
            roomCode,
            senderId: myPeerId,
            senderName: selfPeer.name,
            payload: { peer: selfPeer, joinedAt: Date.now() },
            timestamp: Date.now()
          };
          conn.send(pkt);
        });

        conn.on('data', (data: any) => {
          this.processIncomingPacket(data as NetworkPacket, 'webrtc');
        });

        conn.on('close', () => {
          console.log('[NetworkRoomManager] WebRTC connection to host closed');
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('[NetworkRoomManager] Guest Peer error:', err);
      });
    } catch (err) {
      console.warn('[NetworkRoomManager] Could not init WebRTC Guest:', err);
    }
  }

  private processIncomingPacket(packet: NetworkPacket, source: 'webrtc' | 'broadcast') {
    if (!packet || packet.roomCode !== this.currentRoom?.code) return;
    if (packet.senderId === this.currentRoom.myPeerId) return;

    // Deduplicate packets arriving from both WebRTC and BroadcastChannel
    if (packet.packetId && this.markPacketSeen(packet.packetId)) {
      return;
    }

    // Host authoritative handling for room membership
    if (this.currentRoom.isHost) {
      if (packet.type === 'JOIN_ROOM') {
        const guestPeer: ConnectedPeer = packet.payload?.peer || {
          id: packet.senderId,
          name: packet.senderName,
          classKey: 'mage',
          skinVariant: 0,
          isHost: false,
          playerIndex: this.currentRoom.connectedPeers.length
        };
        const exists = this.currentRoom.connectedPeers.some(p => p.id === packet.senderId);
        if (!exists) {
          guestPeer.playerIndex = this.currentRoom.connectedPeers.length;
          this.currentRoom.connectedPeers.push(guestPeer);
          this.notifyStateChange();

          // Acknowledge connection and broadcast updated peer roster
          this.broadcast({
            packetId: this.nextPacketId(),
            type: 'PEER_CONNECTED',
            roomCode: this.currentRoom.code,
            senderId: 'host',
            senderName: this.currentRoom.connectedPeers[0]?.name || 'Host',
            payload: {
              peers: this.currentRoom.connectedPeers,
              partySize: this.currentRoom.partySize,
              gameMode: this.currentRoom.gameMode,
              aiDifficulty: this.currentRoom.aiDifficulty
            },
            timestamp: Date.now()
          });
        }
      } else if (packet.type === 'PLAYER_UPDATE') {
        const p = this.currentRoom.connectedPeers.find(peer => peer.id === packet.senderId);
        if (p && packet.payload) {
          p.name = packet.payload.name || p.name;
          p.classKey = packet.payload.classKey || p.classKey;
          p.skinVariant = packet.payload.skinVariant ?? p.skinVariant;
          this.notifyStateChange();

          // Relay update to other peers
          this.broadcast({
            packetId: this.nextPacketId(),
            type: 'PLAYER_UPDATE',
            roomCode: this.currentRoom.code,
            senderId: packet.senderId,
            senderName: p.name,
            payload: packet.payload,
            timestamp: Date.now()
          });
        }
      } else if (packet.type === 'LEAVE_ROOM') {
        this.currentRoom.connectedPeers = this.currentRoom.connectedPeers.filter(p => p.id !== packet.senderId);
        this.notifyStateChange();
        this.broadcast({
          packetId: this.nextPacketId(),
          type: 'PEER_CONNECTED',
          roomCode: this.currentRoom.code,
          senderId: 'host',
          senderName: 'Host',
          payload: { peers: this.currentRoom.connectedPeers },
          timestamp: Date.now()
        });
      } else {
        // Relay in-game packet from one guest to all other peers
        this.connections.forEach((conn, id) => {
          if (id !== packet.senderId && conn.open) {
            try {
              conn.send(packet);
            } catch {
              // Ignore
            }
          }
        });
      }
    } else {
      // Guest handling
      if (packet.type === 'PEER_CONNECTED') {
        if (packet.payload?.peers && Array.isArray(packet.payload.peers)) {
          this.currentRoom.connectedPeers = packet.payload.peers;
          if (packet.payload.partySize) this.currentRoom.partySize = packet.payload.partySize;
          if (packet.payload.gameMode) this.currentRoom.gameMode = packet.payload.gameMode;
          if (packet.payload.aiDifficulty) this.currentRoom.aiDifficulty = packet.payload.aiDifficulty;

          // Determine our assigned player index
          const me = this.currentRoom.connectedPeers.find(p => p.id === this.currentRoom!.myPeerId);
          if (me && typeof me.playerIndex === 'number') {
            this.localPlayerIndex = me.playerIndex;
          }
          this.notifyStateChange();
        }
      } else if (packet.type === 'PLAYER_UPDATE') {
        const p = this.currentRoom.connectedPeers.find(peer => peer.id === packet.senderId);
        if (p && packet.payload) {
          p.name = packet.payload.name || p.name;
          p.classKey = packet.payload.classKey || p.classKey;
          p.skinVariant = packet.payload.skinVariant ?? p.skinVariant;
          this.notifyStateChange();
        }
      }
    }

    // Dispatch to registered packet listeners
    this.onPacketListeners.forEach(listener => {
      try {
        listener(packet);
      } catch (err) {
        console.error('[NetworkRoomManager] Listener dispatch error:', err);
      }
    });
  }

  private notifyStateChange() {
    this.onStateChangeListeners.forEach(cb => {
      try {
        cb(this.currentRoom);
      } catch (e) {
        console.error('[NetworkRoomManager] StateChange callback error:', e);
      }
    });
  }
}

export const networkRoomManager = new NetworkRoomManager();
