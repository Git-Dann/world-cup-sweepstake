import { prisma } from "@/lib/prisma";

export type LeaderboardTeam = {
  id: string;
  name: string;
  code: string | null;
  groupName: string | null;
  logoUrl: string | null;
  flagUrl: string | null;
  points: number;
  reachedRound: string;
  eliminated: boolean;
};

export type LeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  paid: boolean;
  total: number;
  teamsAlive: number;
  teams: LeaderboardTeam[];
};

// The live standings: each player's total = sum of their teams' points.
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const players = await prisma.player.findMany({
    include: { teams: { orderBy: [{ points: "desc" }, { name: "asc" }] } },
  });

  const rows = players.map((p) => ({
    id: p.id,
    name: p.name,
    paid: p.paid,
    total: p.teams.reduce((s, t) => s + t.points, 0),
    teamsAlive: p.teams.filter((t) => !t.eliminated).length,
    teams: p.teams.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      groupName: t.groupName,
      logoUrl: t.logoUrl,
      flagUrl: t.flagUrl,
      points: t.points,
      reachedRound: t.reachedRound,
      eliminated: t.eliminated,
    })),
  }));

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
