import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { ensureSettings, getScoring } from "@/lib/settings";
import { syncResultsWithFallbacks } from "@/lib/tournament-sync";
import { recomputeAllScores } from "@/lib/score-engine";
import { ensureSecondTeams } from "@/lib/draw";
import { resultMessage, postToSlack } from "@/lib/slack";
import { appBaseUrl } from "@/lib/base-url";
import { matchCardPath, statusLabelFor } from "@/lib/match-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called every ~15 min by GitHub Actions. Only hits API-Football when a match
// is actually in its live window — otherwise it returns immediately (0 API calls).
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSettings();
  const force = new URL(req.url).searchParams.get("force") === "1";

  const fixtures = await prisma.fixture.findMany({
    select: { kickoff: true, finished: true },
  });
  if (fixtures.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "no fixtures synced yet — run daily-sync first",
    });
  }

  const now = Date.now();
  const BEFORE = 20 * 60 * 1000; // start 20 min before kick-off
  const LIVE_AFTER = 200 * 60 * 1000; // near-live polling ~3h20 after (covers ET + delays)
  // Keep re-checking already-finished fixtures for a day after kick-off. A feed
  // can flip a match to FINISHED with a stale/early score (or the lagging no-key
  // fallback writes one), so we must keep re-reading until the result settles —
  // otherwise a wrong score freezes forever once the match leaves the live window.
  const VERIFY_AFTER = 24 * 60 * 60 * 1000;
  const within = (k: Date, after: number) => {
    const t = k.getTime();
    return t - BEFORE <= now && now <= t + after;
  };

  // Poll a fixture while it's live/upcoming, OR while it's freshly finished and
  // still in the verification tail (so a corrected result flows through).
  const windowFixtures = fixtures.filter((f) =>
    f.finished ? within(f.kickoff, VERIFY_AFTER) : within(f.kickoff, LIVE_AFTER),
  );
  if (!force && windowFixtures.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no live window", apiCalls: 0 });
  }

  // One call returns the whole tournament; the window gate above means we only
  // hit the feed when a match is actually live or recently finished. Falls back
  // through TheSportsDB and openfootball if football-data is unavailable.
  await syncResultsWithFallbacks();

  await ensureSecondTeams();
  await recomputeAllScores(await getScoring());

  // Post any newly-finished results.
  const base = appBaseUrl();
  const toPost = await prisma.fixture.findMany({
    where: { finished: true, resultPosted: false },
    include: {
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
    orderBy: { kickoff: "asc" },
  });

  let posted = 0;
  for (const f of toPost) {
    if (!f.homeTeam || !f.awayTeam) {
      await prisma.fixture.update({ where: { id: f.id }, data: { resultPosted: true } });
      continue;
    }
    const statusLabel = statusLabelFor(f);
    const ok = await postToSlack(
      resultMessage({
        finished: true,
        statusLabel,
        round: f.round,
        base,
        imageUrl: base ? `${base}${matchCardPath(f)}` : undefined,
        home: {
          name: f.homeTeam.name,
          logo: f.homeTeam.logoUrl,
          goals: f.homeGoals,
          owner: f.homeTeam.owner?.name ?? null,
          points: f.homeTeam.points,
        },
        away: {
          name: f.awayTeam.name,
          logo: f.awayTeam.logoUrl,
          goals: f.awayGoals,
          owner: f.awayTeam.owner?.name ?? null,
          points: f.awayTeam.points,
        },
      }),
    );
    if (ok) {
      await prisma.fixture.update({ where: { id: f.id }, data: { resultPosted: true } });
      posted++;
    }
  }

  return NextResponse.json({ ok: true, synced: true, finishedPosted: posted });
}

export const GET = handle;
export const POST = handle;
