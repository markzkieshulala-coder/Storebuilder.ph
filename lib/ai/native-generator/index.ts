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

// ─── Section builders — MDX Luxury Design System ─────────────────────────────
// All HTML uses classes from /css/style.css and /css/modules.css (public/css/).
// No embedded CSS — link tags in <head> load the luxury MDX stylesheet bundle.


function buildNav(cfg: WebsiteConfig): string {
  const nicheLinks: Record<Niche, Array<[string, string, string]>> = {
    STORE:      [["Home", "/", "home"], ["Shop", "/shop.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    RESTAURANT: [["Home", "/", "home"], ["Menu", "/menu.html", "shop"], ["About", "/about.html", "about"], ["Reservations", "/reservations.html", "contact"]],
    SALON:      [["Home", "/", "home"], ["Services", "/services.html", "shop"], ["About", "/about.html", "about"], ["Book Now", "/book.html", "contact"]],
    PORTFOLIO:  [["Home", "/", "home"], ["Work", "/work.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    SAAS:       [["Home", "/", "home"], ["Pricing", "/pricing.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    LANDING:    [["Home", "/", "home"], ["Features", "/features.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    AGENCY:     [["Home", "/", "home"], ["Services", "/services.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    EDUCATION:  [["Home", "/", "home"], ["Courses", "/courses.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
  };
  const links = nicheLinks[cfg.niche];
  const li = links.map(([label, href, page]) =>
    `<a href="${href}" class="mdx-nav__link" data-page-link="${page}" data-editable="link">${label}</a>`
  ).join("");
  return `
<nav class="mdx-nav" id="mdx-nav" data-editable="section" data-section-label="Navigation">
  <a href="/" class="mdx-nav__brand" data-page-link="home">
    <span class="mdx-nav__brand-mark" data-editable="text">${cfg.businessName}</span>
    <span class="mdx-nav__brand-sub" data-editable="text">Est. ${new Date().getFullYear()}</span>
  </a>
  <div class="mdx-nav__links" id="mdx-nav-links">${li}</div>
  <button class="mdx-nav__toggle" id="mdx-nav-toggle" aria-label="Toggle menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<script>
(function(){
  var nav=document.getElementById('mdx-nav');
  var toggle=document.getElementById('mdx-nav-toggle');
  if(toggle&&nav){toggle.addEventListener('click',function(){nav.classList.toggle('mdx-nav--mobile-open');});}
  window.addEventListener('scroll',function(){if(nav){if(window.scrollY>60)nav.classList.add('mdx-nav--scrolled');else nav.classList.remove('mdx-nav--scrolled');}});
})();
</script>`;
}

function buildHero(cfg: WebsiteConfig): string {
  const img = `https://images.unsplash.com/${cfg.heroImage}`;
  return `
<section data-editable="section" data-section-label="Hero" data-page="home" class="hero-canvas glow-orb" id="hero" style="padding-top:72px">
  <div class="hero-canvas__viewport">
    <img data-editable="image" class="hero-canvas__bg-img" src="${img}" alt="${cfg.businessName}">
    <div class="hero-canvas__overlay"></div>
  </div>
  <div class="hero-canvas__content">
    <span class="hero-canvas__eyebrow" data-editable="text">${cfg.businessName}</span>
    <h1 class="hero-canvas__title font-gradient-hero" data-editable="text">${cfg.tagline}</h1>
    <p class="hero-canvas__subtitle" data-editable="text">Serving thousands of happy customers across the Philippines. Quality you can trust, service you will love — every single time.</p>
    <div class="hero-canvas__actions">
      <a href="/shop.html" data-page-link="shop" class="btn-luxury btn-luxury-filled" data-editable="button">${cfg.ctaPrimary}</a>
      <a href="/about.html" data-page-link="about" class="btn-luxury" data-editable="button">${cfg.ctaSecondary}</a>
    </div>
  </div>
</section>`;
}

function buildFeatures(cfg: WebsiteConfig): string {
  const cards = cfg.features.map((f, i) => `
    <div class="feature-card" style="--card-index:${i}" data-editable="card">
      <div class="feature-card__visual" style="display:flex;align-items:center;justify-content:center;background:rgba(201,169,110,0.05);min-height:120px">
        <span style="font-family:'Playfair Display',serif;font-size:2.5rem;font-weight:300;color:rgba(201,169,110,0.4)">${f.icon}</span>
      </div>
      <div class="feature-card__img-overlay"></div>
      <div class="feature-card__lighting"></div>
      <div class="feature-card__body">
        <h3 class="feature-card__title" data-editable="text">${f.title}</h3>
        <p class="feature-card__desc" data-editable="text">${f.desc}</p>
        <span class="feature-card__arrow">→</span>
      </div>
    </div>`).join("");
  return `
<section data-editable="section" data-section-label="Features" data-page="home" class="feature-grid glow-ambient" id="features">
  <div class="feature-grid__header">
    <h2 class="feature-grid__heading font-gradient" data-editable="text">Why Choose ${cfg.businessName}</h2>
    <p class="feature-grid__subheading" data-editable="text">Everything we do is built around your satisfaction. Here is what sets us apart.</p>
  </div>
  <div class="feature-grid__grid">${cards}</div>
</section>`;
}

function buildProducts(cfg: WebsiteConfig): string {
  const sectionLabel: Record<Niche, string> = {
    STORE: "Our Products", RESTAURANT: "Our Menu", SALON: "Our Services",
    PORTFOLIO: "Featured Work", SAAS: "Pricing Plans", LANDING: "What We Offer",
    AGENCY: "Our Services", EDUCATION: "Our Courses",
  };
  const subHeadings: Record<Niche, string> = {
    STORE: "Carefully curated for quality and value.",
    RESTAURANT: "Fresh ingredients, bold flavours.",
    SALON: "Treatments tailored for you.",
    PORTFOLIO: "Selected work from recent projects.",
    SAAS: "Simple, transparent pricing.",
    LANDING: "Everything you need to succeed.",
    AGENCY: "Full-service solutions for modern brands.",
    EDUCATION: "Expert-led programmes for real results.",
  };
  const slides = cfg.products.map((p, i) => {
    const img = `https://images.unsplash.com/${p.image}`;
    const isEven = i % 2 === 1;
    return `
    <div class="cinematic-slide" style="${isEven ? "direction:rtl" : ""}" data-editable="section" data-section-label="${p.name}">
      <div class="cinematic-slide__visual" style="${isEven ? "direction:ltr" : ""}">
        <img class="cinematic-slide__img" data-editable="image" src="${img}" alt="${p.name}">
        <div class="cinematic-slide__img-overlay"></div>
        <div class="cinematic-slide__depth cinematic-slide__depth--back"></div>
        <div class="cinematic-slide__depth cinematic-slide__depth--mid"></div>
        <div class="cinematic-slide__depth cinematic-slide__depth--front"></div>
      </div>
      <div class="cinematic-slide__text" style="${isEven ? "direction:ltr" : ""}">
        <div class="cinematic-slide__meta">
          <span data-editable="text">${String(i + 1).padStart(2, "0")}</span>
          <span class="cinematic-slide__divider">&#x2014;</span>
          <span data-editable="text">${p.badge || sectionLabel[cfg.niche]}</span>
        </div>
        <h3 class="cinematic-slide__title" data-editable="text">${p.name}</h3>
        <p class="cinematic-slide__desc" data-editable="text">${p.desc}</p>
        <div style="margin-top:2rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
          <span style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:500;color:#C9A96E" data-editable="text">${p.price}</span>
          <a href="/contact.html" data-page-link="contact" class="btn-luxury btn-luxury-filled" data-editable="button" style="font-size:0.8rem;padding:0.5rem 1.5rem">${cfg.ctaPrimary}</a>
        </div>
      </div>
    </div>`;
  }).join("");
  return `
<section data-editable="section" data-section-label="${sectionLabel[cfg.niche]}" data-page="shop" class="cinematic-showcase" id="shop">
  <div class="cinematic-showcase__header">
    <h2 class="cinematic-showcase__heading font-gradient" data-editable="text">${sectionLabel[cfg.niche]}</h2>
    <p class="cinematic-showcase__subheading" data-editable="text">${subHeadings[cfg.niche]}</p>
  </div>
  <div class="cinematic-showcase__viewport">${slides}</div>
</section>`;
}

function buildTestimonials(cfg: WebsiteConfig): string {
  const cards = cfg.testimonials.map(t => {
    const initials = t.name.split(" ").map(w => w[0]).join("").slice(0, 2);
    return `
    <div class="philosophy-card float-depth-slow" data-editable="card">
      <div class="philosophy-card__num">"</div>
      <p data-editable="text" style="font-size:0.9375rem;font-weight:300;line-height:1.75;color:rgba(241,240,234,0.75);flex:1;margin-bottom:1.5rem">${t.quote}</p>
      <div style="display:flex;align-items:center;gap:0.875rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,0.06)">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(201,169,110,0.3),rgba(201,169,110,0.1));display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:600;color:#C9A96E;flex-shrink:0">${initials}</div>
        <div>
          <p style="font-size:0.875rem;font-weight:500;color:#F1F0EA" data-editable="text">${t.name}</p>
          <p style="font-size:0.75rem;color:rgba(201,169,110,0.7)" data-editable="text">${t.role}, ${t.company}</p>
        </div>
      </div>
    </div>`;
  }).join("");
  return `
<section data-editable="section" data-section-label="Testimonials" data-page="home" class="glow-ambient" id="testimonials" style="padding:10vh 4vw;background:#060607">
  <div style="text-align:center;max-width:640px;margin:0 auto 5rem">
    <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:500;letter-spacing:-0.01em;margin-bottom:1rem" class="font-gradient" data-editable="text">What Our Customers Say</h2>
    <p style="font-size:1rem;font-weight:300;line-height:1.7;color:rgba(241,240,234,0.5)" data-editable="text">Real words from real people who have experienced the ${cfg.businessName} difference.</p>
  </div>
  <div class="philosophy-grid" style="max-width:1400px;margin:0 auto">${cards}</div>
</section>`;
}

function buildAbout(cfg: WebsiteConfig): string {
  const aboutCopy: Record<Niche, { heading: string; body: string; stat1: string; stat1l: string; stat2: string; stat2l: string; stat3: string; stat3l: string }> = {
    STORE:      { heading: "Our Story", body: `${cfg.businessName} was born out of a passion for quality and a commitment to the Filipino customer. Every product we carry is hand-picked for durability, style, and value. We are more than just a shop — we are a brand you can trust.`, stat1: "50K+", stat1l: "Happy Customers", stat2: "4.9", stat2l: "Average Rating", stat3: "100%", stat3l: "Quality Guarantee" },
    RESTAURANT: { heading: "Our Heritage", body: `${cfg.businessName} has been crafting unforgettable dining experiences since its founding. We believe food is more than sustenance — it is memory, culture, and connection. Every dish tells the story of our kitchen's heart.`, stat1: "15+", stat1l: "Years of Service", stat2: "200+", stat2l: "Menu Items", stat3: "5-Star", stat3l: "Dining Rating" },
    SALON:      { heading: "About the Studio", body: `At ${cfg.businessName}, we combine artistry with expertise to help you look and feel your absolute best. Our team of licensed stylists and beauty professionals are dedicated to staying current with the latest trends and techniques.`, stat1: "10K+", stat1l: "Happy Clients", stat2: "15+", stat2l: "Expert Stylists", stat3: "8+", stat3l: "Years in Business" },
    PORTFOLIO:  { heading: "About Me", body: `I am a multidisciplinary designer and developer based in the Philippines, passionate about crafting digital experiences that are both beautiful and functional. With over 8 years of experience, I have helped startups and established brands achieve their vision.`, stat1: "8+", stat1l: "Years Experience", stat2: "120+", stat2l: "Projects Delivered", stat3: "98%", stat3l: "Client Satisfaction" },
    SAAS:       { heading: "Why We Built This", body: `${cfg.businessName} started when our founders noticed that most business tools were built for large enterprises, leaving Filipino SMEs behind. We set out to build a platform that is powerful enough for enterprise but simple enough for everyone.`, stat1: "10K+", stat1l: "Active Users", stat2: "99.9%", stat2l: "Uptime SLA", stat3: "4x", stat3l: "Faster Than Alternatives" },
    LANDING:    { heading: "Who We Are", body: `${cfg.businessName} is a team of dedicated professionals committed to helping businesses grow. We believe that every entrepreneur deserves access to world-class tools and strategies — regardless of their budget or technical background.`, stat1: "50K+", stat1l: "Businesses Served", stat2: "4.9", stat2l: "Average Rating", stat3: "3 Years", stat3l: "In the Industry" },
    AGENCY:     { heading: "About the Agency", body: `${cfg.businessName} is a full-service marketing agency built for the modern Philippine brand. We combine strategy, creativity, and data to help businesses grow faster, build stronger brands, and connect meaningfully with their audiences.`, stat1: "200+", stat1l: "Brands Served", stat2: "500M+", stat2l: "Revenue Generated", stat3: "5+", stat3l: "Industry Awards" },
    EDUCATION:  { heading: "Our Mission", body: `${cfg.businessName} exists to make world-class education accessible to every Filipino. We believe that the right knowledge and skills can transform lives — and we are committed to delivering them through practical, industry-relevant programmes.`, stat1: "25K+", stat1l: "Students Enrolled", stat2: "95%", stat2l: "Completion Rate", stat3: "100+", stat3l: "Expert Instructors" },
  };
  const a = aboutCopy[cfg.niche];
  return `
<section data-editable="section" data-section-label="About" data-page="about" class="page-section glow-ambient" id="about">
  <div class="page-section__inner" style="max-width:900px;margin:0 auto;text-align:center">
    <h2 class="page-section__heading font-gradient" data-editable="text">${a.heading}</h2>
    <p style="font-size:1.0625rem;font-weight:300;line-height:1.8;color:rgba(241,240,234,0.65);max-width:680px;margin:1.5rem auto 4rem" data-editable="text">${a.body}</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4rem;padding:3rem 0;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="text-align:center">
        <div style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3rem);font-weight:500;margin-bottom:0.5rem" class="font-gradient-gold" data-editable="text">${a.stat1}</div>
        <div style="font-size:0.6875rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:rgba(241,240,234,0.4)" data-editable="text">${a.stat1l}</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3rem);font-weight:500;margin-bottom:0.5rem" class="font-gradient-gold" data-editable="text">${a.stat2}</div>
        <div style="font-size:0.6875rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:rgba(241,240,234,0.4)" data-editable="text">${a.stat2l}</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3rem);font-weight:500;margin-bottom:0.5rem" class="font-gradient-gold" data-editable="text">${a.stat3}</div>
        <div style="font-size:0.6875rem;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:rgba(241,240,234,0.4)" data-editable="text">${a.stat3l}</div>
      </div>
    </div>
    <div style="margin-top:3rem">
      <a href="/contact.html" data-page-link="contact" class="btn-luxury btn-luxury-filled" data-editable="button">${cfg.ctaPrimary}</a>
    </div>
  </div>
</section>`;
}

function buildContact(cfg: WebsiteConfig): string {
  const labels: Record<Niche, { heading: string; sub: string }> = {
    STORE:      { heading: "Get in Touch", sub: "Have a question about an order? We typically reply within a few hours." },
    RESTAURANT: { heading: "Make a Reservation", sub: "Reserve your table or inquire about private events and catering." },
    SALON:      { heading: "Book an Appointment", sub: "Ready for a transformation? Fill in the form and we will confirm your slot." },
    PORTFOLIO:  { heading: "Start a Project", sub: "Tell me about your project and I will get back to you within 24 hours." },
    SAAS:       { heading: "Contact Sales", sub: "Interested in a plan? Our team will set up a personalised walkthrough." },
    LANDING:    { heading: "Get in Touch", sub: "Have questions? Send us a message and we will respond quickly." },
    AGENCY:     { heading: "Let's Work Together", sub: "Tell us about your brand and goals. Free consultation included." },
    EDUCATION:  { heading: "Enrol or Inquire", sub: "Send us a message about courses, schedules, or enrolment details." },
  };
  const l = labels[cfg.niche];
  return `
<section data-editable="section" data-section-label="Contact" data-page="contact" class="glow-ambient" id="contact" style="padding:10vh 4vw">
  <div style="max-width:680px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3.5rem">
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:500;letter-spacing:-0.01em;margin-bottom:1rem" class="font-gradient" data-editable="text">${l.heading}</h2>
      <p style="font-size:1rem;font-weight:300;line-height:1.7;color:rgba(241,240,234,0.5)" data-editable="text">${l.sub}</p>
    </div>
    <form id="sb-contact-form" class="contact-form">
      <div class="contact-form__field">
        <input type="text" name="name" class="contact-form__input" placeholder="Your Name" required>
      </div>
      <div class="contact-form__field">
        <input type="email" name="email" class="contact-form__input" placeholder="Your Email" required>
      </div>
      <div class="contact-form__field">
        <textarea name="message" class="contact-form__input" placeholder="Your message..." rows="5" required style="resize:vertical"></textarea>
      </div>
      <button type="submit" class="btn-luxury btn-luxury-filled" style="width:100%;justify-content:center;margin-top:0.5rem">Send Message</button>
      <div id="sb-form-msg" style="text-align:center;font-size:0.875rem;min-height:1.5rem;margin-top:0.75rem;color:#C9A96E"></div>
    </form>
  </div>
</section>
<script>
(function(){
  var form=document.getElementById('sb-contact-form');
  if(!form)return;
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
        form.innerHTML='<p style="color:#C9A96E;text-align:center;padding:2rem;font-size:1.125rem;font-weight:300">Thank you — we will be in touch shortly.</p>';
      }else{
        msg.textContent=d.error||'Something went wrong. Please try again.';
        btn.textContent=orig;btn.disabled=false;
      }
    })
    .catch(function(){
      msg.textContent='Failed to send. Please check your connection.';
      btn.textContent=orig;btn.disabled=false;
    });
  });
})();
</script>`;
}

function buildFooter(cfg: WebsiteConfig): string {
  const nicheLinks: Record<Niche, Array<[string, string, string]>> = {
    STORE:      [["Shop", "/shop.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    RESTAURANT: [["Menu", "/menu.html", "shop"], ["About", "/about.html", "about"], ["Reservations", "/reservations.html", "contact"]],
    SALON:      [["Services", "/services.html", "shop"], ["About", "/about.html", "about"], ["Book Now", "/book.html", "contact"]],
    PORTFOLIO:  [["Work", "/work.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    SAAS:       [["Pricing", "/pricing.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    LANDING:    [["Features", "/features.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    AGENCY:     [["Services", "/services.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
    EDUCATION:  [["Courses", "/courses.html", "shop"], ["About", "/about.html", "about"], ["Contact", "/contact.html", "contact"]],
  };
  const links = nicheLinks[cfg.niche];
  const li = links.map(([label, href, page]) =>
    `<li><a href="${href}" data-page-link="${page}" class="mdx-footer__col-link" data-editable="link">${label}</a></li>`
  ).join("");
  return `
<footer data-editable="section" data-section-label="Footer" class="mdx-footer" id="footer">
  <div class="mdx-footer__line"></div>
  <div class="mdx-footer__top">
    <div class="mdx-footer__brand">
      <span class="mdx-footer__brand-mark font-gradient-gold" data-editable="text">${cfg.businessName}</span>
      <p class="mdx-footer__brand-tagline" data-editable="text">${cfg.tagline}</p>
    </div>
    <div class="mdx-footer__sitemap">
      <div>
        <p class="mdx-footer__col-title">Navigation</p>
        <ul class="mdx-footer__col-list">${li}</ul>
      </div>
      <div>
        <p class="mdx-footer__col-title">Contact</p>
        <ul class="mdx-footer__col-list">
          <li><a href="#" class="mdx-footer__col-link" data-editable="link">Email Us</a></li>
          <li><a href="tel:+63" class="mdx-footer__col-link" data-editable="link">+63 900 000 0000</a></li>
          <li><a href="#" class="mdx-footer__col-link" data-editable="link">Philippines</a></li>
        </ul>
      </div>
    </div>
  </div>
  <div class="mdx-footer__bottom">
    <p class="mdx-footer__copy" data-editable="text">© ${new Date().getFullYear()} ${cfg.businessName}. All rights reserved.</p>
    <p class="mdx-footer__copy">Built with Storebuilder.ph</p>
  </div>
</footer>`;
}

// ─── Main compiler ────────────────────────────────────────────────────────────

function compileWebsite(cfg: WebsiteConfig): string {
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

  // Virtual multi-page router: intercepts <a data-page-link="X"> clicks,
  // pushes a real-looking /page.html URL with history.pushState, shows/hides
  // sections tagged data-page="X". Back/forward buttons work naturally.
  const virtualRouterJS = `
<script>
(function(){
  var PAGES=['home','shop','about','contact'];
  var PATH_MAP={'/':'home','/index.html':'home','/shop.html':'shop','/menu.html':'shop','/services.html':'shop','/work.html':'shop','/pricing.html':'shop','/features.html':'shop','/courses.html':'shop','/about.html':'about','/contact.html':'contact','/reservations.html':'contact','/book.html':'contact'};

  function showPage(page){
    document.querySelectorAll('[data-page]').forEach(function(el){
      el.style.display=el.getAttribute('data-page')===page?'':'none';
    });
    document.querySelectorAll('.mdx-nav__link,.mdx-footer__col-link').forEach(function(a){
      a.classList.toggle('mdx-nav__link--active',a.getAttribute('data-page-link')===page);
    });
    var nav=document.getElementById('mdx-nav');
    if(nav)nav.classList.remove('mdx-nav--mobile-open');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function pageFromPath(p){
    var clean=p.replace(/\?.*$/,'').replace(/#.*$/,'');
    return PATH_MAP[clean]||'home';
  }

  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('[data-page-link]'):null;
    if(!a)return;
    var page=a.getAttribute('data-page-link');
    if(!page||PAGES.indexOf(page)===-1)return;
    e.preventDefault();
    var href=a.getAttribute('href')||'/';
    history.pushState({page:page},'',href);
    showPage(page);
  });

  window.addEventListener('popstate',function(e){
    var page=(e.state&&e.state.page)?e.state.page:pageFromPath(location.pathname);
    showPage(page);
  });

  var init=pageFromPath(location.pathname);
  showPage(init);
  history.replaceState({page:init},'',location.href);
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.seoTitle}</title>
  <meta name="description" content="${cfg.seoDesc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/modules.css">
</head>
<body>
${sections}
${virtualRouterJS}
</body>
</html>`;
}

// ─── Public API (same interface — zero breaking changes downstream) ────────────

export async function runNativeGenerator(
  userPrompt: string
): Promise<{ result: NativeGenerationResult; usage: NativeGenerationUsage }> {
  console.log("[MDXCompiler] building luxury website locally — zero API calls");

  const cfg = buildConfig(userPrompt);
  const htmlContent = compileWebsite(cfg);

  console.log(
    `[MDXCompiler] done — niche:${cfg.niche} name:"${cfg.businessName}" html:${htmlContent.length} bytes`
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
      model: "mdx-deterministic-compiler-v4",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    },
  };
}
