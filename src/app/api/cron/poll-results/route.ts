import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { ensureSettings, getScoring } from "@/lib/settings";
import { syncFixtures } from "@/lib/tournament-sync";
import { syncFromOpenfootball } from "@/lib/openfootball-fallback";
import { recomputeAllScores } from "@/lib/score-engine";
import { resultMessage, postToSlack } from "@/lib/slack";

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
  const AFTER = 200 * 60 * 1000; // keep polling ~3h20 after (covers ET + delays)
  const inWindow = (k: Date) => {
    const t = k.getTime();
    return t - BEFORE <= now && now <= t + AFTER;
  };

  const windowFixtures = fixtures.filter((f) => !f.finished && inWindow(f.kickoff));
  if (!force && windowFixtures.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no live window", apiCalls: 0 });
  }

  // One call returns the whole tournament; the window gate above means we only
  // hit the API when a match is actually live or recently finished.
  try {
    await syncFixtures();
  } catch (e) {
    console.warn("[poll] football-data failed; trying openfootball fallback:", e);
    await syncFromOpenfootball().catch((e2) => console.warn("[poll] fallback failed:", e2));
  }

  await recomputeAllScores(await getScoring());

  // Post any newly-finished results.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
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
    const mp = new URLSearchParams({
      home: f.homeTeam.name,
      away: f.awayTeam.name,
      hg: String(f.homeGoals ?? 0),
      ag: String(f.awayGoals ?? 0),
      round: f.round,
      ho: f.homeTeam.owner?.name ?? "",
      ao: f.awayTeam.owner?.name ?? "",
    });
    const ok = await postToSlack(
      resultMessage({
        finished: true,
        statusLabel: "FULL TIME",
        round: f.round,
        base,
        imageUrl: base ? `${base}/api/og/match?${mp.toString()}` : undefined,
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
