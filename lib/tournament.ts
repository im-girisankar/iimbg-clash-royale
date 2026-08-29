import "server-only";
import { cache } from "react";
import { getCurrentTournament, listPlayers, listResults } from "./db";
import { resolveBracket } from "./bracket";
import type { Tournament, Player, Bracket } from "./types";

export interface Live {
  tournament: Tournament;
  players: Player[];
  bracket: Bracket;
}

/** What every page calls. Wrapped in cache() so rendering it twice in one
 *  request (e.g. a layout and a page both wanting the live state) queries
 *  the DB once. */
export const loadLive = cache(async (): Promise<Live | null> => {
  /* Frontend work needs a bracket on screen, not a database. DEMO_MODE=1
     serves a fixture and never touches Supabase, so someone can clone this
     and have every match state rendering in about a minute.

     Checked before the try/catch on purpose: an explicit opt-in should not
     be able to be confused with a connection failure. */
  if (process.env.DEMO_MODE === "1") {
    const { demoLive } = await import("./demo");
    return demoLive();
  }

  try {
    const tournament = await getCurrentTournament();
    if (!tournament) return null;

    const [players, results] = await Promise.all([
      listPlayers(tournament.id),
      listResults(tournament.id),
    ]);

    return { tournament, players, bracket: resolveBracket(players, results) };
  } catch (error) {
    /* Two failures look identical here and must not be treated the same.
     *
     * Missing configuration is a deploy that should never have shipped, so
     * it is rethrown and the build stops with the variable named. That is
     * what a missing SUPABASE_URL should do.
     *
     * A database that is merely unreachable is different. `/` and `/display`
     * are prerendered at build time as an optimisation, not a requirement:
     * they carry `revalidate = 5`, so the first request after deploy
     * refetches anyway. Failing the whole deploy because Supabase blinked
     * during the build is the wrong trade on the night of an event, when the
     * thing you need most is to be able to ship a fix. Render the empty
     * state, log loudly, and let ISR pick up the real data seconds later. */
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Missing ")) throw error;

    console.error(
      `loadLive: database unreachable, rendering the empty state. ISR will retry within 5s. ${message}`,
    );
    return null;
  }
});
