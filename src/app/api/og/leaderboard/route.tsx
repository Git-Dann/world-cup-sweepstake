import { ImageResponse } from "next/og";
import { getLeaderboard } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOLD = "#f5c518";

function rankColor(r: number) {
  if (r === 1) return GOLD;
  if (r === 2) return "#c9d1d9";
  if (r === 3) return "#cd7f32";
  return "#33406b";
}

export async function GET() {
  let rows: { rank: number; name: string; total: number; teamsAlive: number }[] = [];
  try {
    rows = (await getLeaderboard())
      .slice(0, 12)
      .map((r) => ({ rank: r.rank, name: r.name, total: r.total, teamsAlive: r.teamsAlive }));
  } catch {
    rows = [];
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0b1020",
          color: "white",
          padding: 48,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 26 }}>
          <div style={{ display: "flex", fontSize: 22, color: GOLD, letterSpacing: 3 }}>
            WORLD CUP 2026 · OFFICE SWEEPSTAKE
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800 }}>Leaderboard</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontSize: 34, color: "#8b95b5" }}>
            No scores yet — the tournament hasn&apos;t kicked off.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((r) => (
              <div
                key={r.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 20px",
                  marginBottom: 9,
                  background: r.rank % 2 ? "#141a30" : "#11162a",
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    background: rankColor(r.rank),
                    color: "#0b1020",
                    fontSize: 24,
                    fontWeight: 800,
                    marginRight: 22,
                  }}
                >
                  {`${r.rank}`}
                </div>
                <div style={{ display: "flex", flex: 1, fontSize: 32, fontWeight: 600 }}>{r.name}</div>
                <div style={{ display: "flex", fontSize: 16, color: "#8b95b5", marginRight: 20 }}>
                  {`${r.teamsAlive} alive`}
                </div>
                <div style={{ display: "flex", fontSize: 38, fontWeight: 800, color: GOLD, width: 80, justifyContent: "flex-end" }}>
                  {`${r.total}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { width: 1000, height: 720 },
  );
}
