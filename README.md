# IIMBG Clash Royale

Live single-elimination bracket for the IIM Bodh Gaya IT Committee Clash Royale
championship. Admins run the tournament from a phone; everyone else opens the
link and watches it fill in.

- **Public** — `/` the bracket, the next match, the champion. `/display` for
  the hall screen.
- **Host** — `/admin`, username and password checked against the `admins` table.

## How it works

Two facts are stored: a player's **seed** (their bracket slot) and, for each
played match, a **winner**. Everything else — who is standing in round 3, who is
out, who has a bye, who is champion — is computed from those on every read by
`lib/bracket.ts`.

That is the whole design. It means a bye needs no row, undoing a result is a
delete rather than a repair, and re-drawing the bracket cannot leave a stale
"advanced to" record behind. `lib/bracket.ts` is pure and unit-tested against
every player count from 2 to 64, including the awkward ones (3, 7, 13, 31, 37,
63) where naive bracket code breaks.

Stack: Next.js 16 App Router, Supabase as plain Postgres, Auth.js v5 with
Google, Tailwind v4, deployed on Vercel. Reads are Server Components, writes are
Server Actions — there is no API layer. The browser never touches the database:
RLS is on with no policies, and everything goes through the server with the
service key.

## Setup

1. **Supabase project** — create one, then open the SQL editor and run
   `supabase/schema.sql`, then `supabase/migration-002-player-ids.sql`.
   PostgREST cannot run DDL, so this is the one step that has to happen in
   the browser.

   It drops the tables from the earlier point-table format. `admins` is not
   dropped, so an existing scorer list survives.

2. **Create the admin login** — the `admins` table stores a username and a
   scrypt hash, never a plaintext password. Generate a row with:

   ```
   node --conditions=react-server -e "import('./lib/password.ts').then(async m => console.log(await m.hashPassword('YOUR-PASSWORD')))"
   ```

   then insert it:

   ```sql
   insert into admins (username, name, password_hash)
   values ('admin', 'IT Committee', 'scrypt$...');
   ```

   Adding a second scorer later is one more row and no code change.


3. **Google OAuth** — [console.cloud.google.com](https://console.cloud.google.com)
   → APIs & Services → Credentials → Create OAuth client ID → Web application.

   Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`

4. **`.env.local`**

   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_KEY=<service_role key — server only, never NEXT_PUBLIC_>
   AUTH_SECRET=<openssl rand -base64 32>
   AUTH_GOOGLE_ID=
   AUTH_GOOGLE_SECRET=
   ```

   On Vercel, add the same four, plus `AUTH_URL` set to the deployed origin.

5. `npm install && npm run dev`

## Running an event

Create the tournament → paste the player names, one per line → **Randomize** →
check the first-round pairings → **Start** (this locks the draw) → tap the winner
after each match.

Byes are worked out for you: 10 players go into a 16-slot bracket with 6 byes,
spread across the draw by standard seeding rather than bunched together.

Got a result wrong? Undo it on the admin console. Anything decided later on that
path is cleared too, because those results were downstream of a fact that turned
out to be false.

## Working on the UI without a database

You do not need Supabase credentials to work on the frontend:

```
npm install
DEMO_MODE=1 npm run dev
```

That renders a fixed 13-player bracket mid-tournament, with byes, finished
matches, playable matches and undecided ones all on screen at once. It never
touches the database. Do not set it in production.

## Commands

```
npm run dev     # localhost:3000
npm run build
npm test        # bracket logic, 2–64 players
npm run lint
```
