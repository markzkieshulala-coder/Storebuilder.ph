/**
 * Deterministic Website Compiler
 *
 * 100% local — zero Anthropic API calls, zero cost per generation.
 *
 * Pipeline:
 *   1. parsePrompt()     — static string matching on the user's text
 *   2. buildConfig()     — selects niche design tokens + copy
 *   3. section builders  — stitch HTML from component structures defined in
 *                          system/universal-component-library/
 *   4. compileWebsite()  — wraps sections with CSS variables from globals.css
 *
 * The cheerio post-pass in lib/ai/generate.ts runs after this and applies
 * data-editable attributes so the HtmlEditor bridge works normally.
 */

import { readFileSync } from "fs";
import { join } from "path";

// ─── Load globals.css variable declarations once ──────────────────────────────

const GLOBALS_CSS = readFileSync(
  join(process.cwd(), "lib/ai/native-generator/system/universal-component-library/assets/globals.css"),
  "utf-8"
);

// ─── Public output types (same contract as before) ────────────────────────────

export type NativeGenerationResult = {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
};

export type NativeGenerationUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

// ─── Internal types ───────────────────────────────────────────────────────────

type Niche =
  | "STORE" | "RESTAURANT" | "PORTFOLIO" | "SAAS"
  | "LANDING" | "SALON" | "AGENCY" | "EDUCATION";

interface WebsiteConfig {
  businessName: string;
  niche: Niche;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  fontHeading: string;
  fontBody: string;
  googleFont: string;
  heroLayout: "split" | "centered" | "fullscreen";
  heroImage: string;
  productImages: string[];
  features: Array<{ icon: string; title: string; desc: string }>;
  products: Array<{ name: string; price: string; desc: string; image: string; badge?: string }>;
  testimonials: Array<{ quote: string; name: string; role: string; company: string }>;
  ctaPrimary: string;
  ctaSecondary: string;
  seoTitle: string;
  seoDesc: string;
}

// Pools of hero and product images per niche — randomized per generation so two
// sites in the same niche never look the same. Image IDs are Unsplash photo IDs.
const HERO_IMAGE_POOLS: Record<Niche, string[]> = {
  STORE: [
    "photo-1607082348824-0a96f2a4b9da", "photo-1441986300917-64674bd600d8",
    "photo-1483985988355-763728e1935b", "photo-1556905055-8f358a7a47b2",
    "photo-1573739022854-abceaeb585dc", "photo-1607082350899-7e105aa886ae",
    "photo-1483721310020-03333e577078", "photo-1490481651871-ab68de25d43d",
  ],
  RESTAURANT: [
    "photo-1414235077428-338989a2e8c0", "photo-1517248135467-4c7edcad34c4",
    "photo-1466978913421-dad2ebd01d17", "photo-1424847651672-bf20a4b0982b",
    "photo-1555396273-367ea4eb4db5", "photo-1540189549336-e6e99c3679fe",
    "photo-1559339352-11d035aa65de", "photo-1551782450-a2132b4ba21d",
  ],
  SALON: [
    "photo-1560066984-138daab4346c", "photo-1522337360788-8b13dee7a37e",
    "photo-1487412947147-5cebf100ffc2", "photo-1583001931096-959e9a1a6223",
    "photo-1607008829749-c0f284a49841", "photo-1503951914875-452162b0f3f1",
    "photo-1554519515-242161756769", "photo-1633681926022-84c23e8cb2d6",
  ],
  PORTFOLIO: [
    "photo-1498050108023-c5249f4df085", "photo-1519389950473-47ba0277781c",
    "photo-1517048676732-d65bc937f952", "photo-1542744173-8e7e53415bb0",
    "photo-1581291518857-4e27b48ff24e", "photo-1610563166150-b34df4f3bcd6",
    "photo-1559028012-481c04fa702d", "photo-1502920917128-1aa500764cbd",
  ],
  SAAS: [
    "photo-1551434678-e076c223a692", "photo-1460925895917-afdab827c52f",
    "photo-1551288049-bebda4e38f71", "photo-1556761175-5973dc0f32e7",
    "photo-1556761175-b413da4baf72", "photo-1559136555-9303baea8ebd",
    "photo-1542744173-8e7e53415bb0", "photo-1531403009284-440f080d1e12",
  ],
  LANDING: [
    "photo-1551434678-e076c223a692", "photo-1522071820081-009f0129c71c",
    "photo-1556761175-4b46a572b786", "photo-1542744173-8e7e53415bb0",
    "photo-1553877522-43269d4ea984", "photo-1521737604893-d14cc237f11d",
    "photo-1556761175-5973dc0f32e7", "photo-1517048676732-d65bc937f952",
  ],
  AGENCY: [
    "photo-1521737604893-d14cc237f11d", "photo-1542744173-8e7e53415bb0",
    "photo-1556761175-5973dc0f32e7", "photo-1559028012-481c04fa702d",
    "photo-1517048676732-d65bc937f952", "photo-1553877522-43269d4ea984",
    "photo-1581291518857-4e27b48ff24e", "photo-1551434678-e076c223a692",
  ],
  EDUCATION: [
    "photo-1522202176988-66273c2fd55f", "photo-1513258496099-48168024aec0",
    "photo-1509062522246-3755977927d7", "photo-1503676260728-1c00da094a0b",
    "photo-1427504494785-3a9ca7044f45", "photo-1546410531-bb4caa6b424d",
    "photo-1434030216411-0b793f4b4173", "photo-1571260899304-425eee4c7efc",
  ],
};

const PRODUCT_IMAGE_POOLS: Record<Niche, string[]> = {
  STORE: [
    "photo-1523275335684-37898b6baf30", "photo-1542291026-7eec264c27ff",
    "photo-1491553895911-0055eca6402d", "photo-1585386959984-a4155224a1ad",
    "photo-1505740420928-5e560c06d30e", "photo-1560769629-975ec94e6a86",
    "photo-1546868871-7041f2a55e12", "photo-1525507119028-ed4c629a60a3",
    "photo-1572635196237-14b3f281503f", "photo-1495121605193-b116b5b9c5fe",
    "photo-1572804013309-59a88b7e92f1", "photo-1607522370275-f14206abe5d3",
  ],
  RESTAURANT: [
    "photo-1546069901-ba9599a7e63c", "photo-1565299624946-b28f40a04680",
    "photo-1565958011703-44f9829ba187", "photo-1504674900247-0877df9cc836",
    "photo-1525351484163-7529414344d8", "photo-1565958011703-44f9829ba187",
    "photo-1565299507177-b0ac66763828", "photo-1567620905732-2d1ec7ab7445",
    "photo-1567620832903-9fc6debc209f", "photo-1540189549336-e6e99c3679fe",
    "photo-1551782450-a2132b4ba21d", "photo-1481931098730-318b6f776db0",
  ],
  SALON: [
    "photo-1522337360788-8b13dee7a37e", "photo-1570172619644-dfd03ed5d881",
    "photo-1519014816548-bf5fe059798b", "photo-1487412947147-5cebf100ffc2",
    "photo-1607008829749-c0f284a49841", "photo-1503951914875-452162b0f3f1",
    "photo-1546552768-9e3a94b38a59", "photo-1560869713-7d0a29430803",
    "photo-1571646034647-52e6ea84b28c", "photo-1553521306-1deb33e90c1c",
  ],
  PORTFOLIO: [
    "photo-1467232004-0de3e13d5296", "photo-1545235617-9465d2a55698",
    "photo-1522202176988-66273c2fd55f", "photo-1507003211169-0a1dd7228f2d",
    "photo-1581291518857-4e27b48ff24e", "photo-1559028012-481c04fa702d",
    "photo-1542744173-8e7e53415bb0", "photo-1517048676732-d65bc937f952",
    "photo-1531403009284-440f080d1e12", "photo-1497032628192-86f99bcd76bc",
  ],
  SAAS: [
    "photo-1460925895917-afdab827c52f", "photo-1551288049-bebda4e38f71",
    "photo-1573496359142-b8d87734a5a2", "photo-1434030216411-0b793f4b4173",
    "photo-1556761175-4b46a572b786", "photo-1556761175-b413da4baf72",
    "photo-1559136555-9303baea8ebd", "photo-1531403009284-440f080d1e12",
  ],
  LANDING: [
    "photo-1460925895917-afdab827c52f", "photo-1551288049-bebda4e38f71",
    "photo-1522071820081-009f0129c71c", "photo-1553877522-43269d4ea984",
    "photo-1556761175-4b46a572b786", "photo-1556761175-5973dc0f32e7",
    "photo-1542744173-8e7e53415bb0", "photo-1517048676732-d65bc937f952",
  ],
  AGENCY: [
    "photo-1460925895917-afdab827c52f", "photo-1551288049-bebda4e38f71",
    "photo-1557804506-669a67965ba0", "photo-1553877522-43269d4ea984",
    "photo-1542744173-8e7e53415bb0", "photo-1556761175-5973dc0f32e7",
    "photo-1559028012-481c04fa702d", "photo-1581291518857-4e27b48ff24e",
  ],
  EDUCATION: [
    "photo-1434030216411-0b793f4b4173", "photo-1513258496099-48168024aec0",
    "photo-1509062522246-3755977927d7", "photo-1474631245212-32dc3c8310c6",
    "photo-1503676260728-1c00da094a0b", "photo-1427504494785-3a9ca7044f45",
    "photo-1546410531-bb4caa6b424d", "photo-1571260899304-425eee4c7efc",
  ],
};

// Simple deterministic hash so the same business name always picks the same images,
// but two different names get different images even within the same niche.
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Niche design tokens + content ───────────────────────────────────────────

const NICHE_CONFIGS: Record<Niche, Omit<WebsiteConfig,
  "businessName" | "niche" | "tagline" | "seoTitle" | "seoDesc"
>> = {
  STORE: {
    primaryColor: "#0F172A", secondaryColor: "#1E293B", accentColor: "#F59E0B",
    backgroundColor: "#FFFFFF", surfaceColor: "#F8FAFC",
    textColor: "#0F172A", textMutedColor: "#64748B", borderColor: "#E2E8F0",
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Inter:wght@400;500;600;700",
    heroLayout: "split",
    heroImage: "photo-1607082348824-0a96f2a4b9da?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1523275335684-37898b6baf30?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1542291026-7eec264c27ff?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1491553895911-0055eca6402d?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1585386959984-a4155224a1ad?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Free Shipping", desc: "Free delivery on all orders over ₱999. Fast and reliable nationwide." },
      { icon: "02", title: "Secure Payment", desc: "GCash, credit card, and COD accepted. 100% safe checkout." },
      { icon: "03", title: "Easy Returns", desc: "Not satisfied? Return within 30 days, no questions asked." },
    ],
    products: [
      { name: "Premium Item", price: "₱1,299", desc: "High-quality product crafted for everyday use.", image: "photo-1523275335684-37898b6baf30?w=600&h=600&auto=format&fit=crop&q=80", badge: "Best Seller" },
      { name: "Classic Edition", price: "₱899", desc: "Timeless design that never goes out of style.", image: "photo-1542291026-7eec264c27ff?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Limited Series", price: "₱1,599", desc: "Exclusive drop — only a few units remaining.", image: "photo-1491553895911-0055eca6402d?w=600&h=600&auto=format&fit=crop&q=80", badge: "Limited" },
      { name: "Everyday Essential", price: "₱699", desc: "Your go-to for any occasion.", image: "photo-1585386959984-a4155224a1ad?w=600&h=600&auto=format&fit=crop&q=80", badge: "New" },
    ],
    testimonials: [
      { quote: "The quality exceeded my expectations. Fast delivery and beautifully packaged — will definitely order again!", name: "Maria Santos", role: "Verified Buyer", company: "Makati City" },
      { quote: "Finally found a local brand that actually delivers on its promise. The craftsmanship is outstanding.", name: "Juan dela Cruz", role: "Loyal Customer", company: "Quezon City" },
      { quote: "Ordered three times already. Every single item is perfect. Best online shop in the Philippines!", name: "Ana Reyes", role: "Repeat Customer", company: "Cebu City" },
    ],
    ctaPrimary: "Shop Now", ctaSecondary: "View Collection",
  },

  RESTAURANT: {
    primaryColor: "#7F1D1D", secondaryColor: "#991B1B", accentColor: "#F59E0B",
    backgroundColor: "#FFFBF5", surfaceColor: "#FEF9F0",
    textColor: "#1C1917", textMutedColor: "#78716C", borderColor: "#E7E5E4",
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500",
    heroLayout: "fullscreen",
    heroImage: "photo-1414235077428-338989a2e8c0?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1546069901-ba9599a7e63c?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1565299624946-b28f40a04680?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1565958011703-44f9829ba187?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1504674900247-0877df9cc836?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Expert Chefs", desc: "Our kitchen team trained in top culinary institutions, bringing authentic flavours to every dish." },
      { icon: "02", title: "Fresh Ingredients", desc: "Sourced daily from local farms and markets — no preservatives, pure taste." },
      { icon: "03", title: "Dine or Deliver", desc: "Enjoy the ambiance in-house or get your favourites delivered to your doorstep." },
    ],
    products: [
      { name: "Signature Plate", price: "₱380", desc: "Our most-loved creation. Rich, bold, and unforgettable.", image: "photo-1546069901-ba9599a7e63c?w=600&h=600&auto=format&fit=crop&q=80", badge: "Chef's Pick" },
      { name: "House Special", price: "₱295", desc: "A time-honoured recipe passed down through generations.", image: "photo-1565299624946-b28f40a04680?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Fresh Catch", price: "₱420", desc: "Straight from the ocean — grilled to perfection.", image: "photo-1565958011703-44f9829ba187?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Garden Bowl", price: "₱245", desc: "Wholesome, vibrant, and packed with seasonal vegetables.", image: "photo-1504674900247-0877df9cc836?w=600&h=600&auto=format&fit=crop&q=80", badge: "Vegan" },
    ],
    testimonials: [
      { quote: "The best dining experience in the city. Every dish tells a story — the flavours are absolutely extraordinary.", name: "Chef Marco Rivera", role: "Food Critic", company: "Philippine Food Guide" },
      { quote: "We celebrated our anniversary here and couldn't have chosen better. Ambiance, service, food — all 10/10.", name: "Elena Villanueva", role: "Regular Guest", company: "Bonifacio Global City" },
      { quote: "The freshness of the ingredients is unmatched. You can taste the care that goes into every single dish.", name: "Roberto Lim", role: "Food Blogger", company: "@TasteOfManila" },
    ],
    ctaPrimary: "Reserve a Table", ctaSecondary: "View Menu",
  },

  SALON: {
    primaryColor: "#1C1917", secondaryColor: "#292524", accentColor: "#F9A8D4",
    backgroundColor: "#FFFDF9", surfaceColor: "#FFF1F2",
    textColor: "#1C1917", textMutedColor: "#78716C", borderColor: "#F3E8FF",
    fontHeading: "'Cormorant Garamond', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500",
    heroLayout: "split",
    heroImage: "photo-1560066984-138daab4346c?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1522337360788-8b13dee7a37e?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1570172619644-dfd03ed5d881?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1519014816548-bf5fe059798b?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1487412947147-5cebf100ffc2?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Expert Stylists", desc: "Our licensed professionals stay ahead of every trend to give you your best look." },
      { icon: "02", title: "Relaxing Experience", desc: "A calm, welcoming environment designed to help you unwind and rejuvenate." },
      { icon: "03", title: "Premium Products", desc: "We use only top-tier, skin-safe products for all treatments and services." },
    ],
    products: [
      { name: "Haircut & Style", price: "₱450", desc: "Precision cut and blowout tailored to your face shape.", image: "photo-1522337360788-8b13dee7a37e?w=600&h=600&auto=format&fit=crop&q=80", badge: "Popular" },
      { name: "Colour Treatment", price: "₱1,200", desc: "Full colour, highlights, or balayage with premium dye.", image: "photo-1570172619644-dfd03ed5d881?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Facial & Glow", price: "₱850", desc: "Deep-cleansing facial with brightening serum and mask.", image: "photo-1519014816548-bf5fe059798b?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Nail Art", price: "₱350", desc: "Gel manicure and pedicure with designer nail art.", image: "photo-1487412947147-5cebf100ffc2?w=600&h=600&auto=format&fit=crop&q=80", badge: "New" },
    ],
    testimonials: [
      { quote: "My hair has never looked this good! The team is so talented and the salon feels like a luxury escape.", name: "Sophia Tan", role: "Regular Client", company: "Pasig City" },
      { quote: "I've been coming here for two years. Consistent quality and always the latest techniques.", name: "Camille Bautista", role: "Loyal Customer", company: "Taguig City" },
      { quote: "The facial treatment completely transformed my skin. I receive compliments every single day now!", name: "Grace Ong", role: "Verified Client", company: "Mandaluyong City" },
    ],
    ctaPrimary: "Book Appointment", ctaSecondary: "View Services",
  },

  PORTFOLIO: {
    primaryColor: "#0A0A0A", secondaryColor: "#1A1A2E", accentColor: "#6366F1",
    backgroundColor: "#FFFFFF", surfaceColor: "#F8FAFC",
    textColor: "#0A0A0A", textMutedColor: "#64748B", borderColor: "#E2E8F0",
    fontHeading: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500",
    heroLayout: "split",
    heroImage: "photo-1498050108023-c5249f4df085?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1467232004-0de3e13d5296?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1545235617-9465d2a55698?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1522202176988-66273c2fd55f?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1507003211169-0a1dd7228f2d?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "UI/UX Design", desc: "User-centred interfaces that are intuitive, accessible, and visually stunning." },
      { icon: "02", title: "Web Development", desc: "Clean, fast, and scalable front-end and full-stack engineering." },
      { icon: "03", title: "Mobile Apps", desc: "Cross-platform mobile experiences built for iOS and Android." },
    ],
    products: [
      { name: "E-Commerce Platform", price: "View Case Study →", desc: "End-to-end design and development for a ₱50M+ online retailer.", image: "photo-1467232004-0de3e13d5296?w=600&h=600&auto=format&fit=crop&q=80", badge: "Featured" },
      { name: "SaaS Dashboard", price: "View Case Study →", desc: "Analytics platform serving 10,000+ daily active users.", image: "photo-1545235617-9465d2a55698?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Brand Identity", price: "View Case Study →", desc: "Full brand refresh for a leading Philippine startup.", image: "photo-1522202176988-66273c2fd55f?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Mobile Fintech App", price: "View Case Study →", desc: "Payments app with 500K+ downloads on the App Store.", image: "photo-1507003211169-0a1dd7228f2d?w=600&h=600&auto=format&fit=crop&q=80", badge: "Award Winner" },
    ],
    testimonials: [
      { quote: "Delivered a stunning product on time and on budget. The attention to detail is remarkable.", name: "Patrick Sy", role: "CEO", company: "TechStart PH" },
      { quote: "Our conversion rate increased by 40% after the redesign. Best investment we've made.", name: "Diane Mercado", role: "Head of Growth", company: "Kaya Finance" },
      { quote: "Professional, creative, and communicative throughout the entire project. Highly recommended.", name: "Luis Fernandez", role: "Founder", company: "Agos Studio" },
    ],
    ctaPrimary: "View My Work", ctaSecondary: "Get in Touch",
  },

  SAAS: {
    primaryColor: "#1E1B4B", secondaryColor: "#312E81", accentColor: "#6366F1",
    backgroundColor: "#FFFFFF", surfaceColor: "#F5F3FF",
    textColor: "#1E1B4B", textMutedColor: "#6B7280", borderColor: "#DDD6FE",
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Inter:wght@400;500;600;700;800",
    heroLayout: "centered",
    heroImage: "photo-1551434678-e076c223a692?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1573496359142-b8d87734a5a2?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1434030216411-0b793f4b4173?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Lightning Fast", desc: "Sub-second response times. Your team stays in flow with zero lag." },
      { icon: "02", title: "Enterprise Security", desc: "SOC 2 Type II certified. End-to-end encryption on every data point." },
      { icon: "03", title: "Real-Time Analytics", desc: "Live dashboards and custom reports — insight when you need it." },
    ],
    products: [
      { name: "Starter", price: "₱999/mo", desc: "Perfect for small teams. Up to 5 seats, 10GB storage, email support.", image: "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Growth", price: "₱2,499/mo", desc: "For scaling teams. Unlimited seats, 100GB, priority support.", image: "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80", badge: "Most Popular" },
      { name: "Business", price: "₱5,999/mo", desc: "Advanced features, SLA guarantee, and dedicated success manager.", image: "photo-1573496359142-b8d87734a5a2?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Enterprise", price: "Custom", desc: "Tailored deployment, on-premise option, and custom integrations.", image: "photo-1434030216411-0b793f4b4173?w=600&h=600&auto=format&fit=crop&q=80" },
    ],
    testimonials: [
      { quote: "Cut our reporting time by 70%. The platform is intuitive and the onboarding was seamless.", name: "Anna Cruz", role: "Head of Operations", company: "Lazada PH" },
      { quote: "Best investment we made this year. ROI was visible within the first month of deployment.", name: "Mark Villanueva", role: "CTO", company: "PayMongo" },
      { quote: "The analytics are so powerful yet easy to use. Our team adopted it within days, not weeks.", name: "Jenny Tan", role: "Director of Data", company: "Globe Telecom" },
    ],
    ctaPrimary: "Start Free Trial", ctaSecondary: "View Pricing",
  },

  LANDING: {
    primaryColor: "#0F172A", secondaryColor: "#1E293B", accentColor: "#06B6D4",
    backgroundColor: "#FFFFFF", surfaceColor: "#F0F9FF",
    textColor: "#0F172A", textMutedColor: "#64748B", borderColor: "#E0F2FE",
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Inter:wght@400;500;600;700;800",
    heroLayout: "centered",
    heroImage: "photo-1551434678-e076c223a692?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1522071820081-009f0129c71c?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1553877522-43269d4ea984?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Launch Fast", desc: "Go live in minutes. No technical knowledge required — just your vision." },
      { icon: "02", title: "Grow Reliably", desc: "Built-in analytics and conversion tools to keep your momentum going." },
      { icon: "03", title: "Trusted by Thousands", desc: "Join 50,000+ Filipino entrepreneurs already growing their business online." },
    ],
    products: [
      { name: "Core Package", price: "₱999", desc: "Everything you need to launch and grow your online presence.", image: "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80", badge: "Best Value" },
      { name: "Pro Package", price: "₱2,499", desc: "Advanced tools, priority support, and custom domain included.", image: "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Team Package", price: "₱4,999", desc: "For growing teams with collaboration and admin controls.", image: "photo-1522071820081-009f0129c71c?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Enterprise", price: "Custom", desc: "White-label solution with SLA and dedicated onboarding.", image: "photo-1553877522-43269d4ea984?w=600&h=600&auto=format&fit=crop&q=80" },
    ],
    testimonials: [
      { quote: "Set up my business page in under 10 minutes. Customers started reaching out the same day!", name: "Rachel Sy", role: "Small Business Owner", company: "Davao City" },
      { quote: "I had zero tech experience and still launched a professional site. The results speak for themselves.", name: "Joseph Ramos", role: "Entrepreneur", company: "Iloilo City" },
      { quote: "The best decision I made for my business. Simple, powerful, and affordable.", name: "Clara Mendoza", role: "Freelancer", company: "Quezon City" },
    ],
    ctaPrimary: "Get Started Free", ctaSecondary: "Learn More",
  },

  AGENCY: {
    primaryColor: "#0A0A0A", secondaryColor: "#111827", accentColor: "#10B981",
    backgroundColor: "#FFFFFF", surfaceColor: "#F9FAFB",
    textColor: "#111827", textMutedColor: "#6B7280", borderColor: "#E5E7EB",
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Inter:wght@400;500;600;700;800",
    heroLayout: "split",
    heroImage: "photo-1521737604893-d14cc237f11d?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1557804506-669a67965ba0?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1553877522-43269d4ea984?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Strategy First", desc: "Every campaign starts with deep research and a clear north star objective." },
      { icon: "02", title: "Compelling Creative", desc: "Content that stops the scroll, builds brand love, and drives action." },
      { icon: "03", title: "Data-Driven Results", desc: "We track every peso of your budget and optimise relentlessly." },
    ],
    products: [
      { name: "Brand Identity", price: "from ₱25,000", desc: "Logo, guidelines, and brand voice that sets you apart.", image: "photo-1460925895917-afdab827c52f?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Social Media", price: "from ₱15,000/mo", desc: "Content creation, scheduling, and community management.", image: "photo-1551288049-bebda4e38f71?w=600&h=600&auto=format&fit=crop&q=80", badge: "Popular" },
      { name: "Paid Advertising", price: "from ₱20,000/mo", desc: "Meta, Google, and TikTok ad campaigns managed by experts.", image: "photo-1557804506-669a67965ba0?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Full-Service", price: "Custom", desc: "End-to-end marketing partner for ambitious brands.", image: "photo-1553877522-43269d4ea984?w=600&h=600&auto=format&fit=crop&q=80" },
    ],
    testimonials: [
      { quote: "Our revenue doubled in six months. The team is sharp, proactive, and genuinely invested in our success.", name: "David Lim", role: "CEO", company: "Carro PH" },
      { quote: "They understood our brand better than we did. The results from the first campaign blew us away.", name: "Nicole Santos", role: "Marketing Director", company: "Bench PH" },
      { quote: "Professional, creative, and always ahead of the curve. Best agency partner we've worked with.", name: "Bernard Ty", role: "Founder", company: "Workbean" },
    ],
    ctaPrimary: "Get a Free Audit", ctaSecondary: "See Our Work",
  },

  EDUCATION: {
    primaryColor: "#1E3A5F", secondaryColor: "#1E40AF", accentColor: "#F59E0B",
    backgroundColor: "#FFFFFF", surfaceColor: "#EFF6FF",
    textColor: "#1E3A5F", textMutedColor: "#64748B", borderColor: "#BFDBFE",
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    googleFont: "Inter:wght@400;500;600;700",
    heroLayout: "split",
    heroImage: "photo-1522202176988-66273c2fd55f?w=1200&h=800&auto=format&fit=crop&q=80",
    productImages: [
      "photo-1434030216411-0b793f4b4173?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1513258496099-48168024aec0?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1509062522246-3755977927d7?w=600&h=600&auto=format&fit=crop&q=80",
      "photo-1474631245212-32dc3c8310c6?w=600&h=600&auto=format&fit=crop&q=80",
    ],
    features: [
      { icon: "01", title: "Expert Instructors", desc: "Learn from industry practitioners with real-world experience." },
      { icon: "02", title: "Accredited Certificates", desc: "Recognised credentials that employers and institutions trust." },
      { icon: "03", title: "Flexible Learning", desc: "Self-paced or live sessions — fit your studies around your life." },
    ],
    products: [
      { name: "Foundation Course", price: "₱1,999", desc: "Perfect for beginners. Build a solid base of knowledge in 4 weeks.", image: "photo-1434030216411-0b793f4b4173?w=600&h=600&auto=format&fit=crop&q=80", badge: "Bestseller" },
      { name: "Advanced Programme", price: "₱4,499", desc: "Deep-dive curriculum for professionals looking to upskill.", image: "photo-1513258496099-48168024aec0?w=600&h=600&auto=format&fit=crop&q=80" },
      { name: "Bootcamp", price: "₱9,999", desc: "Intensive 8-week immersive with live mentoring sessions.", image: "photo-1509062522246-3755977927d7?w=600&h=600&auto=format&fit=crop&q=80", badge: "New Batch" },
      { name: "Corporate Training", price: "Custom", desc: "Tailored programmes for teams of 10 and above.", image: "photo-1474631245212-32dc3c8310c6?w=600&h=600&auto=format&fit=crop&q=80" },
    ],
    testimonials: [
      { quote: "Landed a promotion within a month of completing the programme. The curriculum is excellent.", name: "Liza Alcantara", role: "Graduate", company: "BDO Unibank" },
      { quote: "The instructors are exceptional. Real knowledge, real examples, real results.", name: "Paolo Fernandez", role: "Student", company: "University of Santo Tomas" },
      { quote: "Best learning investment I've made. I now use these skills every single day at work.", name: "Maribel Castro", role: "Course Alumna", company: "Accenture PH" },
    ],
    ctaPrimary: "Enrol Now", ctaSecondary: "Browse Courses",
  },
};

// ─── Prompt parser ────────────────────────────────────────────────────────────

function detectNiche(prompt: string): Niche {
  const p = prompt.toLowerCase();
  if (/\bshop\b|\bstore\b|\bsell\b|\bproduct\b|\becommerce\b|\be-commerce\b|\bmerch\b/.test(p)) return "STORE";
  if (/restaurant|cafe|coffee|food|menu|bistro|diner|eatery|\bbar\b|grill|kitchen/.test(p)) return "RESTAURANT";
  if (/salon|spa|barber|nail\b|beauty|hair\b|skincare|waxing|massage/.test(p)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative|architect/.test(p)) return "PORTFOLIO";
  if (/\bsaas\b|software|\bapp\b|platform|\btech\b|startup|\btool\b|\bapi\b/.test(p)) return "SAAS";
  if (/agency|marketing|digital|branding|studio|consulting|\bfirm\b/.test(p)) return "AGENCY";
  if (/school|tutor|course|learn|education|training|academy|\bclass\b/.test(p)) return "EDUCATION";
  return "LANDING";
}

function extractBusinessName(prompt: string): string {
  const patterns = [
    /(?:brand(?:\s+name)?\s*[:\-–]\s*)["']?([A-Z][A-Za-z0-9\s&'.]+?)["']?(?:\n|,|\.|$)/,
    /(?:store\s+name\s*[:\-–]\s*)["']?([A-Z][A-Za-z0-9\s&'.]+?)["']?(?:\n|,|\.|$)/,
    /(?:business\s+name\s*[:\-–]\s*)["']?([A-Z][A-Za-z0-9\s&'.]+?)["']?(?:\n|,|\.|$)/,
    /(?:called\s+["']?)([A-Z][A-Za-z0-9\s&'.]{2,40})["']?/,
    /(?:named\s+["']?)([A-Z][A-Za-z0-9\s&'.]{2,40})["']?/,
    /(?:for\s+["']?)([A-Z][A-Za-z0-9\s&'.]{2,30})(?:["']?\s*,|\s+(?:website|store|shop|brand|salon|restaurant))/,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1]) return m[1].trim().replace(/['"]+/g, "").slice(0, 60);
  }
  const cap = prompt.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
  if (cap?.[1] && cap[1].length > 2 && cap[1] !== "Create" && cap[1] !== "Make" && cap[1] !== "Build") return cap[1].slice(0, 40);
  return "My Business";
}

function extractColor(prompt: string): string | null {
  const colors: Record<string, string> = {
    red: "#DC2626", blue: "#2563EB", green: "#16A34A", purple: "#9333EA",
    pink: "#EC4899", orange: "#EA580C", yellow: "#D97706", teal: "#0D9488",
    indigo: "#4F46E5", rose: "#E11D48", violet: "#7C3AED", black: "#0A0A0A",
    gold: "#D97706", navy: "#1E3A5F", brown: "#92400E", grey: "#6B7280",
    gray: "#6B7280", emerald: "#059669", cyan: "#0891B2",
  };
  const p = prompt.toLowerCase();
  for (const [name, hex] of Object.entries(colors)) {
    if (p.includes(name)) return hex;
  }
  return null;
}

function buildConfig(prompt: string): WebsiteConfig {
  const niche = detectNiche(prompt);
  const businessName = extractBusinessName(prompt);
  const overrideColor = extractColor(prompt);
  const base = NICHE_CONFIGS[niche];

  const taglines: Record<Niche, string> = {
    STORE: "Premium Quality. Delivered to Your Door.",
    RESTAURANT: "Where Every Meal Becomes a Memory.",
    SALON: "Look Good. Feel Unstoppable.",
    PORTFOLIO: "Turning Ideas into Exceptional Digital Experiences.",
    SAAS: "The Smarter Way to Run Your Business.",
    LANDING: "Everything You Need. Nothing You Don't.",
    AGENCY: "We Build Brands. We Drive Growth.",
    EDUCATION: "Learn Today. Lead Tomorrow.",
  };

  // Pick hero + product images from the pool based on a hash of the business
  // name so two sites in the same niche get different images, but the same name
  // always gets a consistent look.
  const seed = hashString(businessName + niche);
  const heroPool = HERO_IMAGE_POOLS[niche];
  const productPool = PRODUCT_IMAGE_POOLS[niche];
  const heroPick = `${heroPool[seed % heroPool.length]}?w=1200&h=800&auto=format&fit=crop&q=80`;
  // Pick 4 distinct product images starting at an offset
  const productPicks = [0, 1, 2, 3].map(
    (i) => `${productPool[(seed + i * 3) % productPool.length]}?w=600&h=600&auto=format&fit=crop&q=80`
  );
  const productsWithImages = base.products.map((p, i) => ({ ...p, image: productPicks[i] || p.image }));

  return {
    ...base,
    businessName,
    niche,
    tagline: taglines[niche],
    primaryColor: overrideColor ?? base.primaryColor,
    heroImage: heroPick,
    productImages: productPicks,
    products: productsWithImages,
    seoTitle: `${businessName} — ${taglines[niche].split(".")[0]}`,
    seoDesc: `${businessName} | ${taglines[niche]} Serving customers across the Philippines with passion and quality.`,
  };
}

// ─── CSS generator ────────────────────────────────────────────────────────────

function buildCSS(cfg: WebsiteConfig): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=${cfg.googleFont}&display=swap');

:root {
  --color-primary:       ${cfg.primaryColor};
  --color-secondary:     ${cfg.secondaryColor};
  --color-accent:        ${cfg.accentColor};
  --color-background:    ${cfg.backgroundColor};
  --color-surface:       ${cfg.surfaceColor};
  --color-text:          ${cfg.textColor};
  --color-text-muted:    ${cfg.textMutedColor};
  --color-text-inverse:  #FFFFFF;
  --color-border:        ${cfg.borderColor};
  --font-heading:        ${cfg.fontHeading};
  --font-body:           ${cfg.fontBody};
  --text-size-hero:      clamp(2.5rem, 6vw, 5rem);
  --text-size-h1:        clamp(2rem, 4vw, 3.5rem);
  --text-size-h2:        clamp(1.5rem, 3vw, 2.5rem);
  --text-size-h3:        clamp(1.125rem, 2vw, 1.5rem);
  --text-size-body:      clamp(0.9375rem, 1vw + 0.5rem, 1.125rem);
  --text-size-small:     0.875rem;
  --line-height-tight:   1.15;
  --line-height-normal:  1.5;
  --line-height-relaxed: 1.75;
  --letter-spacing-tight: -0.02em;
  --letter-spacing-wide:  0.06em;
  --shape-radius:        0.625rem;
  --shape-radius-lg:     1.25rem;
  --shape-radius-pill:   9999px;
  --shadow-sm:           0 1px 3px rgba(0,0,0,.07);
  --shadow-md:           0 4px 16px rgba(0,0,0,.09);
  --shadow-lg:           0 8px 32px rgba(0,0,0,.12);
  --motion-speed:        280ms;
  --motion-easing:       cubic-bezier(0.4,0,0.2,1);
  --layout-max-width:    1280px;
  --layout-gap:          1.5rem;
  --nav-height:          64px;
  --section-py:          5rem;
  --section-py-sm:       2.5rem;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);background:var(--color-background);color:var(--color-text);line-height:var(--line-height-normal);-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block;object-fit:cover}
a{color:inherit;text-decoration:none}
button{cursor:pointer;border:none;background:none;font:inherit}

.container{width:100%;max-width:var(--layout-max-width);margin:0 auto;padding:0 1.5rem}
.section{padding:var(--section-py-sm) 0}
@media(min-width:768px){.section{padding:var(--section-py) 0}}

/* ── Navigation ── */
.nav{position:sticky;top:0;z-index:100;height:var(--nav-height);background:var(--color-background);border-bottom:1px solid var(--color-border);backdrop-filter:blur(12px)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:100%}
.nav-logo{font-family:var(--font-heading);font-size:1.25rem;font-weight:700;color:var(--color-text);letter-spacing:var(--letter-spacing-tight)}
.nav-links{display:none;gap:2rem;list-style:none}
@media(min-width:768px){.nav-links{display:flex}}
.nav-links a{font-size:var(--text-size-small);font-weight:500;color:var(--color-text-muted);transition:color var(--motion-speed) var(--motion-easing)}
.nav-links a:hover{color:var(--color-accent)}
.nav-cta{display:none}
@media(min-width:640px){.nav-cta{display:inline-flex;align-items:center;padding:.5rem 1.25rem;background:var(--color-primary);color:var(--color-text-inverse);border-radius:var(--shape-radius);font-size:var(--text-size-small);font-weight:600;transition:opacity var(--motion-speed) var(--motion-easing)}}
.nav-cta:hover{opacity:.85}
.nav-toggle{display:flex;flex-direction:column;gap:5px;width:24px;cursor:pointer}
@media(min-width:768px){.nav-toggle{display:none}}
.nav-toggle span{height:2px;background:var(--color-text);border-radius:2px;transition:all var(--motion-speed)}
.nav-mobile{display:none;flex-direction:column;gap:1rem;padding:1.5rem;background:var(--color-background);border-bottom:1px solid var(--color-border)}
.nav-mobile.open{display:flex}
.nav-mobile a{font-weight:500;color:var(--color-text);padding:.5rem 0;border-bottom:1px solid var(--color-border)}
.nav-links a.nav-active,.nav-mobile a.nav-active{color:var(--color-accent);font-weight:700}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:var(--shape-radius);font-weight:600;font-family:var(--font-body);transition:all var(--motion-speed) var(--motion-easing);white-space:nowrap}
.btn-primary{background:var(--color-primary);color:var(--color-text-inverse);padding:.875rem 2rem;font-size:1rem}
.btn-primary:hover{opacity:.85;transform:translateY(-1px)}
.btn-secondary{background:transparent;color:var(--color-primary);padding:.875rem 2rem;font-size:1rem;border:2px solid var(--color-primary)}
.btn-secondary:hover{background:var(--color-primary);color:var(--color-text-inverse)}
.btn-accent{background:var(--color-accent);color:var(--color-text-inverse);padding:.875rem 2rem;font-size:1rem}
.btn-accent:hover{opacity:.85}
.btn-sm{padding:.5rem 1.25rem;font-size:.875rem}

/* ── Badge ── */
.badge{display:inline-flex;align-items:center;padding:.25rem .75rem;border-radius:var(--shape-radius-pill);font-size:.8rem;font-weight:600;letter-spacing:var(--letter-spacing-wide);text-transform:uppercase}
.badge-accent{background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}
.badge-primary{background:var(--color-primary);color:var(--color-text-inverse)}

/* ── Hero ── */
.hero{overflow:hidden}
.hero-split{padding:var(--section-py-sm) 0}
@media(min-width:768px){.hero-split{padding:var(--section-py) 0}}
.hero-split .inner{display:grid;gap:3rem;align-items:center}
@media(min-width:900px){.hero-split .inner{grid-template-columns:1fr 1fr}}
.hero-text{display:flex;flex-direction:column;gap:1.5rem}
.hero-pretitle{font-size:.875rem;font-weight:600;color:var(--color-accent);letter-spacing:var(--letter-spacing-wide);text-transform:uppercase}
.hero-headline{font-family:var(--font-heading);font-size:var(--text-size-hero);line-height:var(--line-height-tight);letter-spacing:var(--letter-spacing-tight);color:var(--color-text)}
.hero-sub{font-size:var(--text-size-body);line-height:var(--line-height-relaxed);color:var(--color-text-muted);max-width:38ch}
.hero-actions{display:flex;flex-wrap:wrap;gap:1rem;margin-top:.5rem}
.hero-stats{display:flex;flex-wrap:wrap;gap:2.5rem;padding-top:1.5rem;border-top:1px solid var(--color-border)}
.hero-stat-value{font-family:var(--font-heading);font-size:var(--text-size-h2);font-weight:700;color:var(--color-text);line-height:1}
.hero-stat-label{font-size:.8rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:var(--letter-spacing-wide);margin-top:.25rem}
.hero-media{border-radius:var(--shape-radius-lg);overflow:hidden;aspect-ratio:4/3}
.hero-media img{width:100%;height:100%;object-fit:cover}

.hero-centered{padding:var(--section-py) 0;text-align:center}
.hero-centered .inner{display:flex;flex-direction:column;align-items:center;gap:1.5rem;max-width:800px;margin:0 auto}
.hero-centered .hero-sub{text-align:center;max-width:54ch}
.hero-centered .hero-actions{justify-content:center}
.hero-centered-img{margin-top:3rem;border-radius:var(--shape-radius-lg);overflow:hidden;aspect-ratio:16/7;width:100%}
.hero-centered-img img{width:100%;height:100%;object-fit:cover}

.hero-fullscreen{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center}
.hero-fullscreen-bg{position:absolute;inset:0;z-index:0}
.hero-fullscreen-bg img{width:100%;height:100%;object-fit:cover}
.hero-fullscreen-overlay{position:absolute;inset:0;background:color-mix(in srgb,var(--color-primary) 70%,transparent);z-index:1}
.hero-fullscreen .inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:1.5rem;padding:0 1.5rem;max-width:900px}
.hero-fullscreen .hero-headline{color:#fff}
.hero-fullscreen .hero-sub{color:rgba(255,255,255,.8)}

/* ── Features ── */
.features{background:var(--color-surface)}
.features-header{text-align:center;margin-bottom:4rem}
.features-grid{display:grid;gap:2rem}
@media(min-width:640px){.features-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.features-grid{grid-template-columns:repeat(3,1fr)}}
.feature-card{background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--shape-radius-lg);padding:2rem;display:flex;flex-direction:column;gap:1rem;transition:box-shadow var(--motion-speed) var(--motion-easing),transform var(--motion-speed) var(--motion-easing)}
.feature-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}
.feature-icon{width:3rem;height:3rem;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--color-accent) 15%,transparent);border-radius:var(--shape-radius);font-family:var(--font-heading);font-size:0.75rem;font-weight:800;color:var(--color-accent);letter-spacing:0.02em}
.feature-title{font-family:var(--font-heading);font-size:var(--text-size-h3);font-weight:600;color:var(--color-text)}
.feature-desc{font-size:var(--text-size-body);color:var(--color-text-muted);line-height:var(--line-height-relaxed)}

/* ── Products / Services / Menu ── */
.products{background:var(--color-background)}
.products-header{display:flex;flex-direction:column;gap:.75rem;margin-bottom:3rem}
@media(min-width:640px){.products-header{flex-direction:row;align-items:flex-end;justify-content:space-between}}
.products-grid{display:grid;gap:1.5rem;grid-template-columns:1fr}
@media(min-width:600px){.products-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.products-grid{grid-template-columns:repeat(4,1fr)}}
.product-card{background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--shape-radius-lg);overflow:hidden;display:flex;flex-direction:column;transition:box-shadow var(--motion-speed),transform var(--motion-speed)}
.product-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-3px)}
.product-img{aspect-ratio:1;overflow:hidden;position:relative}
.product-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--motion-easing)}
.product-card:hover .product-img img{transform:scale(1.04)}
.product-badge{position:absolute;top:.75rem;left:.75rem}
.product-body{padding:1.25rem;display:flex;flex-direction:column;gap:.5rem;flex:1}
.product-name{font-family:var(--font-heading);font-size:var(--text-size-h3);font-weight:600;color:var(--color-text)}
.product-desc{font-size:.9rem;color:var(--color-text-muted);line-height:var(--line-height-relaxed);flex:1}
.product-footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:1rem;border-top:1px solid var(--color-border)}
.product-price{font-family:var(--font-heading);font-size:var(--text-size-h3);font-weight:700;color:var(--color-text)}

/* ── Testimonials ── */
.testimonials{background:var(--color-surface)}
.testimonials-header{text-align:center;margin-bottom:4rem}
.testimonials-grid{display:grid;gap:1.5rem}
@media(min-width:640px){.testimonials-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.testimonials-grid{grid-template-columns:repeat(3,1fr)}}
.testimonial-card{background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--shape-radius-lg);padding:2rem;display:flex;flex-direction:column;gap:1.25rem;box-shadow:var(--shadow-sm)}
.testimonial-stars{display:flex;gap:.25rem;color:var(--color-accent)}
.testimonial-quote{font-size:var(--text-size-body);color:var(--color-text);line-height:var(--line-height-relaxed);font-style:italic;flex:1}
.testimonial-author{display:flex;align-items:center;gap:.75rem;padding-top:1.25rem;border-top:1px solid var(--color-border)}
.testimonial-avatar{width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--color-accent) 20%,var(--color-surface));display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:700;font-size:1.1rem;color:var(--color-accent);flex-shrink:0}
.testimonial-name{font-family:var(--font-heading);font-weight:600;font-size:.95rem;color:var(--color-text)}
.testimonial-role{font-size:.8rem;color:var(--color-text-muted)}

/* ── CTA Banner ── */
.cta-section{background:var(--color-primary);padding:var(--section-py) 0}
.cta-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:1.5rem;max-width:700px;margin:0 auto}
.cta-headline{font-family:var(--font-heading);font-size:var(--text-size-h1);font-weight:700;color:#fff;line-height:var(--line-height-tight)}
.cta-sub{font-size:var(--text-size-body);color:rgba(255,255,255,.75);line-height:var(--line-height-relaxed)}
.cta-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem}
.btn-cta-primary{background:#fff;color:var(--color-primary);padding:.875rem 2rem;font-size:1rem;border-radius:var(--shape-radius);font-weight:700;display:inline-flex;align-items:center;transition:opacity var(--motion-speed)}
.btn-cta-primary:hover{opacity:.9}
.btn-cta-ghost{border:2px solid rgba(255,255,255,.5);color:#fff;padding:.875rem 2rem;font-size:1rem;border-radius:var(--shape-radius);font-weight:600;display:inline-flex;align-items:center;transition:background var(--motion-speed)}
.btn-cta-ghost:hover{background:rgba(255,255,255,.1)}

/* ── Section headings ── */
.section-title{font-family:var(--font-heading);font-size:var(--text-size-h1);font-weight:700;color:var(--color-text);line-height:var(--line-height-tight);letter-spacing:var(--letter-spacing-tight)}
.section-subtitle{font-size:var(--text-size-body);color:var(--color-text-muted);line-height:var(--line-height-relaxed);max-width:54ch;margin-top:.75rem}

/* ── Footer ── */
.footer{background:var(--color-primary);color:rgba(255,255,255,.8);padding:4rem 0 2rem}
.footer-grid{display:grid;gap:3rem;grid-template-columns:1fr}
@media(min-width:640px){.footer-grid{grid-template-columns:2fr 1fr 1fr}}
.footer-brand{display:flex;flex-direction:column;gap:1rem}
.footer-logo{font-family:var(--font-heading);font-size:1.375rem;font-weight:700;color:#fff}
.footer-tagline{font-size:.9rem;line-height:var(--line-height-relaxed);opacity:.7}
.footer-col-title{font-family:var(--font-heading);font-weight:600;color:#fff;font-size:.95rem;margin-bottom:1rem;letter-spacing:var(--letter-spacing-wide);text-transform:uppercase}
.footer-links{display:flex;flex-direction:column;gap:.625rem;list-style:none}
.footer-links a{font-size:.9rem;color:rgba(255,255,255,.7);transition:color var(--motion-speed)}
.footer-links a:hover{color:#fff}
.footer-bottom{margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center}
@media(min-width:640px){.footer-bottom{flex-direction:row;justify-content:space-between}}
.footer-copy{font-size:.8rem;opacity:.5}
`.trim();
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildNav(cfg: WebsiteConfig): string {
  // True multi-page architecture: every nav link goes to one of FOUR canonical
  // pages — #home, #shop, #about, #contact. The page-switcher JS at the bottom
  // of the document shows/hides sections based on the URL hash, so clicking a
  // nav link feels like navigating to a completely different page.
  const nicheLinks: Record<Niche, Array<[string, string]>> = {
    STORE:      [["Home", "#home"], ["Shop", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
    RESTAURANT: [["Home", "#home"], ["Menu", "#shop"], ["About", "#about"], ["Reservations", "#contact"]],
    SALON:      [["Home", "#home"], ["Services", "#shop"], ["About", "#about"], ["Book", "#contact"]],
    PORTFOLIO:  [["Home", "#home"], ["Work", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
    SAAS:       [["Home", "#home"], ["Pricing", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
    LANDING:    [["Home", "#home"], ["Features", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
    AGENCY:     [["Home", "#home"], ["Services", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
    EDUCATION:  [["Home", "#home"], ["Courses", "#shop"], ["About", "#about"], ["Contact", "#contact"]],
  };
  const links = nicheLinks[cfg.niche];
  const li = links.map(([label, href]) => `<li><a href="${href}" data-page-link="${href.slice(1)}">${label}</a></li>`).join("");
  const mob = links.map(([label, href]) => `<a href="${href}" data-page-link="${href.slice(1)}" data-editable="link">${label}</a>`).join("");
  return `
<nav data-editable="section" data-section-label="Navigation" id="nav">
  <div class="container nav-inner">
    <a href="/" class="nav-logo" data-editable="text">${cfg.businessName}</a>
    <ul class="nav-links">${li}</ul>
    <a href="#contact" class="nav-cta btn" data-editable="button">${cfg.ctaPrimary}</a>
    <button class="nav-toggle" id="navToggle" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-mobile" id="navMobile">${mob}</div>
</nav>
<script>
  (function(){
    var t=document.getElementById('navToggle');
    var m=document.getElementById('navMobile');
    if(t&&m) t.addEventListener('click',function(){m.classList.toggle('open');});
  })();
</script>`;
}

function buildHero(cfg: WebsiteConfig): string {
  const img = `https://images.unsplash.com/${cfg.heroImage}`;
  const stats = cfg.niche === "STORE"
    ? `<div class="hero-stats">
        <div><div class="hero-stat-value">50K+</div><div class="hero-stat-label">Happy Customers</div></div>
        <div><div class="hero-stat-value">4.9★</div><div class="hero-stat-label">Average Rating</div></div>
        <div><div class="hero-stat-value">100%</div><div class="hero-stat-label">Satisfaction</div></div>
      </div>` : "";

  if (cfg.heroLayout === "fullscreen") {
    return `
<section data-editable="section" data-section-label="Hero" data-page="home" class="hero hero-fullscreen" id="hero">
  <div class="hero-fullscreen-bg">
    <img data-editable="image" src="${img}" alt="${cfg.businessName}">
    <div class="hero-fullscreen-overlay"></div>
  </div>
  <div class="inner">
    <span class="hero-pretitle" data-editable="text">${cfg.businessName}</span>
    <h1 class="hero-headline" data-editable="text">${cfg.tagline}</h1>
    <p class="hero-sub" data-editable="text">Experience something exceptional. We craft every detail with passion and care, delivering quality that speaks for itself.</p>
    <div class="hero-actions">
      <a href="#shop" class="btn btn-accent" data-editable="button">${cfg.ctaPrimary}</a>
      <a href="#about" class="btn btn-secondary" style="border-color:rgba(255,255,255,.5);color:#fff" data-editable="button">${cfg.ctaSecondary}</a>
    </div>
  </div>
</section>`;
  }

  if (cfg.heroLayout === "centered") {
    return `
<section data-editable="section" data-section-label="Hero" data-page="home" class="hero hero-centered section" id="hero">
  <div class="container inner">
    <span class="badge badge-accent" data-editable="text">Now Live in the Philippines</span>
    <h1 class="hero-headline" data-editable="text">${cfg.tagline}</h1>
    <p class="hero-sub" data-editable="text">Join thousands of satisfied customers who trust ${cfg.businessName} for quality, speed, and reliability — every single time.</p>
    <div class="hero-actions">
      <a href="#shop" class="btn btn-primary" data-editable="button">${cfg.ctaPrimary}</a>
      <a href="#about" class="btn btn-secondary" data-editable="button">${cfg.ctaSecondary}</a>
    </div>
    <div class="hero-centered-img">
      <img data-editable="image" src="${img}" alt="${cfg.businessName}">
    </div>
  </div>
</section>`;
  }

  // Default: split
  return `
<section data-editable="section" data-section-label="Hero" data-page="home" class="hero hero-split section" id="hero">
  <div class="container inner">
    <div class="hero-text">
      <span class="hero-pretitle" data-editable="text">Welcome to ${cfg.businessName}</span>
      <h1 class="hero-headline" data-editable="text">${cfg.tagline}</h1>
      <p class="hero-sub" data-editable="text">Serving thousands of happy customers across the Philippines. Quality you can trust, service you'll love — every single time.</p>
      <div class="hero-actions">
        <a href="#shop" class="btn btn-primary" data-editable="button">${cfg.ctaPrimary}</a>
        <a href="#about" class="btn btn-secondary" data-editable="button">${cfg.ctaSecondary}</a>
      </div>
      ${stats}
    </div>
    <div class="hero-media">
      <img data-editable="image" src="${img}" alt="${cfg.businessName}">
    </div>
  </div>
</section>`;
}

function buildFeatures(cfg: WebsiteConfig): string {
  const cards = cfg.features.map(f => `
    <div class="feature-card">
      <div class="feature-icon">${f.icon}</div>
      <h3 class="feature-title" data-editable="text">${f.title}</h3>
      <p class="feature-desc" data-editable="text">${f.desc}</p>
    </div>`).join("");
  return `
<section data-editable="section" data-section-label="Features" data-page="home" class="features section" id="features">
  <div class="container">
    <div class="features-header">
      <h2 class="section-title" data-editable="text">Why Choose ${cfg.businessName}</h2>
      <p class="section-subtitle" data-editable="text">Everything we do is built around your satisfaction. Here's what sets us apart.</p>
    </div>
    <div class="features-grid">${cards}</div>
  </div>
</section>`;
}

function buildProducts(cfg: WebsiteConfig): string {
  const sectionLabel: Record<Niche, string> = {
    STORE: "Our Products", RESTAURANT: "Our Menu", SALON: "Our Services",
    PORTFOLIO: "Featured Work", SAAS: "Pricing Plans", LANDING: "What We Offer",
    AGENCY: "Our Services", EDUCATION: "Our Courses",
  };
  const cards = cfg.products.map(p => {
    const img = `https://images.unsplash.com/${p.image}`;
    const badge = p.badge
      ? `<div class="product-badge"><span class="badge badge-accent" data-editable="text">${p.badge}</span></div>`
      : "";
    return `
    <div class="product-card">
      <div class="product-img">
        <img data-editable="image" src="${img}" alt="${p.name}" loading="lazy">
        ${badge}
      </div>
      <div class="product-body">
        <h3 class="product-name" data-editable="text">${p.name}</h3>
        <p class="product-desc" data-editable="text">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price" data-editable="text">${p.price}</span>
          <a href="#contact" class="btn btn-primary btn-sm" data-editable="button">${cfg.ctaPrimary}</a>
        </div>
      </div>
    </div>`;
  }).join("");
  return `
<section data-editable="section" data-section-label="${sectionLabel[cfg.niche]}" data-page="shop" class="products section" id="products">
  <div class="container">
    <div class="products-header">
      <div>
        <h2 class="section-title" data-editable="text">${sectionLabel[cfg.niche]}</h2>
        <p class="section-subtitle" data-editable="text">Carefully crafted for you. Explore what ${cfg.businessName} has to offer.</p>
      </div>
      <a href="#contact" class="btn btn-secondary" data-editable="button">${cfg.ctaSecondary}</a>
    </div>
    <div class="products-grid">${cards}</div>
  </div>
</section>`;
}

function buildTestimonials(cfg: WebsiteConfig): string {
  const cards = cfg.testimonials.map(t => {
    const initials = t.name.split(" ").map(w => w[0]).join("").slice(0, 2);
    return `
    <div class="testimonial-card">
      <div class="testimonial-stars">★★★★★</div>
      <p class="testimonial-quote" data-editable="text">"${t.quote}"</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar" aria-hidden="true">${initials}</div>
        <div>
          <p class="testimonial-name" data-editable="text">${t.name}</p>
          <p class="testimonial-role" data-editable="text">${t.role}, ${t.company}</p>
        </div>
      </div>
    </div>`;
  }).join("");
  return `
<section data-editable="section" data-section-label="Testimonials" data-page="home" class="testimonials section" id="testimonials">
  <div class="container">
    <div class="testimonials-header">
      <h2 class="section-title" data-editable="text">What Our Customers Say</h2>
      <p class="section-subtitle" data-editable="text" style="margin:0 auto">Real words from real people who've experienced the ${cfg.businessName} difference.</p>
    </div>
    <div class="testimonials-grid">${cards}</div>
  </div>
</section>`;
}

function buildAbout(cfg: WebsiteConfig): string {
  const aboutCopy: Record<Niche, { heading: string; body: string; stat1: string; stat1l: string; stat2: string; stat2l: string; stat3: string; stat3l: string }> = {
    STORE:      { heading: "Our Story", body: `${cfg.businessName} was born out of a passion for quality and a commitment to the Filipino customer. Every product we carry is hand-picked for durability, style, and value. We're more than just a shop — we're a brand you can trust.`, stat1: "50K+", stat1l: "Happy Customers", stat2: "4.9", stat2l: "Average Rating", stat3: "100%", stat3l: "Quality Guarantee" },
    RESTAURANT: { heading: "Our Heritage", body: `${cfg.businessName} has been crafting unforgettable dining experiences since its founding. We believe food is more than sustenance — it's memory, culture, and connection. Every dish tells the story of our kitchen's heart.`, stat1: "15+", stat1l: "Years of Service", stat2: "200+", stat2l: "Menu Items", stat3: "5-Star", stat3l: "Dining Rating" },
    SALON:      { heading: "About the Studio", body: `At ${cfg.businessName}, we combine artistry with expertise to help you look and feel your absolute best. Our team of licensed stylists and beauty professionals are dedicated to staying current with the latest trends and techniques.`, stat1: "10K+", stat1l: "Happy Clients", stat2: "15+", stat2l: "Expert Stylists", stat3: "8+", stat3l: "Years in Business" },
    PORTFOLIO:  { heading: "About Me", body: `I'm a multidisciplinary designer and developer based in the Philippines, passionate about crafting digital experiences that are both beautiful and functional. With over 8 years of experience, I've helped startups and established brands achieve their vision.`, stat1: "8+", stat1l: "Years Experience", stat2: "120+", stat2l: "Projects Delivered", stat3: "98%", stat3l: "Client Satisfaction" },
    SAAS:       { heading: "Why We Built This", body: `${cfg.businessName} started when our founders noticed that most business tools were built for large enterprises, leaving Filipino SMEs behind. We set out to build a platform that's powerful enough for enterprise but simple enough for everyone.`, stat1: "10K+", stat1l: "Active Users", stat2: "99.9%", stat2l: "Uptime SLA", stat3: "4x", stat3l: "Faster Than Alternatives" },
    LANDING:    { heading: "Who We Are", body: `${cfg.businessName} is a team of dedicated professionals committed to helping businesses grow. We believe that every entrepreneur deserves access to world-class tools and strategies — regardless of their budget or technical background.`, stat1: "50K+", stat1l: "Businesses Served", stat2: "4.9", stat2l: "Average Rating", stat3: "3 Years", stat3l: "In the Industry" },
    AGENCY:     { heading: "About the Agency", body: `${cfg.businessName} is a full-service marketing agency built for the modern Philippine brand. We combine strategy, creativity, and data to help businesses grow faster, build stronger brands, and connect meaningfully with their audiences.`, stat1: "200+", stat1l: "Brands Served", stat2: "₱500M+", stat2l: "Revenue Generated", stat3: "5+", stat3l: "Industry Awards" },
    EDUCATION:  { heading: "Our Mission", body: `${cfg.businessName} exists to make world-class education accessible to every Filipino. We believe that the right knowledge and skills can transform lives — and we're committed to delivering them through practical, industry-relevant programmes.`, stat1: "25K+", stat1l: "Students Enrolled", stat2: "95%", stat2l: "Completion Rate", stat3: "100+", stat3l: "Expert Instructors" },
  };
  const a = aboutCopy[cfg.niche];
  return `
<section data-editable="section" data-section-label="About" data-page="about" class="section" id="about" style="background:var(--color-surface)">
  <div class="container" style="display:grid;gap:4rem;align-items:center">
    <div style="max-width:700px;margin:0 auto;text-align:center">
      <h2 class="section-title" data-editable="text">${a.heading}</h2>
      <p class="section-subtitle" data-editable="text" style="margin:1.25rem auto 2.5rem">${a.body}</p>
      <div style="display:flex;flex-wrap:wrap;gap:2.5rem;justify-content:center">
        <div><div class="hero-stat-value" data-editable="text">${a.stat1}</div><div class="hero-stat-label" data-editable="text">${a.stat1l}</div></div>
        <div><div class="hero-stat-value" data-editable="text">${a.stat2}</div><div class="hero-stat-label" data-editable="text">${a.stat2l}</div></div>
        <div><div class="hero-stat-value" data-editable="text">${a.stat3}</div><div class="hero-stat-label" data-editable="text">${a.stat3l}</div></div>
      </div>
    </div>
  </div>
</section>`;
}

function buildContact(cfg: WebsiteConfig): string {
  const labels: Record<Niche, { heading: string; sub: string }> = {
    STORE:      { heading: "Get in Touch", sub: "Have a question about an order? We typically reply within a few hours." },
    RESTAURANT: { heading: "Make a Reservation", sub: "Reserve your table or inquire about private events and catering." },
    SALON:      { heading: "Book an Appointment", sub: "Ready for a transformation? Fill in the form and we'll confirm your slot." },
    PORTFOLIO:  { heading: "Start a Project", sub: "Tell me about your project and I'll get back to you within 24 hours." },
    SAAS:       { heading: "Contact Sales", sub: "Interested in a plan? Our team will set up a personalised walkthrough." },
    LANDING:    { heading: "Get in Touch", sub: "Have questions? Send us a message and we'll respond quickly." },
    AGENCY:     { heading: "Let's Work Together", sub: "Tell us about your brand and goals. Free consultation included." },
    EDUCATION:  { heading: "Enrol or Inquire", sub: "Send us a message about courses, schedules, or enrolment details." },
  };
  const l = labels[cfg.niche];
  return `
<section data-editable="section" data-section-label="Contact" data-page="contact" class="cta-section" id="contact">
  <div class="container" style="max-width:700px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem">
      <h2 class="cta-headline" data-editable="text">${l.heading}</h2>
      <p class="cta-sub" data-editable="text" style="margin-top:1rem">${l.sub}</p>
    </div>
    <form id="sb-contact-form" style="display:flex;flex-direction:column;gap:1rem;background:rgba(255,255,255,0.08);padding:2.5rem;border-radius:var(--shape-radius-lg)">
      <div style="display:grid;gap:1rem;grid-template-columns:1fr 1fr">
        <input type="text" name="name" placeholder="Your Name" required
          style="padding:.875rem 1.25rem;border-radius:var(--shape-radius);border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:var(--text-size-small);font-family:var(--font-body);outline:none"
          onfocus="this.style.borderColor='rgba(255,255,255,.6)'" onblur="this.style.borderColor='rgba(255,255,255,.2)'" />
        <input type="email" name="email" placeholder="Your Email" required
          style="padding:.875rem 1.25rem;border-radius:var(--shape-radius);border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:var(--text-size-small);font-family:var(--font-body);outline:none"
          onfocus="this.style.borderColor='rgba(255,255,255,.6)'" onblur="this.style.borderColor='rgba(255,255,255,.2)'" />
      </div>
      <textarea name="message" placeholder="Your message..." rows="5" required
        style="padding:.875rem 1.25rem;border-radius:var(--shape-radius);border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:var(--text-size-small);font-family:var(--font-body);resize:vertical;outline:none"
        onfocus="this.style.borderColor='rgba(255,255,255,.6)'" onblur="this.style.borderColor='rgba(255,255,255,.2)'"></textarea>
      <button type="submit" class="btn-cta-primary" style="align-self:center;padding:.875rem 2.5rem;cursor:pointer;border:none">
        Send Message
      </button>
      <div id="sb-form-msg" style="text-align:center;font-size:.9rem;min-height:1.5rem"></div>
    </form>
  </div>
</section>
<script>
(function(){
  var form=document.getElementById('sb-contact-form');
  if(!form)return;
  var inputs=form.querySelectorAll('input,textarea');
  inputs.forEach(function(el){
    el.addEventListener('input',function(){el.style.color='#fff';});
  });
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var btn=form.querySelector('button[type="submit"]');
    var msg=document.getElementById('sb-form-msg');
    var orig=btn.textContent;
    btn.textContent='Sending...';btn.disabled=true;
    var sub=window.location.hostname.split('.storebuilder')[0]||window.location.hostname;
    var data={
      subdomain:sub,
      name:form.querySelector('[name="name"]').value,
      email:form.querySelector('[name="email"]').value,
      message:form.querySelector('[name="message"]').value
    };
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.success){
        form.innerHTML='<p style="color:#fff;font-weight:600;text-align:center;padding:2rem;font-size:1.125rem">Thank you! We will get back to you shortly.</p>';
      }else{
        msg.textContent=d.error||'Something went wrong. Please try again.';
        msg.style.color='#fca5a5';
        btn.textContent=orig;btn.disabled=false;
      }
    })
    .catch(function(){
      msg.textContent='Failed to send. Please check your connection and try again.';
      msg.style.color='#fca5a5';
      btn.textContent=orig;btn.disabled=false;
    });
  });
})();
</script>`;
}

function buildFooter(cfg: WebsiteConfig): string {
  const nicheLinks: Record<Niche, string[]> = {
    STORE:      ["Shop", "Collections", "Shipping Info", "Return Policy"],
    RESTAURANT: ["Menu", "Reservations", "Private Events", "Gift Cards"],
    SALON:      ["Services", "Book Online", "Gallery", "Gift Vouchers"],
    PORTFOLIO:  ["Work", "About", "Process", "Resume"],
    SAAS:       ["Features", "Pricing", "Documentation", "Status"],
    LANDING:    ["Features", "Pricing", "About", "Blog"],
    AGENCY:     ["Services", "Work", "About", "Careers"],
    EDUCATION:  ["Courses", "Instructors", "Blog", "FAQ"],
  };
  const links = nicheLinks[cfg.niche];
  const li = links.map(l => `<li><a href="#" data-editable="link">${l}</a></li>`).join("");
  return `
<footer data-editable="section" data-section-label="Footer" class="footer" id="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="footer-logo" data-editable="text">${cfg.businessName}</span>
        <p class="footer-tagline" data-editable="text">${cfg.tagline}</p>
      </div>
      <div>
        <p class="footer-col-title">Quick Links</p>
        <ul class="footer-links">${li}</ul>
      </div>
      <div>
        <p class="footer-col-title">Contact</p>
        <ul class="footer-links">
          <li><a href="mailto:hello@${cfg.businessName.toLowerCase().replace(/\s+/g, "")}.com" data-editable="link">Email Us</a></li>
          <li><a href="tel:+63" data-editable="link">+63 900 000 0000</a></li>
          <li><a href="#" data-editable="link">Philippines</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-copy" data-editable="text">© ${new Date().getFullYear()} ${cfg.businessName}. All rights reserved.</p>
      <p class="footer-copy" data-editable="text">Built with Storebuilder.ph</p>
    </div>
  </div>
</footer>`;
}

// ─── Main compiler ────────────────────────────────────────────────────────────

function compileWebsite(cfg: WebsiteConfig): string {
  const css = buildCSS(cfg);
  const sections = [
    buildNav(cfg),
    buildHero(cfg),
    buildFeatures(cfg),
    buildProducts(cfg),
    buildTestimonials(cfg),
    buildAbout(cfg),
    buildContact(cfg),
    buildFooter(cfg),
  ].join("\n");

  const pageSwitcherJS = `
<script>
(function(){
  // Hide all paged sections; show only those matching the current hash page.
  // The nav shows sections labelled: #home, #shop, #about, #contact
  // Sections without data-page (nav, footer) are always visible.
  var PAGES = ['home','shop','about','contact'];

  function getPage() {
    var h = window.location.hash.slice(1);
    return PAGES.indexOf(h) !== -1 ? h : 'home';
  }

  function showPage(page) {
    var sections = document.querySelectorAll('[data-page]');
    sections.forEach(function(el) {
      el.style.display = el.getAttribute('data-page') === page ? '' : 'none';
    });
    // Update nav active state
    var links = document.querySelectorAll('[data-page-link]');
    links.forEach(function(a) {
      if (a.getAttribute('data-page-link') === page) {
        a.classList.add('nav-active');
      } else {
        a.classList.remove('nav-active');
      }
    });
    // Close mobile nav if open
    var mob = document.getElementById('navMobile');
    if (mob) mob.classList.remove('open');
  }

  // Initial paint
  showPage(getPage());

  // Hash changes (nav clicks)
  window.addEventListener('hashchange', function() { showPage(getPage()); });

  // Intercept page-link clicks to close mobile menu before hash change fires
  document.querySelectorAll('[data-page-link]').forEach(function(a) {
    a.addEventListener('click', function() {
      var page = a.getAttribute('data-page-link');
      setTimeout(function(){ showPage(page); }, 0);
    });
  });
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.seoTitle}</title>
  <meta name="description" content="${cfg.seoDesc}">
  <style>${css}</style>
</head>
<body>
${sections}
${pageSwitcherJS}
</body>
</html>`;
}

// ─── Public API (same interface as before — zero breaking changes downstream) ──

export async function runNativeGenerator(
  userPrompt: string
): Promise<{ result: NativeGenerationResult; usage: NativeGenerationUsage }> {
  console.log("[DeterministicCompiler] building website locally — zero API calls");

  const cfg = buildConfig(userPrompt);
  const htmlContent = compileWebsite(cfg);

  console.log(
    `[DeterministicCompiler] done — niche:${cfg.niche} name:"${cfg.businessName}" html:${htmlContent.length} bytes`
  );

  return {
    result: {
      htmlContent,
      name: cfg.businessName,
      type: cfg.niche,
      seoTitle: cfg.seoTitle,
      seoDesc: cfg.seoDesc,
    },
    usage: {
      model: "deterministic-compiler-v1",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    },
  };
}
