import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/upgrade", "/contact", "/terms"],
        disallow: ["/dashboard", "/editor", "/admin", "/api/", "/preview/"],
      },
    ],
    sitemap: "https://storebuilder.ph/sitemap.xml",
    host: "https://storebuilder.ph",
  };
}
