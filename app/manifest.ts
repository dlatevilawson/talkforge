import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TalkForge",
    short_name: "TalkForge",
    description:
      "Every life is shaped by conversations. Practice the ones that matter.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#121417",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
