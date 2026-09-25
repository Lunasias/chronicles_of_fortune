import { supabase, RoomData, RoomPlayer, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NetworkActionPayload, NetworkActionType } from './NetworkProtocol';

export class NetworkManager {
  private static instance: NetworkManager;
  public playerId: string = '';
  public currentRoom: RoomData | null = null;
  public players: RoomPlayer[] = [];
  public isHost: boolean = false;
  public myPlayerIndex: number = -1;
  public isOnlineMode: boolean = false;
  private channel: RealtimeChannel | null = null;

  private onPlayersUpdatedCallback: ((players: RoomPlayer[]) => void) | null = null;
  private onGameStartCallback: ((room: RoomData) => void) | null = null;
  private onActionReceivedCallback: ((action: NetworkActionPayload) => void) | null = null;

  private constructor() {
    this.initPlayerId();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  private initPlayerId(): void {
    let id = localStorage.getItem('cof_player_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('cof_player_id', id);
    }
    this.playerId = id;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public isMyTurn(currentTurnIndex: number): boolean {
    if (!this.isOnlineMode) return true;
    return this.myPlayerIndex === currentTurnIndex;
  }

  public async broadcastAction(type: NetworkActionType, data: any): Promise<void> {
    if (!this.channel || !this.isOnlineMode) return;
    const payload: NetworkActionPayload = {
      type,
      playerIndex: this.myPlayerIndex,
      data,
      timestamp: Date.now()
    };
    await this.channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload
    });
  }

  public onActionReceived(cb: (action: NetworkActionPayload) => void): void {
    this.onActionReceivedCallback = cb;
  }


  public async createRoom(playerName: string, classKey: string): Promise<{ success: boolean; error?: string; roomCode?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase credentials not configured in .env' };
    }
    try {
      const roomCode = this.generateRoomCode();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ room_code: roomCode, host_id: this.playerId, status: 'waiting' })
        .select()
        .single();

      if (roomError || !room) {
        return { success: false, error: roomError?.message || 'Failed to create room' };
      }

      this.currentRoom = room;
      this.isHost = true;
      this.myPlayerIndex = 0;
      this.isOnlineMode = true;

      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          player_index: 0,
          player_id: this.playerId,
          player_name: playerName,
          class_key: classKey,
          is_host: true,
          is_ready: true,
          is_connected: true
        });

      if (playerError) {
        return { success: false, error: playerError.message };
      }

      this.subscribeToRoom(room.id);
      await this.fetchPlayers(room.id);
      return { success: true, roomCode };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown network error' };
    }
  }

  public async joinRoom(roomCode: string, playerName: string, classKey: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase credentials not configured in .env' };
    }
    try {
      const code = roomCode.trim().toUpperCase();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select()
        .eq('room_code', code)
        .single();

      if (roomError || !room) {
        return { success: false, error: 'ไม่พบห้องที่ระบุ กรุณาตรวจสอบรหัสห้อง' };
      }

      if (room.status !== 'waiting') {
        return { success: false, error: 'เกมในห้องนี้เริ่มไปแล้ว' };
      }

      const { data: currentPlayers, error: countError } = await supabase
        .from('room_players')
        .select()
        .eq('room_id', room.id);

      if (countError) {
        return { success: false, error: countError.message };
      }

      if ((currentPlayers?.length || 0) >= 4) {
        return { success: false, error: 'ห้องเต็มแล้ว (สูงสุด 4 คน)' };
      }

      const existingPlayer = currentPlayers?.find(p => p.player_id === this.playerId);
      let assignedIndex = 0;

      if (existingPlayer) {
        assignedIndex = existingPlayer.player_index;
      } else {
        const takenIndices = new Set((currentPlayers || []).map(p => p.player_index));
        for (let i = 0; i < 4; i++) {
          if (!takenIndices.has(i)) {
            assignedIndex = i;
            break;
          }
        }

        const { error: insertError } = await supabase
          .from('room_players')
          .insert({
            room_id: room.id,
            player_index: assignedIndex,
            player_id: this.playerId,
            player_name: playerName,
            class_key: classKey,
            is_host: false,
            is_ready: true,
            is_connected: true
          });

        if (insertError) {
          return { success: false, error: insertError.message };


        }
      }

      this.currentRoom = room;
      this.isHost = room.host_id === this.playerId;
      this.myPlayerIndex = assignedIndex;
      this.isOnlineMode = true;

      this.subscribeToRoom(room.id);
      await this.fetchPlayers(room.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown network error' };
    }
  }

  public async fetchPlayers(roomId: string): Promise<RoomPlayer[]> {
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_index', { ascending: true });

    if (!error && data) {
      this.players = data as RoomPlayer[];
      if (this.onPlayersUpdatedCallback) {
        this.onPlayersUpdatedCallback(this.players);
      }
    }
    return this.players;
  }

  public subscribeToRoom(roomId: string): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase.channel(`game_room_${roomId}`);

    this.channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      }, () => {
        this.fetchPlayers(roomId);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        const newRoom = payload.new as RoomData;
        this.currentRoom = newRoom;
        if (newRoom.status === 'in_game' && this.onGameStartCallback) {
          this.onGameStartCallback(newRoom);
        }
      })
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        if (payload && payload.playerIndex !== this.myPlayerIndex) {
          if (this.onActionReceivedCallback) {
            this.onActionReceivedCallback(payload as NetworkActionPayload);
          }
        }
      })
      .subscribe();
  }

  public async startGame(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentRoom || !this.isHost) {
      return { success: false, error: 'Only host can start the game' };
    }

    const { error } = await supabase
      .from('rooms')
      .update({ status: 'in_game' })
      .eq('id', this.currentRoom.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  public async leaveRoom(): Promise<void> {
    if (this.currentRoom) {
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', this.currentRoom.id)
        .eq('player_id', this.playerId);

      if (this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    }
    this.currentRoom = null;
    this.players = [];
    this.isHost = false;
    this.myPlayerIndex = -1;
    this.isOnlineMode = false;
  }

  public onPlayersUpdated(cb: (players: RoomPlayer[]) => void): void {
    this.onPlayersUpdatedCallback = cb;
  }

  public onGameStart(cb: (room: RoomData) => void): void {
    this.onGameStartCallback = cb;
  }
}