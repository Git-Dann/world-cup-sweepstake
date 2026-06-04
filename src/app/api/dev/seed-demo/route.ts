import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron-auth";
import { seedDemo, clearAllData } from "@/lib/demo-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Secret-protected: ?action=seed (default) loads demo data, ?action=clear wipes it.
async function handle(req: NextRequest) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const action = new URL(req.url).searchParams.get("action");
  if (action === "clear") {
    await clearAllData();
    return NextResponse.json({ ok: true, cleared: true });
  }
  const result = await seedDemo();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
