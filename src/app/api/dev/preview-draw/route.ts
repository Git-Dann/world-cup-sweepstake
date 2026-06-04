import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronSecret } from "@/lib/cron-auth";
import { drawMessage, postToSlack } from "@/lib/slack";
import { flagEmojiForTeam } from "@/lib/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Posts a SAMPLE draw announcement to Slack (in-memory random allocation, NOT saved)
// so the format can be previewed before the real draw is run in /admin.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const teams = await prisma.team.findMany({ select: { name: true } });
  if (players.length === 0 || teams.length === 0) {
    return NextResponse.json({ error: "need players and teams first" }, { status: 400 });
  }

  // Fisher–Yates shuffle + round-robin deal, in memory only (nothing persisted).
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const byPlayer: Record<string, { name: string; emoji: string }[]> = {};
  players.forEach((p) => (byPlayer[p.id] = []));
  shuffled.forEach((t, idx) => {
    const p = players[idx % players.length];
    byPlayer[p.id].push({ name: t.name, emoji: flagEmojiForTeam(t.name) });
  });

  const posted = await postToSlack(
    drawMessage({
      base: process.env.NEXT_PUBLIC_APP_URL ?? "",
      players: players.map((p) => ({ name: p.name, teams: byPlayer[p.id] })),
    }),
  );

  return NextResponse.json({
    ok: true,
    posted,
    players: players.length,
    teams: teams.length,
    note: "SAMPLE preview only — not saved. Run the real draw in /admin.",
  });
}

export const GET = handle;
export const POST = handle;
