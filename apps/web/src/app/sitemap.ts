import type { MetadataRoute } from "next";

const siteUrl = "https://app.rohitcode.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
