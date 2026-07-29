import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app/", "/founder/", "/login", "/signup"],
    },
    sitemap: "https://talkforge.io/sitemap.xml",
  };
}
