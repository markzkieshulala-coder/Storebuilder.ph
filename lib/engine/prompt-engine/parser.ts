/**
 * Universal Prompt Parser Engine
 * Dynamic, template-free design intent extraction
 */

import {
  PromptUnderstandingObject,
  ParserConfig,
  DEFAULT_PARSER_CONFIG,
  ParseResult,
  VisualMood,
  DesignStyle,
  WebsitePersonality,
  VisualDensity,
  ModernityLevel,
  BusinessTone,
  ConversionStyle,
  AnimationExpectation,
  LayoutDirection,
  TypographyDirection,
  CompositionExpectation,
  InteractionExpectation,
  ImageDirection,
  BrandingDirection,
  MotionDirection,
  ColorPalette,
  TypographyConfig,
  SpacingConfig,
  BorderRadiusConfig,
  ShadowConfig,
  AnimationConfig,
  LayoutConfig,
  UXConfig,
  PageStructureItem,
} from "./types";

// ───────────────────────────────────────────────────────────────
// DYNAMIC VOCABULARY ENGINE
// ───────────────────────────────────────────────────────────────

interface VocabularyToken {
  terms: string[]; // synonyms / surface forms
  category: string;
  weight: number;
  polarity: "positive" | "negative" | "neutral";
  contextHints?: string[];
}

const VOCABULARY: VocabularyToken[] = [
  // ── Visual Mood ──
  { terms: ["dark", "night", "midnight", "noir", "shadow", "obsidian", "black", "dim"], category: "visualMood:dark", weight: 1.0, polarity: "neutral" },
  { terms: ["light", "bright", "airy", "white", "pastel", "sunlight", "day", "clean"], category: "visualMood:light", weight: 1.0, polarity: "positive" },
  { terms: ["contrast", "bold contrast", "high contrast", "striking"], category: "visualMood:contrast", weight: 1.0, polarity: "positive" },
  { terms: ["muted", "soft", "subdued", "desaturated", "tinted"], category: "visualMood:muted", weight: 1.0, polarity: "neutral" },
  { terms: ["vibrant", "loud", "saturated", "neon", "electric", "bold color"], category: "visualMood:vibrant", weight: 1.0, polarity: "positive" },
  { terms: ["ethereal", "dreamy", "floaty", "foggy", "mist", "heavenly"], category: "visualMood:ethereal", weight: 1.0, polarity: "positive" },
  { terms: ["dramatic", "intense", "theatrical", "cinematic light", "chiaroscuro"], category: "visualMood:dramatic", weight: 1.0, polarity: "positive" },
  { terms: ["warm", "cozy", "earthy", "terracotta", "amber", "golden"], category: "visualMood:warm", weight: 1.0, polarity: "positive" },
  { terms: ["cold", "icy", "steel", "arctic", "frost", "blue tone"], category: "visualMood:cold", weight: 1.0, polarity: "neutral" },

  // ── Design Style ──
  { terms: ["minimal", "minimalist", "simple", "less is more", "stripped", "bare", "essential"], category: "designStyle:minimal", weight: 1.0, polarity: "positive" },
  { terms: ["brutalist", "brutalism", "raw", "unfinished", "concrete", "harsh", "ugly", "anti-design"], category: "designStyle:brutalist", weight: 1.0, polarity: "neutral" },
  { terms: ["glassmorphism", "frosted", "glass", "transparent", "blur", "see-through"], category: "designStyle:glassmorphism", weight: 1.0, polarity: "positive" },
  { terms: ["neumorphism", "soft ui", "extruded", "inset", "bevel", "plastic"], category: "designStyle:neumorphism", weight: 1.0, polarity: "neutral" },
  { terms: ["skeuomorphic", "realistic", "3d", "life-like", "texture"], category: "designStyle:skeuomorphic", weight: 1.0, polarity: "neutral" },
  { terms: ["flat", "flat design", "material", "google style"], category: "designStyle:flat", weight: 1.0, polarity: "positive" },
  { terms: ["cyberpunk", "neon-noir", "blade runner", "hacker", "retro future"], category: "designStyle:cyberpunk", weight: 1.0, polarity: "positive" },
  { terms: ["futuristic", "future", "sci-fi", "space", "tech-forward", "tomorrow"], category: "designStyle:futuristic", weight: 1.0, polarity: "positive" },
  { terms: ["retro", "vintage", "old school", "nostalgia", "80s", "90s"], category: "designStyle:retro", weight: 1.0, polarity: "neutral" },
  { terms: ["editorial", "magazine", "newspaper", "vogue", "publication", "article-first"], category: "designStyle:editorial", weight: 1.0, polarity: "positive" },
  { terms: ["corporate", "business", "b2b", "professional", "institutional"], category: "designStyle:corporate", weight: 1.0, polarity: "neutral" },
  { terms: ["playful", "fun", "whimsical", "cartoon", "cheerful", "bouncy"], category: "designStyle:playful", weight: 1.0, polarity: "positive" },
  { terms: ["artistic", "gallery", "museum", "creative", "studio", "craft"], category: "designStyle:artistic", weight: 1.0, polarity: "positive" },
  { terms: ["luxury", "luxurious", "high-end", "exclusive", "rich", "gold", "velvet"], category: "designStyle:luxury", weight: 1.0, polarity: "positive" },
  { terms: ["premium", "quality", "crafted", "refined", "sophisticated", "upscale"], category: "designStyle:premium", weight: 0.9, polarity: "positive" },
  { terms: ["startup", "founder", "mvp", "lean", "growth", "hustle"], category: "designStyle:startup", weight: 1.0, polarity: "positive" },
  { terms: ["enterprise", "saas", "dashboard", "b2b", "scale"], category: "designStyle:enterprise", weight: 1.0, polarity: "neutral" },
  { terms: ["cinematic", "film", "movie", " widescreen", "scope", "epic"], category: "designStyle:cinematic", weight: 1.0, polarity: "positive" },
  { terms: ["high-tech", "technology", "ai", "software", "engineering", "technical"], category: "designStyle:high-tech", weight: 1.0, polarity: "positive" },
  { terms: ["organic", "nature", "natural", "biomorphic", "flowing", "soft shapes"], category: "designStyle:organic", weight: 1.0, polarity: "positive" },
  { terms: ["industrial", "factory", "metal", "workshop", "machinery", "engine"], category: "designStyle:industrial", weight: 1.0, polarity: "neutral" },
  { terms: ["vaporwave", "aesthetic", "lo-fi", "synthwave", "retrowave"], category: "designStyle:vaporwave", weight: 1.0, polarity: "neutral" },

  // ── Personality ──
  { terms: ["bold", "daring", "confident", "loud", "strong", "powerful"], category: "websitePersonality:bold", weight: 1.0, polarity: "positive" },
  { terms: ["elegant", "graceful", "refined", "delicate", "chic", "classy"], category: "websitePersonality:elegant", weight: 1.0, polarity: "positive" },
  { terms: ["aggressive", "intense", "forceful", "dominant", "alpha"], category: "websitePersonality:aggressive", weight: 1.0, polarity: "neutral" },
  { terms: ["friendly", "welcoming", "warm", "approachable", "inviting", "open"], category: "websitePersonality:friendly", weight: 1.0, polarity: "positive" },
  { terms: ["authoritative", "expert", "definitive", "trusted", "official"], category: "websitePersonality:authoritative", weight: 1.0, polarity: "positive" },
  { terms: ["whimsical", "quirky", "odd", "strange", "unique", "unconventional"], category: "websitePersonality:whimsical", weight: 1.0, polarity: "positive" },
  { terms: ["serious", "grave", "formal", "strict", "no-nonsense"], category: "websitePersonality:serious", weight: 1.0, polarity: "neutral" },
  { terms: ["exclusive", "private", "members-only", "elite", "vip", "invitation"], category: "websitePersonality:exclusive", weight: 1.0, polarity: "positive" },
  { terms: ["energetic", "dynamic", "lively", "pulsing", "alive", "vibrant personality"], category: "websitePersonality:energetic", weight: 1.0, polarity: "positive" },
  { terms: ["calm", "peaceful", "serene", "tranquil", "zen", "meditative"], category: "websitePersonality:calm", weight: 1.0, polarity: "positive" },
  { terms: ["rebellious", "anti", "punk", "underground", "counter-culture"], category: "websitePersonality:rebellious", weight: 1.0, polarity: "neutral" },
  { terms: ["sophisticated", "smart", "intellectual", "cultured", "worldly"], category: "websitePersonality:sophisticated", weight: 1.0, polarity: "positive" },
  { terms: ["youthful", "young", "fresh", "gen-z", "trendy", "hype"], category: "websitePersonality:youthful", weight: 1.0, polarity: "positive" },
  { terms: ["trustworthy", "reliable", "safe", "secure", "honest", "transparent"], category: "websitePersonality:trustworthy", weight: 1.0, polarity: "positive" },
  { terms: ["innovative", "cutting edge", "new", "experimental", "never seen"], category: "websitePersonality:innovative", weight: 1.0, polarity: "positive" },
  { terms: ["timeless", "classic", "evergreen", "enduring", "permanent"], category: "websitePersonality:timeless", weight: 1.0, polarity: "positive" },
  { terms: ["experimental", "avant-garde", "boundary-pushing", "art piece"], category: "websitePersonality:experimental", weight: 1.0, polarity: "neutral" },

  // ── Visual Density ──
  { terms: ["sparse", "empty", "vast", "white space", "breathing room", "isolated"], category: "visualDensity:sparse", weight: 1.0, polarity: "neutral" },
  { terms: ["airy", "open", "loose", "lightweight", "spread out"], category: "visualDensity:airy", weight: 1.0, polarity: "positive" },
  { terms: ["balanced", "proportional", "even", "harmonious"], category: "visualDensity:balanced", weight: 1.0, polarity: "positive" },
  { terms: ["dense", "rich", "packed", "full", "loaded", "information-rich"], category: "visualDensity:dense", weight: 1.0, polarity: "neutral" },
  { terms: ["maximalist", "more is more", "clutter", "ornate", "decorative", "baroque"], category: "visualDensity:maximalist", weight: 1.0, polarity: "neutral" },

  // ── Modernity ──
  { terms: ["cutting-edge", "bleeding edge", "latest", "never done", "groundbreaking"], category: "modernityLevel:cutting-edge", weight: 1.0, polarity: "positive" },
  { terms: ["modern", "current", "today", "2020s", "up to date"], category: "modernityLevel:modern", weight: 1.0, polarity: "positive" },
  { terms: ["classic", "traditional", "old", "established", "heritage", "legacy"], category: "modernityLevel:classic", weight: 1.0, polarity: "neutral" },
  { terms: ["avant-garde", "experimental", "future", "tomorrow", "sci-fi"], category: "modernityLevel:avant-garde", weight: 1.0, polarity: "positive" },

  // ── Business Tone ──
  { terms: ["professional", "corporate", "business", "executive", "suit"], category: "businessTone:professional", weight: 1.0, polarity: "positive" },
  { terms: ["casual", "laid back", "relaxed", "informal", "easygoing"], category: "businessTone:casual", weight: 1.0, polarity: "positive" },
  { terms: ["playful", "fun", "loose", "humor", "jokes", "memes"], category: "businessTone:playful", weight: 1.0, polarity: "positive" },
  { terms: ["technical", "engineer", "developer", "code", "api", "docs"], category: "businessTone:technical", weight: 1.0, polarity: "neutral" },
  { terms: ["luxury", "luxurious", "premium", "vip", "concierge", "white glove"], category: "businessTone:luxury", weight: 1.0, polarity: "positive" },
  { terms: ["accessible", "easy", "simple", "for everyone", "inclusive", "friendly"], category: "businessTone:accessible", weight: 1.0, polarity: "positive" },
  { terms: ["disruptive", "revolutionary", "game changer", "challenge", "rebel"], category: "businessTone:disruptive", weight: 1.0, polarity: "positive" },
  { terms: ["authoritative", "expert", "definitive", "official", "leader"], category: "businessTone:authoritative", weight: 1.0, polarity: "positive" },
  { terms: ["empathetic", "caring", "human", "kind", "gentle", "supportive"], category: "businessTone:empathetic", weight: 1.0, polarity: "positive" },

  // ── Conversion Style ──
  { terms: ["hard sell", "buy now", "limited", "scarcity", "fomo", "urgent"], category: "conversionStyle:hard-sell", weight: 1.0, polarity: "neutral" },
  { terms: ["soft sell", "gentle", "nurture", "relationship", "warm"], category: "conversionStyle:soft-sell", weight: 1.0, polarity: "positive" },
  { terms: ["consultative", "advisor", "help", "solution", "guide"], category: "conversionStyle:consultative", weight: 1.0, polarity: "positive" },
  { terms: ["story-driven", "narrative", "journey", "storytelling", "arc"], category: "conversionStyle:story-driven", weight: 1.0, polarity: "positive" },
  { terms: ["product-first", "showcase", "demo", "feature", "screenshot"], category: "conversionStyle:product-first", weight: 1.0, polarity: "neutral" },
  { terms: ["trust-first", "credibility", "proof", "testimonials", "social proof"], category: "conversionStyle:trust-first", weight: 1.0, polarity: "positive" },

  // ── Layout Direction ──
  { terms: ["single page", "one page", "no navigation", "scroll only", "landing"], category: "layoutDirection:single-page", weight: 1.0, polarity: "neutral" },
  { terms: ["multi page", "website", "pages", "navigation", "menu"], category: "layoutDirection:multi-page", weight: 1.0, polarity: "neutral" },
  { terms: ["scrollytelling", "scroll story", "narrative scroll", "journey"], category: "layoutDirection:scrollytelling", weight: 1.0, polarity: "positive" },
  { terms: ["dashboard", "admin", "panel", "analytics", "metrics"], category: "layoutDirection:dashboard", weight: 1.0, polarity: "neutral" },
  { terms: ["application", "app", "web app", "tool", "platform", "software"], category: "layoutDirection:application", weight: 1.0, polarity: "neutral" },
  { terms: ["portfolio", "gallery", "showcase", "work", "projects", "case studies"], category: "layoutDirection:portfolio", weight: 1.0, polarity: "neutral" },
  { terms: ["e-commerce", "shop", "store", "product", "cart", "checkout", "buy"], category: "layoutDirection:e-commerce", weight: 1.0, polarity: "neutral" },
  { terms: ["saas", "subscription", "pricing", "plans", "features", "onboarding"], category: "layoutDirection:saas", weight: 1.0, polarity: "neutral" },
  { terms: ["lead gen", "contact", "form", "capture", "signup", "book"], category: "layoutDirection:lead-gen", weight: 1.0, polarity: "neutral" },
  { terms: ["editorial", "blog", "articles", "content", "publication"], category: "layoutDirection:editorial", weight: 1.0, polarity: "neutral" },
  { terms: ["showcase", "presentation", "deck", "highlight", "feature"], category: "layoutDirection:showcase", weight: 1.0, polarity: "neutral" },
  { terms: ["documentation", "docs", "guide", "reference", "manual", "help"], category: "layoutDirection:documentation", weight: 1.0, polarity: "neutral" },

  // ── Animation Expectation ──
  { terms: ["no animation", "static", "no motion", "still", "frozen"], category: "animationExpectation:none", weight: 1.0, polarity: "neutral" },
  { terms: ["subtle animation", "gentle", "soft motion", "barely there"], category: "animationExpectation:subtle", weight: 1.0, polarity: "positive" },
  { terms: ["moderate animation", "some motion", "balanced", "normal"], category: "animationExpectation:moderate", weight: 1.0, polarity: "positive" },
  { terms: ["heavy animation", "lots of motion", "animated", "lively"], category: "animationExpectation:heavy", weight: 1.0, polarity: "neutral" },
  { terms: ["cinematic", "film-like", "epic animation", "dramatic motion"], category: "animationExpectation:cinematic", weight: 1.0, polarity: "positive" },
  { terms: ["playful animation", "fun", "bouncy", "cartoon", "cheerful"], category: "animationExpectation:playful", weight: 1.0, polarity: "positive" },
  { terms: ["scroll animation", "scroll trigger", "parallax", "scroll-linked"], category: "animationExpectation:scroll-driven", weight: 1.0, polarity: "positive" },
  { terms: ["micro interaction", "hover", "click", "button", "feedback"], category: "animationExpectation:micro-interaction-focused", weight: 1.0, polarity: "positive" },

  // ── Typography ──
  { terms: ["serif", "times", "elegant font", "classical type", "traditional font"], category: "typographyDirection:serif-dominant", weight: 1.0, polarity: "neutral" },
  { terms: ["sans", "helvetica", "clean font", "modern type", "geometric"], category: "typographyDirection:sans-dominant", weight: 1.0, polarity: "positive" },
  { terms: ["monospace", "code font", "typewriter", "terminal", "fixed width"], category: "typographyDirection:mono-dominant", weight: 1.0, polarity: "neutral" },
  { terms: ["big type", "huge text", "oversized", "display", "large heading", "giant"], category: "typographyDirection:oversized", weight: 1.0, polarity: "positive" },
  { terms: ["small type", "tiny", "micro", "fine print", "compact text"], category: "typographyDirection:tiny", weight: 1.0, polarity: "neutral" },
  { terms: ["editorial type", "newspaper", "magazine", "columns", "pull quote"], category: "typographyDirection:editorial", weight: 1.0, polarity: "positive" },

  // ── Composition ──
  { terms: ["centered", "center", "middle", "symmetric", "balanced"], category: "compositionExpectation:centered", weight: 1.0, polarity: "positive" },
  { terms: ["asymmetric", "off center", "broken grid", "masonry", "uneven"], category: "compositionExpectation:asymmetric", weight: 1.0, polarity: "positive" },
  { terms: ["grid", "columns", "rows", "aligned", "structured", "order"], category: "compositionExpectation:grid-strict", weight: 1.0, polarity: "positive" },
  { terms: ["freeform", "organic", "flowing", "random", "chaos", "no grid"], category: "compositionExpectation:freeform", weight: 1.0, polarity: "neutral" },
  { terms: ["split screen", "half", "side by side", "two panel", "divider"], category: "compositionExpectation:split", weight: 1.0, polarity: "neutral" },
  { terms: ["layered", "stacked", "depth", "overlap", "z-index"], category: "compositionExpectation:layered", weight: 1.0, polarity: "neutral" },
  { terms: ["diagonal", "slant", "tilt", "angle", "oblique"], category: "compositionExpectation:diagonal", weight: 1.0, polarity: "neutral" },
  { terms: ["bento", "bento grid", "card grid", "tile", "box layout"], category: "compositionExpectation:bento", weight: 1.0, polarity: "positive" },
  { terms: ["magazine", "editorial layout", "spread", "cover page"], category: "compositionExpectation:magazine", weight: 1.0, polarity: "positive" },

  // ── Interaction ──
  { terms: ["hover", "mouse", "cursor", "pointer", "rollover"], category: "interactionExpectation:hover-reactive", weight: 1.0, polarity: "neutral" },
  { terms: ["scroll", "scroll-driven", "wheel", "swipe", "gesture"], category: "interactionExpectation:scroll-driven", weight: 1.0, polarity: "neutral" },
  { terms: ["click", "tap", "press", "action", "button", "interaction"], category: "interactionExpectation:click-driven", weight: 1.0, polarity: "neutral" },
  { terms: ["micro interaction", "detail", "small feedback", "state change"], category: "interactionExpectation:micro-interaction-heavy", weight: 1.0, polarity: "positive" },
  { terms: ["passive", "read only", "static", "no interaction", "view"], category: "interactionExpectation:passive", weight: 1.0, polarity: "neutral" },

  // ── Image Direction ──
  { terms: ["photo", "photography", "image", "picture", "portrait", "landscape", "real"], category: "imageDirection:photography-heavy", weight: 1.0, polarity: "neutral" },
  { terms: ["illustration", "drawing", "sketch", "art", "painting", "vector"], category: "imageDirection:illustration-heavy", weight: 1.0, polarity: "neutral" },
  { terms: ["icon", "symbol", "glyph", "pictogram", "icon set"], category: "imageDirection:iconography-heavy", weight: 1.0, polarity: "neutral" },
  { terms: ["abstract", "shape", "form", "pattern", "texture", "gradient"], category: "imageDirection:abstract-visuals", weight: 1.0, polarity: "neutral" },
  { terms: ["3d", "three dimensional", "render", "c4d", "blender", "model"], category: "imageDirection:3d-rendered", weight: 1.0, polarity: "neutral" },
  { terms: ["data", "chart", "graph", "visualization", "infographic", "analytics"], category: "imageDirection:data-visualization", weight: 1.0, polarity: "neutral" },
  { terms: ["no image", "text only", "no photo", "no visual"], category: "imageDirection:minimal-imagery", weight: 1.0, polarity: "neutral" },

  // ── Branding ──
  { terms: ["logo", "mark", "symbol", "brand mark", "emblem"], category: "brandingDirection:logo-centric", weight: 1.0, polarity: "neutral" },
  { terms: ["type brand", "wordmark", "text logo", "font logo"], category: "brandingDirection:type-centric", weight: 1.0, polarity: "neutral" },
  { terms: ["color brand", "colorful", "rainbow", "gradient brand"], category: "brandingDirection:color-centric", weight: 1.0, polarity: "neutral" },
  { terms: ["mascot", "character", "avatar", "face", "creature"], category: "brandingDirection:mascot-centric", weight: 1.0, polarity: "neutral" },
  { terms: ["pattern", "repeat", "tile", "motif", "texture"], category: "brandingDirection:pattern-centric", weight: 1.0, polarity: "neutral" },
  { terms: ["minimal brand", "no logo", "subtle brand", "quiet"], category: "brandingDirection:minimal-branding", weight: 1.0, polarity: "neutral" },

  // ── Motion Direction ──
  { terms: ["parallax", "depth scroll", "layered scroll", "multiplane"], category: "motionDirection:parallax", weight: 1.0, polarity: "positive" },
  { terms: ["reveal", "unveil", "show", "appear", "fade in", "slide in"], category: "motionDirection:reveal", weight: 1.0, polarity: "positive" },
  { terms: ["continuous", "loop", "infinite", "spin", "pulse", "ambient"], category: "motionDirection:continuous", weight: 1.0, polarity: "neutral" },
  { terms: ["triggered", "on click", "on hover", "on scroll", "event"], category: "motionDirection:triggered", weight: 1.0, polarity: "neutral" },
  { terms: ["physics", "spring", "bounce", "gravity", "elastic", "inertia"], category: "motionDirection:physics-based", weight: 1.0, polarity: "neutral" },
  { terms: ["timeline", "sequence", "step", "scene", "act"], category: "motionDirection:timeline", weight: 1.0, polarity: "neutral" },
  { terms: ["ambient", "background", "subtle", "wallpaper", "decorative"], category: "motionDirection:ambient", weight: 1.0, polarity: "neutral" },
  { terms: ["page transition", "route change", "screen", "navigate"], category: "motionDirection:page-transition", weight: 1.0, polarity: "neutral" },

  // ── Negative / Exclusionary ──
  { terms: ["no animation", "no motion", "no video", "static", "no parallax"], category: "negation:motion", weight: -1.0, polarity: "neutral" },
  { terms: ["no grid", "no columns", "no structure", "chaos", "random"], category: "negation:structure", weight: -1.0, polarity: "neutral" },
  { terms: ["no color", "monochrome", "black and white", "grayscale"], category: "negation:color", weight: -1.0, polarity: "neutral" },
  { terms: ["no header", "hide nav", "invisible menu", "clean top"], category: "negation:header", weight: -1.0, polarity: "neutral" },

  // ── Spacing ──
  { terms: ["tight", "compact", "cramped", "small gap", "narrow"], category: "spacingExpectation:compact", weight: 1.0, polarity: "neutral" },
  { terms: ["generous", "spacious", "big gap", "roomy", "loose"], category: "spacingExpectation:generous", weight: 1.0, polarity: "positive" },
  { terms: ["expansive", "huge", "vast", "massive", "open"], category: "spacingExpectation:expansive", weight: 1.0, polarity: "positive" },
  { terms: ["asymmetric spacing", "uneven", "rhythm", "beat"], category: "spacingExpectation:asymmetric-spacing", weight: 1.0, polarity: "neutral" },
];

// ───────────────────────────────────────────────────────────────
// ENTITY EXTRACTORS
// ───────────────────────────────────────────────────────────────

interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  position: number;
}

const ENTITY_PATTERNS: Array<{ type: string; regex: RegExp; normalizer: (match: string) => string }> = [
  {
    type: "color",
    regex: /\b(red|green|blue|yellow|orange|purple|pink|black|white|gray|grey|brown|cyan|magenta|teal|indigo|violet|gold|silver|beige|navy|maroon|olive|lime|turquoise|lavender|peach|cream|charcoal|slate|ivory|mint|coral|amber|rose|slate|zinc|stone|emerald|sapphire|ruby|topaz)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "hex_color",
    regex: /#([0-9A-Fa-f]{3,8})\b/g,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "number",
    regex: /\b(\d+)\b/g,
    normalizer: (m) => m,
  },
  {
    type: "dimension",
    regex: /\b(\d+(?:\.\d+)?)\s*(px|rem|em|vh|vw|%|pt|cm|inch)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "font_family",
    regex: /\b(helvetica|arial|times new roman|georgia|verdana|roboto|inter|poppins|montserrat|open sans|lato|playfair|oswald|space grotesk|outfit|sora|calibre|circular|sohne|editorial|domaine|freight|gt america|suisse|apercu|graphik|founders grotesk|basement|clash|lenox)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "industry",
    regex: /\b(fashion|streetwear|apparel|clothing|technology|tech|software|health|fitness|crossfit|gym|workout|finance|fintech|food|restaurant|cafe|coffee|bakery|bistro|diner|brewery|sports|athletic|travel|hotel|resort|education|automotive|music|entertainment|gaming|art|photography|photographer|law|legal|consulting|marketing|advertising|saas|ecommerce|retail|boutique|beauty|salon|spa|wellness|yoga|meditation|crypto|blockchain|startup|agency|studio|design|architecture|interior|nonprofit|portfolio)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "audience",
    regex: /\b(gen z|gen z|millennial|boomer|teen|young|adult|professional|executive|developer|designer|creative|entrepreneur|founder|investor|consumer|customer|client|patient|student|teacher|parent|kid|child|senior|luxury buyer|budget buyer|enterprise|small business|freelancer|artist|musician|athlete|traveler|foodie|health conscious|tech savvy|beginner|expert|intermediate)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
  {
    type: "emotion",
    regex: /\b(exciting|calming|inspiring|motivating|trustworthy|innovative|luxurious|playful|serious|friendly|aggressive|elegant|bold|subtle|powerful|gentle|warm|cool|dramatic|peaceful|energetic|dynamic|innovative|creative|professional|casual|fun|happy|sad|angry|fear|surprise|disgust|love|joy|trust|anticipation)\b/gi,
    normalizer: (m) => m.toLowerCase(),
  },
];

// ───────────────────────────────────────────────────────────────
// SEMANTIC PROCESSOR
// ───────────────────────────────────────────────────────────────

interface TokenMatch {
  token: VocabularyToken;
  score: number;
  position: number;
  context: string;
}

function tokenizePrompt(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^\w\s\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function ngrams(tokens: string[], maxN: number = 4): string[] {
  const result: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      result.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return result;
}

function findTokenMatches(prompt: string): TokenMatch[] {
  const tokens = tokenizePrompt(prompt);
  const allNgrams = ngrams(tokens, 4);
  const matches: TokenMatch[] = [];

  for (const token of VOCABULARY) {
    for (const term of token.terms) {
      const termWords = term.toLowerCase().split(/\s+/);
      // Single word match
      if (termWords.length === 1) {
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === termWords[0]) {
            matches.push({
              token,
              score: token.weight,
              position: i,
              context: tokens.slice(Math.max(0, i - 3), Math.min(tokens.length, i + 4)).join(" "),
            });
          }
        }
      } else {
        // Multi-word match
        for (const ng of allNgrams) {
          if (ng === term.toLowerCase()) {
            matches.push({
              token,
              score: token.weight * 1.2, // boost multi-word matches
              position: tokens.indexOf(termWords[0]),
              context: ng,
            });
          }
        }
      }
    }
  }

  return matches;
}

function aggregateMatches(matches: TokenMatch[]): Record<string, { score: number; examples: string[] }> {
  const agg: Record<string, { score: number; examples: string[] }> = {};
  for (const m of matches) {
    const key = m.token.category;
    if (!agg[key]) {
      agg[key] = { score: 0, examples: [] };
    }
    agg[key].score += m.score;
    if (!agg[key].examples.includes(m.context)) {
      agg[key].examples.push(m.context);
    }
  }
  return agg;
}

function pickHighest<T extends string>(agg: Record<string, { score: number; examples: string[] }>, prefix: string, fallback: T): T {
  let best: { key: string; score: number } | null = null;
  for (const [key, val] of Object.entries(agg)) {
    if (key.startsWith(prefix + ":")) {
      if (!best || val.score > best.score) {
        best = { key, score: val.score };
      }
    }
  }
  return best ? (best.key.split(":")[1] as T) : fallback;
}

function pickMultiple<T extends string>(agg: Record<string, { score: number; examples: string[] }>, prefix: string, max: number = 3): T[] {
  const candidates = Object.entries(agg)
    .filter(([k]) => k.startsWith(prefix + ":"))
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, max)
    .map(([k]) => k.split(":")[1] as T);
  return candidates;
}

function extractEntities(prompt: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  for (const pattern of ENTITY_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match;
    while ((match = regex.exec(prompt)) !== null) {
      entities.push({
        type: pattern.type,
        value: pattern.normalizer(match[0]),
        confidence: 0.8,
        position: match.index,
      });
    }
  }
  return entities;
}

// ───────────────────────────────────────────────────────────────
// INFERENCE ENGINE
// ───────────────────────────────────────────────────────────────

function inferIndustry(entities: ExtractedEntity[], keywords: string[]): string {
  const industryEntities = entities.filter((e) => e.type === "industry");
  if (industryEntities.length > 0) {
    return industryEntities[0].value;
  }
  // Fallback keyword-based inference
  for (const kw of keywords) {
    const match = ENTITY_PATTERNS.find((p) => p.type === "industry");
    if (match && match.regex.test(kw)) {
      return kw;
    }
  }
  return "general";
}

function inferAudience(entities: ExtractedEntity[]): string {
  const audEntities = entities.filter((e) => e.type === "audience");
  if (audEntities.length > 0) {
    return audEntities.map((a) => a.value).join(", ");
  }
  return "general";
}

// ───────────────────────────────────────────────────────────────
// CONFIGURATION GENERATORS
// ───────────────────────────────────────────────────────────────

function generateColorPalette(
  mood: VisualMood,
  style: DesignStyle,
  personality: WebsitePersonality,
  entities: ExtractedEntity[]
): ColorPalette {
  const extractedColors = entities.filter((e) => e.type === "color" || e.type === "hex_color").map((e) => e.value);

  const palettes: Record<string, ColorPalette> = {
    // Dark moods
    "dark-minimal": {
      primary: "#FFFFFF",
      secondary: "#A1A1AA",
      accent: "#3B82F6",
      background: "#09090B",
      surface: "#18181B",
      text: "#FAFAFA",
      muted: "#71717A",
      border: "#27272A",
      derived: { "surface-elevated": "#27272A", "surface-hover": "#3F3F46" },
    },
    "dark-luxury": {
      primary: "#E5E5E5",
      secondary: "#A3A3A3",
      accent: "#D4AF37",
      background: "#0A0A0A",
      surface: "#171717",
      text: "#F5F5F5",
      muted: "#737373",
      border: "#262626",
      derived: { "surface-elevated": "#262626", "surface-hover": "#404040" },
    },
    "dark-cyberpunk": {
      primary: "#00F0FF",
      secondary: "#FF003C",
      accent: "#BD00FF",
      background: "#0A0A0F",
      surface: "#14141E",
      text: "#E2E8F0",
      muted: "#64748B",
      border: "#1E293B",
      derived: { glow: "rgba(0, 240, 255, 0.3)", neon: "#00F0FF" },
    },
    // Light moods
    "light-minimal": {
      primary: "#18181B",
      secondary: "#52525B",
      accent: "#2563EB",
      background: "#FFFFFF",
      surface: "#F4F4F5",
      text: "#18181B",
      muted: "#A1A1AA",
      border: "#E4E4E7",
      derived: { "surface-elevated": "#FAFAFA", "surface-hover": "#E4E4E7" },
    },
    "light-premium": {
      primary: "#1C1917",
      secondary: "#57534E",
      accent: "#C2410C",
      background: "#FAFAF9",
      surface: "#F5F5F4",
      text: "#1C1917",
      muted: "#A8A29E",
      border: "#E7E5E4",
      derived: { "surface-elevated": "#FFFFFF", "surface-hover": "#E7E5E4" },
    },
    "light-playful": {
      primary: "#1E293B",
      secondary: "#475569",
      accent: "#F59E0B",
      background: "#FEFCE8",
      surface: "#FEF9C3",
      text: "#1E293B",
      muted: "#94A3B8",
      border: "#FDE68A",
      derived: { "surface-elevated": "#FFFFFF", "surface-hover": "#FDE68A" },
    },
    // Warm
    "warm-organic": {
      primary: "#431407",
      secondary: "#78350F",
      accent: "#C2410C",
      background: "#FFF7ED",
      surface: "#FFEDD5",
      text: "#431407",
      muted: "#A16207",
      border: "#FED7AA",
      derived: { "surface-elevated": "#FFFFFF", "surface-hover": "#FED7AA" },
    },
    // Cold
    "cold-tech": {
      primary: "#0C4A6E",
      secondary: "#075985",
      accent: "#38BDF8",
      background: "#F0F9FF",
      surface: "#E0F2FE",
      text: "#0C4A6E",
      muted: "#7DD3FC",
      border: "#BAE6FD",
      derived: { "surface-elevated": "#FFFFFF", "surface-hover": "#BAE6FD" },
    },
    // Vibrant
    "vibrant-bold": {
      primary: "#FFFFFF",
      secondary: "#E2E8F0",
      accent: "#FF006E",
      background: "#1A1A2E",
      surface: "#16213E",
      text: "#FFFFFF",
      muted: "#A0AEC0",
      border: "#0F3460",
      derived: { "surface-elevated": "#1A1A2E", "surface-hover": "#0F3460" },
    },
    // Ethereal
    "ethereal-dreamy": {
      primary: "#4C1D95",
      secondary: "#6D28D9",
      accent: "#C4B5FD",
      background: "#FAF5FF",
      surface: "#F3E8FF",
      text: "#4C1D95",
      muted: "#A78BFA",
      border: "#E9D5FF",
      derived: { "surface-elevated": "#FFFFFF", "surface-hover": "#E9D5FF" },
    },
  };

  // Build a palette key from mood + style
  let key = `${mood}-${style}`;
  if (palettes[key]) {
    const p = palettes[key];
    return { ...p, derived: { ...p.derived } };
  }

  // Fallback: blend based on mood
  key = `${mood}-minimal`;
  if (palettes[key]) {
    const p = palettes[key];
    return { ...p, derived: { ...p.derived } };
  }

  // Ultimate fallback
  const defaultPalette = palettes["light-minimal"];
  return { ...defaultPalette, derived: { ...defaultPalette.derived } };
}

function generateTypography(
  style: DesignStyle,
  personality: WebsitePersonality,
  density: VisualDensity
): TypographyConfig {
  const isDense = density === "dense" || density === "maximalist";
  const isSparse = density === "sparse" || density === "ultra-sparse";

  const serifFamilies: Record<string, string> = {
    heading: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
  };

  const sansFamilies: Record<string, string> = {
    heading: "Inter, system-ui, -apple-system, sans-serif",
    body: "Inter, system-ui, -apple-system, sans-serif",
  };

  const monoFamilies: Record<string, string> = {
    heading: "'SF Mono', Monaco, monospace",
    body: "'SF Mono', Monaco, monospace",
  };

  let families = sansFamilies;

  if (style === "editorial" || style === "luxury" || style === "premium" || personality === "elegant" || personality === "sophisticated") {
    families = serifFamilies;
  } else if (style === "cyberpunk" || style === "high-tech" || style === "futuristic") {
    families = monoFamilies;
  }

  const scaleMultiplier = isDense ? 0.85 : isSparse ? 1.3 : 1.0;

  return {
    family: {
      heading: families.heading,
      body: families.body,
      accent: families.heading,
      mono: "'SF Mono', Monaco, monospace",
    },
    scale: {
      hero: `${(4 * scaleMultiplier).toFixed(2)}rem`,
      h1: `${(3 * scaleMultiplier).toFixed(2)}rem`,
      h2: `${(2.25 * scaleMultiplier).toFixed(2)}rem`,
      h3: `${(1.5 * scaleMultiplier).toFixed(2)}rem`,
      h4: `${(1.25 * scaleMultiplier).toFixed(2)}rem`,
      body: `${(1 * scaleMultiplier).toFixed(2)}rem`,
      small: `${(0.875 * scaleMultiplier).toFixed(2)}rem`,
      caption: `${(0.75 * scaleMultiplier).toFixed(2)}rem`,
    },
    weight: {
      heading: style === "brutalist" || personality === "bold" || personality === "aggressive" ? 900 : 700,
      body: 400,
      bold: 700,
    },
    lineHeight: {
      heading: isSparse ? 1.0 : 1.2,
      body: isDense ? 1.4 : 1.6,
      tight: 1.0,
    },
    letterSpacing: {
      heading: style === "brutalist" ? "0.05em" : style === "luxury" ? "-0.02em" : "-0.01em",
      body: "0",
      tight: "-0.02em",
      wide: "0.05em",
    },
  };
}

function generateSpacing(style: DesignStyle, density: VisualDensity): SpacingConfig {
  const baseUnit = 0.25;
  let section = "5rem";
  let container = "1280px";
  let gutter = "1.5rem";
  let gridGap = "1.5rem";

  switch (density) {
    case "ultra-sparse":
      section = "10rem";
      gutter = "3rem";
      gridGap = "3rem";
      container = "1024px";
      break;
    case "sparse":
      section = "7rem";
      gutter = "2rem";
      gridGap = "2rem";
      container = "1200px";
      break;
    case "dense":
      section = "3rem";
      gutter = "1rem";
      gridGap = "0.75rem";
      container = "1440px";
      break;
    case "packed":
    case "maximalist":
      section = "2rem";
      gutter = "0.75rem";
      gridGap = "0.5rem";
      container = "100%";
      break;
    default:
      section = "5rem";
      gutter = "1.5rem";
      gridGap = "1.5rem";
      container = "1280px";
  }

  if (style === "editorial") {
    container = "800px";
  } else if (style === "brutalist") {
    container = "100%";
    gutter = "0.5rem";
  }

  return {
    unit: baseUnit,
    scale: [
      "0rem",
      "0.25rem",
      "0.5rem",
      "0.75rem",
      "1rem",
      "1.5rem",
      "2rem",
      "3rem",
      "4rem",
      "6rem",
      "8rem",
    ],
    section,
    container,
    gutter,
    gridGap,
  };
}

function generateBorderRadius(style: DesignStyle): BorderRadiusConfig {
  if (style === "brutalist") {
    return {
      none: "0",
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
      full: "0",
      style: "sharp",
    };
  }
  if (style === "glassmorphism" || style === "neumorphism" || style === "organic" || style === "playful") {
    return {
      none: "0",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      full: "9999px",
      style: "soft",
    };
  }
  return {
    none: "0",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
    style: "soft",
  };
}

function generateShadows(style: DesignStyle, mood: VisualMood): ShadowConfig {
  if (style === "glassmorphism") {
    return {
      none: "none",
      sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
      md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
      lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
      xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
      glow: mood === "dark" ? "0 0 20px rgba(255,255,255,0.1)" : "0 0 20px rgba(0,0,0,0.05)",
      style: "glow",
    };
  }
  if (style === "neumorphism") {
    return {
      none: "none",
      sm: "2px 2px 5px #bebebe, -2px -2px 5px #ffffff",
      md: "5px 5px 10px #bebebe, -5px -5px 10px #ffffff",
      lg: "8px 8px 16px #bebebe, -8px -8px 16px #ffffff",
      xl: "12px 12px 24px #bebebe, -12px -12px 24px #ffffff",
      style: "soft",
    };
  }
  if (style === "cyberpunk") {
    return {
      none: "none",
      sm: "0 0 5px rgba(0, 240, 255, 0.3)",
      md: "0 0 15px rgba(0, 240, 255, 0.4), 0 0 30px rgba(0, 240, 255, 0.2)",
      lg: "0 0 25px rgba(0, 240, 255, 0.5), 0 0 50px rgba(0, 240, 255, 0.3)",
      xl: "0 0 40px rgba(0, 240, 255, 0.6), 0 0 80px rgba(0, 240, 255, 0.4)",
      glow: "0 0 20px rgba(0, 240, 255, 0.8)",
      style: "neon",
    };
  }
  return {
    none: "none",
    sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
    style: "soft",
  };
}

function generateAnimation(
  expectation: AnimationExpectation,
  style: DesignStyle,
  personality: WebsitePersonality
): AnimationConfig {
  const enabled = expectation !== "none";
  const complexity = expectation;

  const fast = expectation === "cinematic" || expectation === "heavy" ? "200ms" : "150ms";
  const normal = expectation === "cinematic" ? "500ms" : expectation === "heavy" ? "400ms" : "300ms";
  const slow = expectation === "cinematic" ? "1000ms" : expectation === "heavy" ? "800ms" : "500ms";

  return {
    enabled,
    complexity,
    duration: { fast, normal, slow },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      enter: "cubic-bezier(0, 0, 0.2, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
      bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    preferences: {
      prefersReducedMotion: "reduce",
      scrollAnimations: expectation === "scroll-driven" || expectation === "cinematic" || expectation === "heavy",
      hoverEffects: expectation !== "none",
      pageTransitions: expectation === "cinematic" || expectation === "heavy" || style === "futuristic",
      loadAnimations: enabled,
    },
  };
}

function generateLayout(
  direction: LayoutDirection,
  style: DesignStyle,
  density: VisualDensity
): LayoutConfig {
  return {
    direction,
    containerWidth: style === "editorial" ? "narrow" : density === "maximalist" ? "full" : "wide",
    sidebar: direction === "dashboard" || direction === "application" || direction === "documentation",
    header: style === "editorial" || style === "cinematic" ? "fixed" : "sticky",
    footer: direction === "landing" || direction === "lead-gen" ? "minimal" : "full",
    navStyle: direction === "application" || direction === "dashboard" ? "side" : "top",
    readingPattern: style === "editorial" ? "layer-cake" : "F-pattern",
    gridColumns: density === "maximalist" ? 4 : density === "dense" ? 3 : 2,
    mobileFirst: true,
  };
}

function generateUX(
  direction: LayoutDirection,
  tone: BusinessTone,
  conversionStyle: ConversionStyle,
  industry: string,
  audience: string
): UXConfig {
  const goals: Record<string, string> = {
    "e-commerce": "Drive product purchases with trust and clarity",
    "saas": "Convert visitors to trial users with feature education",
    "lead-gen": "Capture qualified leads through value-driven forms",
    "landing": "Single-focus conversion with minimal friction",
    "portfolio": "Showcase work quality and convert to inquiries",
    "editorial": "Maximize engagement time and return visits",
    "application": "Enable efficient task completion and retention",
    "dashboard": "Surface critical metrics and enable quick actions",
    "showcase": "Generate awe and drive brand awareness",
    "documentation": "Enable fast information discovery and comprehension",
  };

  return {
    primaryGoal: goals[direction] || "Engage visitors and drive conversion",
    targetAudience: audience,
    userJourney: ["discovery", "interest", "trust", "action", "retention"],
    trustSignals: tone === "authoritative" || conversionStyle === "trust-first"
      ? ["testimonials", "social proof", "certifications", "guarantees"]
      : ["professional design", "clear messaging"],
    conversionPoints: direction === "e-commerce"
      ? ["add to cart", "checkout", "upsell"]
      : direction === "saas"
      ? ["free trial", "demo request", "pricing view"]
      : direction === "lead-gen"
      ? ["form submission", "phone call", "download"]
      : ["contact", "subscribe", "share"],
    contentStrategy: direction === "saas" ? "product-led" : direction === "editorial" ? "story-led" : "expert-led",
    accessibility: {
      targetWCAG: "AA",
      colorBlindSafe: true,
      keyboardNav: true,
      screenReaderOptimized: true,
    },
    performance: {
      lazyLoadImages: true,
      skeletonScreens: direction === "application" || direction === "dashboard",
      infiniteScroll: direction === "editorial" || direction === "e-commerce",
      pagination: direction === "e-commerce" || direction === "documentation",
    },
  };
}

function generatePageStructure(
  direction: LayoutDirection,
  style: DesignStyle,
  personality: WebsitePersonality,
  density: VisualDensity
): PageStructureItem[] {
  const baseStructure: PageStructureItem[] = [
    {
      id: "hero",
      type: "hero",
      purpose: "Immediate value proposition and emotional hook",
      importance: "critical",
      contentHints: ["headline", "subheadline", "cta", "visual"],
      layoutHints: ["full-width", "centered"],
      visualWeight: "heavy",
      order: 1,
    },
    {
      id: "social-proof",
      type: "trust-bar",
      purpose: "Establish credibility immediately",
      importance: "high",
      contentHints: ["logos", "stats", "awards"],
      layoutHints: ["horizontal", "marquee"],
      visualWeight: "light",
      order: 2,
    },
  ];

  const dynamicSections: Record<string, PageStructureItem[]> = {
    "saas": [
      {
        id: "features",
        type: "feature-grid",
        purpose: "Educate on product capabilities",
        importance: "critical",
        contentHints: ["feature cards", "icons", "short descriptions"],
        layoutHints: ["bento", "3-column", "alternating"],
        visualWeight: "medium",
        order: 3,
      },
      {
        id: "pricing",
        type: "pricing-table",
        purpose: "Clear pricing transparency",
        importance: "high",
        contentHints: ["plans", "comparison", "cta"],
        layoutHints: ["3-column", "highlighted-middle"],
        visualWeight: "medium",
        order: 4,
      },
    ],
    "e-commerce": [
      {
        id: "product-showcase",
        type: "product-grid",
        purpose: "Display products attractively",
        importance: "critical",
        contentHints: ["product cards", "images", "prices", "ratings"],
        layoutHints: ["masonry", "grid", "featured-first"],
        visualWeight: "heavy",
        order: 3,
      },
      {
        id: "categories",
        type: "category-nav",
        purpose: "Help users find product categories",
        importance: "medium",
        contentHints: ["category tiles", "images"],
        layoutHints: ["horizontal-scroll", "grid"],
        visualWeight: "medium",
        order: 4,
      },
    ],
    "portfolio": [
      {
        id: "work-gallery",
        type: "project-grid",
        purpose: "Showcase selected works",
        importance: "critical",
        contentHints: ["project thumbnails", "titles", "categories"],
        layoutHints: ["masonry", "bento", "full-bleed"],
        visualWeight: "heavy",
        order: 3,
      },
      {
        id: "about",
        type: "bio",
        purpose: "Personal connection and story",
        importance: "medium",
        contentHints: ["photo", "bio text", "skills"],
        layoutHints: ["split", "centered"],
        visualWeight: "medium",
        order: 4,
      },
    ],
    "editorial": [
      {
        id: "featured",
        type: "featured-article",
        purpose: "Highlight top content",
        importance: "high",
        contentHints: ["cover image", "headline", "excerpt", "author"],
        layoutHints: ["magazine-cover", "hero-overlay"],
        visualWeight: "heavy",
        order: 3,
      },
      {
        id: "article-grid",
        type: "content-grid",
        purpose: "Browse more content",
        importance: "medium",
        contentHints: ["article cards", "categories", "dates"],
        layoutHints: ["masonry", "list", "card-grid"],
        visualWeight: "medium",
        order: 4,
      },
    ],
    "landing": [
      {
        id: "value-prop",
        type: "benefits",
        purpose: "Explain why this solution",
        importance: "critical",
        contentHints: ["benefit cards", "icons", "stats"],
        layoutHints: ["3-column", "alternating"],
        visualWeight: "medium",
        order: 3,
      },
      {
        id: "cta-section",
        type: "conversion",
        purpose: "Drive the single action",
        importance: "critical",
        contentHints: ["form", "button", "urgency"],
        layoutHints: ["centered", "full-width"],
        visualWeight: "heavy",
        order: 4,
      },
    ],
    "lead-gen": [
      {
        id: "problem",
        type: "pain-point",
        purpose: "Identify visitor's problem",
        importance: "high",
        contentHints: ["headline", "bullet points", "stats"],
        layoutHints: ["split", "centered"],
        visualWeight: "medium",
        order: 3,
      },
      {
        id: "solution",
        type: "offer",
        purpose: "Present the solution/offer",
        importance: "critical",
        contentHints: ["form", "value stack", "trust badges"],
        layoutHints: ["two-column", "sticky-form"],
        visualWeight: "heavy",
        order: 4,
      },
    ],
    "showcase": [
      {
        id: "main-showcase",
        type: "immersive",
        purpose: "Full sensory experience",
        importance: "critical",
        contentHints: ["full-screen media", "minimal text", "dramatic"],
        layoutHints: ["full-bleed", "layered", "scroll-driven"],
        visualWeight: "heavy",
        order: 3,
      },
      {
        id: "details",
        type: "info",
        purpose: "Supporting information",
        importance: "medium",
        contentHints: ["specs", "credits", "process"],
        layoutHints: ["minimal", "sparse"],
        visualWeight: "light",
        order: 4,
      },
    ],
    "dashboard": [
      {
        id: "metrics",
        type: "kpi-cards",
        purpose: "Quick status overview",
        importance: "critical",
        contentHints: ["numbers", "charts", "trends", "alerts"],
        layoutHints: ["grid", "4-column", "bento"],
        visualWeight: "medium",
        order: 3,
      },
      {
        id: "charts",
        type: "data-viz",
        purpose: "Deep data exploration",
        importance: "high",
        contentHints: ["line charts", "bar charts", "tables"],
        layoutHints: ["2-column", "full-width"],
        visualWeight: "medium",
        order: 4,
      },
    ],
    "application": [
      {
        id: "main-interface",
        type: "workspace",
        purpose: "Primary interaction surface",
        importance: "critical",
        contentHints: ["tools", "canvas", "editor", "sidebar"],
        layoutHints: ["sidebar-main", "panel-based", "resizable"],
        visualWeight: "heavy",
        order: 3,
      },
    ],
  };

  const specific = dynamicSections[direction] || [];

  const closing: PageStructureItem[] = [
    {
      id: "faq",
      type: "accordion",
      purpose: "Address objections and questions",
      importance: "medium",
      contentHints: ["questions", "answers", "expandable"],
      layoutHints: ["narrow", "centered"],
      visualWeight: "light",
      order: specific.length + 3,
    },
    {
      id: "cta-final",
      type: "cta",
      purpose: "Final conversion push",
      importance: "high",
      contentHints: ["headline", "button", "urgency"],
      layoutHints: ["full-width", "centered", "contrasting-background"],
      visualWeight: "medium",
      order: specific.length + 4,
    },
    {
      id: "footer",
      type: "footer",
      purpose: "Navigation, legal, contact",
      importance: "low",
      contentHints: ["links", "social", "copyright", "newsletter"],
      layoutHints: ["multi-column", "minimal"],
      visualWeight: "light",
      order: specific.length + 5,
    },
  ];

  if (density === "sparse" || density === "ultra-sparse") {
    return [...baseStructure, ...specific.slice(0, 2)];
  }

  return [...baseStructure, ...specific, ...closing];
}

function generateComposition(
  compositionType: CompositionExpectation,
  style: DesignStyle,
  direction: LayoutDirection
): { type: CompositionExpectation; readingPattern: string; focalPoints: string[]; hierarchy: string[] } {
  const readingPatterns: Record<string, string> = {
    editorial: "layer-cake",
    landing: "F-pattern",
    "e-commerce": "F-pattern",
    dashboard: "layer-cake",
    application: "Z-pattern",
    showcase: "golden-ratio",
    portfolio: "Z-pattern",
    saas: "F-pattern",
    "lead-gen": "F-pattern",
  };

  return {
    type: compositionType,
    readingPattern: readingPatterns[direction] || "F-pattern",
    focalPoints: compositionType === "asymmetric"
      ? ["top-left", "bottom-right"]
      : compositionType === "split"
      ? ["left-panel", "right-panel"]
      : ["hero-center", "content-zigzag"],
    hierarchy: ["hero", "social-proof", "primary-content", "supporting", "cta", "footer"],
  };
}

function generateBranding(
  direction: BrandingDirection,
  style: DesignStyle,
  personality: WebsitePersonality
): { direction: BrandingDirection; logoStyle: string; taglinePresence: boolean; socialProofPlacement: string; trustIndicators: string[] } {
  return {
    direction,
    logoStyle: style === "minimal" || style === "editorial" ? "wordmark" : style === "playful" ? "mascot" : "abstract mark",
    taglinePresence: personality === "authoritative" || personality === "trustworthy",
    socialProofPlacement: style === "minimal" ? "subtle" : "prominent",
    trustIndicators: style === "luxury" || style === "premium"
      ? ["heritage", "craftsmanship", "exclusivity"]
      : ["reviews", "security", "transparency"],
  };
}

function generateInteraction(
  primary: InteractionExpectation,
  style: DesignStyle
): { primary: InteractionExpectation; secondary: InteractionExpectation[]; feedbackStyle: string; statefulness: string } {
  return {
    primary,
    secondary: style === "futuristic" || style === "cyberpunk"
      ? ["scroll-driven", "micro-interaction-heavy"]
      : ["hover-reactive"],
    feedbackStyle: style === "brutalist" ? "immediate" : style === "playful" ? "delightful" : "subtle",
    statefulness: style === "enterprise" || style === "startup" ? "full" : "light",
  };
}

// ───────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION
// ───────────────────────────────────────────────────────────────

export function parsePrompt(prompt: string, config: ParserConfig = DEFAULT_PARSER_CONFIG): ParseResult {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Token matching
    const matches = findTokenMatches(prompt);
    const aggregated = aggregateMatches(matches);

    // 2. Entity extraction
    const entities = extractEntities(prompt);

    // 3. Keyword extraction
    const keywords = tokenizePrompt(prompt).filter((k) => k.length > 3);

    // 4. Sentiment (simple polarity from matched tokens)
    const sentiments = matches
      .filter((m) => m.token.polarity !== "neutral")
      .map((m) => ({ word: m.token.terms[0], score: m.token.polarity === "positive" ? 1 : -1 }));

    // 5. Resolve all directions
    const visualMood = pickHighest<VisualMood>(aggregated, "visualMood", "neutral");
    const designStyle = pickHighest<DesignStyle>(aggregated, "designStyle", "minimal");
    const websitePersonality = pickHighest<WebsitePersonality>(aggregated, "websitePersonality", "friendly");
    const visualDensity = pickHighest<VisualDensity>(aggregated, "visualDensity", "balanced");
    const modernityLevel = pickHighest<ModernityLevel>(aggregated, "modernityLevel", "modern");
    const businessTone = pickHighest<BusinessTone>(aggregated, "businessTone", "professional");
    const conversionStyle = pickHighest<ConversionStyle>(aggregated, "conversionStyle", "trust-first");
    const layoutDirection = pickHighest<LayoutDirection>(aggregated, "layoutDirection", "landing");
    const animationExpectation = pickHighest<AnimationExpectation>(aggregated, "animationExpectation", "subtle");
    const compositionType = pickHighest<CompositionExpectation>(aggregated, "compositionExpectation", "centered");
    const interactionPrimary = pickHighest<InteractionExpectation>(aggregated, "interactionExpectation", "hover-reactive");
    const imageDirection = pickHighest<ImageDirection>(aggregated, "imageDirection", "mixed-media");
    const brandingDirection = pickHighest<BrandingDirection>(aggregated, "brandingDirection", "logo-centric");

    // 6. Apply negations
    const negations = Object.entries(aggregated).filter(([k]) => k.startsWith("negation:"));
    for (const [key] of negations) {
      const negatedAspect = key.split(":")[1];
      if (negatedAspect === "motion" && animationExpectation !== "none") {
        warnings.push(`Negation detected: user explicitly requested no animation, overriding to 'none'`);
      }
    }

    // 7. Generate derived configurations
    const colorPalette = generateColorPalette(visualMood, designStyle, websitePersonality, entities);
    const typography = generateTypography(designStyle, websitePersonality, visualDensity);
    const spacing = generateSpacing(designStyle, visualDensity);
    const borderRadius = generateBorderRadius(designStyle);
    const shadows = generateShadows(designStyle, visualMood);
    const animation = generateAnimation(animationExpectation, designStyle, websitePersonality);
    const layout = generateLayout(layoutDirection, designStyle, visualDensity);
    const industry = inferIndustry(entities, keywords);
    const audience = inferAudience(entities);
    const ux = generateUX(layoutDirection, businessTone, conversionStyle, industry, audience);
    const pageStructure = generatePageStructure(layoutDirection, designStyle, websitePersonality, visualDensity);
    const composition = generateComposition(compositionType, designStyle, layoutDirection);
    const branding = generateBranding(brandingDirection, designStyle, websitePersonality);
    const interaction = generateInteraction(interactionPrimary, designStyle);

    // 8. Compute confidence
    const matchCount = Object.keys(aggregated).length;
    const totalPossible = 25; // approximate number of category prefixes
    const confidence = Math.min(1, matchCount / totalPossible + 0.3);

    const puo: PromptUnderstandingObject = {
      version: "1.0.0",
      parsedAt: new Date().toISOString(),
      originalPrompt: prompt,
      confidence,

      visualMood,
      designStyle,
      websitePersonality,
      visualDensity,
      modernityLevel,
      businessTone,
      conversionStyle,
      artisticDirection: `${visualMood} ${designStyle} with ${websitePersonality} personality`,

      layout,
      visual: {
        colorPalette,
        typography,
        spacing,
        borderRadius,
        shadows,
        imageDirection,
        composition: compositionType,
        visualDensity,
      },
      ux,
      typography,
      composition,
      motion: animation,
      pageStructure,
      branding,
      interaction,

      extractedKeywords: [...new Set(keywords)].slice(0, 50),
      extractedSentiments: sentiments,
      rawEntities: entities,

      inferredIndustry: industry,
      inferredAudience: audience,
      customAttributes: {},
    };

    return {
      success: true,
      object: puo,
      warnings,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success: false,
      object: {} as PromptUnderstandingObject,
      warnings,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ───────────────────────────────────────────────────────────────
// BATCH PARSING
// ───────────────────────────────────────────────────────────────

export function parsePrompts(prompts: string[], config?: ParserConfig): ParseResult[] {
  return prompts.map((p) => parsePrompt(p, config));
}

// ───────────────────────────────────────────────────────────────
// UTILITY: Validate understanding object completeness
// ───────────────────────────────────────────────────────────────

export function validatePUO(puo: PromptUnderstandingObject): { valid: boolean; missing: string[] } {
  const required = [
    "version",
    "parsedAt",
    "originalPrompt",
    "confidence",
    "visualMood",
    "designStyle",
    "websitePersonality",
    "visualDensity",
    "layout",
    "visual",
    "ux",
    "pageStructure",
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (puo[key as keyof PromptUnderstandingObject] === undefined) {
      missing.push(key);
    }
  }

  return { valid: missing.length === 0, missing };
}
