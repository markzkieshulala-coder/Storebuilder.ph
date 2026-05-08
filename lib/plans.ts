/**
 * Centralized plan limits and feature flags.
 * Single source of truth for what each plan can do.
 */

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type PlanFeatures = {
  tier: PlanTier;
  label: string;
  tagline: string;
  monthlyPriceCentavos: number;
  yearlyPriceCentavos: number;
  // Limits
  maxWebsitesPerMonth: number;
  // Feature flags
  canShareTemplates: boolean;
  canAddPaymentLinks: boolean;
  canGenerateCRM: boolean;
  canUseCustomDomain: boolean;
  canRemoveBranding: boolean;
  hasApiAccess: boolean;
};

export const PLANS: Record<PlanTier, PlanFeatures> = {
  FREE: {
    tier: "FREE",
    label: "Free",
    tagline: "Best for landing pages & personal portfolios",
    monthlyPriceCentavos: 0,
    yearlyPriceCentavos: 0,
    maxWebsitesPerMonth: 5,
    canShareTemplates: false,
    canAddPaymentLinks: false,
    canGenerateCRM: false,
    canUseCustomDomain: false,
    canRemoveBranding: false,
    hasApiAccess: false,
  },
  PRO: {
    tier: "PRO",
    label: "Pro",
    tagline: "Best for online sellers & freelancers",
    monthlyPriceCentavos: 69900,
    yearlyPriceCentavos: 599900,
    maxWebsitesPerMonth: 10,
    canShareTemplates: true,
    canAddPaymentLinks: true,
    canGenerateCRM: false,
    canUseCustomDomain: true,
    canRemoveBranding: true,
    hasApiAccess: true,
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    label: "Enterprise",
    tagline: "For business owners needing advanced systems",
    monthlyPriceCentavos: 99900,
    yearlyPriceCentavos: 899900,
    maxWebsitesPerMonth: 20,
    canShareTemplates: true,
    canAddPaymentLinks: true,
    canGenerateCRM: true,
    canUseCustomDomain: true,
    canRemoveBranding: true,
    hasApiAccess: true,
  },
};

export function getPlan(tier: PlanTier | string | null | undefined): PlanFeatures {
  if (!tier) return PLANS.FREE;
  if (tier === "ENTERPRISE") return PLANS.ENTERPRISE;
  if (tier === "PRO") return PLANS.PRO;
  return PLANS.FREE;
}

export function pesos(centavos: number): string {
  return "₱" + (centavos / 100).toLocaleString("en-PH");
}
