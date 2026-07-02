import { prisma } from "@/lib/prisma";
import { isStrongTeam } from "@/lib/team-tiers";

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

  // Seeded "pot" draw: split into Strong (FIFA pots 1–2) and Weak (pots 3–4),
  // each shuffled. Players who get two teams get ONE from each pot; the remaining
  // players get a single leftover team. So nobody ends up with two giants or two
  // minnows. Players are shuffled so who-gets-what is random + re-rolls each run.
  const shuffledPlayers = shuffle(players);
  const strong = shuffle(teams.filter((t) => isStrongTeam(t.name)));
  const weak = shuffle(teams.filter((t) => !isStrongTeam(t.name)));

  const owner = new Map<string, string>(); // teamId -> playerId
  const twoTeamCount = Math.min(Math.max(teams.length - shuffledPlayers.length, 0), shuffledPlayers.length);

  let si = 0;
  let wi = 0;
  // Two-team players: one strong + one weak.
  for (let i = 0; i < twoTeamCount; i++) {
    if (si < strong.length) owner.set(strong[si++].id, shuffledPlayers[i].id);
    if (wi < weak.length) owner.set(weak[wi++].id, shuffledPlayers[i].id);
  }
  // One-team players: a single team from whatever's left.
  const leftover = shuffle([...strong.slice(si), ...weak.slice(wi)]);
  let li = 0;
  for (let i = twoTeamCount; i < shuffledPlayers.length; i++) {
    if (li < leftover.length) owner.set(leftover[li++].id, shuffledPlayers[i].id);
  }
  // Safety net: any team still unassigned (uneven counts) → round-robin.
  let rr = 0;
  for (const t of teams) {
    if (!owner.has(t.id)) owner.set(t.id, shuffledPlayers[rr++ % shuffledPlayers.length].id);
  }

  await prisma.$transaction([
    prisma.extraTeam.deleteMany({}),
    prisma.team.updateMany({ data: { ownerId: null } }),
    ...teams.map((t) =>
      prisma.team.update({ where: { id: t.id }, data: { ownerId: owner.get(t.id) ?? null } }),
    ),
    prisma.setting.update({ where: { id: 1 }, data: { drawCompletedAt: new Date() } }),
  ]);

  // The pot draw balances team strength but still leaves single-team players on
  // one team. Top everyone up to two so the leaderboard is fair by count too.
  await ensureSecondTeams();

  return { players: players.length, teams: teams.length };
}

export async function resetDraw() {
  await prisma.$transaction([
    prisma.extraTeam.deleteMany({}),
    prisma.team.updateMany({ data: { ownerId: null } }),
    prisma.setting.update({ where: { id: 1 }, data: { drawCompletedAt: null } }),
  ]);
}

// Idempotent: ensure every player holds at least two teams. Players who only
// drew one get topped up with a random co-owned "second team" (any team they
// don't already hold — eliminated or not, it's a fair random draw). Once a
// player has two teams this is a no-op, so it's safe to run on every sync.
export async function ensureSecondTeams(target = 2) {
  // Only meaningful once the draw has happened — before that no one owns a
  // team, and topping up would hand out teams that the draw is about to assign.
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting?.drawCompletedAt) return { assigned: 0 };

  const players = await prisma.player.findMany({
    include: { teams: { select: { id: true } }, extraTeams: { select: { teamId: true } } },
  });
  const allTeamIds = (await prisma.team.findMany({ select: { id: true } })).map((t) => t.id);
  if (allTeamIds.length < target) return { assigned: 0 };

  const toCreate: { playerId: string; teamId: string }[] = [];
  for (const p of players) {
    const held = new Set<string>([
      ...p.teams.map((t) => t.id),
      ...p.extraTeams.map((e) => e.teamId),
    ]);
    while (held.size < target) {
      const pool = allTeamIds.filter((id) => !held.has(id));
      if (pool.length === 0) break;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      held.add(pick);
      toCreate.push({ playerId: p.id, teamId: pick });
    }
  }

  if (toCreate.length) await prisma.extraTeam.createMany({ data: toCreate });
  return { assigned: toCreate.length };
}
