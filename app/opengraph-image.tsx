import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TalkForge — Master the Art of Communication";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#F7F8FA",
          color: "#121417",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              border: "1.5px solid rgba(18,20,23,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            TF
          </div>
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>
            TalkForge
          </div>
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Master the Art of Communication.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            color: "#5A616C",
            maxWidth: 720,
            lineHeight: 1.4,
          }}
        >
          An AI Communication Gym for the conversations that matter.
        </div>
      </div>
    ),
    { ...size }
  );
}
