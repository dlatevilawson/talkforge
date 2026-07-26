import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TalkForge — AI Communication Gym";
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
          background: "#F3F5F7",
          color: "#121417",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 40,
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
            fontSize: 28,
            fontWeight: 500,
            color: "#3D5A73",
            marginBottom: 16,
          }}
        >
          AI Communication Gym
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            maxWidth: 960,
          }}
        >
          Practice the conversations that matter.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "#5A616C",
            maxWidth: 760,
            lineHeight: 1.4,
          }}
        >
          Rehearse with Forge — then walk into the real moment ready.
        </div>
      </div>
    ),
    { ...size }
  );
}
