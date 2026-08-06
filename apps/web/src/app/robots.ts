import type { MetadataRoute } from "next";

const siteUrl = "https://app.rohitcode.tech";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/calendar",
          "/canvas",
          "/co-space",
          "/dashboard",
          "/expenses",
          "/focus",
          "/goals",
          "/habits",
          "/inbox",
          "/journal",
          "/notes",
          "/projects",
          "/settings",
          "/tasks",
          "/today",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
