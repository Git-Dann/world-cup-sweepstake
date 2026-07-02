import { prisma } from "@/lib/prisma";
import {
  roundKeyFromApi,
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
//
// Scoring is pure win/draw/loss on EVERY match (group and knockout):
//   win = scoring.groupWin (3), draw = scoring.groupDraw (1), loss = 0.
// A knockout decided on penalties counts as a win for the team that advances.
// There are no round-progression or cup bonuses.
export async function recomputeAllScores(scoring: ScoringConfig) {
  const teams = await prisma.team.findMany();
  const fixtures = await prisma.fixture.findMany();
  const teamByApi = new Map(teams.map((t) => [t.apiId, t]));

  const events: Ev[] = [];
  const totals = new Map<string, number>();
  const reached = new Map<string, RoundKey>();
  const exitRound = new Map<string, string>(); // teamId -> round label where knocked out

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

  // Award a win to one side and a loss (0 pts) to the other; the loser exits.
  const settleWin = (
    f: { id: string },
    rkLabel: string,
    winnerId: string | null,
    loserId: string | null,
  ) => {
    if (winnerId) add(winnerId, f.id, "WIN", scoring.groupWin, `Win — ${rkLabel}`);
    if (loserId) exitRound.set(loserId, rkLabel);
  };

  for (const f of fixtures) {
    const rk = roundKeyFromApi(f.round);
    const home = f.homeTeamId;
    const away = f.awayTeamId;

    // Track furthest round reached (for the "alive" display only — reaching a
    // round no longer awards any points).
    if (rk !== "GROUP") {
      if (home) bumpReached(home, rk);
      if (away) bumpReached(away, rk);
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
        if (home) add(home, f.id, "DRAW", scoring.groupDraw, "Draw");
        if (away) add(away, f.id, "DRAW", scoring.groupDraw, "Draw");
      } else {
        const homeWon = hg > ag;
        if (homeWon && home) add(home, f.id, "WIN", scoring.groupWin, "Win");
        if (!homeWon && away) add(away, f.id, "WIN", scoring.groupWin, "Win");
      }
      continue;
    }

    // Knockout: the team that advances gets the win (penalties included); the
    // other is knocked out. Prefer the explicit winner id; fall back to goals.
    const label = ROUND_LABELS[rk];
    const winnerTeam = f.winnerTeamApiId ? teamByApi.get(f.winnerTeamApiId) : undefined;
    if (winnerTeam) {
      const winnerId = winnerTeam.id;
      settleWin(f, label, winnerId, winnerId === home ? away : home);
    } else if (hg !== ag) {
      const homeWon = hg > ag;
      settleWin(f, label, homeWon ? home : away, homeWon ? away : home);
    }
    // If a knockout is finished but has no winner and is level on goals, we
    // can't tell who advanced — award nothing until the data resolves.
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
