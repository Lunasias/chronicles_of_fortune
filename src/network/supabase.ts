import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export interface RoomPlayer {
  id?: string;
  room_id: string;
  player_index: number;
  player_id: string;
  player_name: string;
  class_key: string;
  is_host: boolean;
  is_ready: boolean;
  is_connected: boolean;
}

export interface RoomData {
  id: string;
  room_code: string;
  host_id: string;
  status: 'waiting' | 'in_game' | 'finished';
  current_turn_index: number;
  turn_deadline?: string;
  game_state?: any;
}
