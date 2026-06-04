import { prisma } from "@/lib/prisma";
import { DEMO_TEAMS, DEMO_PLAYERS, flagUrl } from "@/lib/demo-data";
import { ensureSettings, getScoring } from "@/lib/settings";
import { runDraw } from "@/lib/draw";
import { recomputeAllScores } from "@/lib/score-engine";

// Wipes all teams/players/fixtures/scores. Run before going live with real data.
export async function clearAllData() {
  await prisma.scoreEvent.deleteMany({});
  await prisma.fixture.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.player.deleteMany({});
  await ensureSettings();
  await prisma.setting.update({ where: { id: 1 }, data: { drawCompletedAt: null } });
}

// Populates a realistic-looking tournament so the presentation can be previewed.
// Demo apiIds start at 900001 so they never collide with real football-data ids.
export async function seedDemo() {
  await ensureSettings();
  await clearAllData();

  let apiId = 900001;
  const teams: { id: string; apiId: number; groupName: string | null }[] = [];
  for (const t of DEMO_TEAMS) {
    teams.push(
      await prisma.team.create({
        data: {
          apiId: apiId++,
          name: t.name,
          code: t.code,
          groupName: t.group,
          logoUrl: flagUrl(t.iso2),
        },
      }),
    );
  }

  for (const name of DEMO_PLAYERS) {
    await prisma.player.create({ data: { name, paid: Math.random() > 0.4 } });
  }

  await runDraw();

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  let fId = 950001;

  // Group fixtures (round-robin) with random finished results.
  const byGroup: Record<string, typeof teams> = {};
  for (const t of teams) (byGroup[t.groupName ?? "?"] ??= []).push(t);
  for (const g of Object.keys(byGroup)) {
    const gt = byGroup[g];
    for (let i = 0; i < gt.length; i++) {
      for (let j = i + 1; j < gt.length; j++) {
        const hg = Math.floor(Math.random() * 4);
        const ag = Math.floor(Math.random() * 4);
        await prisma.fixture.create({
          data: {
            apiId: fId++,
            kickoff: daysAgo(6),
            status: "FINISHED",
            round: "Group Stage",
            homeTeamId: gt[i].id,
            awayTeamId: gt[j].id,
            homeGoals: hg,
            awayGoals: ag,
            winnerTeamApiId: hg > ag ? gt[i].apiId : ag > hg ? gt[j].apiId : null,
            finished: true,
          },
        });
      }
    }
  }

  // A few quarter-final fixtures — some played, some upcoming — to show round bonuses.
  const ko = teams.slice(0, 8);
  for (let i = 0; i + 1 < ko.length; i += 2) {
    const finished = i < 4;
    const hg = Math.floor(Math.random() * 3) + 1;
    const ag = Math.floor(Math.random() * 2);
    await prisma.fixture.create({
      data: {
        apiId: fId++,
        kickoff: finished ? daysAgo(2) : daysAgo(-2),
        status: finished ? "FINISHED" : "TIMED",
        round: "Quarter-finals",
        homeTeamId: ko[i].id,
        awayTeamId: ko[i + 1].id,
        homeGoals: finished ? hg : null,
        awayGoals: finished ? ag : null,
        winnerTeamApiId: finished ? (hg > ag ? ko[i].apiId : ko[i + 1].apiId) : null,
        finished,
      },
    });
  }

  await recomputeAllScores(await getScoring());
  return { teams: teams.length, players: DEMO_PLAYERS.length };
}
