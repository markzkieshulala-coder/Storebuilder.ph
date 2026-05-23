/**
 * Curated Premium Image Catalog
 *
 * Hand-picked Unsplash photo IDs per niche × role × product-type. Unsplash
 * direct CDN URLs (`https://images.unsplash.com/photo-{ID}`) are stable,
 * royalty-free, and require no API key — perfect for an Ultra-Premium
 * production renderer.
 *
 * The renderer picks deterministically from the pool via item-name hash, so
 * each product card / section gets a unique but always niche-relevant photo.
 *
 * Fallback chain: this catalog → LoremFlickr (existing) → Picsum (onerror).
 */

// ────────────────────────────────────────────────────────────────────────────
// SECTION POOLS — per niche × role (hero / about / products / contact / cta)
// ────────────────────────────────────────────────────────────────────────────

type NicheRolePools = Record<string, Record<string, string[]>>;

/** Map of niche → role → array of Unsplash photo IDs (no domain prefix). */
const SECTION_POOLS: NicheRolePools = {
  basketball: {
    hero: [
      "1546519638-68e109498ffc",       // basketball court at sunset
      "1574623452334-1e0ac2b3ccb4",   // player dunking
      "1577471488278-16eec37ffcc2",   // close-up of hoop
      "1518605458261-bdab6b6c8d70",   // arena interior
      "1612872087720-bb876e2e67d1",   // basketball game action
    ],
    about: [
      "1518614914854-d96be8a6f49a",   // team huddle
      "1571019613454-1cb2f99b2d8b",   // locker room
      "1505666287802-931582b5fcde",   // training session
      "1518605458261-bdab6b6c8d70",   // arena lights
    ],
    products: [
      "1542718610-a1d656d1884c",       // basketball sneakers display
      "1556906781-9a412961c28c",       // sneaker close-up
      "1595950653106-6c9ebd614d3a",   // sports retail store
      "1518365050014-70fe7232897f",   // sneakers shelf
    ],
    contact: [
      "1574629810360-7efbbe195018",   // gym interior
      "1571902943202-507ec2618e8f",   // empty court
      "1505666287802-931582b5fcde",   // facility
    ],
    cta: [
      "1518605458261-bdab6b6c8d70",   // crowd / arena
      "1577741314755-c19842611a8b",   // game-winning moment
    ],
  },

  restaurant: {
    hero: [
      "1414235077428-338989a2e8c0",   // restaurant interior warm light
      "1517248135467-4c7edcad34c4",   // gourmet plating
      "1552566626-52f8b828add9",       // fine dining table
      "1559339352-11d035aa65de",       // chef plating
    ],
    about: [
      "1556910103-1c02745aae4d",       // chef in kitchen
      "1551218808-94e220e084d2",       // kitchen team
      "1592417817038-d13fd7342605",   // cooking action
    ],
    products: [
      "1546069901-ba9599a7e63c",       // signature dish
      "1567620905732-2d1ec7ab7445",   // burger gourmet
      "1565299624946-b28f40a0ae38",   // pizza
      "1559847844-5315695dadae",       // dessert plate
    ],
    contact: [
      "1414235077428-338989a2e8c0",   // restaurant ambiance
      "1517248135467-4c7edcad34c4",   // table setting
    ],
    cta: [
      "1552566626-52f8b828add9",       // celebration table
    ],
  },

  food: {
    hero: [
      "1517248135467-4c7edcad34c4",   // gourmet plating
      "1546069901-ba9599a7e63c",       // signature dish
    ],
    about: [
      "1556910103-1c02745aae4d",       // chef
    ],
    products: [
      "1546069901-ba9599a7e63c",
      "1567620905732-2d1ec7ab7445",
      "1565299624946-b28f40a0ae38",
    ],
    contact: [
      "1414235077428-338989a2e8c0",
    ],
    cta: [
      "1552566626-52f8b828add9",
    ],
  },

  barber: {
    hero: [
      "1517398852892-bc7d11586c4e",   // classic barbershop interior
      "1622286342621-4bd786c2447c",   // barber chair vintage
      "1503951914875-452162b0f3f1",   // straight razor shave
    ],
    about: [
      "1605497788044-5a32c7078486",   // barber working
      "1593702275687-f9fa3b5e6648",   // close-up grooming
    ],
    products: [
      "1521590832167-7bcbfaa6381f",   // grooming products
      "1626808642875-0aa545482dfb",   // beard care kit
    ],
    contact: [
      "1622286342621-4bd786c2447c",   // chair
      "1517398852892-bc7d11586c4e",   // shop interior
    ],
    cta: [
      "1605497788044-5a32c7078486",   // barber finishing
    ],
  },

  barbershop: {
    hero: [
      "1517398852892-bc7d11586c4e",
      "1622286342621-4bd786c2447c",
    ],
    about: ["1605497788044-5a32c7078486"],
    products: ["1521590832167-7bcbfaa6381f"],
    contact: ["1517398852892-bc7d11586c4e"],
    cta: ["1605497788044-5a32c7078486"],
  },

  salon: {
    hero: [
      "1560066984-138dadb4c035",       // salon modern interior
      "1522335789203-aaae5b4b8d04",   // styling chair
      "1487412947147-5cebf100ffc2",   // beauty hair flow
    ],
    about: [
      "1580618672591-eb180b1a973f",   // stylist working
      "1571646034647-52e6ea84b28c",   // beauty professional
    ],
    products: [
      "1556228720-195a672e8a03",       // cosmetics flat lay
      "1571781926291-c477ebfd024b",   // luxury beauty bottles
    ],
    contact: [
      "1560066984-138dadb4c035",
    ],
    cta: [
      "1487412947147-5cebf100ffc2",
    ],
  },

  beauty: {
    hero: ["1560066984-138dadb4c035", "1487412947147-5cebf100ffc2"],
    about: ["1580618672591-eb180b1a973f"],
    products: ["1556228720-195a672e8a03", "1571781926291-c477ebfd024b"],
    contact: ["1560066984-138dadb4c035"],
    cta: ["1487412947147-5cebf100ffc2"],
  },

  watchmaking: {
    hero: [
      "1523275335684-37898b6baf30",   // luxury watch closeup
      "1547996160-81dfa63595aa",       // mechanical watch macro
      "1522312346375-d1a52e2b99b3",   // watch movement
    ],
    about: [
      "1518131672697-613becd4fab5",   // watchmaker hands
      "1509048191080-d2e2678e67b8",   // workshop
    ],
    products: [
      "1547996160-81dfa63595aa",
      "1523275335684-37898b6baf30",
      "1522312346375-d1a52e2b99b3",
    ],
    contact: [
      "1509048191080-d2e2678e67b8",
    ],
    cta: [
      "1547996160-81dfa63595aa",
    ],
  },

  jewelry: {
    hero: [
      "1599643478518-a784e5dc4c8f",   // diamond ring
      "1535632787350-4e68ef0ac584",   // jewelry display
    ],
    about: [
      "1606503825008-909a67e63c3d",   // jeweler at work
    ],
    products: [
      "1599643478518-a784e5dc4c8f",
      "1535632787350-4e68ef0ac584",
    ],
    contact: [
      "1535632787350-4e68ef0ac584",
    ],
    cta: [
      "1599643478518-a784e5dc4c8f",
    ],
  },

  fashion: {
    hero: [
      "1490481651871-ab68de25d43d",   // fashion model editorial
      "1485231183945-fffde7cc051e",   // runway moment
      "1483985988355-763728e1935b",   // fashion editorial
    ],
    about: [
      "1558769132-cb1aea458c5e",       // designer atelier
      "1551803091-e20673f15770",       // sewing studio
    ],
    products: [
      "1539109136881-3be0616acf4b",   // boutique rack
      "1567401893414-76b7b1e5a7a5",   // fashion flat lay
      "1525507119028-ed4c629a60a3",   // luxury bag
    ],
    contact: [
      "1567401893414-76b7b1e5a7a5",
    ],
    cta: [
      "1490481651871-ab68de25d43d",
    ],
  },

  coffee: {
    hero: [
      "1495474472287-4d71bcdd2085",   // cafe ambiance
      "1453614512568-c4024d13c247",   // espresso shot
      "1559496417-e7f25cb247f3",       // pour over
    ],
    about: [
      "1556761175-5973dc0f32e7",       // barista
    ],
    products: [
      "1453614512568-c4024d13c247",
      "1559496417-e7f25cb247f3",
    ],
    contact: ["1495474472287-4d71bcdd2085"],
    cta: ["1559496417-e7f25cb247f3"],
  },

  fitness: {
    hero: [
      "1534438327276-14e5300c3a48",   // gym dark moody
      "1574680096145-d05b474e2155",   // workout
      "1571019614242-c5c5dee9f50b",   // gym equipment
    ],
    about: [
      "1517344884509-a0c97ec11bcc",   // trainer
    ],
    products: [
      "1571019614242-c5c5dee9f50b",
    ],
    contact: ["1534438327276-14e5300c3a48"],
    cta: ["1574680096145-d05b474e2155"],
  },

  cybersecurity: {
    hero: [
      "1550751827-4bd374c3f58b",       // server lights
      "1518770660439-4636190af475",   // circuit board
      "1526374965328-7f61d4dc18c5",   // matrix-style code
    ],
    about: [
      "1521737711867-e3b97375f902",   // tech team
    ],
    products: [
      "1551288049-bebda4e38f71",       // dashboard
      "1518770660439-4636190af475",
    ],
    contact: ["1497366216548-37526070297c"],
    cta: ["1550751827-4bd374c3f58b"],
  },

  saas: {
    hero: [
      "1551288049-bebda4e38f71",       // analytics dashboard
      "1460925895917-afdab827c52f",   // laptop work
    ],
    about: [
      "1521737711867-e3b97375f902",   // team
    ],
    products: [
      "1551288049-bebda4e38f71",
    ],
    contact: ["1497366216548-37526070297c"],
    cta: ["1460925895917-afdab827c52f"],
  },

  portfolio: {
    hero: [
      "1486406146926-c627a92ad1ab",   // creative workspace
      "1561070791-2526d30994b8",       // designer setup
    ],
    about: [
      "1517457373958-b7bdd4587205",   // creative working
    ],
    products: [
      "1561070791-2526d30994b8",
    ],
    contact: ["1486406146926-c627a92ad1ab"],
    cta: ["1517457373958-b7bdd4587205"],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT POOLS — per niche × product-type
// ────────────────────────────────────────────────────────────────────────────

const PRODUCT_POOLS: Record<string, Record<string, string[]>> = {
  basketball: {
    shoe: [
      "1542718610-a1d656d1884c",       // basketball shoes
      "1556906781-9a412961c28c",       // sneaker shot
      "1518365050014-70fe7232897f",   // sneakers shelf
      "1542291026-7eec264c27ff",       // red sneakers
      "1595950653106-6c9ebd614d3a",   // store display
    ],
    jersey: [
      "1577741314755-c19842611a8b",   // basketball game
      "1518605458261-bdab6b6c8d70",   // arena
      "1571019613454-1cb2f99b2d8b",   // jersey rack
      "1574629810360-7efbbe195018",   // sports apparel
    ],
    ball: [
      "1546519638-68e109498ffc",       // basketball
      "1612872087720-bb876e2e67d1",   // ball in action
      "1577471488278-16eec37ffcc2",   // hoop
    ],
    shorts: [
      "1571019613454-1cb2f99b2d8b",
      "1595950653106-6c9ebd614d3a",
    ],
    default: [
      "1546519638-68e109498ffc",
      "1574623452334-1e0ac2b3ccb4",
      "1518605458261-bdab6b6c8d70",
      "1542718610-a1d656d1884c",
    ],
  },

  restaurant: {
    steak: [
      "1546964124-0cce460f38ef",
      "1558030006-450675393462",
    ],
    burger: [
      "1567620905732-2d1ec7ab7445",
      "1568901346375-23c9450c58cd",
    ],
    seafood: [
      "1559339352-11d035aa65de",
      "1532465614-6cc8d45f647f",
    ],
    pasta: [
      "1551183053-bf91a1d81141",
      "1473093295043-cdd812d0e601",
    ],
    pizza: [
      "1565299624946-b28f40a0ae38",
      "1574071318508-1cdbab80d002",
    ],
    dessert: [
      "1559847844-5315695dadae",
      "1551024601-bec78aea704b",
    ],
    coffee: [
      "1453614512568-c4024d13c247",
      "1559496417-e7f25cb247f3",
    ],
    default: [
      "1546069901-ba9599a7e63c",
      "1517248135467-4c7edcad34c4",
      "1567620905732-2d1ec7ab7445",
      "1565299624946-b28f40a0ae38",
    ],
  },

  food: {
    default: [
      "1546069901-ba9599a7e63c",
      "1517248135467-4c7edcad34c4",
      "1567620905732-2d1ec7ab7445",
      "1565299624946-b28f40a0ae38",
    ],
  },

  barber: {
    default: [
      "1521590832167-7bcbfaa6381f",   // grooming products
      "1626808642875-0aa545482dfb",   // beard kit
      "1503951914875-452162b0f3f1",   // razor
      "1605497788044-5a32c7078486",   // barber action
    ],
  },

  barbershop: {
    default: [
      "1521590832167-7bcbfaa6381f",
      "1626808642875-0aa545482dfb",
      "1503951914875-452162b0f3f1",
      "1605497788044-5a32c7078486",
    ],
  },

  salon: {
    nail: [
      "1604654894610-df63bc536371",
      "1632345031435-8727f6897d53",
    ],
    skin: [
      "1571781926291-c477ebfd024b",
      "1556228720-195a672e8a03",
    ],
    hair: [
      "1487412947147-5cebf100ffc2",
      "1522335789203-aaae5b4b8d04",
    ],
    default: [
      "1556228720-195a672e8a03",
      "1571781926291-c477ebfd024b",
      "1487412947147-5cebf100ffc2",
    ],
  },

  beauty: {
    default: [
      "1556228720-195a672e8a03",
      "1571781926291-c477ebfd024b",
      "1487412947147-5cebf100ffc2",
    ],
  },

  watchmaking: {
    default: [
      "1547996160-81dfa63595aa",
      "1523275335684-37898b6baf30",
      "1522312346375-d1a52e2b99b3",
      "1524805444758-089113d48a6d",
    ],
  },

  jewelry: {
    default: [
      "1599643478518-a784e5dc4c8f",
      "1535632787350-4e68ef0ac584",
      "1611652022419-a9419f74343d",
    ],
  },

  fashion: {
    dress: [
      "1490481651871-ab68de25d43d",
      "1483985988355-763728e1935b",
    ],
    jacket: [
      "1551028719-00167b16eac5",
      "1539109136881-3be0616acf4b",
    ],
    shoe: [
      "1525507119028-ed4c629a60a3",
      "1543163521-1bf539c55dd2",
    ],
    default: [
      "1490481651871-ab68de25d43d",
      "1539109136881-3be0616acf4b",
      "1525507119028-ed4c629a60a3",
      "1567401893414-76b7b1e5a7a5",
    ],
  },

  coffee: {
    default: [
      "1453614512568-c4024d13c247",
      "1559496417-e7f25cb247f3",
      "1495474472287-4d71bcdd2085",
    ],
  },

  fitness: {
    default: [
      "1571019614242-c5c5dee9f50b",
      "1534438327276-14e5300c3a48",
      "1574680096145-d05b474e2155",
    ],
  },

  cybersecurity: {
    default: [
      "1550751827-4bd374c3f58b",
      "1518770660439-4636190af475",
      "1551288049-bebda4e38f71",
      "1526374965328-7f61d4dc18c5",
    ],
  },

  saas: {
    default: [
      "1551288049-bebda4e38f71",
      "1460925895917-afdab827c52f",
      "1518770660439-4636190af475",
    ],
  },

  portfolio: {
    default: [
      "1486406146926-c627a92ad1ab",
      "1561070791-2526d30994b8",
      "1517457373958-b7bdd4587205",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// URL BUILDERS
// ────────────────────────────────────────────────────────────────────────────

function unsplashUrl(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;
}

function pickFromPool(pool: string[], hash: number): string | null {
  if (!pool.length) return null;
  return pool[Math.abs(hash) % pool.length];
}

/** Normalize the niche string to a catalog key. */
function nicheKey(niche: string): string {
  const n = (niche || "").toLowerCase().trim();
  if (/barber/.test(n))                   return "barber";
  if (/salon|beauty|cosmetic|spa/.test(n)) return "salon";
  if (/restaurant|dining|bistro/.test(n)) return "restaurant";
  if (/coffee|cafe|espresso/.test(n))     return "coffee";
  if (/food|culinary|gourmet/.test(n))    return "food";
  if (/basketball|nba/.test(n))           return "basketball";
  if (/watch/.test(n))                    return "watchmaking";
  if (/jewel|jeweler/.test(n))            return "jewelry";
  if (/fashion|cloth|apparel|wear/.test(n)) return "fashion";
  if (/fit|gym|workout/.test(n))          return "fitness";
  if (/cyber|security/.test(n))           return "cybersecurity";
  if (/saas|software|app/.test(n))        return "saas";
  if (/portfolio|creative|design|art/.test(n)) return "portfolio";
  return n;
}

/** Classify a product name into a known type bucket for that niche. */
function productKey(name: string, niche: string): string {
  const n = (name || "").toLowerCase();
  switch (nicheKey(niche)) {
    case "basketball":
      // Check jersey/ball/shorts BEFORE shoes — many jersey names contain
      // player names (lebron, curry, kobe) that also appear in shoe names.
      if (/jersey|uniform|swingman|authentic|statement|city\s+edition|lakers|warriors|celtics|bulls|nets|bucks|heat|mavericks|#\d+/.test(n)) return "jersey";
      if (/short|pant/.test(n))   return "shorts";
      if (/\bball\b/.test(n))     return "ball";
      if (/shoe|sneaker|air\s+jordan|air\s+max|zoom|flow|kyrie|kd\s*\d|lebron\s*\d|curry\s*\d/.test(n)) return "shoe";
      return "default";
    case "restaurant":
    case "food":
      if (/coffee|espresso|latte/.test(n))          return "coffee";
      if (/steak|beef|fillet|ribeye/.test(n))       return "steak";
      if (/burger|sandwich/.test(n))                 return "burger";
      if (/seafood|fish|sushi|salmon/.test(n))       return "seafood";
      if (/pasta|spaghetti|ravioli|risotto/.test(n)) return "pasta";
      if (/pizza/.test(n))                           return "pizza";
      if (/dessert|cake|pastry|ice/.test(n))         return "dessert";
      return "default";
    case "salon":
    case "beauty":
      if (/nail|manicure|pedicure/.test(n)) return "nail";
      if (/skin|facial|cleanse/.test(n))    return "skin";
      if (/hair|color|cut|style/.test(n))   return "hair";
      return "default";
    case "fashion":
      if (/dress|gown/.test(n))          return "dress";
      if (/jacket|coat|blazer/.test(n)) return "jacket";
      if (/shoe|heel|boot/.test(n))     return "shoe";
      return "default";
    default:
      return "default";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns a curated Unsplash URL for a SECTION background, or null if no
 * curated pool exists for this niche+role combination.
 *
 * @param niche  e.g. "basketball"
 * @param role   one of "hero" | "about" | "products" | "contact" | "cta"
 * @param hash   deterministic seed (lets each section pick a different pool entry)
 * @param w/h    desired dimensions
 */
export function curatedSectionImage(
  niche: string,
  role: string,
  hash: number,
  w = 1600,
  h = 900
): string | null {
  const nk = nicheKey(niche);
  const pool = SECTION_POOLS[nk]?.[role] ?? SECTION_POOLS[nk]?.hero;
  if (!pool?.length) return null;
  const id = pickFromPool(pool, hash);
  return id ? unsplashUrl(id, w, h) : null;
}

/**
 * Returns a curated Unsplash URL for a specific PRODUCT card, classified by
 * the product name (so e.g. "LeBron Lakers Jersey" → basketball jersey shots,
 * "Air Jordan 1" → basketball shoes), or null if no curated pool exists.
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
  const pool =
    PRODUCT_POOLS[nk]?.[pk] ??
    PRODUCT_POOLS[nk]?.default ??
    [];
  if (!pool.length) return null;
  const id = pickFromPool(pool, hash);
  return id ? unsplashUrl(id, w, h) : null;
}

/** Detect whether the niche has any curated coverage in this catalog. */
export function hasCuratedCoverage(niche: string): boolean {
  const nk = nicheKey(niche);
  return Boolean(SECTION_POOLS[nk] || PRODUCT_POOLS[nk]);
}
