import { test, describe } from "node:test";
import { expect } from "./expect.ts";
import { demoLive } from "../lib/demo.ts";

/* The demo fixture exists so somebody can style every match state without a
 * database. That only works if every state is actually in it.
 *
 * The first version of this fixture listed winners by hand, which meant
 * hand-deriving which bracket slots meet in which match. Five of the seven
 * were wrong, resolveBracket correctly discarded them as stale, and the
 * fixture silently rendered 2 matches instead of 7 while looking fine. These
 * assertions are what would have caught that. */
describe("demo fixture", () => {
  const live = demoLive();
  const matches = live.bracket.rounds.flat();

  test("13 players in a 16 bracket, so there are byes", () => {
    expect(live.players.length).toBe(13);
    expect(live.bracket.size).toBe(16);
    expect(live.bracket.totalRounds).toBe(4);
  });

  test("every player got a distinct slot", () => {
    const seeds = live.players.map((p) => p.seed);
    expect(new Set(seeds).size).toBe(13);
    expect(seeds.every((s) => s !== null && s >= 0 && s < 16)).toBe(true);
  });

  test("all four match states are on screen at once", () => {
    for (const state of ["bye", "done", "ready", "waiting"] as const) {
      const found = matches.filter((m) => m.state === state).length;
      expect(found > 0).toBe(true);
    }
  });

  test("results were not silently discarded as stale", () => {
    // The exact number matters less than that it is what the fixture set out
    // to play. A mismatch means the winners no longer line up with the draw.
    expect(live.bracket.played).toBe(7);
    expect(live.bracket.total).toBe(12);
  });

  test("mid-tournament: playable matches, no champion yet", () => {
    expect(live.bracket.nextMatches.length > 0).toBe(true);
    expect(live.bracket.champion).toBeNull();
    expect(live.tournament.status).toBe("live");
  });

  test("carries roll numbers and some game tags, so those render too", () => {
    expect(live.players.every((p) => p.regNo !== null)).toBe(true);
    expect(live.players.some((p) => p.gameTag !== null)).toBe(true);
    expect(live.players.some((p) => p.gameTag === null)).toBe(true);
  });

  test("is stable across calls, so screenshots mean something", () => {
    const again = demoLive();
    expect(again.bracket.played).toBe(live.bracket.played);
    expect(again.players.map((p) => p.seed)).toEqual(
      live.players.map((p) => p.seed),
    );
    expect(again.bracket.nextMatches.map((m) => m.a?.name)).toEqual(
      live.bracket.nextMatches.map((m) => m.a?.name),
    );
  });
});
