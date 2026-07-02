import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { ensureSettings, getScoring } from "@/lib/settings";
import { syncAll, syncResultsWithFallbacks } from "@/lib/tournament-sync";
import { recomputeAllScores } from "@/lib/score-engine";
import { ensureSecondTeams } from "@/lib/draw";
import { getLeaderboard } from "@/lib/leaderboard";
import { fixturesPreviewMessage, leaderboardMessage, postToSlack } from "@/lib/slack";
import { londonDate, londonTime, londonDateLabel } from "@/lib/dates";
import { appBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Runs once daily (Vercel Cron — allowed on Hobby). Full refresh of teams,
// groups, fixtures + a recompute, then posts the day's fixture preview and the
// current standings to Slack.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await ensureSettings();
  let synced: Record<string, unknown>;
  try {
    synced = await syncAll();
  } catch (e) {
    console.warn("[daily-sync] full sync failed; falling back to results-only:", e);
    synced = { fallbackSource: await syncResultsWithFallbacks() };
  }
  await ensureSecondTeams();
  await recomputeAllScores(await getScoring());

  const base = appBaseUrl();
  const today = londonDate(new Date());

  // Today's fixtures preview
  const fixtures = await prisma.fixture.findMany({
    include: {
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
    orderBy: { kickoff: "asc" },
  });
  const todays = fixtures.filter((f) => londonDate(f.kickoff) === today);
  if (todays.length > 0) {
    await postToSlack(
      fixturesPreviewMessage({
        dateLabel: londonDateLabel(new Date()),
        base,
        matches: todays.map((f) => {
          const owners = [f.homeTeam?.owner?.name, f.awayTeam?.owner?.name].filter(Boolean);
          return {
            time: londonTime(f.kickoff),
            home: f.homeTeam?.name ?? "TBD",
            away: f.awayTeam?.name ?? "TBD",
            owners: owners.length ? owners.join(" v ") : undefined,
          };
        }),
      }),
    );
  }

  // Current standings (only once the draw has happened — otherwise no owners)
  if (settings.drawCompletedAt) {
    const rows = await getLeaderboard();
    if (rows.length > 0) {
      await postToSlack(
        leaderboardMessage({
          base,
          top: rows.slice(0, 5).map((r) => ({ rank: r.rank, name: r.name, total: r.total })),
          imageUrl: base ? `${base}/api/og/leaderboard?ts=${Date.now()}` : undefined,
        }),
      );
    }
  }

  return NextResponse.json({ ok: true, ...synced, todaysMatches: todays.length });
}

export const GET = handle;
export const POST = handle;
