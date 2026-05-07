// Minimal anchor-to-route normalizer extracted from lib/ai/generate.ts so it
// can be called at render time (for legacy DB records whose hrefs were stored
// as "#about" before normalisation was added to the generation pipeline).

const ANCHOR_ROUTE_MAP: Record<string, string> = {
  home: "/", index: "/", main: "/",
  about: "/about", "about-us": "/about", "our-story": "/about",
  work: "/work", portfolio: "/work", projects: "/work", case: "/work",
  gallery: "/gallery", photos: "/gallery", images: "/gallery",
  menu: "/menu", "our-menu": "/menu",
  shop: "/shop",
  store: "/store",
  products: "/products", "our-products": "/products", catalog: "/products",
  services: "/services", "our-services": "/services", offers: "/services",
  features: "/features",
  process: "/process", "how-it-works": "/process", "how-we-work": "/process",
  pricing: "/pricing", plans: "/pricing",
  team: "/team", staff: "/team", people: "/team",
  faq: "/faq", faqs: "/faq", questions: "/faq",
  contact: "/contact", "contact-us": "/contact", "get-in-touch": "/contact",
  reach: "/contact",
  testimonials: "/testimonials", reviews: "/testimonials",
  blog: "/blog",
};

export function normalizeHref(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  const key = trimmed
    .replace(/^#+/, "")
    .replace(/^scroll-?to[:-]?/i, "")
    .trim()
    .toLowerCase();
  if (!key || key === "/") return "/";
  if (ANCHOR_ROUTE_MAP[key]) return ANCHOR_ROUTE_MAP[key];
  const slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `/${slug}` : "/";
}

export function normalizeNavLinks<T extends { sections: Array<{ type: string; data: Record<string, unknown>; styles: Record<string, string> }> }>(website: T): T {
  return {
    ...website,
    sections: website.sections.map((s) => {
      const d = { ...(s.data || {}) } as any;

      if (s.type === "nav") {
        if (Array.isArray(d.links)) {
          d.links = d.links.map((l: any) => ({
            ...l,
            href: normalizeHref(l?.href ?? l?.label) ?? "/",
          }));
        }
        if (d.ctaHref !== undefined) d.ctaHref = normalizeHref(d.ctaHref) ?? "/contact";
      }

      if (s.type === "footer" && Array.isArray(d.columns)) {
        d.columns = d.columns.map((col: any) => ({
          ...col,
          links: Array.isArray(col?.links)
            ? col.links.map((l: any) => ({ ...l, href: normalizeHref(l?.href ?? l?.label) ?? "/" }))
            : col?.links,
        }));
      }

      if (s.type === "hero" || s.type === "cta") {
        if (d.ctaPrimary?.href !== undefined) d.ctaPrimary.href = normalizeHref(d.ctaPrimary.href) ?? "/";
        if (d.ctaSecondary?.href !== undefined) d.ctaSecondary.href = normalizeHref(d.ctaSecondary.href) ?? "/";
        if (typeof d.ctaHref === "string") d.ctaHref = normalizeHref(d.ctaHref) ?? "/";
      }

      return { ...s, data: d };
    }),
  };
}
