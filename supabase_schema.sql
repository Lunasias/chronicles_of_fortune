-- =========================================================
-- Supabase Schema for Chronicles of Fortune Online
-- =========================================================

-- 1. Rooms Table
create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  room_code varchar(6) not null unique,
  host_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'in_game', 'finished')),
  current_turn_index integer not null default 0,
  turn_deadline timestamptz,
  game_state jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Room Players Table
create table if not exists public.room_players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  player_index integer not null check (player_index >= 0 and player_index <= 3),
  player_id text not null,
  player_name text not null,
  class_key text not null default 'warrior',
  is_host boolean not null default false,
  is_ready boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz default now(),
  unique (room_id, player_index),
  unique (room_id, player_id)
);

-- 3. Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- Public read/write policy for anonymous game rooms
create policy "Allow all access to rooms" on public.rooms
  for all using (true) with check (true);

create policy "Allow all access to room_players" on public.room_players
  for all using (true) with check (true);

-- 4. Enable Supabase Realtime Publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
