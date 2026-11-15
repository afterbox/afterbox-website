import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: "/",
    display: "browser",
    background_color: "#f7f5f0",
    theme_color: "#1c2c50",
    icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
