import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

/** Signed-in, onboarding and auth-verify routes are private; they also carry noindex. */
const privatePaths = ["/design", "/home", "/start", "/connect", "/found", "/add", "/verify"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: privatePaths },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
