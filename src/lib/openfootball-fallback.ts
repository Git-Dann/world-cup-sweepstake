import { prisma } from "@/lib/prisma";
import { pairKey, key, dateKey } from "@/lib/team-match";

// Free, no-key fallback results feed (volunteer-updated, so it can lag). Used ONLY
// when the API feeds are unreachable — fills any not-yet-finished fixture whose
// team-pair (and date) matches an openfootball match that has a score.
const URL_2026 = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

type OfMatch = {
  date?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] };
  score1?: number;
  score2?: number;
};

function extractScore(m: OfMatch): [number, number] | null {
  if (m.score?.ft && m.score.ft.length === 2) return [m.score.ft[0], m.score.ft[1]];
  if (typeof m.score1 === "number" && typeof m.score2 === "number") return [m.score1, m.score2];
  return null;
}

export async function syncFromOpenfootball(): Promise<{ updated: number; unmatched: number }> {
  const res = await fetch(URL_2026, { cache: "no-store" });
  if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`);
  const data = (await res.json()) as { matches?: OfMatch[] };
  const matches = data.matches ?? [];

  const fixtures = await prisma.fixture.findMany({
    where: { finished: false },
    include: { homeTeam: true, awayTeam: true },
  });

  let updated = 0;
  let unmatched = 0;
  for (const m of matches) {
    const score = extractScore(m);
    if (!score || !m.team1 || !m.team2) continue;

    const pair = pairKey(m.team1, m.team2);
    const candidates = fixtures.filter(
      (f) => f.homeTeam && f.awayTeam && pairKey(f.homeTeam.name, f.awayTeam.name) === pair,
    );
    const fx = (m.date && candidates.find((f) => dateKey(f.kickoff) === dateKey(m.date!))) ?? candidates[0];
    if (!fx || !fx.homeTeam || !fx.awayTeam) {
      unmatched++;
      continue;
    }

    const homeIsTeam1 = key(fx.homeTeam.name) === key(m.team1);
    const homeGoals = homeIsTeam1 ? score[0] : score[1];
    const awayGoals = homeIsTeam1 ? score[1] : score[0];
    await prisma.fixture.update({
      where: { id: fx.id },
      data: {
        homeGoals,
        awayGoals,
        finished: true,
        status: "FINISHED",
        winnerTeamApiId:
          homeGoals > awayGoals ? fx.homeTeam.apiId : awayGoals > homeGoals ? fx.awayTeam.apiId : null,
      },
    });
    updated++;
  }
  return { updated, unmatched };
}
