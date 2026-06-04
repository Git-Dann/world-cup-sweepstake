import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { resultMessage, leaderboardMessage, fixturesPreviewMessage, postToSlack } from "@/lib/slack";
import { getLeaderboard } from "@/lib/leaderboard";
import { londonTime } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Posts a sample of every Slack message type (clearly marked TEST) using the real
// builders + image URLs, and returns a system-health snapshot. Validation in one call.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const [teams, fixtures, withFlags, withCrests, owned, finished, settings] = await Promise.all([
    prisma.team.count(),
    prisma.fixture.count(),
    prisma.team.count({ where: { flagUrl: { not: null } } }),
    prisma.team.count({ where: { logoUrl: { not: null } } }),
    prisma.team.count({ where: { ownerId: { not: null } } }),
    prisma.fixture.count({ where: { finished: true } }),
    prisma.setting.findUnique({ where: { id: 1 } }),
  ]);

  // 1) Sample match result — two real teams, fake 2–1, with the flag scoreboard image.
  const sample = await prisma.team.findMany({
    take: 2,
    orderBy: { name: "asc" },
    include: { owner: true },
  });
  let result = false;
  if (sample.length === 2) {
    const [h, a] = sample;
    const mp = new URLSearchParams({
      home: h.name,
      away: a.name,
      hg: "2",
      ag: "1",
      round: "Sample · Group Stage",
      ho: h.owner?.name ?? "",
      ao: a.owner?.name ?? "",
      hf: h.flagUrl ?? "",
      af: a.flagUrl ?? "",
      status: "FULL TIME · TEST",
    });
    result = await postToSlack(
      resultMessage({
        finished: true,
        statusLabel: "FULL TIME · TEST",
        round: "Sample · Group Stage",
        base,
        imageUrl: base ? `${base}/api/og/match?${mp.toString()}` : undefined,
        home: { name: h.name, logo: h.logoUrl, goals: 2, owner: h.owner?.name ?? null, points: h.points },
        away: { name: a.name, logo: a.logoUrl, goals: 1, owner: a.owner?.name ?? null, points: a.points },
      }),
    );
  }

  // 2) Standings (leaderboard image).
  const rows = await getLeaderboard();
  const leaderboard = await postToSlack(
    leaderboardMessage({
      base,
      title: "🏆 Leaderboard · TEST",
      top: rows.slice(0, 5).map((r) => ({ rank: r.rank, name: r.name, total: r.total })),
      imageUrl: base ? `${base}/api/og/leaderboard?ts=test` : undefined,
    }),
  );

  // 3) Fixtures preview (next 5 real fixtures).
  const next = await prisma.fixture.findMany({
    where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
    take: 5,
  });
  const preview = await postToSlack(
    fixturesPreviewMessage({
      dateLabel: "Sample fixtures · TEST",
      matches: next.map((f) => ({
        time: londonTime(f.kickoff),
        home: f.homeTeam?.name ?? "TBD",
        away: f.awayTeam?.name ?? "TBD",
      })),
    }),
  );

  return NextResponse.json({
    ok: true,
    validation: {
      baseUrl: base || "(MISSING — Slack images will break!)",
      teams,
      fixtures,
      teamsWithFlags: withFlags,
      teamsWithCrests: withCrests,
      teamsOwned: owned,
      finishedFixtures: finished,
      drawDone: !!settings?.drawCompletedAt,
      prize: settings?.prizeText,
    },
    slackPosted: { result, leaderboard, preview },
  });
}

export const GET = handle;
export const POST = handle;
