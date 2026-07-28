import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/atlas", "/dashboard", "/prepare", "/voice", "/auth"],
    },
    sitemap: "https://talkforge.io/sitemap.xml",
  };
}
