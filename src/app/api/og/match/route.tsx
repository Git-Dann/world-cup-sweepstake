import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOLD = "#f5c518";
const RAINBOW = "linear-gradient(90deg,#ff4d4d,#ffb020,#28c76f,#2f7bff,#9b5cff)";

// Scoreboard-style result graphic, driven entirely by query params so it renders
// without a DB and can be referenced by a public URL in Slack.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const home = q.get("home") ?? "Home";
  const away = q.get("away") ?? "Away";
  const hg = q.get("hg") ?? "0";
  const ag = q.get("ag") ?? "0";
  const round = q.get("round") ?? "";
  const ho = q.get("ho") ?? "";
  const ao = q.get("ao") ?? "";
  const status = q.get("status") ?? "FULL TIME";

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
          fontFamily: "sans-serif",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              background: GOLD,
              color: "#0b1020",
              fontWeight: 800,
              fontSize: 24,
              padding: "6px 20px",
              borderRadius: 999,
            }}
          >
            ⚽ {status}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8b95b5" }}>{round}</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 330 }}>
            <div style={{ display: "flex", fontSize: 50, fontWeight: 800, lineHeight: 1.05 }}>{home}</div>
            {ho ? <div style={{ display: "flex", fontSize: 22, color: "#8b95b5", marginTop: 10 }}>{ho}</div> : <div style={{ display: "flex" }} />}
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 92, fontWeight: 900, color: GOLD }}>
            <span style={{ display: "flex" }}>{hg}</span>
            <span style={{ display: "flex", color: "#3a4567", margin: "0 16px" }}>–</span>
            <span style={{ display: "flex" }}>{ag}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 330, alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 50, fontWeight: 800, lineHeight: 1.05, textAlign: "right" }}>{away}</div>
            {ao ? <div style={{ display: "flex", fontSize: 22, color: "#8b95b5", marginTop: 10 }}>{ao}</div> : <div style={{ display: "flex" }} />}
          </div>
        </div>

        <div style={{ display: "flex", height: 8, borderRadius: 999, backgroundImage: RAINBOW }} />
      </div>
    ),
    { width: 1000, height: 525 },
  );
}
