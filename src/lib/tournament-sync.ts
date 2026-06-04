import { prisma } from "@/lib/prisma";
import {
  fetchTeams,
  fetchStandings,
  fetchFixtures,
  FINISHED_STATUSES,
} from "@/lib/api-football";
import { ensureSettings } from "@/lib/settings";

// Upsert the 48 teams (name, code, badge URL) and assign group letters from standings.
export async function syncTeamsAndGroups(leagueId: number, season: number) {
  const teams = await fetchTeams(leagueId, season);
  for (const t of teams) {
    await prisma.team.upsert({
      where: { apiId: t.team.id },
      update: { name: t.team.name, code: t.team.code, logoUrl: t.team.logo },
      create: {
        apiId: t.team.id,
        name: t.team.name,
        code: t.team.code,
        logoUrl: t.team.logo,
      },
    });
  }

  // Group letters come from the standings endpoint (populated once groups are drawn).
  const standings = await fetchStandings(leagueId, season).catch(() => []);
  const groups = standings[0]?.league?.standings ?? [];
  for (const group of groups) {
    for (const row of group) {
      await prisma.team.updateMany({
        where: { apiId: row.team.id },
        data: { groupName: row.group?.replace(/^Group\s+/i, "") ?? null },
      });
    }
  }

  return teams.length;
}

// Upsert fixtures (optionally filtered, e.g. by date for the poller).
export async function syncFixtures(
  leagueId: number,
  season: number,
  extra: Record<string, string | number> = {},
) {
  const fixtures = await fetchFixtures(leagueId, season, extra);
  const teams = await prisma.team.findMany({ select: { id: true, apiId: true } });
  const byApi = new Map(teams.map((t) => [t.apiId, t.id]));

  let count = 0;
  for (const f of fixtures) {
    const homeId = byApi.get(f.teams.home.id) ?? null;
    const awayId = byApi.get(f.teams.away.id) ?? null;
    const winnerApiId = f.teams.home.winner
      ? f.teams.home.id
      : f.teams.away.winner
        ? f.teams.away.id
        : null;
    const finished = FINISHED_STATUSES.has(f.fixture.status.short);

    const data = {
      kickoff: new Date(f.fixture.date),
      status: f.fixture.status.short,
      round: f.league.round,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
      winnerTeamApiId: winnerApiId,
      finished,
    };

    await prisma.fixture.upsert({
      where: { apiId: f.fixture.id },
      update: data,
      create: { apiId: f.fixture.id, ...data },
    });
    count++;
  }

  return count;
}

// Full sync: teams + groups, then fixtures. Used by the seed route.
export async function syncAll(leagueId: number, season: number) {
  await ensureSettings();
  const teams = await syncTeamsAndGroups(leagueId, season);
  const fixtures = await syncFixtures(leagueId, season);
  return { teams, fixtures };
}
