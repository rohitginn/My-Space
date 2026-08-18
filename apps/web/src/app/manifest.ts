import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MySpace",
    short_name: "MySpace",
    description: "A personal productivity and collaboration workspace for planning, focus, and meaningful work.",
    start_url: "/",
    display: "standalone",
    background_color: "#171713",
    theme_color: "#171713",
    icons: [
      {
        src: "/images/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
