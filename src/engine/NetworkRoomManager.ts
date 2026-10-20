/**
 * NetworkRoomManager.ts
 * P2P Room Code & Real-time Match Synchronization for Chronicles of Fortune
 * Supports dual-layer transport:
 * 1. WebRTC DataChannel (via PeerJS) for online internet/cross-device play using 6-character room codes.
 * 2. BroadcastChannel for zero-latency local multi-tab/window testing on the same computer.
 */

export type NetworkPacketType =
  | 'ROOM_ERROR'
  | 'BATTLE_PROMPT'
  | 'JOIN_ROOM'
  | 'REJOIN_ROOM'
  | 'REJOIN_ACK'
  | 'PEER_CONNECTED'
  | 'PEER_RECONNECTED'
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
  clientSessionId?: string; // persistent across page refresh
  name: string;
  classKey: string;
  skinVariant: number;
  isHost: boolean;
  isAI?: boolean;
  playerIndex?: number;
  isDisconnected?: boolean;
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

export interface ActiveMPSession {
  roomCode: string;
  isHost: boolean;
  clientSessionId: string;
  myPeerId: string;
  playerName: string;
  classKey: string;
  skinVariant: number;
  playerIndex: number;
  status: 'lobby' | 'playing';
  gameMode?: string;
  saveDataSnapshot?: any;
  connectedPeers?: ConnectedPeer[];
  partySize?: number;
  lastActiveTime: number;
}

export function getOrCreateClientSessionId(fresh = false): string {
  if (typeof sessionStorage === 'undefined') return 'headless_session';
  try {
    let id = sessionStorage.getItem('cf_client_session_id');
    if (!id || fresh) {
      id = 'cs_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('cf_client_session_id', id);
    }
    return id;
  } catch {
    return 'headless_session';
  }
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
  private reconnectTimer: any = null;
  private transportGeneration = 0;
  private onlineMessage = '';
  private admissionTimer: ReturnType<typeof setTimeout> | null = null;

  public getOnlineMessage(): string { return this.onlineMessage; }

  public canRetryConnection(): boolean {
    return this.currentRoom?.isHost
      ? !this.peer || this.peer.destroyed || this.peer.disconnected
      : !this.hostConnection?.open;
  }

  private setOnlineMessage(message: string): void {
    this.onlineMessage = message;
    this.notifyStateChange();
  }

  private waitForAdmission(): void {
    if (this.admissionTimer) clearTimeout(this.admissionTimer);
    const generation = this.transportGeneration;
    this.admissionTimer = setTimeout(() => {
      this.admissionTimer = null;
      if (generation !== this.transportGeneration || !this.currentRoom) return;
      this.setOnlineMessage('ยังเชื่อมต่อ Host ไม่สำเร็จ ตรวจรหัสห้องและให้ Host เปิดเกมค้างไว้ แล้วกดลองเชื่อมต่อใหม่ หากอยู่คนละเครือข่ายให้ลองเปลี่ยนเครือข่าย');
    }, 12000);
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveSessionSnapshot();
      });
      window.addEventListener('online', () => {
        console.log('[NetworkRoomManager] Browser came back online! Re-establishing room connection...');
        if (this.currentRoom) {
          this.reconnectWebRTC();
        }
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

  public setStatus(status: 'lobby' | 'playing'): void {
    if (this.currentRoom) {
      this.currentRoom.status = status;
      this.saveSessionSnapshot();
      this.notifyStateChange();
    }
  }

  public saveSessionSnapshot(saveData?: any): void {
    if (typeof sessionStorage === 'undefined' || !this.currentRoom) return;
    const clientSessionId = getOrCreateClientSessionId();
    const me = this.currentRoom.connectedPeers.find(p => p.id === this.currentRoom!.myPeerId);
    const existing = this.getActiveSession();

    const session: ActiveMPSession = {
      roomCode: this.currentRoom.code,
      isHost: this.currentRoom.isHost,
      clientSessionId,
      myPeerId: this.currentRoom.myPeerId,
      playerName: me?.name || 'Player',
      classKey: me?.classKey || 'warrior',
      skinVariant: me?.skinVariant || 0,
      playerIndex: this.localPlayerIndex,
      status: this.currentRoom.status,
      gameMode: this.currentRoom.gameMode,
      saveDataSnapshot: saveData || (existing?.roomCode === this.currentRoom.code ? existing.saveDataSnapshot : null),
      connectedPeers: this.currentRoom.connectedPeers,
      partySize: this.currentRoom.partySize,
      lastActiveTime: Date.now()
    };

    try {
      sessionStorage.setItem('cf_active_mp_session', JSON.stringify(session));
    } catch (e) {
      console.warn('[NetworkRoomManager] Failed to save session snapshot:', e);
    }
  }

  public getActiveSession(): ActiveMPSession | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('cf_active_mp_session');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveMPSession;
      if (Date.now() - parsed.lastActiveTime < 1000 * 60 * 60) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public clearSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('cf_active_mp_session');
    }
  }

  /**
   * Host / Create a new multiplayer game room (or restore with presetRoomCode)
   */
  public createRoom(
    hostPlayerName: string = 'Host',
    hostClassKey: string = 'warrior',
    hostSkinVariant: number = 0,
    presetRoomCode?: string
  ): RoomInfo {
    this.leaveRoom(true);
    const code = presetRoomCode ? presetRoomCode.toUpperCase() : this.generateRoomCode();
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${code}`;
    const myPeerId = 'host';
    const clientSessionId = getOrCreateClientSessionId();
    this.localPlayerIndex = 0;

    const hostPeer: ConnectedPeer = {
      id: myPeerId,
      clientSessionId,
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
    this.saveSessionSnapshot();
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
    if (!/^CF-\d{4}$/.test(cleanCode)) return false;

    this.leaveRoom(true);
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${cleanCode}`;
    const myPeerId = 'guest_' + Math.random().toString(36).substring(2, 8);
    // A duplicated tab inherits sessionStorage. A new join needs a new identity;
    // only explicit rejoin may reclaim a reserved seat.
    const clientSessionId = getOrCreateClientSessionId(true);
    this.localPlayerIndex = 1;

    const selfPeer: ConnectedPeer = {
      id: myPeerId,
      clientSessionId,
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
    this.waitForAdmission();
    this.initGuestWebRTC(cleanCode, myPeerId, selfPeer, false);

    // Broadcast JOIN packet over local broadcast channel
    this.broadcast({
      packetId: this.nextPacketId(),
      type: 'JOIN_ROOM',
      roomCode: cleanCode,
      senderId: myPeerId,
      senderName: playerName,
      payload: {
        peer: selfPeer,
        clientSessionId,
        joinedAt: Date.now()
      },
      timestamp: Date.now()
    });

    this.saveSessionSnapshot();
    this.notifyStateChange();
    return true;
  }

  /**
   * Rejoin an active multiplayer room session after browser reload or network drop
   */
  public rejoinRoom(session: ActiveMPSession): boolean {
    const cleanCode = session.roomCode.trim().toUpperCase();
    if (!/^CF-\d{4}$/.test(cleanCode)) return false;

    this.leaveRoom(true);
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${cleanCode}`;
    const myPeerId = 'guest_' + Math.random().toString(36).substring(2, 8);
    const clientSessionId = session.clientSessionId || getOrCreateClientSessionId();
    this.localPlayerIndex = session.playerIndex;

    const selfPeer: ConnectedPeer = {
      id: myPeerId,
      clientSessionId,
      name: session.playerName,
      classKey: session.classKey,
      skinVariant: session.skinVariant,
      isHost: false,
      playerIndex: session.playerIndex
    };

    this.currentRoom = {
      code: cleanCode,
      isHost: false,
      myPeerId,
      connectedPeers: [selfPeer],
      channelName,
      status: session.status || 'playing',
      gameMode: session.gameMode
    };

    this.setupBroadcastChannel(channelName);
    this.waitForAdmission();
    this.initGuestWebRTC(cleanCode, myPeerId, selfPeer, true, session.myPeerId);

    // Broadcast REJOIN packet
    this.broadcast({
      packetId: this.nextPacketId(),
      type: 'REJOIN_ROOM',
      roomCode: cleanCode,
      senderId: myPeerId,
      senderName: session.playerName,
      payload: {
        peer: selfPeer,
        clientSessionId,
        playerIndex: session.playerIndex,
        previousPeerId: session.myPeerId,
        rejoinedAt: Date.now()
      },
      timestamp: Date.now()
    });

    this.saveSessionSnapshot();
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
  public leaveRoom(preserveSession: boolean = false) {
    this.transportGeneration++;
    if (this.admissionTimer) clearTimeout(this.admissionTimer);
    this.admissionTimer = null;
    this.onlineMessage = '';
    if (!preserveSession) {
      this.clearSession();
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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

    this.currentRoom = null;
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
    if (typeof window === 'undefined') return;
    if (typeof (window as any).RTCPeerConnection === 'undefined') {
      this.setOnlineMessage('เบราว์เซอร์นี้ใช้การเชื่อมต่อข้ามเครื่องไม่ได้ กรุณาเปิดเกมผ่าน HTTPS หรือ localhost ในเบราว์เซอร์ที่รองรับ WebRTC (ยังเล่นข้ามแท็บที่ URL เดียวกันได้)');
      return;
    }
    this.setOnlineMessage('กำลังเปิดห้องออนไลน์...');

    const generation = this.transportGeneration;
    try {
      const mod = await import('peerjs');
      if (generation !== this.transportGeneration || this.currentRoom?.code !== roomCode) return;
      if (this.peer && !this.peer.destroyed) return;
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
        if (generation !== this.transportGeneration) return;
        this.setOnlineMessage('ห้องออนไลน์พร้อมรับผู้เล่น');
        console.log('[NetworkRoomManager] Host WebRTC Peer open:', id);
      });

      this.peer.on('connection', (conn: any) => {
        console.log('[NetworkRoomManager] Incoming peer connection from:', conn.peer);
        if (generation !== this.transportGeneration || !this.currentRoom?.isHost) { conn.close(); return; }
        this.connections.set(conn.peer, conn);

        conn.on('data', (data: any) => {
          if (generation !== this.transportGeneration || data?.senderId !== conn.metadata?.peerId) return;
          this.processIncomingPacket(data as NetworkPacket, 'webrtc');
        });

        conn.on('close', () => {
          if (this.connections.get(conn.peer) !== conn) return;
          this.connections.delete(conn.peer);
          if (this.currentRoom) {
            const peerObj = this.currentRoom.connectedPeers.find(p => p.id === conn.metadata?.peerId);
            if (peerObj) {
              if (this.currentRoom.status === 'playing') {
                peerObj.isDisconnected = true;
              } else {
                this.currentRoom.connectedPeers = this.currentRoom.connectedPeers.filter(p => p.id !== conn.metadata?.peerId);
                this.currentRoom.connectedPeers.forEach((p, i) => p.playerIndex = i);
              }
              this.notifyStateChange();
              this.publishRoster();
            }
          }
        });
      });

      this.peer.on('error', (err: any) => {
        if (generation !== this.transportGeneration) return;
        this.setOnlineMessage(err?.type === 'unavailable-id'
          ? 'รหัสห้องนี้ถูกใช้อยู่ กรุณาออกจากห้องแล้วสร้างห้องใหม่'
          : 'เปิดห้องออนไลน์ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วกดลองเชื่อมต่อใหม่ (ยังเล่นข้ามแท็บที่ URL เดียวกันได้)');
        console.warn('[NetworkRoomManager] Host Peer error:', err);
      });
      this.peer.on('disconnected', () => {
        if (generation !== this.transportGeneration) return;
        this.setOnlineMessage('การเชื่อมต่อเซิร์ฟเวอร์ห้องหลุด กดลองเชื่อมต่อใหม่เพื่อให้เพื่อนเข้าห้องได้');
      });
    } catch (err) {
      if (generation === this.transportGeneration) this.setOnlineMessage('โหลดระบบเชื่อมต่อออนไลน์ไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่');
      console.warn('[NetworkRoomManager] Could not init WebRTC Host:', err);
    }
  }

  private async initGuestWebRTC(roomCode: string, myPeerId: string, selfPeer: ConnectedPeer, isRejoining: boolean = false, previousPeerId?: string) {
    if (typeof window === 'undefined') return;
    if (typeof (window as any).RTCPeerConnection === 'undefined') {
      this.setOnlineMessage('เบราว์เซอร์นี้ใช้การเชื่อมต่อข้ามเครื่องไม่ได้ กรุณาเปิดเกมผ่าน HTTPS หรือ localhost ในเบราว์เซอร์ที่รองรับ WebRTC (ยังเล่นข้ามแท็บที่ URL เดียวกันได้)');
      return;
    }
    this.setOnlineMessage('กำลังเชื่อมต่อห้องออนไลน์...');

    const generation = this.transportGeneration;
    try {
      const mod = await import('peerjs');
      if (generation !== this.transportGeneration || this.currentRoom?.code !== roomCode) return;
      const PeerClass = (mod as any).Peer || (mod as any).default?.Peer || (mod as any).default;
      if (!PeerClass) return;

      const hostPeerId = `cof-host-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const previousPeer = this.peer;
      this.peer = null;
      this.hostConnection = null;
      previousPeer?.destroy();
      this.peer = new PeerClass(`cof-guest-${Math.random().toString(36).substring(2, 9)}`, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      const activePeer = this.peer;
      this.peer.on('open', () => {
        if (this.peer !== activePeer || generation !== this.transportGeneration) return;
        console.log('[NetworkRoomManager] Guest WebRTC connected to signaling broker. Connecting to host:', hostPeerId);
        const conn = activePeer.connect(hostPeerId, { reliable: true, metadata: { peerId: myPeerId } });
        this.hostConnection = conn;
        const timeout = setTimeout(() => {
          if (this.hostConnection === conn && !conn.open) { this.hostConnection = null; conn.close(); this.scheduleAutoReconnect(); }
        }, 10000);
        conn.on('error', () => {
          clearTimeout(timeout);
          if (this.hostConnection !== conn) return;
          this.hostConnection = null; this.scheduleAutoReconnect();
        });

        conn.on('open', () => {
          clearTimeout(timeout);
          if (this.hostConnection !== conn) return;
          console.log('[NetworkRoomManager] WebRTC DataConnection to host opened!');
          const pktType = isRejoining ? 'REJOIN_ROOM' : 'JOIN_ROOM';
          const pkt: NetworkPacket = {
            packetId: this.nextPacketId(),
            type: pktType,
            roomCode,
            senderId: myPeerId,
            senderName: selfPeer.name,
            payload: {
              peer: selfPeer,
              clientSessionId: selfPeer.clientSessionId,
              previousPeerId,
              playerIndex: selfPeer.playerIndex,
              joinedAt: Date.now()
            },
            timestamp: Date.now()
          };
          conn.send(pkt);
        });

        conn.on('data', (data: any) => {
          if (generation !== this.transportGeneration || this.hostConnection !== conn) return;
          this.processIncomingPacket(data as NetworkPacket, 'webrtc');
        });

        conn.on('close', () => {
          clearTimeout(timeout);
          if (this.hostConnection !== conn) return;
          console.log('[NetworkRoomManager] WebRTC connection to host closed');
          this.hostConnection = null;
          this.setOnlineMessage('การเชื่อมต่อ Host หลุด กำลังเชื่อมต่อใหม่...');
          this.scheduleAutoReconnect();
        });
      });

      this.peer.on('error', (err: any) => {
        if (this.peer !== activePeer) return;
        console.warn('[NetworkRoomManager] Guest Peer error:', err);
        this.setOnlineMessage(err?.type === 'peer-unavailable'
          ? 'ยังไม่พบ Host ตรวจรหัสห้องและให้ Host เปิดเกมค้างไว้ กำลังลองใหม่...'
          : 'เชื่อมต่อออนไลน์ไม่สำเร็จ กำลังลองใหม่ หากยังไม่ได้ให้ลองเปลี่ยนเครือข่าย');
        this.hostConnection = null;
        this.scheduleAutoReconnect();
      });
    } catch (err) {
      if (generation === this.transportGeneration) this.setOnlineMessage('โหลดระบบเชื่อมต่อออนไลน์ไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่');
      console.warn('[NetworkRoomManager] Could not init WebRTC Guest:', err);
    }
  }

  public scheduleAutoReconnect(): void {
    if (this.reconnectTimer) return;
    if (!this.currentRoom || this.currentRoom.isHost) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentRoom && !this.hostConnection) {
        console.log('[NetworkRoomManager] Attempting automatic reconnection to Host...');
        const me = this.currentRoom.connectedPeers.find(p => p.id === this.currentRoom!.myPeerId) || {
          id: this.currentRoom.myPeerId,
          clientSessionId: getOrCreateClientSessionId(),
          name: 'Guest',
          classKey: 'warrior',
          skinVariant: 0,
          isHost: false,
          playerIndex: this.localPlayerIndex
        };
        this.initGuestWebRTC(this.currentRoom.code, this.currentRoom.myPeerId, me, true);
      }
    }, 2500);
  }

  public reconnectWebRTC(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.currentRoom?.isHost) {
      if (this.peer?.disconnected && !this.peer.destroyed) {
        this.setOnlineMessage('กำลังเชื่อมต่อเซิร์ฟเวอร์ห้องใหม่...');
        this.peer.reconnect();
      } else if (!this.peer || this.peer.destroyed) {
        this.initHostWebRTC(this.currentRoom.code, this.currentRoom.connectedPeers[0]?.name || 'Host');
      }
    } else if (this.currentRoom) {
      this.waitForAdmission();
      const me = this.currentRoom.connectedPeers.find(p => p.id === this.currentRoom!.myPeerId) || {
        id: this.currentRoom.myPeerId,
        clientSessionId: getOrCreateClientSessionId(),
        name: 'Guest',
        classKey: 'warrior',
        skinVariant: 0,
        isHost: false,
        playerIndex: this.localPlayerIndex
      };
      this.initGuestWebRTC(this.currentRoom.code, this.currentRoom.myPeerId, me, true);
    }
  }

  public updateLobbySettings(settings: { partySize?: number; gameMode?: string }): boolean {
    const room = this.currentRoom;
    if (!room?.isHost || room.status !== 'lobby') return false;
    if (settings.partySize !== undefined) {
      if (![2, 3, 4].includes(settings.partySize) || settings.partySize < room.connectedPeers.length) return false;
      room.partySize = settings.partySize;
    }
    if (settings.gameMode && ['standard', 'blitz', 'coop_raid', 'roguelike_draft'].includes(settings.gameMode)) room.gameMode = settings.gameMode;
    this.publishRoster(); this.saveSessionSnapshot(); this.notifyStateChange();
    return true;
  }

  public restoreRoster(session: ActiveMPSession): void {
    if (!this.currentRoom?.isHost || !session.connectedPeers) return;
    this.currentRoom.connectedPeers = session.connectedPeers.map(p => ({ ...p, isDisconnected: !p.isHost }));
    this.currentRoom.partySize = session.partySize || session.connectedPeers.length;
    this.saveSessionSnapshot();
  }

  private publishRoster(reconnectedPeer?: ConnectedPeer): void {
    const room = this.currentRoom;
    if (!room?.isHost) return;
    this.broadcast({ packetId: this.nextPacketId(), type: reconnectedPeer ? 'PEER_RECONNECTED' : 'PEER_CONNECTED', roomCode: room.code,
      senderId: 'host', senderName: room.connectedPeers[0]?.name || 'Host',
      payload: { peer: reconnectedPeer, peers: room.connectedPeers, partySize: room.partySize, gameMode: room.gameMode, aiDifficulty: room.aiDifficulty }, timestamp: Date.now() });
  }

  private processIncomingPacket(packet: NetworkPacket, source: 'webrtc' | 'broadcast') {
    const room = this.currentRoom;
    if (!room || !packet || packet.roomCode !== room.code || typeof packet.packetId !== 'string' || !packet.packetId || typeof packet.senderId !== 'string') return;
    if (packet.senderId === room.myPeerId || this.markPacketSeen(packet.packetId)) return;
    if (['START_GAME', 'PEER_CONNECTED', 'PEER_RECONNECTED', 'REJOIN_ACK', 'ROOM_ERROR'].includes(packet.type) && packet.senderId !== 'host') return;
    if (room.isHost) {
      if (packet.type === 'JOIN_ROOM' || packet.type === 'REJOIN_ROOM') {
        const sessionId = packet.payload?.clientSessionId;
        let member = room.connectedPeers.find(p => !p.isHost && (p.id === packet.senderId || (sessionId && p.clientSessionId === sessionId)));
        if (!member && (room.status === 'playing' || room.connectedPeers.length >= (room.partySize || 3))) {
          this.broadcast({ packetId: this.nextPacketId(), type: 'ROOM_ERROR', roomCode: room.code, senderId: 'host', senderName: 'Host',
            payload: { peerId: packet.senderId, message: room.status === 'playing' ? 'เกมเริ่มแล้ว ไม่พบที่นั่งเดิมของคุณ' : 'ห้องเต็มแล้ว' }, timestamp: Date.now() });
          return;
        }
        if (!member) {
          member = { id: packet.senderId, clientSessionId: sessionId, name: String(packet.senderName || 'Guest').slice(0, 24),
            classKey: packet.payload?.peer?.classKey || 'warrior', skinVariant: packet.payload?.peer?.skinVariant || 0,
            isHost: false, playerIndex: room.connectedPeers.length };
          room.connectedPeers.push(member);
        }
        member.id = packet.senderId; member.isDisconnected = false;
        this.publishRoster(packet.type === 'REJOIN_ROOM' ? member : undefined); this.saveSessionSnapshot(); this.notifyStateChange();
      } else {
        const member = room.connectedPeers.find(p => p.id === packet.senderId && !p.isHost);
        if (!member) return;
        if (packet.type === 'PLAYER_UPDATE') {
          if (room.status !== 'lobby') return;
          member.name = String(packet.payload?.name || member.name).slice(0, 24);
          member.classKey = packet.payload?.classKey || member.classKey;
          member.skinVariant = packet.payload?.skinVariant ?? member.skinVariant;
          this.publishRoster(); this.notifyStateChange();
        } else if (packet.type === 'LEAVE_ROOM') {
          if (room.status === 'playing') member.isDisconnected = true;
          else {
            room.connectedPeers = room.connectedPeers.filter(p => p !== member);
            room.connectedPeers.forEach((p, i) => p.playerIndex = i);
          }
          this.publishRoster(); this.saveSessionSnapshot(); this.notifyStateChange();
        } else {
          // Bridge both transports; all clients deduplicate the original packet ID.
          if (source === 'webrtc') this.channel?.postMessage(packet);
          this.connections.forEach(conn => { if (conn.open) { try { conn.send(packet); } catch {} } });
        }
      }
    } else {
      if (['JOIN_ROOM', 'REJOIN_ROOM'].includes(packet.type)) return;
      if (packet.type === 'PEER_CONNECTED' || packet.type === 'PEER_RECONNECTED') {
        if (packet.senderId !== 'host' || !Array.isArray(packet.payload?.peers)) return;
        if (this.admissionTimer) clearTimeout(this.admissionTimer);
        this.admissionTimer = null;
        this.onlineMessage = source === 'webrtc' ? 'เชื่อมต่อห้องออนไลน์แล้ว' : this.onlineMessage;
        room.connectedPeers = packet.payload.peers;
        room.partySize = packet.payload.partySize ?? room.partySize;
        room.gameMode = packet.payload.gameMode ?? room.gameMode;
        room.aiDifficulty = packet.payload.aiDifficulty ?? room.aiDifficulty;
        const me = room.connectedPeers.find(p => p.id === room.myPeerId);
        if (me && typeof me.playerIndex === 'number') this.localPlayerIndex = me.playerIndex;
        this.saveSessionSnapshot(); this.notifyStateChange();
      } else if (packet.type === 'START_GAME') {
        if (!packet.payload?.saveData || room.status === 'playing') return;
      }
    }
    this.onPacketListeners.forEach(listener => {
      try { listener(packet); } catch (err) { console.error('[NetworkRoomManager] Listener dispatch error:', err); }
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
