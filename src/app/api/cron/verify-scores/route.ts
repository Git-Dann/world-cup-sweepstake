import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron-auth";
import { ensureSettings, getScoring } from "@/lib/settings";
import { syncResultsWithFallbacks } from "@/lib/tournament-sync";
import { recomputeAllScores } from "@/lib/score-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Belt-and-braces verification pass, run every ~30 min by GitHub Actions. Unlike
// the live poller it has NO window gate — it always re-reads the results feed
// (football-data, then the TheSportsDB / openfootball fallbacks) and recomputes,
// so a score that got stuck or was never caught in a live window self-corrects.
// It does NOT post to Slack — the live poller owns announcements; this just keeps
// the stored scores honest.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSettings();
  const source = await syncResultsWithFallbacks();
  await recomputeAllScores(await getScoring());

  return NextResponse.json({ ok: true, verified: true, source });
}

export const GET = handle;
export const POST = handle;
