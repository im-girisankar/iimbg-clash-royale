-- Run this in the Supabase SQL editor. It is additive: nothing is dropped and
-- existing players keep working, because both columns are nullable.
--
-- Why these two and not a registrations table: the only question the admin
-- actually has to answer at 9pm is "which Rohan is this?". A roll number
-- answers it, and a Clash Royale tag answers it for anyone whose roll number
-- nobody remembers. Neither is worth a second table, a join, or a screen.

alter table players add column if not exists reg_no   text;
alter table players add column if not exists game_tag text;

-- Roll numbers are unique within a tournament, but only where one was given:
-- a partial index lets any number of players have no roll number at all
-- without colliding with each other.
create unique index if not exists players_regno_idx
  on players (tournament_id, lower(reg_no))
  where reg_no is not null;
