import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app/dashboard", permanent: false },
      { source: "/voice", destination: "/app/practice", permanent: false },
      { source: "/progress", destination: "/app/progress", permanent: false },
      { source: "/profile", destination: "/app/profile", permanent: false },
      { source: "/prepare", destination: "/app/prepare", permanent: false },
      { source: "/training", destination: "/app/training", permanent: false },
      { source: "/auth", destination: "/login", permanent: false },
      { source: "/welcome", destination: "/signup", permanent: false },
      { source: "/atlas", destination: "/founder/atlas", permanent: false },
      { source: "/interview", destination: "/app/interview", permanent: false },
      { source: "/small-talk", destination: "/app/small-talk", permanent: false },
      { source: "/leadership", destination: "/app/leadership", permanent: false },
      { source: "/negotiation", destination: "/app/negotiation", permanent: false },
      { source: "/storytelling", destination: "/app/storytelling", permanent: false },
      {
        source: "/difficult-conversations",
        destination: "/app/difficult-conversations",
        permanent: false,
      },
      { source: "/reflect/:id", destination: "/app/reflect/:id", permanent: false },
      { source: "/reality/:id", destination: "/app/reality/:id", permanent: false },
    ];
  },
};

export default nextConfig;
