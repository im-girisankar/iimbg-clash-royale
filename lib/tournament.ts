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
  const tournament = await getCurrentTournament();
  if (!tournament) return null;

  const [players, results] = await Promise.all([
    listPlayers(tournament.id),
    listResults(tournament.id),
  ]);

  const bracket = resolveBracket(players, results);

  return { tournament, players, bracket };
});
