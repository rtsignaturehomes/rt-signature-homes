import { listPaths } from "../lib/content";
import { SITE_URL } from "../lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return listPaths().map((urlPath) => ({
    url: `${SITE_URL}${urlPath}`,
    changeFrequency: urlPath === "/" || urlPath.startsWith("/services") ? "weekly" : "monthly",
    priority: urlPath === "/" ? 1 : urlPath.startsWith("/services/") ? 0.8 : 0.7,
  }));
}
