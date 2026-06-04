import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron-auth";
import { syncAll } from "@/lib/tournament-sync";
import { recomputeAllScores } from "@/lib/score-engine";
import { getScoring } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Re-sync teams/fixtures in place (refreshes crests, flags, groups, results)
// WITHOUT clearing players or the draw, and without posting to Slack.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const synced = await syncAll();
  await recomputeAllScores(await getScoring());
  return NextResponse.json({ ok: true, ...synced });
}

export const GET = handle;
export const POST = handle;
