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
    potText: s?.potText ?? null,
  };
}
