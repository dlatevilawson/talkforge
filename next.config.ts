import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app/history", permanent: false },
      { source: "/history", destination: "/app/history", permanent: false },
      { source: "/voice", destination: "/app/practice", permanent: false },
      { source: "/app/forge", destination: "/app/practice", permanent: false },
      { source: "/app/arena", destination: "/app/practice", permanent: false },
      { source: "/progress", destination: "/app/progress", permanent: false },
      { source: "/profile", destination: "/app/profile", permanent: false },
      { source: "/prepare", destination: "/app", permanent: false },
      { source: "/training", destination: "/app", permanent: false },
      { source: "/auth", destination: "/login", permanent: false },
      { source: "/welcome", destination: "/signup", permanent: false },
      { source: "/atlas", destination: "/founder/atlas", permanent: false },
      { source: "/interview", destination: "/app", permanent: false },
      { source: "/small-talk", destination: "/app", permanent: false },
      { source: "/leadership", destination: "/app", permanent: false },
      { source: "/negotiation", destination: "/app", permanent: false },
      { source: "/storytelling", destination: "/app", permanent: false },
      {
        source: "/difficult-conversations",
        destination: "/app",
        permanent: false,
      },
      { source: "/app/prepare", destination: "/app", permanent: false },
      { source: "/app/training", destination: "/app", permanent: false },
      { source: "/app/interview", destination: "/app", permanent: false },
      { source: "/app/small-talk", destination: "/app", permanent: false },
      { source: "/app/leadership", destination: "/app", permanent: false },
      { source: "/app/negotiation", destination: "/app", permanent: false },
      { source: "/app/storytelling", destination: "/app", permanent: false },
      {
        source: "/app/difficult-conversations",
        destination: "/app",
        permanent: false,
      },
      { source: "/reflect/:id", destination: "/app/reflect/:id", permanent: false },
      { source: "/reality/:id", destination: "/app/reality/:id", permanent: false },
    ];
  },
};

export default nextConfig;
