import { prisma } from "@/lib/prisma";
import { mergeScoring, type ScoringConfig } from "@/lib/scoring";

// The Setting row is a singleton (id = 1).
export async function ensureSettings() {
  return prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function getScoring(): Promise<ScoringConfig> {
  const s = await ensureSettings();
  return mergeScoring(s.scoring);
}
