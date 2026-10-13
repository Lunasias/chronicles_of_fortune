/**
 * NetworkRoomManager.ts
 * P2P Room Code & Match Synchronization Foundation for Chronicles of Fortune
 * Supports BroadcastChannel for seamless local multi-tab/window multiplayer
 * and provides extensible signaling packet protocol for remote WebRTC peer connections.
 */

export interface NetworkPacket {
  type: 'JOIN_ROOM' | 'PEER_CONNECTED' | 'DICE_ROLL' | 'MOVE_STEP' | 'USE_SPELL' | 'TURN_END' | 'CHAT_MSG' | 'SYNC_STATE';
  roomCode: string;
  senderId: number | string;
  senderName: string;
  payload: any;
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  isHost: boolean;
  connectedPeers: Array<{ id: string | number; name: string }>;
  channelName: string;
}

export class NetworkRoomManager {
  private channel: BroadcastChannel | null = null;
  private currentRoom: RoomInfo | null = null;
  private onPacketListeners: Array<(packet: NetworkPacket) => void> = [];
  private onStateChangeListeners: Array<(info: RoomInfo | null) => void> = [];

  constructor() {}

  /**
   * Generate a readable 6-character alphanumeric room code (e.g., 'CF-7842')
   */
  public generateRoomCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `CF-${num}`;
  }

  /**
   * Host / Create a new multiplayer game room
   */
  public createRoom(hostPlayerName: string = 'Host'): RoomInfo {
    this.leaveRoom();
    const code = this.generateRoomCode();
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${code}`;

    this.currentRoom = {
      code,
      isHost: true,
      connectedPeers: [{ id: 'host', name: hostPlayerName }],
      channelName
    };

    this.setupChannel(channelName, hostPlayerName);
    this.notifyStateChange();
    return this.currentRoom;
  }

  /**
   * Join an existing multiplayer room using room code
   */
  public joinRoom(roomCode: string, playerName: string = 'Guest'): boolean {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return false;

    this.leaveRoom();
    const channelName = `CHRONICLES_OF_FORTUNE_ROOM_${cleanCode}`;

    this.currentRoom = {
      code: cleanCode,
      isHost: false,
      connectedPeers: [{ id: 'self', name: playerName }],
      channelName
    };

    this.setupChannel(channelName, playerName);

    // Broadcast JOIN packet to notify host and other players
    this.broadcast({
      type: 'JOIN_ROOM',
      roomCode: cleanCode,
      senderId: 'guest_' + Math.floor(Math.random() * 10000),
      senderName: playerName,
      payload: { joinedAt: Date.now() },
      timestamp: Date.now()
    });

    this.notifyStateChange();
    return true;
  }

  /**
   * Leave the current room and close communication channel
   */
  public leaveRoom() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Safe fallback
      }
      this.channel = null;
    }
    this.currentRoom = null;
    this.notifyStateChange();
  }

  /**
   * Get active room status
   */
  public getRoomInfo(): RoomInfo | null {
    return this.currentRoom;
  }

  /**
   * Broadcast a network packet across the room
   */
  public broadcast(packet: NetworkPacket) {
    if (!this.channel) return;
    try {
      this.channel.postMessage(packet);
    } catch (err) {
      console.warn('[NetworkRoomManager] Broadcast error:', err);
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

  private setupChannel(channelName: string, selfName: string) {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event: MessageEvent) => {
        const packet = event.data as NetworkPacket;
        if (!packet || packet.roomCode !== this.currentRoom?.code) return;

        // Auto-respond to JOIN_ROOM if this peer is the host
        if (packet.type === 'JOIN_ROOM' && this.currentRoom.isHost) {
          const peerExists = this.currentRoom.connectedPeers.some(p => p.id === packet.senderId);
          if (!peerExists) {
            this.currentRoom.connectedPeers.push({ id: packet.senderId, name: packet.senderName });
            this.notifyStateChange();

            // Acknowledge connection
            this.broadcast({
              type: 'PEER_CONNECTED',
              roomCode: this.currentRoom.code,
              senderId: 'host',
              senderName: selfName,
              payload: { peers: this.currentRoom.connectedPeers },
              timestamp: Date.now()
            });
          }
        } else if (packet.type === 'PEER_CONNECTED' && !this.currentRoom.isHost) {
          if (packet.payload?.peers && Array.isArray(packet.payload.peers)) {
            this.currentRoom.connectedPeers = packet.payload.peers;
            this.notifyStateChange();
          }
        }

        // Notify subscribers
        this.onPacketListeners.forEach(listener => {
          try {
            listener(packet);
          } catch (e) {
            console.error('[NetworkRoomManager] Listener dispatch error:', e);
          }
        });
      };
    } catch (err) {
      console.warn('[NetworkRoomManager] Failed to init BroadcastChannel:', err);
    }
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
