-- Run this in the Supabase SQL editor.
--
-- Replaces Google sign-in with a username and password. The old `admins`
-- table was keyed on email because Google supplied the identity; nothing
-- supplies it now, so the table is rebuilt around a username.
--
-- No credentials in this file on purpose. It creates the shape; the INSERT
-- carrying the password hash is generated separately and pasted in by hand,
-- because a scrypt hash committed to a public repository is an offline
-- cracking target and this repository is public.

drop table if exists admins;

create table admins (
  username      text primary key,
  name          text,
  -- scrypt$N$r$p$salt$hash, all base64. Parameters live in the string so a
  -- future increase in cost does not invalidate rows already written.
  password_hash text not null,
  added_at      timestamptz not null default now()
);

alter table admins enable row level security;

-- RLS on with no policies, exactly as the other tables: every read goes
-- through the server with the service key, and the browser never reaches
-- this table at all. That matters more here than anywhere else in the
-- schema, because this is the one table holding a credential.
