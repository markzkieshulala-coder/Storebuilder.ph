import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://storebuilder.ph";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/upgrade`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/auth/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/auth/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
