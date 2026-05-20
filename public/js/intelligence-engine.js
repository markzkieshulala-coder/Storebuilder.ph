/**
 * ULTRA-PREMIUM 3D WEBSITE SYSTEM GENERATOR
 * Core Module: Procedural Intelligence Engine
 * Mission: Deep Semantic Relevance + Infinite Architectural Uniqueness
 * Constraint: ZERO hardcoded global theme seed arrays. ALL generation is procedural.
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. ENTROPY & UTILITY PRIMITIVES
  // ============================================================

  const _prngState = new Uint32Array(4);
  let _seedInitialized = false;

  function _initializePrng(seedStr) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < seedStr.length; i++) {
      const k = seedStr.charCodeAt(i);
      h1 = (h1 ^ k) | 0; h1 = Math.imul(h1, 597399067) | 0; h1 = (h1 << 13) | (h1 >>> 19);
      h2 = (h2 ^ k) | 0; h2 = Math.imul(h2, 2246822507) | 0; h2 = (h2 << 15) | (h2 >>> 17);
      h3 = (h3 ^ k) | 0; h3 = Math.imul(h3, 3266489909) | 0; h3 = (h3 << 17) | (h3 >>> 15);
      h4 = (h4 ^ k) | 0; h4 = Math.imul(h4, 668265263) | 0; h4 = (h4 << 19) | (h4 >>> 13);
    }
    _prngState[0] = h1 >>> 0;
    _prngState[1] = h2 >>> 0;
    _prngState[2] = h3 >>> 0;
    _prngState[3] = h4 >>> 0;
    _seedInitialized = true;
  }

  function _hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function _rand() {
    if (!_seedInitialized) _initializePrng(String(Date.now()) + Math.random());
    const s0 = _prngState[0], s1 = _prngState[1], s2 = _prngState[2], s3 = _prngState[3];
    const t = (s0 + s3) | 0;
    _prngState[0] = (s1 << 9) | (s1 >>> 23);
    _prngState[1] = (s2 << 11) | (s2 >>> 21);
    _prngState[2] = (s3 << 13) | (s3 >>> 19);
    _prngState[3] = Math.imul(s0, 5);
    const b = (t << 7) | (t >>> 25);
    const c = Math.imul(s1, 9);
    _prngState[0] = (_prngState[0] ^ b) | 0;
    _prngState[3] = (_prngState[3] ^ c) | 0;
    return ((t >>> 0) / 4294967296);
  }

  function _randInt(min, max) {
    return Math.floor(_rand() * (max - min + 1)) + min;
  }

  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function _lerp(a, b, t) { return a + (b - a) * t; }

  function _shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(_rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function _pick(arr) {
    return arr[_randInt(0, arr.length - 1)];
  }

  function _hex(n) {
    const s = Math.round(_clamp(n, 0, 255)).toString(16);
    return s.length === 1 ? '0' + s : s;
  }

  function _rgbToHex(r, g, b) {
    return '#' + _hex(r) + _hex(g) + _hex(b);
  }

  // ============================================================
  // 2. SEMANTIC KEYWORD SPACES & LEXICAL PARSING
  // ============================================================

  const CATEGORY_TRIGGERS = {
    E_COMMERCE: [
      'shop', 'store', 'boutique', 'retail', 'product', 'collection', 'catalog', 'commerce',
      'ecommerce', 'sneaker', 'shoe', 'fashion', 'watch', 'jewelry', 'apparel', 'luxury goods',
      'handbag', 'leather', 'furniture', 'interior', 'wine', 'perfume', 'cosmetic', 'skincare',
      'marketplace', 'sell', 'purchase', 'cart', 'checkout', 'inventory', 'brand store',
      'basketball', 'soccer', 'sports', 'jersey', 'sneakers', 'shoes', 'kicks', 'nba',
      'coffee', 'cafe', 'espresso', 'roastery', 'beans', 'tea', 'bakery',
      'gym', 'fitness', 'supplement', 'workout', 'crossfit', 'pilates', 'yoga',
      'salon', 'spa', 'barbershop', 'beauty', 'nails', 'hair',
      'skincare', 'beauty', 'cosmetics', 'makeup', 'fragrance',
      'restaurant', 'dining', 'eatery', 'bistro', 'cuisine', 'food', 'kitchen',
      'flower', 'florist', 'plants', 'garden',
      'bookstore', 'books', 'stationery',
      'electronics', 'gadgets', 'phone', 'laptop', 'computer',
      'pet', 'pets', 'pet shop', 'pet store', 'veterinary',
      'toys', 'kids', 'baby', 'children',
      'auto', 'automotive', 'car', 'motorcycle', 'bike',
      'home decor', 'kitchen', 'bedding', 'mattress',
      'art', 'crafts', 'handmade', 'artisan'
    ],
    PORTFOLIO: [
      'portfolio', 'creative', 'artist', 'photographer', 'videographer', 'filmmaker', 'editor',
      'designer', 'illustrator', 'architect', 'writer', 'copywriter', 'director', 'showreel',
      'showcase', 'gallery', 'selected works', 'case study', 'personal site', 'demo reel',
      'motion', '3d artist', 'graphic designer', 'ui designer', 'ux designer', 'creative studio'
    ],
    SAAS: [
      'saas', 'dashboard', 'platform', 'analytics', 'software', 'app', 'application', 'toolkit',
      'suite', 'cloud', 'service', 'solution', 'management system', 'crm', 'erp', 'api',
      'data platform', 'workflow', 'automation', 'collaboration', 'workspace', 'enterprise',
      'productivity', 'monitoring', 'infrastructure', 'devops', 'fintech', 'martech'
    ],
    AGENCY: [
      'agency', 'studio', 'consultancy', 'firm', 'collective', 'partners', 'creative agency',
      'digital agency', 'marketing agency', 'branding', 'strategy', 'growth', 'media group',
      'production house', 'ad agency', 'design studio', 'development agency'
    ],
    LANDING: [
      'landing page', 'coming soon', 'waitlist', 'preorder', 'launch', 'campaign', 'event',
      'conference', 'signup', 'lead gen', 'promo', 'announcement', 'product launch',
      'early access', 'register', 'subscribe', 'download', 'beta'
    ],
    BUSINESS: [
      'business', 'corporate', 'company', 'enterprise', 'professional services', 'law firm',
      'accounting', 'real estate', 'hospitality', 'restaurant', 'cafe', 'hotel', 'clinic',
      'healthcare', 'consulting', 'logistics', 'manufacturing', 'construction', 'insurance'
    ]
  };

  const NICHE_EXTRACT_PATTERNS = [
    /(?:build|create|design|generate)\s+(?:a|an)\s+(.+?)\s+(?:website|site|page|experience)/i,
    /(?:for|about)\s+(?:a|an)?\s*(.+?)\s+(?:website|site|page|store|portfolio|dashboard)/i,
    /^(.+?)\s+(?:website|site|page|store|portfolio|dashboard)/i,
    /(.+?)(?:\s+website|\s+site|\s+page)/i
  ];

  const BRAND_PATTERNS = [
    /brand\s+(?:name|is|:)?\s*["']?([^"'\n,]+)["']?/i,
    /(?:called|named)\s+["']?([^"'\n,]{2,40})["']?/i,
    /^(?:"|')?([^"'\n,]{2,30})(?:"|')?\s*[-–:]\s/i
  ];

  // ============================================================
  // 3. INTENT PARSING PIPELINE
  // ============================================================

  function parseIntent(userPrompt) {
    const raw = (userPrompt || '').toLowerCase().trim();
    if (!raw) return null;

    // -- A) siteCategory detection --
    let bestCategory = 'BUSINESS';
    let bestScore = -1;
    const tokens = raw.split(/[^a-z0-9]+/).filter(Boolean);

    for (const [cat, triggers] of Object.entries(CATEGORY_TRIGGERS)) {
      let score = 0;
      for (const token of tokens) {
        for (const trig of triggers) {
          if (token === trig) { score += 4; }
          else if (trig.includes(token)) { score += 2; }
          else if (token.includes(trig)) { score += 1; }
        }
      }
      if (score > bestScore) { bestScore = score; bestCategory = cat; }
    }

    // -- B) primaryNiche extraction --
    let primaryNiche = '';
    for (const pattern of NICHE_EXTRACT_PATTERNS) {
      const m = userPrompt.match(pattern);
      if (m && m[1]) { primaryNiche = m[1].trim(); break; }
    }
    if (!primaryNiche) {
      primaryNiche = userPrompt
        .replace(/\b(build|create|design|generate|make|a|an|the|for|website|site|page|me|us)\b/gi, '')
        .replace(/[.,;:!?]+$/, '')
        .trim();
    }
    if (primaryNiche.length > 60) primaryNiche = primaryNiche.slice(0, 60);

    // -- C) brandName extraction --
    let brandName = '';
    for (const pattern of BRAND_PATTERNS) {
      const m = userPrompt.match(pattern);
      if (m && m[1]) { brandName = m[1].trim(); break; }
    }
    if (!brandName && primaryNiche) {
      const words = primaryNiche.split(/\s+/);
      if (words.length >= 1) {
        brandName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    // -- D) Build deterministic seed from prompt + current time jitter --
    const timeJitter = String(Date.now()).slice(-6);
    const seedSource = raw + '|' + bestCategory + '|' + primaryNiche + '|' + timeJitter;
    const masterSeed = String(_hashString(seedSource));
    _initializePrng(masterSeed);

    return {
      siteCategory: bestCategory,
      primaryNiche: primaryNiche,
      brandName: brandName,
      masterSeed: masterSeed,
      rawPrompt: userPrompt
    };
  }

  // ============================================================
  // 3B. DYNAMIC COPY MATRIX — Niche-specific copy generation
  // ============================================================

  function generateNicheCopy(intent) {
    const n = (intent.primaryNiche || '').toLowerCase();
    const b = intent.brandName || 'Brand';
    const raw = (intent.rawPrompt || '').toLowerCase();
    const cat = intent.siteCategory || 'BUSINESS';
    function _has() {
      var keys = Array.prototype.slice.call(arguments);
      return keys.some(function(k) { return raw.indexOf(k) >= 0 || n.indexOf(k) >= 0; });
    }
    var isBasketball = _has('basketball', 'nba', 'hoops', 'court');
    var isSoccer = _has('soccer', 'football', 'futbol', 'pitch') && !isBasketball;
    var isSneakers = _has('sneaker', 'kicks') && !isBasketball && !isSoccer;
    var isCoffee = _has('coffee', 'cafe', 'espresso', 'roaster', 'barista', 'beans');
    var isRestaurant = _has('restaurant', 'dining', 'cuisine', 'bistro', 'eatery') && !isCoffee;
    var isFitness = _has('gym', 'fitness', 'workout', 'training', 'supplement', 'crossfit');
    var isSalon = _has('salon', 'barbershop', 'barber', 'spa', 'haircut');
    var isJewelry = _has('jewel', 'jewelry', 'ring', 'necklace', 'diamond');
    var isWatch = _has('watch', 'timepiece', 'horology');
    var isLeather = _has('leather goods', 'leather bag', 'leathercraft', 'leather wallet', 'leather store');
    var isFashion = _has('fashion', 'apparel', 'clothing', 'streetwear', 'couture') && !isLeather;
    var isSkincare = _has('skincare', 'skin care', 'cosmetic', 'serum', 'moisturizer');
    var isElectronics = _has('electronics', 'gadget', 'smartphone', 'laptop', 'devices');
    var isPets = _has('pet store', 'pet shop', 'dog', 'veterinary', 'animal shelter');
    var isPhotography = _has('photographer', 'photography', 'photo studio', 'portrait');
    var isVideo = _has('video editor', 'filmmaker', 'videographer', 'film production', 'motion design');
    var isSaas = cat === 'SAAS';
    var isAgency = cat === 'AGENCY';
    var isPortfolio = cat === 'PORTFOLIO';
    var isLanding = cat === 'LANDING';

    if (isBasketball) return {
      tagline: 'Basketball Culture',
      headline: b,
      subheadline: 'Elite gear, authentic jerseys, and court-ready equipment for players who play to win.',
      manifesto: ['We outfit', 'champions', 'on every', 'court.'],
      sectionAbout: b + ' was built for the culture. From practice courts to championship arenas, our gear is worn by those who play at the highest level.',
      featureHighlights: [
        {title:'Court-Grade Gear', desc:'Every product is tested under game conditions — durable, performance-driven, built to last.'},
        {title:'Authentic Jerseys', desc:'Official-replica and custom NBA-style jerseys with premium stitching and breathable fabric.'},
        {title:'Fast Nationwide Delivery', desc:'Orders ship same-day. Reach any court in 24 hours across major cities.'},
        {title:'Player First', desc:'From point guards to centers, our catalog serves every position and every play style.'},
        {title:'Trusted by Athletes', desc:'Over 5,000 players trust ' + b + ' for their game-day gear and training equipment.'},
        {title:'Secure Checkout', desc:'GCash, credit card, and installment — all secured with bank-level encryption.'}
      ]
    };
    if (isSoccer) return {
      tagline: 'Football Culture',
      headline: b,
      subheadline: 'Premium football kits, boots, and training gear. Where the beautiful game begins.',
      manifesto: ['We play', 'the beautiful', 'game with', 'precision.'],
      sectionAbout: b + ' equips football players from grassroots to elite — authentic kits, pro boots, and essential training equipment.',
      featureHighlights: [
        {title:'Match-Ready Kits', desc:'Every jersey uses breathable, sweat-wicking fabric built for 90+ minutes of play.'},
        {title:'Pro Boots', desc:'Performance football boots engineered for traction, control, and acceleration on any surface.'},
        {title:'Fast Shipping', desc:'Same-day dispatch. Your kit arrives before your next training session.'},
        {title:'Club & Player', desc:b + ' supplies individual players, local clubs, and national academies alike.'},
        {title:'Community Trusted', desc:b + ' has outfitted thousands of players across dozens of leagues nationwide.'},
        {title:'Secure Orders', desc:'Shop with confidence — all payments secured with bank-level encryption.'}
      ]
    };
    if (isCoffee) return {
      tagline: 'Specialty Coffee',
      headline: b,
      subheadline: 'Single-origin roasts, precision espresso, and coffee culture at its finest. From bean to cup.',
      manifesto: ['Every cup', 'begins with', 'intentional', 'craft.'],
      sectionAbout: b + ' sources the world\'s finest green coffee, roasts to order, and delivers an exceptional cup every single time.',
      featureHighlights: [
        {title:'Single-Origin Sourcing', desc:b + ' partners directly with farms in Ethiopia, Colombia, and beyond for traceable, premium beans.'},
        {title:'Small-Batch Roasting', desc:'Roasted in small batches, weekly — so you always receive peak freshness in every bag.'},
        {title:'Same-Day Dispatch', desc:'Roasted-to-order and shipped within 24 hours of your purchase.'},
        {title:'Barista Grade', desc:'Our roast profiles are developed with professional baristas to achieve perfect extraction.'},
        {title:'Subscription Ready', desc:b + ' subscribers receive rotating seasonal selections curated by our head roaster.'},
        {title:'Eco-Conscious', desc:'All packaging is compostable. We offset 100% of our roasting carbon emissions.'}
      ]
    };
    if (isRestaurant) return {
      tagline: 'Fine Dining',
      headline: b,
      subheadline: 'An exceptional dining experience crafted from the finest seasonal ingredients. Where every meal is a memory.',
      manifesto: ['Great food', 'begins with', 'uncompromising', 'ingredients.'],
      sectionAbout: b + ' is a celebration of culinary craft. Our chefs source seasonal ingredients and transform them into dishes that linger long after the last bite.',
      featureHighlights: [
        {title:'Seasonal Menu', desc:'Our chefs craft the menu around the finest seasonal produce available each week.'},
        {title:'Curated Wine List', desc:'Over 80 labels — natural, organic, and biodynamic — curated to complement every dish.'},
        {title:'Private Dining', desc:'Bespoke experiences for celebrations, corporate events, and intimate gatherings.'},
        {title:'Farm-to-Table', desc:b + ' partners with local farms to bring the freshest produce from field to plate.'},
        {title:'Renowned Kitchen', desc:'Our kitchen has served thousands of guests with a 4.9-star average across all platforms.'},
        {title:'Easy Reservations', desc:'Book your table online in seconds. Same-day and advance bookings always available.'}
      ]
    };
    if (isFitness) return {
      tagline: 'Performance Training',
      headline: b,
      subheadline: 'Premium fitness equipment and supplements engineered for serious athletes. Train harder.',
      manifesto: ['Strength is', 'built through', 'intentional', 'effort.'],
      sectionAbout: b + ' exists for those who take training seriously — premium equipment, scientifically-backed supplements, and programs that produce real results.',
      featureHighlights: [
        {title:'Science-Backed Supplements', desc:'Every ' + b + ' supplement is third-party tested — no fillers, no compromise on purity.'},
        {title:'Pro-Grade Equipment', desc:'Commercial-grade bars, plates, and rigs built for gym and home installations.'},
        {title:'Fast Delivery', desc:'Same-day dispatch on all in-stock items. Your gear arrives ready to use.'},
        {title:'Expert Programs', desc:b + ' training programs are designed by certified coaches with proven, documented results.'},
        {title:'Athlete Community', desc:'Join thousands of ' + b + ' athletes sharing progress, PRs, and nutrition advice.'},
        {title:'Secure Payments', desc:'Multi-payment support including GCash, card, COD, and installment plans.'}
      ]
    };
    if (isSalon) return {
      tagline: 'Premium Beauty',
      headline: b,
      subheadline: 'Expert stylists, luxury products, and an atmosphere designed for total transformation. Your sanctuary.',
      manifesto: ['Beauty begins', 'with care', 'and the right', 'hands.'],
      sectionAbout: b + ' is a premium beauty destination — skilled stylists, curated products, and a welcoming environment that creates your best self.',
      featureHighlights: [
        {title:'Master Stylists', desc:'Every ' + b + ' stylist is trained at premium academies with years of hands-on expertise.'},
        {title:'Luxury Products', desc:'We use only professional-grade, cruelty-free brands — L\'Oréal Pro, Wella, Olaplex, and more.'},
        {title:'Easy Booking', desc:'Book your appointment online in seconds. Same-day slots often available.'},
        {title:'Full-Service Menu', desc:'Haircuts, color, nail art, facials — ' + b + ' is your complete beauty destination.'},
        {title:'Private Atmosphere', desc:'Curated playlists, premium décor, and attentive service make every visit memorable.'},
        {title:'Trusted Results', desc:b + ' has styled thousands of clients with a 4.9-star reputation across platforms.'}
      ]
    };
    if (isJewelry) return {
      tagline: 'Fine Jewelry',
      headline: b,
      subheadline: 'Handcrafted fine jewelry that celebrates life\'s most significant moments. Worn by those who notice the difference.',
      manifesto: ['Every piece', 'carries the', 'weight of', 'intention.'],
      sectionAbout: b + ' crafts jewelry from conflict-free diamonds and ethically sourced metals. Each piece is a permanent statement of quality and love.',
      featureHighlights: [
        {title:'Conflict-Free Stones', desc:'Every ' + b + ' diamond and gemstone is responsibly sourced and GIA-certified.'},
        {title:'Handcrafted Settings', desc:'Each piece is made by hand using traditional goldsmithing techniques refined over generations.'},
        {title:'Bespoke Service', desc:'Design a custom engagement ring, pendant, or bracelet — we make your vision tangible.'},
        {title:'Complimentary Engraving', desc:b + ' offers free engraving on all pieces — personalize with a message or date.'},
        {title:'Lifetime Warranty', desc:'All jewelry is backed by our lifetime craftsmanship warranty and complimentary resizing.'},
        {title:'Insured Delivery', desc:'Every order ships in tamper-proof packaging with full insurance coverage.'}
      ]
    };
    if (isWatch) return {
      tagline: 'Fine Timepieces',
      headline: b,
      subheadline: 'Precision-engineered timepieces that transcend the ordinary. Time, mastered.',
      manifesto: ['Time deserves', 'an instrument', 'worthy of', 'your wrist.'],
      sectionAbout: b + ' curates and distributes some of the world\'s most respected mechanical and quartz timepieces — from dress watches to professional divers.',
      featureHighlights: [
        {title:'Swiss Movement', desc:'Every ' + b + ' timepiece houses a certified Swiss or Japanese movement for precision you can feel.'},
        {title:'Sapphire Crystal', desc:'Anti-scratch sapphire crystal display glass on all premium-tier pieces.'},
        {title:'Authenticated Pre-Owned', desc:'Our certified pre-owned program gives you access to rare references at honest prices.'},
        {title:'White Glove Service', desc:b + ' offers strap changes, battery replacement, and movement servicing in-house.'},
        {title:'Authorized Dealer', desc:'Verified inventory and documentation on every piece in our collection.'},
        {title:'Insured Delivery', desc:'Every timepiece ships in a branded box with full insurance and signature confirmation.'}
      ]
    };
    if (isLeather) return {
      tagline: 'Leather Craft',
      headline: b,
      subheadline: 'Hand-stitched leather goods built to age beautifully and outlast trends. Heritage in every grain.',
      manifesto: ['Craftsmanship', 'takes time.', 'We believe', "it's worth it."],
      sectionAbout: b + ' produces leather goods using full-grain hides and traditional hand-stitching. Our bags and accessories only get better with age.',
      featureHighlights: [
        {title:'Full-Grain Leather', desc:b + ' uses only the top layer of the hide — the most durable, richest part of the leather.'},
        {title:'Hand-Stitched', desc:'Each piece is saddle-stitched by hand — a method that outlasts machine stitching by decades.'},
        {title:'Heritage Tanning', desc:'Vegetable-tanned using traditional Italian methods that produce a rich, developing patina.'},
        {title:'Made to Order', desc:'Many ' + b + ' pieces are made-to-order. Custom initials, dimensions, and hardware available.'},
        {title:'Lifetime Repair', desc:'We repair or replace any piece showing craft defects — unconditionally, for life.'},
        {title:'Responsible Hides', desc:'All leather is sourced from tanneries certified under Leather Working Group standards.'}
      ]
    };
    if (isFashion) return {
      tagline: 'Contemporary Fashion',
      headline: b,
      subheadline: 'Modern silhouettes, quality fabrics, and a distinct point of view. Wear your perspective.',
      manifesto: ['Fashion is', 'a language.', b + ' helps', 'you speak it.'],
      sectionAbout: b + ' is an independent fashion label built on intention. Every collection is a conversation between material, form, and the person wearing it.',
      featureHighlights: [
        {title:'Quality Fabrics', desc:b + ' uses GOTS-certified organic cotton, premium linen, and responsible blends across all collections.'},
        {title:'Seasonal Collections', desc:'New collections release quarterly, designed around a single narrative concept.'},
        {title:'Inclusive Sizing', desc:b + ' offers XS through 3XL in all styles — fashion for every body.'},
        {title:'Ethical Production', desc:'Made in ethical factories with fair wages and independently audited working conditions.'},
        {title:'Easy Returns', desc:'30-day no-questions returns with free prepaid labels on every order.'},
        {title:'Style Concierge', desc:'Our personal styling team helps you build a wardrobe around your lifestyle and budget.'}
      ]
    };
    if (isSkincare) return {
      tagline: 'Skincare Science',
      headline: b,
      subheadline: 'Clinically validated formulas and clean ingredients for transformative skin results. Science you can feel.',
      manifesto: ['Your skin', 'deserves', 'ingredients that', 'actually work.'],
      sectionAbout: b + ' is a clinical skincare brand built on peer-reviewed science. No filler ingredients, no false promises — formulas that deliver visible results.',
      featureHighlights: [
        {title:'Clinically Tested', desc:'Every ' + b + ' formula undergoes independent clinical trials before reaching your skin.'},
        {title:'Clean Ingredients', desc:'Zero parabens, zero sulfates, zero synthetic fragrance — just effective actives.'},
        {title:'Dermatologist Approved', desc:b + ' works with board-certified dermatologists to develop each formulation.'},
        {title:'Sustainable Packaging', desc:'Refillable glass bottles and compostable outer packaging — beauty with conscience.'},
        {title:'Personalized Routine', desc:'Answer 5 questions and receive a routine built specifically for your skin type.'},
        {title:'Results Guarantee', desc:'60-day results guarantee — if your skin doesn\'t improve, we refund in full.'}
      ]
    };
    if (isElectronics) return {
      tagline: 'Tech & Devices',
      headline: b,
      subheadline: 'Premium gadgets, authentic devices, and accessories that keep you connected. Technology with purpose.',
      manifesto: ['The right', 'device changes', 'how you', 'experience life.'],
      sectionAbout: b + ' stocks authenticated electronics from the world\'s leading manufacturers. Every device is genuine, every purchase backed by full warranty.',
      featureHighlights: [
        {title:'Authentic Products', desc:'Every ' + b + ' device comes with official documentation, authentic warranty, and purchase receipt.'},
        {title:'Wide Selection', desc:'Smartphones, laptops, audio, wearables, and smart home devices — all under one roof.'},
        {title:'Same-Day Delivery', desc:b + ' offers same-day delivery in Metro Manila and major cities nationwide.'},
        {title:'Expert Advice', desc:'Our product specialists help you find the right device for your needs and budget.'},
        {title:'Extended Warranty', desc:'Add up to 2 years of extended warranty coverage to any device at checkout.'},
        {title:'Secure Checkout', desc:'Pay with GCash, credit card, or installment — all with bank-level security.'}
      ]
    };
    if (isPets) return {
      tagline: 'Pet Care',
      headline: b,
      subheadline: 'Everything your pets need to thrive — premium nutrition, accessories, and expert care. For the family members who love unconditionally.',
      manifesto: ['Every pet', 'deserves a life', 'full of', 'care and joy.'],
      sectionAbout: b + ' is the trusted pet care destination for thousands of pet owners — vet-approved products, premium food, and everything in between.',
      featureHighlights: [
        {title:'Vet-Approved Nutrition', desc:'All ' + b + ' pet food and supplements are selected with input from licensed veterinarians.'},
        {title:'Premium Accessories', desc:'Beds, crates, collars, and toys curated for safety, durability, and pet happiness.'},
        {title:'Same-Day Delivery', desc:b + ' ships same-day so your pet never runs out of the essentials.'},
        {title:'Grooming Services', desc:'Professional pet grooming, dental cleaning, and nail trims at our flagship locations.'},
        {title:'Vet Consultations', desc:'Book online vet consultations through the ' + b + ' platform — fast and affordable.'},
        {title:'Trusted by Owners', desc:'Over 10,000 pet owners trust ' + b + ' for their furry family members\' daily care.'}
      ]
    };
    if (isPhotography) return {
      tagline: 'Photography',
      headline: b,
      subheadline: 'Visual storytelling through the lens — capturing moments that outlast memory. The image behind the image.',
      manifesto: ['A great', 'photograph', 'tells a story', 'without words.'],
      sectionAbout: b + ' is a professional photography studio specializing in portraits, editorial, commercial, and documentary work. Every frame is intentional.',
      featureHighlights: [
        {title:'Commercial Photography', desc:b + ' produces campaign-ready imagery for brands, agencies, and product launches.'},
        {title:'Portrait Sessions', desc:'Individual, couple, and family sessions with full retouching and print rights included.'},
        {title:'Event Coverage', desc:'Weddings, corporate events, and private celebrations — full-day and half-day packages.'},
        {title:'Fast Turnaround', desc:b + ' delivers fully edited galleries within 5 business days. Rush delivery available.'},
        {title:'Full Rights', desc:'All commercial and personal use rights included with every package. No licensing fees.'},
        {title:'Award-Winning Work', desc:b + ' has been recognized across regional and international photography competitions.'}
      ]
    };
    if (isVideo) return {
      tagline: 'Video Production',
      headline: b,
      subheadline: 'Cinematic storytelling — from brand films to social-first reels. Motion that moves people.',
      manifesto: ['Motion that', 'moves people', 'begins with', 'a single frame.'],
      sectionAbout: b + ' is a full-service video production studio. We concept, shoot, and deliver brand films, documentary content, and social media reels.',
      featureHighlights: [
        {title:'Brand Films', desc:b + ' produces narrative-driven brand films that define identity and build genuine audience connection.'},
        {title:'Social-First Content', desc:'Vertical, horizontal, and square formats optimized for Instagram, TikTok, and YouTube.'},
        {title:'Documentary Style', desc:'Long-form documentary content for NGOs, companies, and cultural institutions.'},
        {title:'Fast Edit Cycles', desc:b + ' delivers first cuts within 3 business days. Revisions turned around in 24 hours.'},
        {title:'Full Post-Production', desc:'Color grading, sound design, motion graphics, and VFX all handled in-house.'},
        {title:'Client Portal', desc:'Review and approve edits through a dedicated portal with time-coded comments.'}
      ]
    };
    if (isSaas) return {
      tagline: b + ' Platform',
      headline: b,
      subheadline: 'The platform that scales with your team. Built for the way you actually work.',
      manifesto: ['Software', 'should work', 'for people,', 'not against them.'],
      sectionAbout: b + ' is a modern platform designed to eliminate friction, automate workflows, and give your team the clarity they need to move fast.',
      featureHighlights: [
        {title:'Real-Time Analytics', desc:b + ' surfaces the metrics that matter — live dashboards, custom reports, automated alerts.'},
        {title:'Team Collaboration', desc:'Shared workspaces, role-based access, and async-first communication tools built in.'},
        {title:'API-First Architecture', desc:b + ' connects to your existing stack — Slack, Notion, Zapier, and 100+ integrations.'},
        {title:'Enterprise Security', desc:'SOC 2 Type II certified. SSO, 2FA, audit logs, and data residency controls standard.'},
        {title:'Instant Onboarding', desc:'From signup to first value in under 5 minutes. No setup fees, no sales call required.'},
        {title:'24/7 SLA Support', desc:'Dedicated customer success manager and 99.99% uptime SLA on all paid plans.'}
      ]
    };
    if (isAgency) return {
      tagline: 'Creative Agency',
      headline: b,
      subheadline: 'Strategy, design, and technology — united. We build the brands that define categories.',
      manifesto: ['Great brands', 'aren\'t built', 'by accident.', 'They\'re designed.'],
      sectionAbout: b + ' is an independent creative agency specializing in brand identity, digital campaigns, and spatial web experiences. We work with visionary founders and global companies.',
      featureHighlights: [
        {title:'Brand Strategy', desc:b + ' develops naming, positioning, and messaging architecture that gives brands a defensible identity.'},
        {title:'Visual Identity', desc:'Logo systems, color palettes, typography, and art direction — built to scale across all touchpoints.'},
        {title:'Digital Campaigns', desc:'Performance creative, social campaigns, and paid media strategy that drives measurable results.'},
        {title:'Spatial Web Design', desc:b + ' builds 3D web experiences that stop the scroll and start conversations.'},
        {title:'Film & Content', desc:'Brand films, explainer videos, and documentary content produced in-house at studio quality.'},
        {title:'Transparent Process', desc:'Weekly check-ins, shared project portals, and clear milestones — you\'re always in control.'}
      ]
    };
    if (isPortfolio) return {
      tagline: 'Selected Work',
      headline: b,
      subheadline: 'A curated collection of work at the intersection of design, technology, and storytelling. Making things that matter.',
      manifesto: ['Design', 'without intent', 'is just', 'decoration.'],
      sectionAbout: b + ' is an independent creative practitioner — working with brands, agencies, and cultural institutions to produce work worth remembering.',
      featureHighlights: [
        {title:'Brand Identity', desc:b + ' creates visual identities that distill complex ideas into systems that scale.'},
        {title:'UI/UX Design', desc:'Interface design with deep attention to accessibility, hierarchy, and interaction logic.'},
        {title:'Motion & 3D', desc:'Kinetic design, motion graphics, and spatial web experiences with cinematic craft.'},
        {title:'Art Direction', desc:b + ' directs photoshoots, campaigns, and editorial content for print and digital media.'},
        {title:'Strategy', desc:'Design thinking-driven strategy workshops and positioning exercises for growing brands.'},
        {title:'Available Now', desc:'Open for freelance, studio collaboration, or full-time creative leadership opportunities.'}
      ]
    };
    if (isLanding) return {
      tagline: 'Coming Soon',
      headline: b,
      subheadline: 'Something exceptional is coming. Join the waitlist and be first to experience it.',
      manifesto: ['We\'re building', 'something', 'the world', 'hasn\'t seen.'],
      sectionAbout: b + ' is in private beta. We\'re accepting early access requests from founding members who want to shape what comes next.',
      featureHighlights: [
        {title:'Founding Access', desc:'Founding members get lifetime pricing, priority support, and direct input into the ' + b + ' roadmap.'},
        {title:'Exclusive Features', desc:'Early access users unlock features months before public release.'},
        {title:'Founding Pricing', desc:b + ' founding pricing is locked for life — never pay more, even as we scale.'},
        {title:'Community First', desc:'Join a private community of early adopters who share feedback and shape the product.'},
        {title:'No Credit Card', desc:'Reserve your spot today — no payment required until launch day.'},
        {title:'Launch Alert', desc:'We\'ll notify you the moment ' + b + ' goes live. Be first in line.'}
      ]
    };
    // E_COMMERCE fallback
    var nicheLabel = n.split(' ').slice(0, 3).map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ') || 'Premium Store';
    if (cat === 'E_COMMERCE') return {
      tagline: nicheLabel,
      headline: b,
      subheadline: 'Premium ' + n + ' curated with precision for those who demand the best.',
      manifesto: ['Premium', n, 'deserves a', 'premium home.'],
      sectionAbout: b + ' is your trusted destination for the finest ' + n + '. Every product is hand-selected, every order handled with care and precision.',
      featureHighlights: [
        {title:'Premium Selection', desc:'Every ' + n + ' at ' + b + ' is hand-selected against rigorous quality standards.'},
        {title:'Expert Curation', desc:'Our specialists review thousands of products to bring you only the best ' + n + ' available.'},
        {title:'Fast Delivery', desc:b + ' ships same-day and next-day to major cities nationwide.'},
        {title:'Customer Promise', desc:'30-day hassle-free returns, live chat support, and a satisfaction guarantee on every order.'},
        {title:'Authentic Products', desc:'Every item at ' + b + ' is verified authentic — no counterfeits, ever.'},
        {title:'Secure Payments', desc:'GCash, credit card, and installment — all secured with bank-level encryption.'}
      ]
    };
    // General fallback
    return {
      tagline: nicheLabel || 'Premium Service',
      headline: b,
      subheadline: b + ' — delivering exceptional ' + (n || 'service') + ' with uncompromising quality and trusted expertise.',
      manifesto: ['Excellence', 'is not an', 'accident.', "It's a choice."],
      sectionAbout: b + ' has built a reputation for quality, reliability, and results. We serve our customers with genuine care and expert execution.',
      featureHighlights: [
        {title:'Premium Quality', desc:'Everything at ' + b + ' meets our rigorous quality standards before reaching our customers.'},
        {title:'Expert Team', desc:'Our team brings years of ' + (n || 'industry') + ' expertise to every engagement.'},
        {title:'Fast Turnaround', desc:b + ' delivers on time, every time — no excuses, no delays.'},
        {title:'Client First', desc:'We build every solution around your specific goals, timeline, and budget.'},
        {title:'Proven Track Record', desc:'Thousands of satisfied clients trust ' + b + ' year after year.'},
        {title:'Secure & Reliable', desc:'Industry-standard security, privacy-compliant processes, and 24/7 support.'}
      ]
    };
  }

  // ============================================================
  // 4. PROCEDURAL AESTHETIC GENERATOR
  // ============================================================

  // Semantic color-space definitions (ranges only, NO fixed hex arrays)
  const SEMANTIC_COLOR_SPACES = {
    LUXURY: {
      baseHueRange: [210, 260],
      baseSatRange: [5, 18],
      baseLitRange: [4, 14],
      accentHueRange: [35, 55],
      accentSatRange: [55, 80],
      accentLitRange: [55, 72],
      secondaryHueOffset: [170, 210],
      secondarySatRange: [25, 45],
      secondaryLitRange: [40, 60],
      surfaceLitRange: [8, 18],
      label: 'luxury'
    },
    TECH_SASS: {
      baseHueRange: [220, 245],
      baseSatRange: [30, 55],
      baseLitRange: [6, 14],
      accentHueRange: [160, 190],
      accentSatRange: [70, 95],
      accentLitRange: [55, 75],
      secondaryHueOffset: [280, 320],
      secondarySatRange: [50, 75],
      secondaryLitRange: [55, 70],
      surfaceLitRange: [10, 20],
      label: 'tech_saas'
    },
    CREATIVE_DARK: {
      baseHueRange: [0, 360],
      baseSatRange: [3, 12],
      baseLitRange: [4, 10],
      accentHueRange: [0, 360],
      accentSatRange: [75, 95],
      accentLitRange: [60, 80],
      secondaryHueOffset: [0, 360],
      secondarySatRange: [40, 65],
      secondaryLitRange: [50, 70],
      surfaceLitRange: [8, 16],
      label: 'creative_dark'
    },
    WARM_ORGANIC: {
      baseHueRange: [20, 45],
      baseSatRange: [20, 35],
      baseLitRange: [10, 20],
      accentHueRange: [340, 20],
      accentSatRange: [55, 80],
      accentLitRange: [55, 75],
      secondaryHueOffset: [80, 120],
      secondarySatRange: [30, 55],
      secondaryLitRange: [45, 65],
      surfaceLitRange: [14, 24],
      label: 'warm_organic'
    },
    MINIMAL_LIGHT: {
      baseHueRange: [0, 360],
      baseSatRange: [0, 8],
      baseLitRange: [94, 98],
      accentHueRange: [200, 260],
      accentSatRange: [60, 85],
      accentLitRange: [50, 65],
      secondaryHueOffset: [0, 360],
      secondarySatRange: [0, 15],
      secondaryLitRange: [30, 50],
      surfaceLitRange: [96, 100],
      label: 'minimal_light'
    }
  };

  function _mapCategoryToSemanticSpace(category, niche) {
    const nicheLow = niche.toLowerCase();
    if (category === 'E_COMMERCE') {
      if (/shoe|sneaker|leather|watch|jewelry|perfume|luxury/.test(nicheLow)) return 'LUXURY';
      if (/furniture|interior|home|plant|organic|coffee/.test(nicheLow)) return 'WARM_ORGANIC';
      return _rand() > 0.5 ? 'LUXURY' : 'WARM_ORGANIC';
    }
    if (category === 'PORTFOLIO') {
      if (/video|film|motion|editor|director|cgi|3d/.test(nicheLow)) return 'CREATIVE_DARK';
      if (/photographer|illustrator|artist|designer/.test(nicheLow)) return 'CREATIVE_DARK';
      return 'CREATIVE_DARK';
    }
    if (category === 'SAAS') return 'TECH_SASS';
    if (category === 'AGENCY') {
      return _rand() > 0.6 ? 'CREATIVE_DARK' : 'TECH_SASS';
    }
    if (category === 'LANDING') {
      if (/luxury|premium|exclusive/.test(nicheLow)) return 'LUXURY';
      if (/tech|app|ai|software|platform/.test(nicheLow)) return 'TECH_SASS';
      return 'WARM_ORGANIC';
    }
    if (/restaurant|cafe|food|hotel|travel/.test(nicheLow)) return 'WARM_ORGANIC';
    if (/law|finance|insurance|corporate/.test(nicheLow)) return _rand() > 0.5 ? 'MINIMAL_LIGHT' : 'LUXURY';
    const spaces = Object.keys(SEMANTIC_COLOR_SPACES);
    return spaces[_randInt(0, spaces.length - 1)];
  }

  function _generateColorFromSpace(spaceKey, offsetFactor) {
    const S = SEMANTIC_COLOR_SPACES[spaceKey];
    const of = offsetFactor || _rand();

    const baseHue = _lerp(S.baseHueRange[0], S.baseHueRange[1], of + (_rand() - 0.5) * 0.08);
    const baseSat = _lerp(S.baseSatRange[0], S.baseSatRange[1], of + (_rand() - 0.5) * 0.1);
    const baseLit = _lerp(S.baseLitRange[0], S.baseLitRange[1], of + (_rand() - 0.5) * 0.1);

    const accentHue = _lerp(S.accentHueRange[0], S.accentHueRange[1], of + (_rand() - 0.5) * 0.12);
    const accentSat = _lerp(S.accentSatRange[0], S.accentSatRange[1], of + (_rand() - 0.5) * 0.08);
    const accentLit = _lerp(S.accentLitRange[0], S.accentLitRange[1], of + (_rand() - 0.5) * 0.08);

    const secHueOff = _lerp(S.secondaryHueOffset[0], S.secondaryHueOffset[1], of + (_rand() - 0.5) * 0.1);
    const secSat = _lerp(S.secondarySatRange[0], S.secondarySatRange[1], of + (_rand() - 0.5) * 0.1);
    const secLit = _lerp(S.secondaryLitRange[0], S.secondaryLitRange[1], of + (_rand() - 0.5) * 0.1);

    const surfLit = _lerp(S.surfaceLitRange[0], S.surfaceLitRange[1], of + (_rand() - 0.5) * 0.08);

    return {
      base: _hslToHex(baseHue, baseSat, baseLit),
      surface: _hslToHex(baseHue, baseSat * 0.8, surfLit),
      surfaceElevated: _hslToHex(baseHue, baseSat * 0.6, Math.min(100, surfLit + 4)),
      accent: _hslToHex(accentHue, accentSat, accentLit),
      accentGlow: _hslToHex(accentHue, accentSat * 0.7, accentLit + 12),
      secondary: _hslToHex(secHueOff, secSat, secLit),
      textPrimary: _hslToHex(baseHue, baseSat * 0.5, baseLit > 50 ? 10 : 94),
      textSecondary: _hslToHex(baseHue, baseSat * 0.4, baseLit > 50 ? 30 : 72),
      border: _hslToHex(baseHue, baseSat * 0.5, baseLit > 50 ? 80 : 20),
      semanticLabel: S.label
    };
  }

  function _hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = _clamp(s, 0, 100) / 100;
    l = _clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return _rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function generateProceduralPalette(intent) {
    const semanticSpace = _mapCategoryToSemanticSpace(intent.siteCategory, intent.primaryNiche);
    const offsetFactor = (_rand() * 0.7) + 0.15;
    const palette = _generateColorFromSpace(semanticSpace, offsetFactor);
    palette.semanticSpace = semanticSpace;
    palette.offsetFactor = offsetFactor;
    return palette;
  }

  // ============================================================
  // 5. AGNOSTIC COMPONENT ASSEMBLER
  // ============================================================

  const COMPONENT_LIBRARY = {
    E_COMMERCE: {
      hero: [
        { id: 'HERO_CINEMATIC_SHOWCASE', label: 'Cinematic Product Showcase Hero', minH: '100vh', layout: 'full-bleed' },
        { id: 'HERO_SPLIT_REVEAL', label: 'Split-Screen Editorial Reveal', minH: '90vh', layout: 'split' },
        { id: 'HERO_MONUMENTAL_TEXT', label: 'Monumental Typography Hero', minH: '100vh', layout: 'center' },
        { id: 'HERO_3D_ORBITAL', label: '3D Orbital Product Stage', minH: '95vh', layout: 'stage' }
      ],
      body: [
        { id: 'GRID_ASYMMETRIC_MASONRY', label: 'Asymmetric Masonry Product Grid', minH: 'auto', layout: 'masonry' },
        { id: 'SPEC_LABORATORY', label: 'Specification Detail Laboratory', minH: '80vh', layout: 'tabs' },
        { id: 'EDITORIAL_LOOKBOOK', label: 'Editorial Lookbook Scroller', minH: '120vh', layout: 'scroll' },
        { id: 'MATERIAL_PALETTE', label: 'Material & Texture Palette', minH: '70vh', layout: 'tiles' },
        { id: 'IMMERSIVE_ATELIER', label: 'Immersive Atelier Experience', minH: '100vh', layout: 'full-bleed' },
        { id: 'TESTIMONIAL_CAROUSEL', label: 'Curated Testimonial Carousel', minH: '60vh', layout: 'slider' },
        { id: 'CRAFT_NARRATIVE', label: 'Craft Narrative Timeline', minH: '90vh', layout: 'timeline' }
      ],
      footer: [
        { id: 'FOOTER_NEWSLETTER_LUXURY', label: 'Luxury Newsletter Footer', minH: '50vh', layout: 'compact' },
        { id: 'FOOTER_BRAND_TEMPLE', label: 'Brand Temple Footer', minH: '70vh', layout: 'monument' }
      ]
    },
    PORTFOLIO: {
      hero: [
        { id: 'HERO_KINETIC_CANVAS', label: 'Dark Kinetic Canvas Hero', minH: '100vh', layout: 'full-bleed' },
        { id: 'HERO_TYPOGRAPHY_MONUMENT', label: 'Typography Monument Hero', minH: '100vh', layout: 'center' },
        { id: 'HERO_VIDEO_IMMERSION', label: 'Video Immersion Portal', minH: '100vh', layout: 'stage' }
      ],
      body: [
        { id: 'SHOWCASE_ASYMMETRIC_MASONRY', label: 'Asymmetric Masonry Showcase', minH: 'auto', layout: 'masonry' },
        { id: 'SPLIT_SCREEN_PRESENTATION', label: 'Split-Screen Presentation Row', minH: '90vh', layout: 'split' },
        { id: 'PROCESS_MATRIX', label: 'Process Matrix Grid', minH: '80vh', layout: 'matrix' },
        { id: 'PROJECT_TIMELINE', label: 'Project Timeline Scroller', minH: '110vh', layout: 'timeline' },
        { id: 'IMMERSIVE_SHOWREEL', label: 'Immersive Showreel Chamber', minH: '100vh', layout: 'full-bleed' },
        { id: 'CLIENT_PROOF_GRID', label: 'Client Proof & Metrics Grid', minH: '70vh', layout: 'tiles' },
        { id: 'AWARDS_RECOGNITION', label: 'Awards & Recognition Wall', minH: '60vh', layout: 'grid' }
      ],
      footer: [
        { id: 'FOOTER_CONTACT_ATELIER', label: 'Contact Atelier Footer', minH: '80vh', layout: 'monument' },
        { id: 'FOOTER_MINIMAL_SIGNATURE', label: 'Minimal Signature Footer', minH: '40vh', layout: 'compact' }
      ]
    },
    SAAS: {
      hero: [
        { id: 'HERO_DASHBOARD_REVEAL', label: 'Dashboard UI Reveal Hero', minH: '100vh', layout: 'stage' },
        { id: 'HERO_DATA_VORTEX', label: 'Data Vortex Typography Hero', minH: '95vh', layout: 'center' },
        { id: 'HERO_INTERACTIVE_DEMO', label: 'Interactive Live Demo Hero', minH: '100vh', layout: 'full-bleed' }
      ],
      body: [
        { id: 'FEATURE_ISOMETRIC_GRID', label: 'Isometric Feature Grid', minH: 'auto', layout: 'masonry' },
        { id: 'ANALYTICS_SHOWCASE', label: 'Analytics Showcase Stage', minH: '90vh', layout: 'full-bleed' },
        { id: 'INTEGRATION_ECOSYSTEM', label: 'Integration Ecosystem Map', minH: '80vh', layout: 'matrix' },
        { id: 'PRICING_ARCHITECTURE', label: 'Pricing Architecture', minH: '70vh', layout: 'tabs' },
        { id: 'TESTIMONIAL_METRICS', label: 'Testimonial & Metrics Wall', minH: '75vh', layout: 'grid' },
        { id: 'SECURITY_VAULT', label: 'Security & Compliance Vault', minH: '60vh', layout: 'tiles' },
        { id: 'DEPLOYMENT_TIMELINE', label: 'Deployment Timeline', minH: '85vh', layout: 'timeline' }
      ],
      footer: [
        { id: 'FOOTER_ENTERPRISE_CTA', label: 'Enterprise CTA Footer', minH: '65vh', layout: 'monument' },
        { id: 'FOOTER_DEV_DOCS_HUB', label: 'Developer Docs Hub Footer', minH: '50vh', layout: 'compact' }
      ]
    },
    AGENCY: {
      hero: [
        { id: 'HERO_CREATIVE_BURST', label: 'Creative Burst Hero', minH: '100vh', layout: 'full-bleed' },
        { id: 'HERO_MANIFESTO_WALL', label: 'Manifesto Typography Wall', minH: '95vh', layout: 'center' },
        { id: 'HERO_SHOWREEL_GATEWAY', label: 'Showreel Gateway Hero', minH: '100vh', layout: 'stage' }
      ],
      body: [
        { id: 'CAPABILITY_MATRIX', label: 'Capability Matrix Grid', minH: 'auto', layout: 'matrix' },
        { id: 'CASE_STUDY_THEATER', label: 'Case Study Theater', minH: '110vh', layout: 'full-bleed' },
        { id: 'TEAM_PORTRAIT_GRID', label: 'Team Portrait Grid', minH: '80vh', layout: 'masonry' },
        { id: 'PROCESS_NARRATIVE', label: 'Process Narrative Scroller', minH: '100vh', layout: 'scroll' },
        { id: 'METRICS_PROOF_WALL', label: 'Metrics Proof Wall', minH: '70vh', layout: 'grid' },
        { id: 'PARTNER_ECOSYSTEM', label: 'Partner Ecosystem Orbit', minH: '75vh', layout: 'tiles' }
      ],
      footer: [
        { id: 'FOOTER_NEW_BUSINESS_ALTAR', label: 'New Business Altar Footer', minH: '80vh', layout: 'monument' },
        { id: 'FOOTER_CULTURE_HUB', label: 'Culture Hub Footer', minH: '60vh', layout: 'compact' }
      ]
    },
    LANDING: {
      hero: [
        { id: 'HERO_COUNTDOWN_SINGULARITY', label: 'Countdown Singularity Hero', minH: '100vh', layout: 'center' },
        { id: 'HERO_PRODUCT_REVEAL', label: 'Product Reveal Hero', minH: '100vh', layout: 'stage' },
        { id: 'HERO_VIDEO_TEASER', label: 'Cinematic Video Teaser Hero', minH: '95vh', layout: 'full-bleed' }
      ],
      body: [
        { id: 'VALUE_PROP_TRIAD', label: 'Value Proposition Triad', minH: '70vh', layout: 'matrix' },
        { id: 'SOCIAL_PROOF_WALL', label: 'Social Proof Wall', minH: '60vh', layout: 'grid' },
        { id: 'EARLY_ACCESS_GATE', label: 'Early Access Gate', minH: '75vh', layout: 'compact' },
        { id: 'FEATURE_SNEAK_PEEK', label: 'Feature Sneak Peek Grid', minH: '80vh', layout: 'masonry' }
      ],
      footer: [
        { id: 'FOOTER_WAITLIST_FORM', label: 'Waitlist Form Footer', minH: '55vh', layout: 'monument' },
        { id: 'FOOTER_MINIMAL_LEGAL', label: 'Minimal Legal Footer', minH: '30vh', layout: 'compact' }
      ]
    },
    BUSINESS: {
      hero: [
        { id: 'HERO_TRUST_STATEMENT', label: 'Trust Statement Hero', minH: '90vh', layout: 'center' },
        { id: 'HERO_SERVICE_SHOWCASE', label: 'Service Showcase Hero', minH: '100vh', layout: 'stage' },
        { id: 'HERO_BUILDING_EXTERIOR', label: 'Building Exterior Panorama', minH: '95vh', layout: 'full-bleed' }
      ],
      body: [
        { id: 'SERVICE_EXPERTISE_GRID', label: 'Service Expertise Grid', minH: 'auto', layout: 'masonry' },
        { id: 'TEAM_TRUST_GRID', label: 'Team & Trust Grid', minH: '80vh', layout: 'matrix' },
        { id: 'LOCATION_ATLAS', label: 'Location & Atlas Section', minH: '85vh', layout: 'tiles' },
        { id: 'TESTIMONIAL_CREDIBILITY', label: 'Testimonial Credibility Wall', minH: '70vh', layout: 'grid' },
        { id: 'HISTORY_TIMELINE', label: 'Company History Timeline', minH: '90vh', layout: 'timeline' }
      ],
      footer: [
        { id: 'FOOTER_CONTACT_FORM', label: 'Contact Form Footer', minH: '70vh', layout: 'monument' },
        { id: 'FOOTER_CORPORATE_MAP', label: 'Corporate Map Footer', minH: '55vh', layout: 'compact' }
      ]
    }
  };

  function assembleComponentStack(intent) {
    const cat = intent.siteCategory;
    const lib = COMPONENT_LIBRARY[cat] || COMPONENT_LIBRARY['BUSINESS'];
    const stack = [];

    // Hero: always 1, occasionally 2 for ultra-premium feel
    const heroPool = _shuffle(lib.hero);
    stack.push({ ...heroPool[0], role: 'hero', index: 0 });
    if (_rand() > 0.75 && heroPool[1]) {
      stack.push({ ...heroPool[1], role: 'hero-secondary', index: 1 });
    }

    // Body: procedural slice count based on category
    const bodyPool = _shuffle(lib.body);
    let sliceCount;
    if (cat === 'E_COMMERCE') sliceCount = _randInt(4, 6);
    else if (cat === 'PORTFOLIO') sliceCount = _randInt(4, 5);
    else if (cat === 'SAAS') sliceCount = _randInt(4, 6);
    else if (cat === 'AGENCY') sliceCount = _randInt(4, 5);
    else if (cat === 'LANDING') sliceCount = _randInt(2, 3);
    else sliceCount = _randInt(3, 5);

    const selectedBody = bodyPool.slice(0, sliceCount);
    selectedBody.forEach((comp, i) => {
      stack.push({ ...comp, role: 'body', index: i });
    });

    // Footer: 1
    const footerPool = _shuffle(lib.footer);
    stack.push({ ...footerPool[0], role: 'footer', index: 0 });

    // Inject asymmetric alignment offsets per component
    stack.forEach((comp) => {
      comp.alignment = {
        horizontal: _pick(['left', 'center', 'right', 'asymmetric']),
        vertical: _pick(['top', 'center', 'bottom', 'asymmetric']),
        padX: _randInt(4, 12) + '%',
        padY: _randInt(6, 18) + 'vh',
        zIndex: _randInt(2, 10)
      };
      comp.animationProfile = {
        entryDuration: (_rand() * 0.8 + 0.6).toFixed(2) + 's',
        entryEasing: _pick(['cubic-bezier(0.16,1,0.3,1)', 'cubic-bezier(0.33,1,0.68,1)', 'cubic-bezier(0.25,0.46,0.45,0.94)']),
        staggerDelay: (_rand() * 0.15 + 0.05).toFixed(2) + 's',
        parallaxDepth: (_rand() * 0.6 + 0.2).toFixed(2)
      };
    });

    return stack;
  }

  // ============================================================
  // 6. INJECTION MAP FOR HYPER-SPECIFIC ASSET PROMPTS
  // ============================================================

  const PHOTOGRAPHIC_MODIFIER_CONFIGS = {
    macro_studio: {
      base: 'Macro studio texture photography of {{NICHE}}, {{LIGHTING}}, crisp micro-details, 8k resolution --seed {{SEED}}',
      lighting: [
        'high-contrast chiaroscuro lighting with deep obsidian shadows',
        'soft diffused platinum lighting with subtle specular highlights',
        'dramatic side-rim lighting revealing surface fiber topology',
        'clinical neutral white-box lighting with zero color cast',
        'warm tungsten pool lighting with amber reflective bounce'
      ]
    },
    cinematic_wide: {
      base: 'Cinematic commercial wide shot of premium {{NICHE}}, {{AMBIENCE}}, 3D depth of field, anamorphic lens characteristics --seed {{SEED}}',
      ambience: [
        'elegant ambient atmospheric glow with volumetric haze',
        'crisp dawn skylight with cool silver rim tones',
        'noir urban night ambience with neon reflections',
        'organic golden-hour warmth with long natural shadows',
        'sterile futuristic white-space with subtle holographic sheen'
      ]
    },
    editorial_flat: {
      base: 'Editorial flat-lay product photography of {{NICHE}}, {{SURFACE}}, high fidelity color grading, Hasselblad medium format --seed {{SEED}}',
      surface: [
        'marble and brushed brass surface composition',
        'raw concrete and charred oak texture juxtaposition',
        'silk velvet draping with pearl accent props',
        'minimalist pure-white cyclorama with soft shadow falloff',
        'dark slate and oxidized copper patina tableau'
      ]
    },
    immersive_3d: {
      base: 'Immersive 3D rendered environment featuring {{NICHE}}, {{RENDER}}, photorealistic path-traced lighting --seed {{SEED}}',
      render: [
        'floating in zero-gravity void with subtle nebula particle atmosphere',
        'encased in a translucent acrylic monolith with caustic refractions',
        'situated within an infinite mirror corridor creating recursive depth',
        'resting on a liquid mercury surface with perfect reflections',
        'suspended inside a brutalist concrete chamber with single shaft of light'
      ]
    },
    portrait_human: {
      base: 'High-end editorial portrait photography for {{NICHE}}, {{MOOD}}, shallow depth of field, Leica M-series aesthetic --seed {{SEED}}',
      mood: [
        'confident contemplative mood with natural window light',
        'dynamic kinetic energy with motion-blur background',
        'intimate candid warmth with bokeh city lights behind',
        'authoritative corporate stance with architectural leading lines',
        'artistic bohemian atmosphere with rich textile layering'
      ]
    }
  };

  function generateAssetPrompts(intent, slotCount) {
    const niche = intent.primaryNiche;
    const keys = Object.keys(PHOTOGRAPHIC_MODIFIER_CONFIGS);
    const prompts = [];

    for (let i = 0; i < slotCount; i++) {
      const cfgKey = keys[i % keys.length];
      const cfg = PHOTOGRAPHIC_MODIFIER_CONFIGS[cfgKey];
      const modifierKey = Object.keys(cfg).find(k => k !== 'base');
      const modifiers = cfg[modifierKey];
      const modifier = modifiers[_randInt(0, modifiers.length - 1)];
      const seed = _randInt(100000, 999999);
      let text = cfg.base.replace('{{NICHE}}', niche).replace('{{' + modifierKey.toUpperCase() + '}}', modifier).replace('{{SEED}}', seed);
      prompts.push({
        slotIndex: i,
        prompt: text,
        cfgKey: cfgKey,
        seed: seed
      });
    }
    return prompts;
  }

  // ============================================================
  // 7. 3D SPATIAL ANIMATION VALUE GENERATOR
  // ============================================================

  function generateSpatialAnimationProfile(intent) {
    const isLuxury = /LUXURY|CREATIVE_DARK/.test(_mapCategoryToSemanticSpace(intent.siteCategory, intent.primaryNiche));
    const baseTranslateZ = isLuxury ? _randInt(60, 180) : _randInt(30, 120);
    return {
      scenePerspective: _randInt(800, 1400),
      elementTranslateZ: baseTranslateZ,
      rotationRangeX: _randInt(5, 15),
      rotationRangeY: _randInt(8, 25),
      hoverLiftZ: _randInt(20, 60),
      scrollVelocityFactor: parseFloat((_rand() * 0.04 + 0.02).toFixed(3)),
      mouseTiltIntensity: parseFloat((_rand() * 0.3 + 0.1).toFixed(2)),
      ambientFloatAmplitude: _randInt(8, 24),
      ambientFloatFrequency: parseFloat((_rand() * 0.5 + 0.3).toFixed(2)),
      particleDensity: _randInt(20, 80),
      blurBackdrop: isLuxury ? _randInt(12, 24) : _randInt(6, 14)
    };
  }

  // ============================================================
  // 8. FULL SITE COMPILATION PIPELINE
  // ============================================================

  function compileProceduralEngine(userPrompt) {
    const intent = parseIntent(userPrompt);
    if (!intent) return null;

    const palette = generateProceduralPalette(intent);
    const componentStack = assembleComponentStack(intent);
    const assetPrompts = generateAssetPrompts(intent, componentStack.length + 3);
    const spatialProfile = generateSpatialAnimationProfile(intent);

    // Unique routing pages generated procedurally
    const pagePool = ['home', 'about', 'services', 'work', 'contact', 'journal', 'shop', 'collection', 'process'];
    const shuffledPages = _shuffle(pagePool);
    const pageCount = intent.siteCategory === 'LANDING' ? 1 : _randInt(2, 4);
    const routes = shuffledPages.slice(0, pageCount).map(p => '/' + p);
    if (!routes.includes('/home')) routes.unshift('/home');

    // Typography scale generated procedurally
    const typeScale = {
      hero: (_rand() * 4 + 6).toFixed(1) + 'vw',
      h1: (_rand() * 2 + 3).toFixed(1) + 'vw',
      h2: (_rand() * 1 + 2).toFixed(1) + 'vw',
      body: (_rand() * 0.3 + 0.9).toFixed(2) + 'rem',
      micro: (_rand() * 0.2 + 0.65).toFixed(2) + 'rem',
      lineHeight: parseFloat((_rand() * 0.2 + 1.3).toFixed(2)),
      letterSpacingHero: (_rand() * -0.03 - 0.01).toFixed(3) + 'em',
      letterSpacingBody: (_rand() * 0.01 + 0.00).toFixed(3) + 'em'
    };

    return {
      intent: intent,
      palette: palette,
      componentStack: componentStack,
      assetPrompts: assetPrompts,
      spatialProfile: spatialProfile,
      routes: routes,
      typeScale: typeScale,
      copy: generateNicheCopy(intent),
      timestamp: new Date().toISOString(),
      generationSignature: 'UP3D-' + intent.masterSeed.slice(0, 8)
    };
  }

  // ============================================================
  // 9. DIAGNOSTIC METRICS EXPORT
  // ============================================================

  function extractDiagnostics(compiledResult) {
    if (!compiledResult) return { error: 'No compilation result available' };
    return {
      detectedCategory: compiledResult.intent.siteCategory,
      extractedNiche: compiledResult.intent.primaryNiche,
      algorithmicPaletteCoordinates: {
        semanticSpace: compiledResult.palette.semanticSpace,
        offsetFactor: compiledResult.palette.offsetFactor,
        base: compiledResult.palette.base,
        accent: compiledResult.palette.accent,
        secondary: compiledResult.palette.secondary
      },
      generatedComponentStackCount: compiledResult.componentStack.length,
      generatedRoutes: compiledResult.routes,
      generationSignature: compiledResult.generationSignature
    };
  }

  // ============================================================
  // 10. GLOBAL API SURFACE
  // ============================================================

  global.ProceduralIntelligenceEngine = {
    compile: compileProceduralEngine,
    diagnostics: extractDiagnostics,
    parseIntent: parseIntent,
    generatePalette: generateProceduralPalette,
    assembleStack: assembleComponentStack,
    generateAssets: generateAssetPrompts,
    generateSpatialProfile: generateSpatialAnimationProfile,
    utils: {
      rand: _rand,
      randInt: _randInt,
      shuffle: _shuffle,
      hslToHex: _hslToHex
    }
  };

})(typeof window !== 'undefined' ? window : global);
