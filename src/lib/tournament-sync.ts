import { prisma } from "@/lib/prisma";
import {
  fetchTeams,
  fetchStandings,
  fetchMatches,
  FD_FINISHED,
  stageToRoundLabel,
} from "@/lib/football-data";
import { ensureSettings } from "@/lib/settings";
import { flagUrlForTeam } from "@/lib/flags";

// Upsert the teams (name, code, crest) and assign group letters from standings.
export async function syncTeamsAndGroups() {
  const teams = await fetchTeams();
  for (const t of teams) {
    await prisma.team.upsert({
      where: { apiId: t.id },
      update: { name: t.name, code: t.tla, logoUrl: t.crest, flagUrl: flagUrlForTeam(t.name) },
      create: { apiId: t.id, name: t.name, code: t.tla, logoUrl: t.crest, flagUrl: flagUrlForTeam(t.name) },
    });
  }

  // Group letters come from the standings endpoint (each group is one table).
  const standings = await fetchStandings().catch(() => null);
  const groupTables = standings?.standings?.filter((s) => s.group) ?? [];
  for (const gt of groupTables) {
    const letter = gt.group?.replace(/^GROUP_/i, "") ?? null;
    for (const row of gt.table) {
      await prisma.team.updateMany({
        where: { apiId: row.team.id },
        data: { groupName: letter },
      });
    }
  }

  return teams.length;
}

// Upsert all matches (one call returns the whole tournament).
export async function syncFixtures() {
  const matches = await fetchMatches();
  const teams = await prisma.team.findMany({ select: { id: true, apiId: true } });
  const byApi = new Map(teams.map((t) => [t.apiId, t.id]));

  let count = 0;
  for (const m of matches) {
    const homeApi = m.homeTeam?.id ?? null;
    const awayApi = m.awayTeam?.id ?? null;
    const winnerApiId =
      m.score.winner === "HOME_TEAM"
        ? homeApi
        : m.score.winner === "AWAY_TEAM"
          ? awayApi
          : null;

    const data = {
      kickoff: new Date(m.utcDate),
      status: m.status,
      round: stageToRoundLabel(m.stage),
      homeTeamId: homeApi ? (byApi.get(homeApi) ?? null) : null,
      awayTeamId: awayApi ? (byApi.get(awayApi) ?? null) : null,
      homeGoals: m.score.fullTime.home,
      awayGoals: m.score.fullTime.away,
      winnerTeamApiId: winnerApiId,
      finished: FD_FINISHED.has(m.status),
    };

    await prisma.fixture.upsert({
      where: { apiId: m.id },
      update: data,
      create: { apiId: m.id, ...data },
    });
    count++;
  }

  return count;
}

// Full sync: teams + groups, then fixtures. Used by the daily cron + admin "Sync now".
export async function syncAll() {
  await ensureSettings();
  const teams = await syncTeamsAndGroups();
  const fixtures = await syncFixtures();
  return { teams, fixtures };
}
