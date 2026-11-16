-- =============================================================================
-- PLAYZONE - database setup (Stage 1: rooms and lobby)
-- Run this ONCE in Supabase -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again later (it uses "if not exists" / "create or replace").
--
-- BEFORE you run it:  Authentication -> Sign In / Providers -> turn ON
-- "Allow anonymous sign-ins". Players join without an email or password.
-- =============================================================================

-- ---------- tables ----------
create table if not exists public.rooms (
  code        text primary key,
  host_id     uuid not null,
  game_id     text,
  status      text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  created_at  timestamptz not null default now()
);

create table if not exists public.room_players (
  room_code   text not null references public.rooms (code) on delete cascade,
  player_id   uuid not null,
  nickname    text not null check (char_length(nickname) between 1 and 14),
  joined_at   timestamptz not null default now(),
  primary key (room_code, player_id)
);

-- ---------- security ----------
-- Players may READ rooms. They can NOT write directly: all changes go through
-- the functions below, which check the rules (host only, 4 players max...).
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- A security-definer helper avoids recursive RLS checks when determining
-- whether the current user belongs to a room.
create or replace function public.is_room_member(p_room_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_players rp
    where rp.room_code = p_room_code
      and rp.player_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(text) from public, anon;
grant execute on function public.is_room_member(text) to authenticated;

drop policy if exists "rooms are readable" on public.rooms;
drop policy if exists "room members can read their rooms" on public.rooms;
create policy "room members can read their rooms"
  on public.rooms for select to authenticated
  using (public.is_room_member(code));

drop policy if exists "room players are readable" on public.room_players;
drop policy if exists "room members can read players in their rooms" on public.room_players;
create policy "room members can read players in their rooms"
  on public.room_players for select to authenticated
  using (public.is_room_member(room_code));

-- ---------- live updates ----------
-- DELETE events need the full row to match the room filter.
alter table public.room_players replica identity full;
alter table public.rooms replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_players; exception when duplicate_object then null; end;
end $$;

-- ---------- functions (the game rules live here) ----------

-- Create a room, become its host and its first player. Returns the room code.
create or replace function public.create_room(p_nickname text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_tries int := 0;
begin
  if v_user is null then raise exception 'You must be signed in.'; end if;
  if p_nickname is null or char_length(trim(p_nickname)) = 0 then raise exception 'Please enter a nickname.'; end if;

  -- leave any old room first so a phone is only in one room at a time
  perform public.leave_all_rooms(v_user);

  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.rooms (code, host_id) values (v_code, v_user);
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 20 then raise exception 'Could not create a room. Please try again.'; end if;
    end;
  end loop;

  insert into public.room_players (room_code, player_id, nickname) values (v_code, v_user, left(trim(p_nickname), 14));
  return v_code;
end $$;

-- Join a room by code. Fails when the room is missing, full or already playing.
create or replace function public.join_room(p_code text, p_nickname text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms;
  v_count int;
  v_member boolean;
begin
  if v_user is null then raise exception 'You must be signed in.'; end if;
  if p_nickname is null or char_length(trim(p_nickname)) = 0 then raise exception 'Please enter a nickname.'; end if;

  select * into v_room from public.rooms where code = upper(p_code) for update;
  if not found then raise exception 'Room % was not found. Check the code.', upper(p_code); end if;

  select exists (select 1 from public.room_players where room_code = v_room.code and player_id = v_user) into v_member;

  if v_member then
    -- reconnecting: just refresh the nickname
    update public.room_players set nickname = left(trim(p_nickname), 14) where room_code = v_room.code and player_id = v_user;
    return;
  end if;

  if v_room.status <> 'lobby' then raise exception 'That match has already started.'; end if;

  select count(*) into v_count from public.room_players where room_code = v_room.code;
  if v_count >= 4 then raise exception 'This room is full (4 players maximum).'; end if;

  perform public.leave_all_rooms(v_user);
  insert into public.room_players (room_code, player_id, nickname) values (v_room.code, v_user, left(trim(p_nickname), 14));
end $$;

-- Internal helper: remove a user from every room, passing the host crown on.
create or replace function public.leave_all_rooms(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in select room_code from public.room_players where player_id = p_user loop
    delete from public.room_players where room_code = r.room_code and player_id = p_user;
    if not exists (select 1 from public.room_players where room_code = r.room_code) then
      delete from public.rooms where code = r.room_code;
    else
      update public.rooms set host_id = (select player_id from public.room_players where room_code = r.room_code order by joined_at limit 1)
      where code = r.room_code and host_id = p_user;
    end if;
  end loop;
end $$;

create or replace function public.leave_room(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  perform public.leave_all_rooms(auth.uid());
end $$;

-- Host picks the game shown in the lobby.
create or replace function public.select_game(p_code text, p_game_id text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.rooms set game_id = p_game_id
   where code = upper(p_code) and host_id = auth.uid() and status = 'lobby';
  if not found then raise exception 'Only the host can choose the game.'; end if;
end $$;

-- Host starts the match (needs a game and at least 2 players).
create or replace function public.start_match(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_room public.rooms; v_count int;
begin
  select * into v_room from public.rooms where code = upper(p_code) for update;
  if not found then raise exception 'Room not found.'; end if;
  if v_room.host_id <> auth.uid() then raise exception 'Only the host can start the match.'; end if;
  if v_room.game_id is null then raise exception 'Choose a game first.'; end if;
  select count(*) into v_count from public.room_players where room_code = v_room.code;
  if v_count < 2 then raise exception 'You need at least 2 players.'; end if;
  update public.rooms set status = 'playing' where code = v_room.code;
end $$;

-- Host sends everybody back to the lobby after a match.
create or replace function public.back_to_lobby(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.rooms set status = 'lobby' where code = upper(p_code) and host_id = auth.uid();
  if not found then raise exception 'Only the host can return to the lobby.'; end if;
end $$;

-- ---------- permissions ----------
-- PostgreSQL grants function execution to PUBLIC by default. Explicitly
-- remove that default for every RPC, then grant only to signed-in users.
revoke all on function public.leave_all_rooms(uuid) from public, anon, authenticated;
revoke all on function public.create_room(text) from public, anon;
revoke all on function public.join_room(text, text) from public, anon;
revoke all on function public.leave_room(text) from public, anon;
revoke all on function public.select_game(text, text) from public, anon;
revoke all on function public.start_match(text) from public, anon;
revoke all on function public.back_to_lobby(text) from public, anon;

grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.leave_room(text) to authenticated;
grant execute on function public.select_game(text, text) to authenticated;
grant execute on function public.start_match(text) to authenticated;
grant execute on function public.back_to_lobby(text) to authenticated;
