import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TalkForge — Communication changes lives. Master yours.";
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
          alignItems: "center",
          padding: "72px",
          background: "#F4F5F7",
          color: "#121417",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: "#121417",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F4F5F7",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          △
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.08,
            maxWidth: 960,
          }}
        >
          Communication changes lives.
          <br />
          Master yours.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "#5C6370",
            maxWidth: 720,
            lineHeight: 1.4,
          }}
        >
          Nobody is born a great communicator. Every great communicator is forged.
        </div>
      </div>
    ),
    { ...size }
  );
}
