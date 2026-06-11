"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signInAdmin, signOutAdmin, isAdmin } from "@/lib/admin-auth";
import { runDraw, resetDraw } from "@/lib/draw";
import { syncAll } from "@/lib/tournament-sync";
import { seedDemo, clearAllData } from "@/lib/demo-seed";
import { recomputeAllScores } from "@/lib/score-engine";
import { ensureSettings, getScoring } from "@/lib/settings";
import { getLeaderboard } from "@/lib/leaderboard";
import { flagEmojiForTeam } from "@/lib/flags";
import { drawMessage, resultMessage, leaderboardMessage, postToSlack } from "@/lib/slack";
import { appBaseUrl } from "@/lib/base-url";
import { matchCardPath, statusLabelFor } from "@/lib/match-card";

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function signInAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await signInAdmin(password);
  redirect(ok ? "/admin" : "/admin?error=1");
}

export async function signOutAction() {
  await signOutAdmin();
  redirect("/admin");
}

export async function addPlayersAction(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("names") ?? "");
  const names = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length) {
    await prisma.player.createMany({ data: names.map((name) => ({ name })) });
  }
  refresh();
}

export async function removePlayerAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  await prisma.team.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
  await prisma.player.delete({ where: { id } });
  refresh();
}

export async function updatePrizeAction(formData: FormData) {
  await assertAdmin();
  const prizeText = String(formData.get("prizeText") ?? "").trim() || "Bragging rights 🏆";
  await ensureSettings();
  await prisma.setting.update({ where: { id: 1 }, data: { prizeText } });
  revalidatePath("/");
  redirect("/admin?saved=prize");
}

export async function updateBrandingAction(formData: FormData) {
  await assertAdmin();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const bgUrl = String(formData.get("bgUrl") ?? "").trim() || null;
  await ensureSettings();
  await prisma.setting.update({ where: { id: 1 }, data: { logoUrl, bgUrl } });
  revalidatePath("/");
  redirect("/admin?saved=branding");
}

async function announceDraw() {
  const rows = await getLeaderboard();
  await postToSlack(
    drawMessage({
      base: process.env.NEXT_PUBLIC_APP_URL ?? "",
      players: rows.map((r) => ({
        name: r.name,
        teams: r.teams.map((t) => ({ name: t.name, emoji: flagEmojiForTeam(t.name) })),
      })),
    }),
  );
}

export async function runDrawAction() {
  await assertAdmin();
  await runDraw();
  refresh();
}

export async function postDrawAction() {
  await assertAdmin();
  await announceDraw();
  revalidatePath("/");
  redirect("/admin?saved=draw-posted");
}

export async function resetDrawAction() {
  await assertAdmin();
  await resetDraw();
  refresh();
}

// Re-post a finished match's result card to Slack (always with the OG graphic).
// Used to push a corrected score after a re-sync. Goes through the same
// resultMessage path as the live poller so the post looks identical.
export async function repostResultAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("fixtureId") ?? "");
  const f = await prisma.fixture.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
  });
  if (!f || !f.homeTeam || !f.awayTeam) redirect("/admin?error=repost");

  const base = appBaseUrl();
  const ok = await postToSlack(
    resultMessage({
      finished: true,
      statusLabel: statusLabelFor(f),
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
  if (ok) await prisma.fixture.update({ where: { id: f.id }, data: { resultPosted: true } });
  redirect(ok ? "/admin?saved=reposted" : "/admin?error=repost");
}

// Post the current leaderboard (with the live OG graphic) to Slack on demand —
// handy after a score correction. Same message the daily cron sends.
export async function repostLeaderboardAction() {
  await assertAdmin();
  const base = appBaseUrl();
  const rows = await getLeaderboard();
  const ok = await postToSlack(
    leaderboardMessage({
      base,
      top: rows.slice(0, 5).map((r) => ({ rank: r.rank, name: r.name, total: r.total })),
      imageUrl: base ? `${base}/api/og/leaderboard?ts=${Date.now()}` : undefined,
    }),
  );
  redirect(ok ? "/admin?saved=lb-posted" : "/admin?error=lb-post");
}

export async function syncNowAction() {
  await assertAdmin();
  await ensureSettings();
  await syncAll();
  await recomputeAllScores(await getScoring());
  refresh();
}

export async function seedDemoAction() {
  await assertAdmin();
  await seedDemo();
  refresh();
}

export async function clearAllAction() {
  await assertAdmin();
  await clearAllData();
  refresh();
}
