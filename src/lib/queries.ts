import { prisma } from "@/lib/prisma";

export type GroupTeam = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  points: number;
  owner: string | null;
  eliminated: boolean;
  reachedRound: string;
};

export async function getTeamsByGroup(): Promise<{ group: string; teams: GroupTeam[] }[]> {
  const teams = await prisma.team.findMany({
    include: { owner: true },
    orderBy: [{ groupName: "asc" }, { points: "desc" }, { name: "asc" }],
  });

  const map = new Map<string, GroupTeam[]>();
  for (const t of teams) {
    const g = t.groupName ?? "TBD";
    const arr = map.get(g) ?? [];
    arr.push({
      id: t.id,
      name: t.name,
      code: t.code,
      logoUrl: t.logoUrl,
      points: t.points,
      owner: t.owner?.name ?? null,
      eliminated: t.eliminated,
      reachedRound: t.reachedRound,
    });
    map.set(g, arr);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, teams]) => ({ group, teams }));
}

export async function getDrawState() {
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    drawCompleted: !!s?.drawCompletedAt,
    prizeText: s?.prizeText ?? "Bragging rights 🏆",
    logoUrl: s?.logoUrl ?? null,
    bgUrl: s?.bgUrl ?? null,
  };
}

const LIVE_STATUSES = ["IN_PLAY", "PAUSED", "LIVE", "1H", "2H", "ET", "HT", "BT", "P"];

export type FeaturedMatch =
  | {
      state: "live" | "upcoming";
      round: string;
      status: string;
      kickoff: string;
      home: { name: string; logo: string | null };
      away: { name: string; logo: string | null };
      homeGoals: number | null;
      awayGoals: number | null;
    }
  | { state: "none" };

// The match to feature in the banner: a live game if there is one, else the next one.
export async function getFeaturedMatch(): Promise<FeaturedMatch> {
  const include = { homeTeam: true, awayTeam: true } as const;

  const live = await prisma.fixture.findFirst({
    where: { status: { in: LIVE_STATUSES }, homeTeamId: { not: null }, awayTeamId: { not: null } },
    include,
    orderBy: { kickoff: "asc" },
  });

  const fixture =
    live ??
    (await prisma.fixture.findFirst({
      where: {
        finished: false,
        status: { notIn: LIVE_STATUSES },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      include,
      orderBy: { kickoff: "asc" },
    }));

  if (!fixture || !fixture.homeTeam || !fixture.awayTeam) return { state: "none" };

  return {
    state: live ? "live" : "upcoming",
    round: fixture.round,
    status: fixture.status,
    kickoff: fixture.kickoff.toISOString(),
    home: { name: fixture.homeTeam.name, logo: fixture.homeTeam.logoUrl },
    away: { name: fixture.awayTeam.name, logo: fixture.awayTeam.logoUrl },
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
  };
}
