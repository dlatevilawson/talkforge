import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon — official TalkForge gold mark on light ground. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F8FA",
        }}
      >
        <svg
          width="40"
          height="58"
          viewBox="200 40 400 580"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F7E3B0" />
              <stop offset="30%" stopColor="#E8C173" />
              <stop offset="55%" stopColor="#C99B4A" />
              <stop offset="78%" stopColor="#EBC77E" />
              <stop offset="100%" stopColor="#B98634" />
            </linearGradient>
            <mask id="h">
              <rect x="200" y="40" width="400" height="580" fill="#fff" />
              <circle cx="400" cy="330" r="38" fill="#000" />
            </mask>
          </defs>
          <g mask="url(#h)" fill="url(#g)">
            <path d="M394 56 C 386 180 328 276 240 328 C 328 382 386 478 394 604 Z" />
            <path d="M406 56 C 414 180 472 276 560 328 C 472 382 414 478 406 604 Z" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
