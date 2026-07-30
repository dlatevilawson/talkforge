import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app/",
        "/founder/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/auth/",
        "/logout",
        "/onboarding",
        "/change-password",
      ],
    },
    sitemap: "https://talkforge.io/sitemap.xml",
  };
}
