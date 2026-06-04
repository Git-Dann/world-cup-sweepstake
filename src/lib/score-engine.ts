import { prisma } from "@/lib/prisma";
import {
  roundKeyFromApi,
  reachBonus,
  ROUND_ORDER,
  ROUND_LABELS,
  type ScoringConfig,
  type RoundKey,
} from "@/lib/scoring";

type Ev = {
  teamId: string;
  fixtureId: string | null;
  kind: string;
  points: number;
  note?: string;
};

// Idempotent full recompute: rebuilds the ScoreEvent ledger and each team's
// total from scratch off the current fixtures. Safe to run on every poll —
// re-running never double-counts.
export async function recomputeAllScores(scoring: ScoringConfig) {
  const teams = await prisma.team.findMany();
  const fixtures = await prisma.fixture.findMany();
  const teamByApi = new Map(teams.map((t) => [t.apiId, t]));

  const events: Ev[] = [];
  const totals = new Map<string, number>();
  const reached = new Map<string, RoundKey>();
  const exitRound = new Map<string, string>(); // teamId -> round label where knocked out
  const awardedReach = new Set<string>(); // `${teamId}:${roundKey}`

  const add = (
    teamId: string,
    fixtureId: string | null,
    kind: string,
    points: number,
    note?: string,
  ) => {
    events.push({ teamId, fixtureId, kind, points, note });
    totals.set(teamId, (totals.get(teamId) ?? 0) + points);
  };

  const bumpReached = (teamId: string, rk: RoundKey) => {
    const cur = reached.get(teamId) ?? "GROUP";
    if (ROUND_ORDER[rk] > ROUND_ORDER[cur]) reached.set(teamId, rk);
  };

  for (const f of fixtures) {
    const rk = roundKeyFromApi(f.round);
    const home = f.homeTeamId;
    const away = f.awayTeamId;

    // Reach bonus: awarded as soon as a team APPEARS in a knockout fixture
    // (i.e. they qualified for that round). Deduped per (team, round).
    if (rk !== "GROUP") {
      for (const teamId of [home, away]) {
        if (!teamId) continue;
        bumpReached(teamId, rk);
        const key = `${teamId}:${rk}`;
        if (!awardedReach.has(key)) {
          const rb = reachBonus(rk, scoring);
          if (rb) {
            add(teamId, f.id, rb.kind, rb.points, `Reached ${ROUND_LABELS[rk]}`);
            awardedReach.add(key);
          }
        }
      }
    }

    if (!f.finished) continue;
    const hg = f.homeGoals ?? 0;
    const ag = f.awayGoals ?? 0;

    if (scoring.goalBonus > 0) {
      if (home && hg) add(home, f.id, "GOAL", hg * scoring.goalBonus, `${hg} goal(s)`);
      if (away && ag) add(away, f.id, "GOAL", ag * scoring.goalBonus, `${ag} goal(s)`);
    }

    if (rk === "GROUP") {
      if (hg === ag) {
        if (home) add(home, f.id, "GROUP_DRAW", scoring.groupDraw, "Group draw");
        if (away) add(away, f.id, "GROUP_DRAW", scoring.groupDraw, "Group draw");
      } else {
        const homeWon = hg > ag;
        if (homeWon && home) add(home, f.id, "GROUP_WIN", scoring.groupWin, "Group win");
        if (!homeWon && away) add(away, f.id, "GROUP_WIN", scoring.groupWin, "Group win");
      }
    } else {
      // Knockout: the loser exits here; the Final winner takes the cup.
      const winnerTeam = f.winnerTeamApiId ? teamByApi.get(f.winnerTeamApiId) : undefined;
      if (winnerTeam) {
        const loserId = winnerTeam.id === home ? away : home;
        if (loserId) exitRound.set(loserId, ROUND_LABELS[rk]);
        if (rk === "FINAL") {
          add(winnerTeam.id, f.id, "WIN_CUP", scoring.winCup, "Won the World Cup 🏆");
        }
      }
    }
  }

  await prisma.$transaction([
    prisma.scoreEvent.deleteMany({}),
    ...teams.map((t) =>
      prisma.team.update({
        where: { id: t.id },
        data: {
          points: totals.get(t.id) ?? 0,
          reachedRound: reached.get(t.id) ?? "GROUP",
          eliminated: exitRound.has(t.id),
          exitRound: exitRound.get(t.id) ?? null,
        },
      }),
    ),
    prisma.scoreEvent.createMany({
      data: events.map((e) => ({
        teamId: e.teamId,
        fixtureId: e.fixtureId,
        kind: e.kind,
        points: e.points,
        note: e.note ?? null,
      })),
    }),
  ]);

  return { events: events.length, teams: teams.length };
}
