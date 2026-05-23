/**
 * Shape of the legacy `Website.jsonContent` payload.
 * Consumed by checkout and contact routes to read payment/contact settings.
 */

export type GeneratedWebsite = {
  name?: string;
  type?: string;
  seoTitle?: string;
  seoDesc?: string;
  subdomain?: string | null;
  sections?: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
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
};
