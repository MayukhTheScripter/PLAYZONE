-- =============================================================================
-- PLAYZONE migration 001 - Ready / Unready
-- Run ONCE in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again. It only ADDS things to your existing tables/functions;
-- it does not drop data, tables, policies or grants.
--
-- What it changes
--   1. room_players gets a new column  "ready"  (true/false, starts as false).
--   2. New function set_ready(): a player can change ONLY their own ready flag.
--   3. start_match() is replaced: it now also requires that EVERY player in the
--      room (the host included) is ready. The server enforces this, so a
--      modified browser cannot skip it.
--   4. back_to_lobby() is replaced: it also resets everybody to "not ready".
--
-- Nothing changes for reading: your "members can read" policies already cover
-- the new column, and Realtime already publishes room_players, so every phone
-- sees ready changes live.
-- =============================================================================

alter table public.room_players
  add column if not exists ready boolean not null default false;

-- Any player in the room toggles their OWN flag (never somebody else's).
create or replace function public.set_ready(p_code text, p_ready boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_status text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  select status into v_status from public.rooms where code = upper(p_code);
  if not found then raise exception 'Room not found.'; end if;
  if v_status <> 'lobby' then raise exception 'You can only change Ready in the lobby.'; end if;
  update public.room_players
     set ready = coalesce(p_ready, false)
   where room_code = upper(p_code) and player_id = auth.uid();
  if not found then raise exception 'You are not in this room.'; end if;
end $$;

-- Host starts the match: needs a game, 2+ players and everybody ready.
create or replace function public.start_match(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_room public.rooms; v_count int; v_waiting int;
begin
  select * into v_room from public.rooms where code = upper(p_code) for update;
  if not found then raise exception 'Room not found.'; end if;
  if v_room.host_id <> auth.uid() then raise exception 'Only the host can start the match.'; end if;
  if v_room.status <> 'lobby' then raise exception 'The match has already started.'; end if;
  if v_room.game_id is null then raise exception 'Choose a game first.'; end if;
  select count(*), count(*) filter (where not ready)
    into v_count, v_waiting
    from public.room_players where room_code = v_room.code;
  if v_count < 2 then raise exception 'You need at least 2 players.'; end if;
  if v_waiting > 0 then
    raise exception 'Everybody must be ready first (% still waiting).', v_waiting;
  end if;
  update public.rooms set status = 'playing' where code = v_room.code;
end $$;

-- Host sends everybody back to the lobby after a match; readiness starts over.
create or replace function public.back_to_lobby(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.rooms set status = 'lobby' where code = upper(p_code) and host_id = auth.uid();
  if not found then raise exception 'Only the host can return to the lobby.'; end if;
  update public.room_players set ready = false where room_code = upper(p_code);
end $$;

-- Permissions: same rule as the rest of your schema (signed-in users only).
revoke all on function public.set_ready(text, boolean) from public, anon;
grant execute on function public.set_ready(text, boolean) to authenticated;
-- (start_match / back_to_lobby keep the grants you already set.)
