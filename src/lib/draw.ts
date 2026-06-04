import { prisma } from "@/lib/prisma";

// Randomly allocate ALL teams across the players as evenly as possible.
// 48 teams ÷ N players → each player gets floor or ceil(48/N) teams.
export async function runDraw() {
  const players = await prisma.player.findMany();
  if (players.length === 0) throw new Error("Add players before running the draw.");

  const teams = await prisma.team.findMany();
  if (teams.length === 0) throw new Error("Teams haven't been synced yet.");

  // Fisher–Yates shuffle
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Deal round-robin so the split is even (differ by at most 1).
  await prisma.$transaction([
    prisma.team.updateMany({ data: { ownerId: null } }),
    ...shuffled.map((team, idx) =>
      prisma.team.update({
        where: { id: team.id },
        data: { ownerId: players[idx % players.length].id },
      }),
    ),
    prisma.setting.update({
      where: { id: 1 },
      data: { drawCompletedAt: new Date() },
    }),
  ]);

  return { players: players.length, teams: shuffled.length };
}

export async function resetDraw() {
  await prisma.$transaction([
    prisma.team.updateMany({ data: { ownerId: null } }),
    prisma.setting.update({ where: { id: 1 }, data: { drawCompletedAt: null } }),
  ]);
}
