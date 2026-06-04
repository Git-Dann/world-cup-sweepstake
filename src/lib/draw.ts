import { prisma } from "@/lib/prisma";

// Randomly allocate ALL teams across the players as evenly as possible.
// 48 teams ÷ N players → each player gets floor or ceil(48/N) teams.
export async function runDraw() {
  const players = await prisma.player.findMany();
  if (players.length === 0) throw new Error("Add players before running the draw.");

  const teams = await prisma.team.findMany();
  if (teams.length === 0) throw new Error("Teams haven't been synced yet.");

  // Fisher–Yates shuffle
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Shuffle BOTH teams AND players, so when 48 doesn't divide evenly the extra
  // team(s) land on random players — not whoever happens to be first in the list.
  const shuffledTeams = shuffle(teams);
  const shuffledPlayers = shuffle(players);

  // Deal round-robin so the split is even (differ by at most 1).
  await prisma.$transaction([
    prisma.team.updateMany({ data: { ownerId: null } }),
    ...shuffledTeams.map((team, idx) =>
      prisma.team.update({
        where: { id: team.id },
        data: { ownerId: shuffledPlayers[idx % shuffledPlayers.length].id },
      }),
    ),
    prisma.setting.update({
      where: { id: 1 },
      data: { drawCompletedAt: new Date() },
    }),
  ]);

  return { players: players.length, teams: shuffledTeams.length };
}

export async function resetDraw() {
  await prisma.$transaction([
    prisma.team.updateMany({ data: { ownerId: null } }),
    prisma.setting.update({ where: { id: 1 }, data: { drawCompletedAt: null } }),
  ]);
}
