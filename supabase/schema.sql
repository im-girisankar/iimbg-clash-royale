-- IIMBG Clash Royale — full schema. Paste into the Supabase SQL editor and run.
--
-- WARNING: the drops below remove the earlier league/point-table tables. They
-- are deliberate — that format was scrapped. `admins` is NOT dropped, so the
-- scorer list survives. Everything else was empty.
--
-- Design note: the bracket's shape is implicit, not stored. A player has a
-- seed (a slot number), a result names a winner for one (round, slot), and
-- who is standing in any later slot is computed from those two facts by
-- lib/bracket.ts. That is why undoing a result is a delete, not a repair.

drop table if exists bgmi_results          cascade;
drop table if exists cr_results            cascade;
drop table if exists bgmi_placement_points cascade;
drop table if exists matches               cascade;
drop table if exists competitors           cascade;

-- Who may sign in. Add a scorer by inserting a row — no deploy needed.
create table if not exists admins (
  email    text primary key,
  name     text,
  added_at timestamptz not null default now()
);

-- One row per tournament. The committee runs one at a time, but keeping it a
-- table (rather than a config constant) means next semester's event is a new
-- row instead of a migration, and this one stays readable as history.
create table if not exists tournaments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  status       text not null default 'setup' check (status in ('setup', 'live', 'done')),
  size         int  not null default 0,           -- bracket slots; power of two
  created_by   text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz
);

create table if not exists players (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  name          text not null,
  seed          int,                               -- 0-based slot, null before the draw
  created_at    timestamptz not null default now(),
  unique (tournament_id, name),
  unique (tournament_id, seed)
);

-- A played match. Byes never appear here: they have no result to record.
-- crowns are optional — the winner is what the bracket needs, the score is
-- what people argue about afterwards.
create table if not exists results (
  tournament_id uuid not null references tournaments (id) on delete cascade,
  round         int  not null check (round >= 1),
  slot          int  not null check (slot >= 0),
  winner_id     uuid not null references players (id) on delete cascade,
  crowns_a      int check (crowns_a between 0 and 3),
  crowns_b      int check (crowns_b between 0 and 3),
  decided_at    timestamptz not null default now(),
  decided_by    text,
  primary key (tournament_id, round, slot)
);

create index if not exists players_tournament_idx    on players (tournament_id, seed);
create index if not exists results_tournament_idx    on results (tournament_id, round, slot);
create index if not exists tournaments_created_idx   on tournaments (created_at desc);

-- RLS on with no policies: the browser never reaches these tables. Every read
-- and write goes through the server using the service key, which bypasses RLS.
alter table admins      enable row level security;
alter table tournaments enable row level security;
alter table players     enable row level security;
alter table results     enable row level security;
