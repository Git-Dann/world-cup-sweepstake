import { prisma } from "@/lib/prisma";
import { pairKey, key, dateKey } from "@/lib/team-match";

// Second real results feed (TheSportsDB). Structured JSON, key-optional ("3" is
// the free/test key), so it's a dependable cross-check when football-data.org is
// unreachable or lagging. Unlike the openfootball fallback it can also CORRECT an
// already-finished fixture whose score is wrong, because by the time we fall back
// to it the primary feed has failed and this is the best truth we have.
const LEAGUE_ID = process.env.THESPORTSDB_LEAGUE_ID ?? "4429"; // FIFA World Cup
const SEASON = process.env.THESPORTSDB_SEASON ?? "2026";
const API_KEY = process.env.THESPORTSDB_KEY ?? "3"; // free tier

const FINISHED = new Set(["FT", "AET", "PEN", "Match Finished"]);

type TsdbEvent = {
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string; // YYYY-MM-DD
  strStatus?: string;
};

export async function syncFromTheSportsDB(): Promise<{ updated: number; unmatched: number }> {
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`thesportsdb HTTP ${res.status}`);
  const data = (await res.json()) as { events?: TsdbEvent[] | null };
  const events = data.events ?? [];

  const fixtures = await prisma.fixture.findMany({
    include: { homeTeam: true, awayTeam: true },
  });

  let updated = 0;
  let unmatched = 0;
  for (const e of events) {
    if (!e.strHomeTeam || !e.strAwayTeam) continue;
    if (!FINISHED.has(e.strStatus ?? "")) continue;
    const hs = e.intHomeScore == null ? NaN : Number(e.intHomeScore);
    const as = e.intAwayScore == null ? NaN : Number(e.intAwayScore);
    if (Number.isNaN(hs) || Number.isNaN(as)) continue;

    const pair = pairKey(e.strHomeTeam, e.strAwayTeam);
    const candidates = fixtures.filter(
      (f) => f.homeTeam && f.awayTeam && pairKey(f.homeTeam.name, f.awayTeam.name) === pair,
    );
    const fx =
      (e.dateEvent && candidates.find((f) => dateKey(f.kickoff) === e.dateEvent)) ?? candidates[0];
    if (!fx || !fx.homeTeam || !fx.awayTeam) {
      unmatched++;
      continue;
    }

    const homeIsHome = key(fx.homeTeam.name) === key(e.strHomeTeam);
    const homeGoals = homeIsHome ? hs : as;
    const awayGoals = homeIsHome ? as : hs;

    // Don't write if we already hold exactly this finished result.
    if (fx.finished && fx.homeGoals === homeGoals && fx.awayGoals === awayGoals) continue;

    await prisma.fixture.update({
      where: { id: fx.id },
      data: {
        homeGoals,
        awayGoals,
        finished: true,
        status: "FINISHED",
        winnerTeamApiId:
          homeGoals > awayGoals
            ? fx.homeTeam.apiId
            : awayGoals > homeGoals
              ? fx.awayTeam.apiId
              : null,
      },
    });
    updated++;
  }
  return { updated, unmatched };
}
