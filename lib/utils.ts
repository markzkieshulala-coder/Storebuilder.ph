import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

export function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

// Convert USD cost to PHP
export function usdToPhp(usd: number): number {
  const rate = parseFloat(process.env.USD_TO_PHP_RATE ?? "57.5");
  return usd * rate;
}

// Token cost calculation
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { usd: number; php: number } {
  let inputCostPer1M = 0;
  let outputCostPer1M = 0;

  if (model.includes("haiku")) {
    inputCostPer1M = 0.25; // $0.25 per 1M input tokens
    outputCostPer1M = 1.25; // $1.25 per 1M output tokens
  } else if (model.includes("sonnet")) {
    inputCostPer1M = 3.0; // $3.00 per 1M input tokens
    outputCostPer1M = 15.0; // $15.00 per 1M output tokens
  }

  const costUsd =
    (inputTokens / 1_000_000) * inputCostPer1M +
    (outputTokens / 1_000_000) * outputCostPer1M;

  return {
    usd: costUsd,
    php: usdToPhp(costUsd),
  };
}

export function timeUntilReset(resetAt: Date): string {
  const now = new Date();
  const diff = resetAt.getTime() - now.getTime();

  if (diff <= 0) return "Reset now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
