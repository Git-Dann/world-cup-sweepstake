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
import { drawMessage, postToSlack } from "@/lib/slack";

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
  await announceDraw();
  refresh();
}

export async function resetDrawAction() {
  await assertAdmin();
  await resetDraw();
  refresh();
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
