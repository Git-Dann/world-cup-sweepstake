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
// A player's teams are their primary-owned teams plus any shared "second team"
// they were topped up with, so 1-team and 2-team players compete on equal terms.
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const players = await prisma.player.findMany({
    include: { teams: true, extraTeams: { include: { team: true } } },
  });

  const rows = players.map((p) => {
    // Merge owned + shared teams, de-duping by id (a player never counts the
    // same team twice), then sort strongest-first.
    const byId = new Map(p.teams.map((t) => [t.id, t]));
    for (const e of p.extraTeams) if (!byId.has(e.team.id)) byId.set(e.team.id, e.team);
    const teams = [...byId.values()].sort(
      (a, b) => b.points - a.points || a.name.localeCompare(b.name),
    );

    return {
      id: p.id,
      name: p.name,
      paid: p.paid,
      total: teams.reduce((s, t) => s + t.points, 0),
      teamsAlive: teams.filter((t) => !t.eliminated).length,
      teams: teams.map((t) => ({
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
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
