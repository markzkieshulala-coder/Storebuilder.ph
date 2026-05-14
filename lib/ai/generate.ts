/**
 * Legacy types for the JSON-section editor and renderer.
 *
 * The full website generation logic that used to live here has been REMOVED.
 * All new generations go through Stitch → Claude (lib/ai/stitch-generate.ts).
 *
 * These types are kept ONLY because legacy (pre-Stitch v2) sites stored as
 * jsonContent sections still render through WebsiteRenderer + its section
 * components, and those components import these type definitions. No active
 * code path constructs a GeneratedWebsite from scratch anymore.
 */

export type Section = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles: Record<string, string>;
};

export type GeneratedWebsite = {
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
  fonts: { heading: string; body: string };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  sections: Section[];
  settings?: {
    payments?: {
      gcash?: boolean;
      paymaya?: boolean;
      creditCard?: boolean;
      cod?: boolean;
      bankTransfer?: boolean;
      grabpay?: boolean;
    };
    contact?: { phone?: string; email?: string; address?: string };
  };
  // Injected at runtime for published sites — not stored in JSON
  subdomain?: string;
};
