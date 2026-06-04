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

export async function togglePaidAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const player = await prisma.player.findUnique({ where: { id } });
  if (player) await prisma.player.update({ where: { id }, data: { paid: !player.paid } });
  refresh();
}

export async function updatePrizeAction(formData: FormData) {
  await assertAdmin();
  const prizeText = String(formData.get("prizeText") ?? "").trim() || "Bragging rights 🏆";
  const potText = String(formData.get("potText") ?? "").trim() || null;
  await ensureSettings();
  await prisma.setting.update({ where: { id: 1 }, data: { prizeText, potText } });
  refresh();
}

export async function runDrawAction() {
  await assertAdmin();
  await runDraw();
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
