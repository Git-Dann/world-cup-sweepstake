import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { clearAllData } from "@/lib/demo-seed";
import { syncAll } from "@/lib/tournament-sync";
import { recomputeAllScores } from "@/lib/score-engine";
import { getScoring } from "@/lib/settings";
import { REAL_PLAYERS } from "@/lib/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Go-live: clears demo data, pulls the real WC teams/fixtures, adds the real roster.
// Does NOT run the draw — do that from /admin when ready.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await clearAllData();
  const synced = await syncAll();
  await prisma.player.createMany({ data: REAL_PLAYERS.map((name) => ({ name })) });
  await recomputeAllScores(await getScoring());
  const players = await prisma.player.count();
  return NextResponse.json({
    ok: true,
    ...synced,
    players,
    note: "Real teams + roster loaded. Run the draw from /admin when ready.",
  });
}

export const GET = handle;
export const POST = handle;
