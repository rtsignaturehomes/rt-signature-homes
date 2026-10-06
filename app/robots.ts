import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.rtsignaturehomes.com/sitemap.xml",
    host: "https://www.rtsignaturehomes.com",
  };
}
