/**
 * Curated Niche Image Catalog
 *
 * Returns instant, niche-relevant image URLs for section backgrounds and
 * product cards. Uses LoremFlickr (keyword-based Flickr CDN) as the primary
 * source — no specific photo IDs to verify, no API key needed, and keywords
 * guarantee the image content matches the niche and role.
 *
 * The seed (lock) parameter makes results deterministic: the same section
 * always gets the same photo on every render.
 */

// ─── Keyword maps ──────────────────────────────────────────────────────────────

/** Map: niche → role → LoremFlickr keyword string */
const SECTION_KEYWORDS: Record<string, Record<string, string>> = {
  basketball: {
    hero:     "basketball,arena,NBA,court,stadium",
    about:    "basketball,athletes,training,team,sport",
    products: "basketball,sneakers,Nike,gear,store",
    contact:  "basketball,gym,court,training,facility",
    cta:      "basketball,champions,celebration,victory",
  },
  restaurant: {
    hero:     "restaurant,fine-dining,interior,elegant,luxury",
    about:    "chef,kitchen,cooking,gourmet,culinary",
    products: "food,gourmet,plating,dish,cuisine",
    contact:  "restaurant,dining,table,ambiance,interior",
    cta:      "restaurant,celebration,dining,experience",
  },
  food: {
    hero:     "food,gourmet,cuisine,plating,elegant",
    about:    "chef,kitchen,cooking,culinary",
    products: "food,dish,gourmet,meal",
    contact:  "restaurant,cafe,food,interior",
    cta:      "food,dining,feast,celebration",
  },
  barber: {
    hero:     "barbershop,barber,vintage,interior,classic",
    about:    "barber,grooming,haircut,professional",
    products: "grooming,beard,pomade,men,barbershop",
    contact:  "barbershop,chair,interior,vintage",
    cta:      "barber,grooming,style,men",
  },
  barbershop: {
    hero:     "barbershop,barber,vintage,interior,classic",
    about:    "barber,grooming,haircut,professional",
    products: "grooming,beard,pomade,men",
    contact:  "barbershop,chair,interior",
    cta:      "barber,grooming,style",
  },
  salon: {
    hero:     "salon,beauty,hair,luxury,interior",
    about:    "stylist,salon,hair,professional,beauty",
    products: "cosmetics,beauty,skincare,makeup,luxury",
    contact:  "salon,reception,beauty,elegant",
    cta:      "beauty,salon,transformation,style",
  },
  beauty: {
    hero:     "beauty,cosmetics,luxury,skincare,elegant",
    about:    "beauty,professional,salon,cosmetics",
    products: "skincare,cosmetics,beauty,luxury,bottle",
    contact:  "beauty,salon,elegant,interior",
    cta:      "beauty,transformation,glow,luxury",
  },
  watchmaking: {
    hero:     "luxury,watch,timepiece,craft,boutique",
    about:    "watchmaker,craftsmanship,workshop,precision",
    products: "watch,luxury,timepiece,mechanical,display",
    contact:  "watch,boutique,showroom,luxury",
    cta:      "watch,luxury,elegance,timepiece",
  },
  jewelry: {
    hero:     "jewelry,diamond,luxury,elegant,boutique",
    about:    "jeweler,craft,workshop,gemstone,luxury",
    products: "jewelry,diamond,ring,necklace,luxury",
    contact:  "jewelry,boutique,display,luxury",
    cta:      "jewelry,diamond,luxury,elegance",
  },
  fashion: {
    hero:     "fashion,runway,model,luxury,elegant",
    about:    "fashion,designer,atelier,studio,style",
    products: "fashion,clothing,boutique,luxury,apparel",
    contact:  "fashion,boutique,store,luxury",
    cta:      "fashion,style,luxury,collection",
  },
  coffee: {
    hero:     "coffee,cafe,barista,interior,cozy",
    about:    "barista,coffee,brewing,artisan,cafe",
    products: "coffee,espresso,latte,beans,drink",
    contact:  "coffee,cafe,interior,cozy",
    cta:      "coffee,morning,cafe,warm",
  },
  fitness: {
    hero:     "gym,fitness,workout,training,dark",
    about:    "trainer,fitness,workout,athlete,gym",
    products: "fitness,equipment,gym,workout,sport",
    contact:  "gym,fitness,facility,modern",
    cta:      "fitness,motivation,strength,athlete",
  },
  cybersecurity: {
    hero:     "server,technology,data,cyber,blue",
    about:    "technology,cybersecurity,team,office,monitors",
    products: "cybersecurity,dashboard,technology,data",
    contact:  "office,technology,modern,blue",
    cta:      "security,technology,protection,digital",
  },
  saas: {
    hero:     "technology,software,laptop,modern,digital",
    about:    "team,office,technology,startup,modern",
    products: "software,dashboard,technology,app",
    contact:  "office,modern,technology,startup",
    cta:      "technology,success,digital,growth",
  },
  portfolio: {
    hero:     "creative,design,workspace,studio,modern",
    about:    "creative,designer,studio,work,artist",
    products: "design,creative,portfolio,artwork,studio",
    contact:  "studio,creative,workspace,modern",
    cta:      "creative,design,inspiration,portfolio",
  },
  pet: {
    hero:     "pet,dog,cat,puppy,kitten,animal",
    about:    "pet,dog,cat,care,grooming,vet",
    products: "pet,food,toy,supplies,treats,collar",
    contact:  "pet,store,clinic,grooming",
    cta:      "pet,happy,owner,family,companion",
  },
};

/** Map: niche → product-type → LoremFlickr keyword string */
const PRODUCT_KEYWORDS: Record<string, Record<string, string>> = {
  basketball: {
    shoe:    "basketball,sneakers,Jordan,Nike,footwear",
    jersey:  "basketball,jersey,NBA,uniform,team",
    ball:    "basketball,ball,sport,court",
    shorts:  "basketball,shorts,athletic,sport",
    default: "basketball,gear,sport,equipment",
  },
  restaurant: {
    steak:   "steak,beef,grill,fine-dining",
    burger:  "burger,gourmet,food,sandwich",
    seafood: "seafood,fish,sushi,elegant",
    pasta:   "pasta,Italian,food,gourmet",
    pizza:   "pizza,Italian,food,artisan",
    dessert: "dessert,cake,pastry,sweet",
    coffee:  "coffee,espresso,drink,cafe",
    default: "food,gourmet,dish,restaurant",
  },
  food: {
    default: "food,gourmet,meal,cuisine",
  },
  barber: {
    default: "barber,grooming,pomade,men,beard",
  },
  barbershop: {
    default: "barber,grooming,pomade,men",
  },
  salon: {
    nail:    "nails,manicure,beauty,cosmetics",
    skin:    "skincare,serum,beauty,luxury",
    hair:    "hair,styling,salon,beauty",
    default: "beauty,cosmetics,luxury,salon",
  },
  beauty: {
    default: "beauty,cosmetics,skincare,luxury",
  },
  watchmaking: {
    default: "watch,luxury,timepiece,mechanical",
  },
  jewelry: {
    default: "jewelry,diamond,luxury,ring",
  },
  fashion: {
    dress:   "dress,fashion,elegant,gown",
    jacket:  "jacket,fashion,menswear,style",
    shoe:    "shoes,fashion,luxury,designer",
    default: "fashion,clothing,luxury,style",
  },
  coffee: {
    default: "coffee,espresso,drink,cafe",
  },
  fitness: {
    default: "fitness,gym,sport,athletic",
  },
  cybersecurity: {
    default: "technology,cybersecurity,digital,data",
  },
  saas: {
    default: "software,technology,app,digital",
  },
  portfolio: {
    default: "design,creative,portfolio,artwork",
  },
  pet: {
    food:    "pet,food,kibble,dog,cat",
    toy:     "pet,toy,dog,cat,play",
    treat:   "pet,treats,snacks,dog,cat",
    grooming:"pet,grooming,brush,bath,care",
    default: "pet,product,supplies,dog,cat",
  },
};

// ─── URL builder ───────────────────────────────────────────────────────────────

/**
 * Build a LoremFlickr URL. Keywords determine subject matter; lock makes the
 * result deterministic. Images are served from Flickr CDN — instant load,
 * no API key, always niche-relevant.
 */
function loremFlickrUrl(keywords: string, w: number, h: number, seed: number): string {
  const lock = Math.abs(seed) % 9973; // prime limit keeps distribution clean
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}?lock=${lock}`;
}

// ─── Niche normalisation ───────────────────────────────────────────────────────

function nicheKey(niche: string): string {
  const n = (niche || "").toLowerCase().trim();
  if (/barber/.test(n))                     return "barber";
  // Pet matched BEFORE generic food/salon so "pet food" / "pet grooming" /
  // "dog food" route to pet keywords instead of restaurant or salon keywords.
  if (/\bpet|dog|cat|puppy|kitten|aquarium/.test(n)) return "pet";
  if (/salon|beauty|cosmetic|spa/.test(n))  return "salon";
  if (/restaurant|dining|bistro/.test(n))   return "restaurant";
  if (/coffee|cafe|espresso/.test(n))       return "coffee";
  if (/food|culinary|gourmet/.test(n))      return "food";
  if (/basketball|nba/.test(n))             return "basketball";
  if (/watch/.test(n))                      return "watchmaking";
  if (/jewel/.test(n))                      return "jewelry";
  if (/fashion|cloth|apparel|wear/.test(n)) return "fashion";
  if (/fit|gym|workout/.test(n))            return "fitness";
  if (/cyber|security/.test(n))             return "cybersecurity";
  if (/saas|software|app/.test(n))          return "saas";
  if (/portfolio|creative|design|art/.test(n)) return "portfolio";
  return n;
}

/** Classify a product name into its type bucket for niche-specific keywords. */
function productKey(name: string, niche: string): string {
  const n = (name || "").toLowerCase();
  switch (nicheKey(niche)) {
    case "basketball":
      // Check jersey/ball/shorts BEFORE shoes — player names in jersey names
      // (lebron, curry, kobe) also appear in shoe names; jersey must win.
      if (/jersey|uniform|swingman|authentic|statement|city\s+edition|lakers|warriors|celtics|bulls|nets|bucks|heat|mavericks|#\d+/.test(n)) return "jersey";
      if (/short|pant/.test(n))   return "shorts";
      if (/\bball\b/.test(n))     return "ball";
      if (/shoe|sneaker|air\s+jordan|air\s+max|zoom|flow|kyrie|kd\s*\d|lebron\s*\d|curry\s*\d/.test(n)) return "shoe";
      return "default";
    case "restaurant":
    case "food":
      if (/coffee|espresso|latte/.test(n))           return "coffee";
      if (/steak|beef|fillet|ribeye/.test(n))        return "steak";
      if (/burger|sandwich/.test(n))                  return "burger";
      if (/seafood|fish|sushi|salmon/.test(n))        return "seafood";
      if (/pasta|spaghetti|ravioli|risotto/.test(n)) return "pasta";
      if (/pizza/.test(n))                            return "pizza";
      if (/dessert|cake|pastry|ice/.test(n))          return "dessert";
      return "default";
    case "salon":
    case "beauty":
      if (/nail|manicure|pedicure/.test(n)) return "nail";
      if (/skin|facial|cleanse/.test(n))    return "skin";
      if (/hair|color|cut|style/.test(n))   return "hair";
      return "default";
    case "fashion":
      if (/dress|gown/.test(n))           return "dress";
      if (/jacket|coat|blazer/.test(n))   return "jacket";
      if (/shoe|heel|boot/.test(n))       return "shoe";
      return "default";
    case "pet":
      if (/food|kibble|treat/.test(n))    return "food";
      if (/toy|chew|play/.test(n))        return "toy";
      if (/grooming|brush|shampoo/.test(n)) return "grooming";
      return "default";
    default:
      return "default";
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a LoremFlickr URL for a SECTION background matching this niche+role.
 * Always returns a URL (never null) — keywords guarantee relevant content.
 *
 * @param niche  e.g. "basketball"
 * @param role   one of "hero" | "about" | "products" | "contact" | "cta"
 * @param hash   deterministic seed (different sections pick different lock values)
 * @param w/h    desired dimensions
 */
export function curatedSectionImage(
  niche: string,
  role: string,
  hash: number,
  w = 1600,
  h = 900
): string | null {
  const nk  = nicheKey(niche);
  const map  = SECTION_KEYWORDS[nk];
  if (!map) {
    // Unknown niche — derive keywords from the niche string itself so
    // "cat toy" → search "cat,toy", "real estate" → search "real,estate", etc.
    const fromNiche = (niche || "business")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(w => w.length >= 3 && !/^(the|and|for|with|that|new|best|top|store|shop|online|premium)$/.test(w))
      .slice(0, 3)
      .join(",");
    const keywords = (fromNiche || "business") + ",premium,modern,professional";
    return loremFlickrUrl(keywords, w, h, hash);
  }
  const keywords = map[role] ?? map.hero ?? "business,modern,premium";
  return loremFlickrUrl(keywords, w, h, hash);
}

/**
 * Returns a LoremFlickr URL for a PRODUCT CARD image. The product name is
 * classified into a type bucket (shoe / jersey / ball / etc.) so the image
 * matches what the card is actually selling.
 *
 * @param productName  e.g. "Air Jordan 1" or "LeBron Lakers Jersey"
 * @param niche        e.g. "basketball"
 * @param hash         deterministic seed
 * @param w/h          desired dimensions
 */
export function curatedProductImage(
  productName: string,
  niche: string,
  hash: number,
  w = 800,
  h = 800
): string | null {
  const nk  = nicheKey(niche);
  const pk  = productKey(productName, niche);
  const map  = PRODUCT_KEYWORDS[nk];
  if (!map) {
    // Unknown niche — keywords pulled from the product NAME first, then niche
    // so "Catnip Mouse Toy" + niche "cat toy" → "catnip,mouse,toy,cat,product".
    const fromName = (productName || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(w => w.length >= 3 && !/^(the|and|for|with|premium|luxury|new|best|top)$/.test(w))
      .slice(0, 3)
      .join(",");
    const fromNiche = (niche || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(w => w.length >= 3 && !/^(the|and|for|with|that|new|best|store|shop|online|premium)$/.test(w))
      .slice(0, 2)
      .join(",");
    const keywords = [fromName, fromNiche, "product,premium"].filter(Boolean).join(",") || "product,premium,modern";
    return loremFlickrUrl(keywords, w, h, hash);
  }
  const keywords = map[pk] ?? map.default ?? "product,premium,display";
  return loremFlickrUrl(keywords, w, h, hash);
}

/** Returns true when niche has dedicated keyword coverage in this catalog. */
export function hasCuratedCoverage(niche: string): boolean {
  const nk = nicheKey(niche);
  return Boolean(SECTION_KEYWORDS[nk] || PRODUCT_KEYWORDS[nk]);
}
