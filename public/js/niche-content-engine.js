/**
 * ULTRA-PREMIUM 3D WEBSITE SYSTEM — Niche Content Engine
 * Generates business-specific copy from the user's prompt intent.
 * Every section uses real niche content instead of generic template text.
 */
(function (global) {
  'use strict';

  // ─── Sub-niche detector ────────────────────────────────────────────────────
  function detectSubNiche(intent) {
    const raw = ((intent.rawPrompt || '') + ' ' + (intent.primaryNiche || '')).toLowerCase();

    if (/basketball|jersey.*nba|nba.*jersey|pba|nba.*shoe|baller|hoops|court.*sport/.test(raw)) return 'basketball';
    if (/soccer|football.*sport|futsal|fifa|pitch|cleat|football.*jersey/.test(raw)) return 'soccer';
    if (/gym|fitness|workout|training.*center|protein|supplement|crossfit|weights/.test(raw)) return 'fitness';
    if (/sneaker|shoe.*store|footwear|kicks|air.*jordan|jordan.*store|nike.*store|adidas.*store/.test(raw)) return 'sneakers';
    if (/fashion|apparel|clothing|boutique|outfit|dress|garment|wear.*brand/.test(raw)) return 'fashion';
    if (/jewelry|jewellery|engagement.*ring|necklace|bracelet|gold.*store|diamond/.test(raw)) return 'jewelry';
    if (/watch.*store|timepiece|horology|chronograph|luxury.*watch/.test(raw)) return 'watches';
    if (/leather.*bag|handbag|purse|wallet.*store|luggage/.test(raw)) return 'leather';
    if (/coffee|espresso|cafe|barista|latte|third.wave/.test(raw)) return 'coffee';
    if (/restaurant|dining|cuisine|eatery|bistro|grill.*food|food.*restaurant/.test(raw)) return 'restaurant';
    if (/bakery|pastry|bread|cake.*shop|dessert.*shop|patisserie/.test(raw)) return 'bakery';
    if (/bar|cocktail|spirits|wine.*bar|brewery|craft.*beer/.test(raw)) return 'bar';
    if (/hair.*salon|salon|barber|haircut|barbershop/.test(raw)) return 'salon';
    if (/spa|massage.*center|wellness.*spa|relaxation/.test(raw)) return 'spa';
    if (/skincare|beauty.*brand|cosmetic|makeup.*brand|serum.*brand/.test(raw)) return 'skincare';
    if (/nail.*salon|manicure|pedicure|nail.*art/.test(raw)) return 'nail';
    if (/analytics.*platform|data.*platform|reporting.*tool|business.*intelligence/.test(raw)) return 'analytics_saas';
    if (/crm|customer.*management.*software|sales.*crm/.test(raw)) return 'crm_saas';
    if (/fintech|payment.*platform|banking.*app|neobank/.test(raw)) return 'fintech';
    if (/photography.*studio|photo.*studio|portrait.*studio/.test(raw)) return 'photography';
    if (/design.*studio|graphic.*design|branding.*studio/.test(raw)) return 'design_studio';
    if (/video.*production|film.*studio|cinematograph/.test(raw)) return 'filmmaking';
    if (/marketing.*agency|ad.*agency|growth.*agency|digital.*agency/.test(raw)) return 'agency';
    if (/law.*firm|lawyer|legal.*service|attorney/.test(raw)) return 'law';
    if (/clinic|medical.*center|healthcare|dental|dentist/.test(raw)) return 'healthcare';
    if (/real.*estate|property.*agency|realty|homes.*for.*sale/.test(raw)) return 'real_estate';
    if (/school|tutoring|academy|online.*course|e.learning/.test(raw)) return 'education';

    // Category-level fallbacks
    const cat = (intent.siteCategory || 'BUSINESS').toUpperCase();
    if (cat === 'E_COMMERCE') return 'ecommerce_generic';
    if (cat === 'PORTFOLIO') return 'portfolio_generic';
    if (cat === 'SAAS') return 'saas_generic';
    if (cat === 'AGENCY') return 'agency';
    if (cat === 'LANDING') return 'landing_generic';
    return 'business_generic';
  }

  // ─── Content banks ─────────────────────────────────────────────────────────
  const BANKS = {

    basketball: {
      taglines: [
        "Philippines' Premier Basketball Gear",
        "Every Jersey. Every Shoe. Certified Authentic.",
        "Where Ballers Shop — NBA, PBA & FIBA Gear",
        "Official Basketball Gear Delivered to Your Door"
      ],
      heroSubs: [
        "From Lakers jerseys to Curry sneakers, every item in our collection is certified authentic, sourced directly from official NBA and Nike partners. Free metro-wide delivery.",
        "The Philippines' largest selection of genuine basketball gear. Shop jerseys, performance sneakers, and training equipment — all 100% certified.",
        "Certified NBA, PBA, and FIBA-grade basketball gear for serious players and collectors. Same-day dispatch on orders before 2PM."
      ],
      products: [
        { name: "Nike Air Jordan 37 High", desc: "Full-foot Zoom Air cushioning with carbon fiber propulsion plate. Court-tested explosive responsiveness.", price: "₱9,500", badge: "Bestseller" },
        { name: "LeBron James Lakers Jersey", desc: "Nike Authentic NBA Swingman. Heat-pressed numbers, Dri-FIT mesh, official on-court silhouette.", price: "₱3,800" },
        { name: "Steph Curry Warriors #30", desc: "Nike City Edition authentic jersey with embroidered team logos and official NBA holographic tag.", price: "₱4,200", badge: "Hot" },
        { name: "Spalding NBA Official Game Ball", desc: "Full-grain Horween leather. Official NBA game ball specification, hand-crafted in the USA.", price: "₱12,000" },
        { name: "Under Armour Curry 11 Low", desc: "UA Warp speed cushioning with Flow foam midsole for explosive first-step precision.", price: "₱8,800" },
        { name: "Giannis Bucks Statement Jersey", desc: "Nike Authentic Statement Edition. Official NBA hologram, embroidered patch details.", price: "₱4,500" },
        { name: "Nike KD 17 Basketball Shoes", desc: "Engineered mesh upper with full-length Zoom Air. Designed with Kevin Durant for elite court performance.", price: "₱8,200", badge: "New" },
        { name: "Wilson NBA Authentic Game Ball", desc: "Premium microfiber composite. Official NBA game ball, approved for all levels of play.", price: "₱6,500" }
      ],
      features: [
        { icon: "✓", title: "100% Certified Authentic", desc: "Every item carries official NBA holographic tags and a certificate of authenticity. No fakes, ever." },
        { icon: "⚡", title: "Same-Day Metro Delivery", desc: "Order before 2PM and get your gear delivered the same day across Metro Manila and key cities." },
        { icon: "🏀", title: "Official NBA & Nike Partner", desc: "Direct sourcing from Nike, Jordan, Spalding, and official NBA merchandise distributors." },
        { icon: "↩", title: "30-Day Returns", desc: "Changed your mind? No problem. Free returns on all unworn items with original tags within 30 days." },
        { icon: "🔒", title: "Secure Payments", desc: "GCash, Maya, credit card, and COD accepted. All transactions are fully encrypted and protected." },
        { icon: "📦", title: "Premium Packaging", desc: "Every order is packed with care in official packaging. Perfect for gifts and collectors." }
      ],
      testimonials: [
        { name: "Carlo Reyes", role: "UAAP Player, DLSU", text: "Best basketball store in the Philippines. Their Jordan collection is always updated and every item is 100% legit. Fast delivery too.", rating: "★★★★★" },
        { name: "Mika Bautista", role: "Basketball Coach, BGC", text: "I've ordered jerseys here three times already. Fast delivery, authentic items, zero fakes. Highly recommended to all my players.", rating: "★★★★★" },
        { name: "James Villanueva", role: "NBA Collector, Cebu", text: "Finally a store that stocks rare colorways. Got my Kobe x Nike collection here. Same-day shipping, arrived in perfect condition.", rating: "★★★★★" },
        { name: "Ana Santos", role: "Sports Retailer", text: "I wholesale from them regularly. Pricing is competitive, stock is reliable, and every product passes our authenticity check.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "10,000+", label: "Products In Stock" },
        { val: "4.9★", label: "Customer Rating" },
        { val: "50,000+", label: "Orders Shipped" },
        { val: "100%", label: "Certified Authentic" },
        { val: "Same Day", label: "Metro Delivery" },
        { val: "30 Days", label: "Free Returns" }
      ],
      cta: { primary: "Shop Jerseys", secondary: "View Sneakers", newsletter: "Get Drop Alerts", getStarted: "Shop Now" },
      sectionTitles: { products: "Top Basketball Gear", services: "Our Collections", about: "Your Game, Our Passion", features: "Why Ballers Choose Us", testimonials: "What Players Say", process: "How It Works", contact: "Get In Touch" },
      pills: ["Jerseys", "Sneakers", "Basketballs", "Accessories", "Training Gear"],
      teamRoles: ["Head Buyer", "Store Manager", "Authentication Specialist", "Customer Relations", "Social Media", "Logistics Lead"],
      processSteps: [
        { num: "01", title: "Browse", desc: "Explore our full catalog of NBA jerseys, performance sneakers, and training equipment." },
        { num: "02", title: "Authenticate", desc: "Every item is verified by our authentication team before listing. Holograms, tags, and packaging all checked." },
        { num: "03", title: "Order", desc: "Checkout with GCash, Maya, credit card, or COD. Orders confirmed within minutes." },
        { num: "04", title: "Pack", desc: "Each item is carefully packed in official protective packaging and photographed before dispatch." },
        { num: "05", title: "Deliver", desc: "Same-day metro delivery for orders before 2PM. Track your order in real-time via SMS." }
      ],
      valuePropTriad: [
        { title: "Guaranteed Authentic", desc: "Every jersey, shoe, and ball is certified. We source directly from official NBA and Nike partners — no grey market." },
        { title: "Fastest Delivery", desc: "Same-day dispatch across Metro Manila. Provincial orders arrive within 2–3 business days via courier." },
        { title: "Collectors' Trust", desc: "Over 50,000 orders shipped with a 4.9-star rating. The go-to store for Philippine basketball fans since 2019." }
      ],
      locationCity: "Manila",
      partnerNames: ["Nike", "Jordan", "Spalding", "Wilson", "Adidas", "Under Armour", "New Balance", "Puma"],
      variantLabels: ["Elite Edition", "Championship Series", "Pro Cut", "Stadium Edition", "Player Exclusive", "Home Kit", "Away Kit", "Collectors Series"],
      footerTagline: "Philippines' premier source for certified authentic NBA and basketball gear."
    },

    sneakers: {
      taglines: [
        "Premium Sneakers — Authenticated & Ready to Wear",
        "Every Drop. Every Colorway. All Legit.",
        "Curated Sneakers for Collectors & Enthusiasts",
        "The Sneaker Source You Can Trust"
      ],
      heroSubs: [
        "From Air Jordan 1s to New Balance 990s — every pair in our collection passes a rigorous authenticity check before it reaches your door.",
        "Shop the rarest colorways, latest drops, and timeless classics. Authenticated, graded, and delivered in pristine condition.",
        "For sneaker collectors who demand the real thing. Every pair verified, every release tracked, every drop available."
      ],
      products: [
        { name: "Air Jordan 1 Retro High OG", desc: "The original colourway that started it all. Tumbled leather upper, vintage sole unit, and Wings logo in perfect condition.", price: "₱14,500", badge: "Iconic" },
        { name: "Nike Air Force 1 '07 Low", desc: "Classic white leather upper with perforated toe box. The most versatile silhouette in sneaker history.", price: "₱5,800" },
        { name: "Adidas Ultraboost 23", desc: "Primeknit upper with full-length Boost midsole. Street-to-track performance with premium cushioning.", price: "₱9,200", badge: "Bestseller" },
        { name: "New Balance 990v6", desc: "Made in USA. Full-grain pigskin leather and mesh upper with ENCAP midsole. The pinnacle of comfort engineering.", price: "₱13,000" },
        { name: "Nike Dunk Low Panda", desc: "Black and white leather panels on the classic Dunk silhouette. Clean, versatile, and endlessly wearable.", price: "₱6,500", badge: "Hot" },
        { name: "Asics Gel-Kayano 30", desc: "Stability and cushioning engineered for long-distance comfort. FlyteFoam midsole with Gel cushioning system.", price: "₱8,800" },
        { name: "On Cloudmonster", desc: "Swiss-engineered with 18 CloudTec pods for extreme cushioning. Lightweight for all-day wear.", price: "₱10,500", badge: "New" },
        { name: "Converse Chuck 70 High", desc: "The elevated Chuck Taylor. Canvas upper with reinforced stitching, ortholite cushioning, and vintage sole.", price: "₱4,200" }
      ],
      features: [
        { icon: "✓", title: "Multi-Point Authentication", desc: "Every pair goes through a 12-point check: stitching, materials, box labels, size tags, and sole construction." },
        { icon: "📦", title: "Collector-Grade Packaging", desc: "Shipped in the original box with tissue, extra laces, and our authentication card inside a protective outer box." },
        { icon: "⚡", title: "Drop Alerts", desc: "Subscribe to our Viber and Instagram for real-time drop notifications before they sell out." },
        { icon: "↩", title: "Easy Returns", desc: "Unworn pairs can be returned within 14 days. We inspect on receipt and process refunds within 24 hours." },
        { icon: "📸", title: "Detailed Photos", desc: "Every listing includes 20+ high-resolution photos of the actual pair you'll receive — no stock images." },
        { icon: "💳", title: "Flexible Payment", desc: "GCash, Maya, credit card installments, and bank transfer accepted. Zero interest on 3-month plans." }
      ],
      testimonials: [
        { name: "Paolo Cruz", role: "Sneaker Collector, BGC", text: "I've bought 8 pairs and every single one was legit. Their authentication process is thorough and they always send detailed photos before shipping.", rating: "★★★★★" },
        { name: "Trisha Lim", role: "Streetwear Enthusiast", text: "Finally a local sneaker store with a real authentication guarantee. Got my Jordan 1 Chicago and it's perfect. Shipped next day.", rating: "★★★★★" },
        { name: "Mark Ramos", role: "Regular Buyer", text: "Best prices for authenticated kicks in the Philippines. I've compared with resellers in BGC and their prices are always better.", rating: "★★★★★" },
        { name: "Jessa Aquino", role: "Content Creator", text: "Unboxing experience is premium — comes with the authentication card, original box, and extra laces. Worth every peso.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "3,000+", label: "Pairs Authenticated" },
        { val: "4.9★", label: "Buyer Rating" },
        { val: "12-Point", label: "Auth Process" },
        { val: "<24h", label: "Same-Day Dispatch" },
        { val: "0", label: "Fakes Ever Sold" },
        { val: "14 Days", label: "Return Window" }
      ],
      cta: { primary: "Shop Kicks", secondary: "View New Drops", newsletter: "Get Drop Alerts", getStarted: "Browse All" },
      sectionTitles: { products: "Latest Collection", services: "Our Services", about: "The Authentication Difference", features: "Why Buyers Trust Us", testimonials: "Collector Reviews", process: "How Authentication Works", contact: "Inquire Now" },
      pills: ["Jordans", "Nike", "Adidas", "New Balance", "Limited Drops"],
      teamRoles: ["Head Authenticator", "Buying Lead", "Photographer", "Customer Support", "Social Media", "Fulfillment Manager"],
      processSteps: [
        { num: "01", title: "Source", desc: "We source from trusted suppliers, official retailers, and verified private sellers worldwide." },
        { num: "02", title: "Inspect", desc: "Our 12-point authentication check covers every detail: materials, tags, stitching, box labels, and sole construction." },
        { num: "03", title: "Photo", desc: "20+ detailed photos of the actual pair are taken and uploaded to the listing before sale." },
        { num: "04", title: "Pack", desc: "Original box preserved, wrapped in tissue, placed in a protective outer box with our authentication card." },
        { num: "05", title: "Ship", desc: "Same-day dispatch for orders before 2PM. Trackable courier with SMS updates until delivery." }
      ],
      valuePropTriad: [
        { title: "Zero Fakes, Ever", desc: "Our 12-point authentication has caught and rejected thousands of pairs. Not one fake has shipped in our history." },
        { title: "Collector-Grade Care", desc: "From original box to authentication card, every order is packed as if it were going to our own personal collection." },
        { title: "Real-Time Drops", desc: "Follow us for instant alerts on new releases and restocks before they sell out. Never miss a drop again." }
      ],
      locationCity: "Manila",
      partnerNames: ["Nike", "Jordan", "Adidas", "New Balance", "Asics", "On Running", "Converse", "Vans"],
      variantLabels: ["OG Colorway", "Retro Edition", "Limited Drop", "Exclusive Release", "Collaboration", "Classic Reissue", "Heritage Cut", "Collectors Item"],
      footerTagline: "Authenticated sneakers for collectors who demand the real thing."
    },

    coffee: {
      taglines: [
        "Specialty Coffee — Sourced from the World's Finest Origins",
        "From Seed to Cup, Every Sip Tells a Story",
        "Third-Wave Coffee in the Heart of the City",
        "Where Every Cup Is a Craft"
      ],
      heroSubs: [
        "Single-origin beans precision-brewed by SCA-certified baristas. From Ethiopian Yirgacheffe to Colombian Geisha — we source only the top 1% of specialty-grade coffee.",
        "A quiet corner for extraordinary coffee. Direct-trade beans from 14 origins, freshly roasted weekly, and brewed with obsessive precision.",
        "Third-wave specialty coffee in the heart of the city. Our baristas are trained in Tokyo and Melbourne. Come taste the difference."
      ],
      products: [
        { name: "Ethiopian Yirgacheffe — Natural", desc: "Bright florals and stone fruit with a jasmine finish. Light roast. Pour-over recommended.", price: "₱380", badge: "Seasonal" },
        { name: "Colombian Geisha Washed", desc: "Celebrated for its tea-like clarity and peach blossom aromatics. Our most prized single origin.", price: "₱520", badge: "Premium" },
        { name: "Signature Espresso Blend", desc: "Brazilian Santos + Sumatra Mandheling. Rich crema, dark chocolate, and a clean caramel finish.", price: "₱220" },
        { name: "Cold Brew Reserve", desc: "18-hour slow-steeped Guatemalan Antigua. Smooth, low-acid, naturally sweet over crystal ice.", price: "₱280", badge: "Fan Fave" },
        { name: "Japanese Iced Latte", desc: "Double-strength espresso pulled over hand-chipped ice with fresh oat milk. Our most Instagrammed drink.", price: "₱320" },
        { name: "Kenya AA — Washed", desc: "Complex black currant and grapefruit notes with a bright malic acidity. V60 or AeroPress recommended.", price: "₱420" },
        { name: "Specialty Flat White", desc: "Ristretto base with silky full-cream milk microfoam. Milk-forward with a clean espresso finish.", price: "₱260" },
        { name: "Oat Milk Cortado", desc: "Equal parts ristretto and oat milk. Balanced, creamy, and less acidic than a traditional cortado.", price: "₱290" }
      ],
      features: [
        { icon: "🌍", title: "Direct-Trade Sourcing", desc: "We work directly with farmers across 14 countries, paying 20–30% above Fair Trade minimum for exceptional quality." },
        { icon: "⚙", title: "Precision Dialing", desc: "Every espresso is dialed in daily by our SCA-certified barista team. Shot weight, time, and yield tracked to the gram." },
        { icon: "🌱", title: "Seasonal Menu", desc: "Our menu rotates with harvest seasons so you're always tasting beans at their peak freshness and flavour." },
        { icon: "🛍", title: "Whole-Bean Retail", desc: "Take the experience home. All single origins are roasted to order and available for purchase in 200g bags." },
        { icon: "📚", title: "Brew Guides", desc: "Free downloadable brew guides for every origin we stock. Learn the right grind size, water temp, and ratios." },
        { icon: "🎓", title: "Barista Classes", desc: "Monthly public cupping sessions and home brewing classes for enthusiasts who want to go deeper." }
      ],
      testimonials: [
        { name: "Andrea Cruz", role: "Coffee Enthusiast, BGC", text: "The best pour-over I've had outside of Japan. Their Ethiopian Natural is stunning — jasmine and peach in every sip. Worth every peso.", rating: "★★★★★" },
        { name: "Marco Tan", role: "Remote Worker, Makati", text: "I work from here daily. Great WiFi, incredible coffee, and the baristas know exactly how to dial in their espresso every time.", rating: "★★★★★" },
        { name: "Sofia Lim", role: "Food Blogger", text: "Finally a café that treats coffee as seriously as fine dining. The Colombian Geisha changed how I think about specialty coffee.", rating: "★★★★★" },
        { name: "Ryan Fernandez", role: "Home Barista", text: "I buy my beans here every two weeks. Freshly roasted, perfectly labelled with tasting notes, and always consistent quality.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "14+", label: "Origins Sourced" },
        { val: "4.9★", label: "Google Rating" },
        { val: "SCA", label: "Certified Baristas" },
        { val: "Weekly", label: "Fresh Roasts" },
        { val: "Direct", label: "Farm Partnerships" },
        { val: "Top 1%", label: "Specialty Grade" }
      ],
      cta: { primary: "View Menu", secondary: "Order Beans", newsletter: "Get Brew Guides", getStarted: "Visit Us" },
      sectionTitles: { products: "Current Origins & Menu", services: "Our Offerings", about: "The Philosophy Behind the Cup", features: "What Sets Us Apart", testimonials: "What Our Regulars Say", process: "From Farm to Cup", contact: "Find Us" },
      pills: ["Pour-Over", "Espresso", "Cold Brew", "Whole Beans", "Merchandise"],
      teamRoles: ["Head Barista", "Roast Master", "Green Buyer", "Store Manager", "Pastry Chef", "Operations Lead"],
      processSteps: [
        { num: "01", title: "Source", desc: "We visit farms in Ethiopia, Colombia, Kenya, Guatemala, and beyond — building direct relationships with growers." },
        { num: "02", title: "Cup", desc: "Every lot is cupped blind at origin and again on arrival. We only approve beans scoring 85+ on the SCA scale." },
        { num: "03", title: "Roast", desc: "Roasted weekly in small batches on our Probat drum roaster. Each origin gets a custom roast profile developed over months." },
        { num: "04", title: "Brew", desc: "Our SCA-certified baristas dial in every recipe fresh each morning. Grind size, dose, and extraction time tracked precisely." },
        { num: "05", title: "Serve", desc: "Your cup is prepared to order, served with origin tasting notes, and enjoyed in our carefully designed space." }
      ],
      valuePropTriad: [
        { title: "Origin Transparency", desc: "We know the name of every farmer we buy from. Every menu item tells you where it's from and why we chose it." },
        { title: "Barista Excellence", desc: "Our team trains continuously. SCA certifications, origin trips, and monthly cuppings keep our standards at the top." },
        { title: "Freshness First", desc: "We roast weekly and never sell beans older than 21 days. What you taste is always at peak freshness." }
      ],
      locationCity: "Manila",
      partnerNames: ["Yirgacheffe Farmers Co-op", "Finca La Palma", "Gachatha FCS", "Huila Producers", "Tres Ríos", "Daterra Farm", "Nespresso Selections", "SCA Philippines"],
      variantLabels: ["Natural Process", "Washed", "Honey Process", "Anaerobic", "Extended Ferment", "Cold Ferment", "Double Washed", "Sun-Dried"],
      footerTagline: "Specialty coffee sourced directly from the world's finest farms."
    },

    restaurant: {
      taglines: [
        "Farm-to-Table Dining — Fresh, Local, Exceptional",
        "Where Every Dish Is a Celebration",
        "Modern Filipino Cuisine Reimagined",
        "Exceptional Food, Unforgettable Evenings"
      ],
      heroSubs: [
        "Fresh, locally sourced ingredients transformed into extraordinary dining experiences. Reserve your table and let our kitchen tell you a story.",
        "Modern cuisine rooted in local tradition. Every dish on our menu celebrates the best produce our region has to offer.",
        "An intimate dining room, a passionate kitchen brigade, and a menu that changes with the seasons. Reservations recommended."
      ],
      products: [
        { name: "Pan-Seared Lapu-Lapu", desc: "Fresh grouper with calamansi beurre blanc, crispy quinoa, and micro herbs from our garden.", price: "₱680", badge: "Chef's Pick" },
        { name: "Wagyu Beef Short Rib", desc: "72-hour sous vide wagyu short rib, truffle jus, potato fondant, and charred broccolini.", price: "₱1,200", badge: "Signature" },
        { name: "Kare-Kare Reimagined", desc: "Braised oxtail in house-ground peanut sauce with heirloom vegetables and crispy fermented shrimp paste crostini.", price: "₱780" },
        { name: "Tuna Tataki Starter", desc: "Seared Gensan tuna with ponzu, pickled cucumber, sesame, and wasabi aioli. Served with wonton crisps.", price: "₱420" },
        { name: "Roasted Chicken Inasal", desc: "Free-range chicken marinated 24 hours in our proprietary blend, roasted to order. Served with garlic sinangag and achara.", price: "₱580" },
        { name: "Seasonal Vegetable Tasting", desc: "Five preparations of today's market vegetables — roasted, raw, fermented, compressed, and pickled.", price: "₱480", badge: "Vegetarian" },
        { name: "Sinigang na Salmon", desc: "Wild-caught salmon in tamarind broth with heirloom tomatoes, eggplant, and fresh kangkong.", price: "₱620" },
        { name: "Chocolate Lava Cake", desc: "Valrhona dark chocolate fondant with ube ice cream, salted caramel, and crystallised violet.", price: "₱340" }
      ],
      features: [
        { icon: "🌿", title: "Farm-to-Table", desc: "We partner with 12 local farms to source ingredients within 48 hours of harvest. Freshness is non-negotiable." },
        { icon: "👨‍🍳", title: "Award-Winning Kitchen", desc: "Our head chef trained in Paris and Singapore, bringing international technique to Filipino flavors." },
        { icon: "🍷", title: "Curated Wine List", desc: "Over 80 labels curated by our sommelier, with a focus on natural wines and Old World classics." },
        { icon: "📅", title: "Private Dining", desc: "A private room for 8–20 guests. Custom menus, dedicated service, and floral arrangements available." },
        { icon: "🔄", title: "Seasonal Menu", desc: "Our menu changes monthly to celebrate what's at peak. No dish outstays its welcome." },
        { icon: "🎉", title: "Events & Tasting Menus", desc: "Monthly chef's table dinners, wine pairings, and cooking demonstrations. Always something special." }
      ],
      testimonials: [
        { name: "Isabel Torres", role: "Food Critic, Metro Manila", text: "The kare-kare reimagined is the best dish I've eaten this year. Technique is flawless and the local sourcing philosophy shines through.", rating: "★★★★★" },
        { name: "David and Maria Sy", role: "Anniversary Dinner", text: "We celebrated our 10th anniversary here and it was perfect. The private dining room, the tasting menu, the service — all exceptional.", rating: "★★★★★" },
        { name: "Chef Jun Reyes", role: "Fellow Chef", text: "The produce quality is unmatched. You can taste the freshness in every component. A benchmark for farm-to-table in the Philippines.", rating: "★★★★★" },
        { name: "Carla Mendoza", role: "Regular Guest", text: "I've eaten here twelve times and never had the same menu twice. That seasonal approach keeps me coming back every month.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "8★", label: "Michelin Bib" },
        { val: "4.9★", label: "Dining Rating" },
        { val: "12", label: "Farm Partners" },
        { val: "Monthly", label: "Menu Refresh" },
        { val: "80+", label: "Wine Labels" },
        { val: "10 Years", label: "In Service" }
      ],
      cta: { primary: "Book a Table", secondary: "View Menu", newsletter: "Get Events Updates", getStarted: "Reserve Now" },
      sectionTitles: { products: "Today's Menu Highlights", services: "Our Dining Experiences", about: "The Story Behind the Kitchen", features: "The Dining Difference", testimonials: "Guests' Words", process: "From Farm to Plate", contact: "Reservations" },
      pills: ["Starters", "Mains", "Vegetarian", "Wine & Drinks", "Desserts"],
      teamRoles: ["Executive Chef", "Sous Chef", "Head Sommelier", "Restaurant Manager", "Pastry Chef", "Farm Relations"],
      processSteps: [
        { num: "01", title: "Source", desc: "Our kitchen team visits partner farms twice a week, selecting only peak-season produce at perfect ripeness." },
        { num: "02", title: "Create", desc: "Chef develops dishes around what the farm delivers, not the other way around. The menu is written fresh each morning." },
        { num: "03", title: "Prepare", desc: "Mise en place begins at 8AM. Stocks, sauces, and ferments made from scratch daily. No shortcuts." },
        { num: "04", title: "Plate", desc: "Each dish is plated with the precision of fine art. Temperature, texture, and composition checked on every pass." },
        { num: "05", title: "Serve", desc: "Our service team are trained in the story behind every dish. Your meal comes with context, not just food." }
      ],
      valuePropTriad: [
        { title: "Hyper-Local Sourcing", desc: "Every protein, vegetable, and herb on your plate was alive within 48 hours. We know every farmer by name." },
        { title: "Seasonal Creativity", desc: "The menu changes every month, sometimes every week. Returning guests never eat the same thing twice." },
        { title: "Unhurried Hospitality", desc: "We're not a table-turn restaurant. You have your table for the evening. Take your time, enjoy the ritual of dining." }
      ],
      locationCity: "Bonifacio Global City",
      partnerNames: ["Homegrown Farm", "Hillside Organics", "Laguna Aquaculture", "Mt. Province Produce", "Sagada Coffee", "Benguet Vegetables", "Local Dairy Co.", "Artisanal Pantry"],
      variantLabels: ["Seasonal Special", "Chef's Creation", "Farm Fresh", "Heritage Recipe", "Market Find", "Weekend Feature", "Garden Harvest", "Fisherman's Catch"],
      footerTagline: "Farm-to-table dining that celebrates the best of local produce and Filipino culinary heritage."
    },

    fitness: {
      taglines: [
        "Train Harder. Recover Smarter. Live Better.",
        "Your Fitness Journey Starts Here",
        "Premium Gym Equipment & Supplements Delivered",
        "Performance Gear for Serious Athletes"
      ],
      heroSubs: [
        "Professional-grade gym equipment, certified supplements, and expert-curated training gear — delivered to your gym or home in the Philippines.",
        "From commercial-grade barbells to cutting-edge wearables, every product is tested by certified strength coaches before we list it.",
        "Equip your gym, fuel your training, and track your progress with gear trusted by Philippine national athletes."
      ],
      products: [
        { name: "Rogue Monster Lite Barbell", desc: "Olympic chrome barbell, 28.5mm diameter, dual knurl marks, 1,500 lb capacity. The gold standard for serious lifting.", price: "₱18,500", badge: "Pro Grade" },
        { name: "Optimum Nutrition Gold Standard Whey", desc: "25g protein per serving, 5.5g BCAAs. Certified NSF for Sport. The world's best-selling protein for a reason.", price: "₱2,800" },
        { name: "Nike Metcon 9", desc: "Flat heel for stability under load, Zoom Air forefoot for running. The most versatile CrossFit shoe available.", price: "₱8,500", badge: "Bestseller" },
        { name: "Assault AirBike Classic", desc: "Fan-driven air resistance, dual-action arms, unlimited resistance. The hardest cardio machine ever built.", price: "₱65,000" },
        { name: "Theragun Pro G5", desc: "Professional-grade percussive therapy. 60 lbs of force, QuietForce technology, 5 attachments. Used by PBA players.", price: "₱18,000" },
        { name: "Eleiko IPF Powerlifting Set", desc: "IWF-approved 20kg barbell with calibrated competition plates. For lifters who demand perfection.", price: "₱85,000", badge: "Competition" },
        { name: "INZER Forever Lever Belt", desc: "10mm single-ply lever belt, IPF approved. The standard in competitive powerlifting for 30 years.", price: "₱4,500" },
        { name: "Garmin Forerunner 965", desc: "AMOLED display, running power, training load, sleep tracking, and 31-day battery. The serious runner's GPS watch.", price: "₱28,000", badge: "New" }
      ],
      features: [
        { icon: "💪", title: "Coach-Tested", desc: "Every product is tested by our team of certified strength and conditioning coaches before we add it to our catalog." },
        { icon: "📦", title: "White-Glove Delivery", desc: "Heavy equipment delivered and assembled in your gym. We don't just drop and go — we set up properly." },
        { icon: "🏆", title: "Competition Grade", desc: "We stock equipment approved for IPF, IWF, and CrossFit competitions. Real equipment for real athletes." },
        { icon: "📞", title: "Expert Advice", desc: "Free pre-purchase consultation with a certified coach. Get the right gear for your training program and budget." },
        { icon: "🔧", title: "Maintenance Support", desc: "Commercial equipment comes with installation and 12-month service support. We keep your gym running." },
        { icon: "💊", title: "Third-Party Tested Supplements", desc: "Every supplement we stock is NSF, Informed Sport, or Labdoor certified. No contaminated products, ever." }
      ],
      testimonials: [
        { name: "Coach Mark Santos", role: "Strength Coach, Philippine Weightlifting", text: "The Eleiko set is the real deal. Our national team trains on it daily. Fast delivery, properly assembled, and perfect quality.", rating: "★★★★★" },
        { name: "Ria Dela Cruz", role: "CrossFit Athlete", text: "Best fitness store in the Philippines. I've bought my Rogue barbell, belts, and supplements here. Always authentic, always fast.", rating: "★★★★★" },
        { name: "James Tuazon", role: "Gym Owner, Cebu", text: "Outfitted my entire gym through them. Honest advice, no upselling, and the commercial equipment was delivered and set up perfectly.", rating: "★★★★★" },
        { name: "Ana Ramos", role: "Marathon Runner", text: "The Garmin 965 arrived next day and they helped me set it up for my training plan. Customer service is genuinely helpful.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "500+", label: "Products Stocked" },
        { val: "4.9★", label: "Customer Rating" },
        { val: "IPF/IWF", label: "Approved Equipment" },
        { val: "NSF", label: "Certified Supplements" },
        { val: "Next Day", label: "Metro Delivery" },
        { val: "12 Months", label: "Equipment Support" }
      ],
      cta: { primary: "Shop Equipment", secondary: "View Supplements", newsletter: "Get Training Tips", getStarted: "Browse Catalog" },
      sectionTitles: { products: "Top Performance Gear", services: "What We Offer", about: "Built for Serious Athletes", features: "Why Athletes Trust Us", testimonials: "Athlete Reviews", process: "How We Select Products", contact: "Get Advice" },
      pills: ["Barbells & Plates", "Cardio", "Supplements", "Apparel", "Recovery"],
      teamRoles: ["Head Coach", "Equipment Specialist", "Nutrition Advisor", "Customer Support", "Logistics Manager", "Brand Partnerships"],
      processSteps: [
        { num: "01", title: "Test", desc: "Our certified coaches use every product personally before it's approved for our catalog. No exceptions." },
        { num: "02", title: "Verify", desc: "Supplements are cross-checked against third-party databases. Equipment specs are verified against manufacturer data." },
        { num: "03", title: "List", desc: "Every product listing is written by a qualified coach, not a copywriter. Accurate specs, honest reviews." },
        { num: "04", title: "Deliver", desc: "Same-day metro dispatch for in-stock items. Heavy equipment delivery includes assembly by our certified installers." },
        { num: "05", title: "Support", desc: "Post-purchase support from actual coaches. Questions about programming, nutrition, or equipment — we answer them." }
      ],
      valuePropTriad: [
        { title: "Coach-Curated Catalog", desc: "Every product is selected and tested by certified coaches. We reject anything we wouldn't use ourselves." },
        { title: "Competition-Grade Quality", desc: "We stock what Philippine national athletes actually use. IPF, IWF, and CrossFit approved — or we don't sell it." },
        { title: "Expert After-Purchase Support", desc: "Buy with confidence. Our coaching team answers questions about your training and equipment long after you checkout." }
      ],
      locationCity: "Manila",
      partnerNames: ["Rogue Fitness", "Eleiko", "Optimum Nutrition", "Theragun", "Garmin", "Nike Training", "INZER", "Assault Fitness"],
      variantLabels: ["Pro Edition", "Competition Grade", "Elite Series", "Performance Cut", "Sport Edition", "Certified Pro", "Training Pack", "Champion Series"],
      footerTagline: "Professional-grade fitness equipment and supplements for serious Philippine athletes."
    },

    salon: {
      taglines: [
        "Premium Hair Services — Where Artistry Meets Precision",
        "Your Best Hair, Every Visit",
        "Expert Cuts, Colour & Treatments",
        "The Salon That Actually Listens"
      ],
      heroSubs: [
        "Our master stylists bring international technique to every appointment. From precision cuts to colour corrections — your hair is in expert hands.",
        "A calm, focused salon experience with stylists who consult properly, cut confidently, and deliver results that last.",
        "We don't just cut hair — we listen, analyse, and craft a style that works with your face, hair type, and lifestyle."
      ],
      products: [
        { name: "Master Precision Cut", desc: "60-min consultation and cut with our senior stylists. Includes wash, blow-dry, and styling advice.", price: "₱1,200", badge: "Most Popular" },
        { name: "Balayage & Toning", desc: "Hand-painted highlights with professional toning. Natural sun-kissed gradient from our colour specialists.", price: "₱4,500" },
        { name: "Japanese Rebonding", desc: "Milbon smoothing treatment with heat-activated restructuring. Lasts up to 12 months with proper care.", price: "₱3,800" },
        { name: "Brazilian Blowout", desc: "Formaldehyde-free keratin treatment. Eliminates frizz, reduces dry time, and adds brilliant shine for 90 days.", price: "₱3,200" },
        { name: "Hair Colour + Cut Package", desc: "Full single-process colour with a precision cut, blow-dry, and take-home care kit. Our top value package.", price: "₱2,800", badge: "Best Value" },
        { name: "Olaplex Treatment Series", desc: "3-step Bond Builder treatment that repairs damaged hair from the inside out. Recommended every 6 weeks.", price: "₱1,500" },
        { name: "Scalp & Hair Analysis", desc: "In-depth scalp health assessment with our trichologist-trained specialist. Customised treatment plan included.", price: "₱850" },
        { name: "Men's Barbershop Cut", desc: "Classic men's cut with hot towel, neck shave, and styling. Our most-booked service on weekends.", price: "₱550", badge: "Fan Fave" }
      ],
      features: [
        { icon: "✂", title: "Senior Stylists Only", desc: "Every stylist has 7+ years of experience and completes quarterly training with top international brands." },
        { icon: "📋", title: "Full Consultation", desc: "We spend 15 minutes understanding your hair before scissors or colour touch anything. No rushed services." },
        { icon: "💆", title: "Premium Products", desc: "We use Milbon, Olaplex, L'Oréal Professionnel, and Wella exclusively. No economy-range products on premium services." },
        { icon: "📅", title: "Easy Booking", desc: "Book online, on Instagram, or via SMS. Same-day appointments available on weekdays." },
        { icon: "🌿", title: "Healthy Hair First", desc: "We refuse services that will damage your hair. Our stylists will tell you honestly what your hair can handle." },
        { icon: "♻", title: "Eco-Conscious", desc: "Sustainable packaging, water-saving washbasins, and recyclable color foils. We take our environmental impact seriously." }
      ],
      testimonials: [
        { name: "Patricia Gomez", role: "Regular Client", text: "I've been coming here for 3 years. The balayage is always perfect and they remember exactly how I like my hair even months apart.", rating: "★★★★★" },
        { name: "Monica Reyes", role: "Bride, Wedding Season", text: "Had my trial and wedding hair done here. Bridal team was professional, on time, and my updo lasted all 8 hours perfectly.", rating: "★★★★★" },
        { name: "Kevin Tan", role: "Regular Men's Client", text: "Finally a salon that does men's cuts properly. The consultation actually happens, the cut is precise, and the hot towel is a bonus.", rating: "★★★★★" },
        { name: "Vanessa Lim", role: "Colour Client", text: "My colour correction took 6 hours and they got it perfect. Honest about what my hair could handle and the result was exactly what I wanted.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "7+", label: "Years Per Stylist" },
        { val: "4.9★", label: "Client Rating" },
        { val: "500+", label: "Weekly Appointments" },
        { val: "15 Min", label: "Consultation First" },
        { val: "0", label: "Rushed Services" },
        { val: "Same Day", label: "Booking Available" }
      ],
      cta: { primary: "Book Appointment", secondary: "View Services", newsletter: "Get Hair Tips", getStarted: "Book Now" },
      sectionTitles: { products: "Our Services", services: "Service Menu", about: "The Salon Philosophy", features: "Why Clients Stay", testimonials: "Client Experiences", process: "Your Salon Journey", contact: "Book With Us" },
      pills: ["Haircuts", "Colour", "Treatments", "Bridal", "Men's"],
      teamRoles: ["Master Stylist", "Colour Specialist", "Treatment Expert", "Salon Manager", "Junior Stylist", "Receptionist"],
      processSteps: [
        { num: "01", title: "Book", desc: "Reserve online, via Instagram, or SMS. We confirm within 15 minutes and send a reminder the day before." },
        { num: "02", title: "Consult", desc: "Your stylist spends 15 minutes understanding your hair history, lifestyle, and goals before any service begins." },
        { num: "03", title: "Create", desc: "The service is performed with precision, using only professional-grade products suited to your hair type." },
        { num: "04", title: "Finish", desc: "Every service ends with a blow-dry, styling, and a breakdown of products and techniques used so you can replicate at home." },
        { num: "05", title: "Maintain", desc: "We send a personalised care guide after every colour service and remind you when it's time for a refresh." }
      ],
      valuePropTriad: [
        { title: "Honest Consultation", desc: "We'll tell you what your hair can and can't do right now. No upselling, no damage for the sake of a sale." },
        { title: "Senior Skill Level", desc: "Every stylist on our team has 7+ years of experience. You never get handed off to a trainee." },
        { title: "Results That Last", desc: "We use Milbon, Olaplex, and L'Oréal Pro because they work. Your colour, cut, and treatment should outlast the trend." }
      ],
      locationCity: "Quezon City",
      partnerNames: ["Milbon", "Olaplex", "L'Oréal Pro", "Wella Professionals", "Schwarzkopf", "Redken", "Kerastase", "GHD"],
      variantLabels: ["Classic Cut", "Signature Style", "Premium Colour", "Treatment Series", "Bridal Package", "Executive Style", "Refresh & Tone", "Full Transformation"],
      footerTagline: "Expert hair services with honest consultation and results that actually last."
    },

    skincare: {
      taglines: [
        "Science-Backed Skincare for Real Results",
        "Your Skin, Understood",
        "Clinically Tested. Dermatologist-Approved.",
        "Skip the Guesswork — Get the Glow"
      ],
      heroSubs: [
        "Dermatologist-formulated skincare that actually works. No filler ingredients, no false claims — just science-backed formulas that deliver visible results.",
        "Built for the Philippine climate. Every product is humidity-tested, SPF-appropriate, and designed for diverse Filipino skin tones.",
        "Skincare that respects your skin's biology. Clinically tested formulas with full ingredient transparency and zero greenwashing."
      ],
      products: [
        { name: "10% Niacinamide Serum", desc: "Pore-minimising, brightening, and oil-controlling. Fragrance-free, lightweight formula suitable for all skin types.", price: "₱1,200", badge: "Bestseller" },
        { name: "Vitamin C 15% + Ferulic Acid", desc: "Stable L-ascorbic acid with ferulic acid and vitamin E. Brightening, anti-oxidant, and collagen-boosting.", price: "₱1,800", badge: "Premium" },
        { name: "Ceramide Barrier Repair Moisturiser", desc: "Three-ceramide complex with hyaluronic acid and cholesterol. Restores the skin barrier in 24 hours.", price: "₱1,400" },
        { name: "SPF 50 PA++++ Daily Sunscreen", desc: "Lightweight, non-greasy, invisible finish. Broad-spectrum protection with niacinamide for daily brightening.", price: "₱950", badge: "Daily Essential" },
        { name: "Retinol 0.3% Night Serum", desc: "Encapsulated retinol with buffering ceramides for gradual, non-irritating delivery. Reduces fine lines in 8 weeks.", price: "₱1,600" },
        { name: "Gentle Amino Acid Cleanser", desc: "pH-balanced foaming cleanser with glycine and alanine. Removes makeup and sunscreen without stripping the skin barrier.", price: "₱850" },
        { name: "Azelaic Acid 10% Treatment", desc: "Targets hyperpigmentation, rosacea, and comedones. Gentle enough for sensitive skin, effective from week two.", price: "₱1,100" },
        { name: "Peptide Eye Cream", desc: "Matrixyl 3000 + Argireline for fine lines, dark circles, and puffiness. Ultra-light gel texture absorbs instantly.", price: "₱1,350", badge: "New" }
      ],
      features: [
        { icon: "🔬", title: "Dermatologist-Formulated", desc: "Every formula is co-developed with board-certified dermatologists and tested in clinical settings before launch." },
        { icon: "🌴", title: "Philippine Climate-Tested", desc: "All products are humidity and heat-stability tested for Philippine conditions. No pilling, no melt-down, no separation." },
        { icon: "📋", title: "Full Ingredient Transparency", desc: "Complete INCI list on every product page with explanations of what each ingredient does and why it's included." },
        { icon: "🚫", title: "No Filler Policy", desc: "We don't use fragrance, alcohol, parabens, or any ingredient that isn't earning its place in the formula." },
        { icon: "🧪", title: "Clinically Tested", desc: "All efficacy claims are backed by independent clinical studies. We show you the data, not just the before-and-after." },
        { icon: "♻", title: "Sustainable Packaging", desc: "PCR plastic bottles, aluminium components, and refillable options across our core range. Minimal waste by design." }
      ],
      testimonials: [
        { name: "Dr. Anna Cruz", role: "Board-Certified Dermatologist", text: "I recommend this line to my patients with sensitive skin. The formulations are clean, effective, and pH-appropriate. Rare in this market.", rating: "★★★★★" },
        { name: "Maria Santos", role: "Skincare Enthusiast", text: "The Niacinamide serum cleared my pores in 3 weeks and the sunscreen is the first one I've used that doesn't leave a white cast on my NC45 skin.", rating: "★★★★★" },
        { name: "Jasmine Tan", role: "Sensitive Skin User", text: "I've tried everything and nothing worked without flaring me up. This line is the first that actually respects my skin barrier.", rating: "★★★★★" },
        { name: "Paolo Reyes", role: "First-Time Skincare User", text: "My girlfriend recommended this and the starter kit transformed my skin in a month. Simple routine, real results.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "Derm", label: "Formulated" },
        { val: "4.9★", label: "Verified Reviews" },
        { val: "Clinical", label: "Study Backed" },
        { val: "0", label: "Filler Ingredients" },
        { val: "48h", label: "Free Returns" },
        { val: "PH-Made", label: "Climate-Tested" }
      ],
      cta: { primary: "Shop Skincare", secondary: "Take Skin Quiz", newsletter: "Get Routine Tips", getStarted: "Find My Routine" },
      sectionTitles: { products: "The Core Range", services: "Our Products", about: "The Science Behind the Skin", features: "Why This Is Different", testimonials: "Real Results", process: "How Our Formulas Are Made", contact: "Skin Questions?" },
      pills: ["Serums", "Moisturisers", "Sunscreen", "Cleansers", "Treatments"],
      teamRoles: ["Head Formulator", "Dermatology Advisor", "Clinical Researcher", "Brand Manager", "Customer Education", "Sustainability Lead"],
      processSteps: [
        { num: "01", title: "Research", desc: "We review 100+ clinical studies before committing to an ingredient. Only proven actives make the cut." },
        { num: "02", title: "Formulate", desc: "Our dermatologist team builds the formula around efficacy, stability, and skin tolerance — not trend or marketing." },
        { num: "03", title: "Test", desc: "Stability testing at 40°C (Philippine summer conditions), patch testing on 100+ volunteers, and clinical efficacy studies." },
        { num: "04", title: "Validate", desc: "Third-party clinical testing confirms the claims before any product is launched. We publish the results openly." },
        { num: "05", title: "Launch", desc: "Products launch with full ingredient education, routine guides, and ongoing customer support from our skincare advisors." }
      ],
      valuePropTriad: [
        { title: "No Pseudoscience", desc: "Every ingredient is backed by peer-reviewed studies. We explain what each does and show you the clinical data." },
        { title: "Built for Filipino Skin", desc: "Humidity-tested, tone-inclusive, and formulated for the climate you actually live in — not a lab in Seoul or LA." },
        { title: "Honest Results", desc: "Our before-and-afters are unretouched. Our clinical data is third-party verified. What you see is what you'll get." }
      ],
      locationCity: "Manila",
      partnerNames: ["Givaudan", "BASF", "Croda", "DSM Nutritional", "Evonik", "Elementis", "Symrise", "IFF"],
      variantLabels: ["Starter Formula", "Advanced Treatment", "Clinical Strength", "Daily Essentials", "Pro Formula", "Sensitive Range", "Brightening Series", "Barrier Repair"],
      footerTagline: "Dermatologist-formulated skincare built for the Philippine climate and Filipino skin."
    },

    saas_generic: {
      taglines: [
        "The Platform Built for Scale",
        "Work Smarter. Move Faster. Grow Bigger.",
        "Everything Your Team Needs in One Place",
        "The Last Platform You'll Ever Need"
      ],
      heroSubs: [
        "Streamline your workflows, automate the repetitive, and give your team the clarity they need to ship faster than ever.",
        "A unified platform that brings your team, data, and tools together. Built for modern teams who move fast and think bigger.",
        "Stop switching between 10 tools. One platform, full visibility, and the automation that gives your team back its best hours."
      ],
      products: [
        { name: "Starter Plan", desc: "Up to 5 team members, 20 projects, core automation, and email support. The perfect starting point.", price: "Free", badge: "Get Started" },
        { name: "Pro Plan", desc: "Unlimited projects, custom workflows, API access, priority support, and advanced analytics.", price: "₱1,490/mo", badge: "Most Popular" },
        { name: "Business Plan", desc: "Everything in Pro + SSO, audit logs, custom integrations, and a dedicated customer success manager.", price: "₱4,990/mo" },
        { name: "Enterprise", desc: "Custom deployment, SLA guarantees, white-labelling, and onboarding support for large organisations.", price: "Custom" },
        { name: "Automation Add-On", desc: "Build no-code automations across 300+ integrations. Trigger, filter, and route data without engineering.", price: "₱490/mo" },
        { name: "Analytics Suite", desc: "Custom dashboards, scheduled reports, and data export to BI tools. Full visibility into your KPIs.", price: "₱990/mo" },
        { name: "API Access", desc: "Full REST and GraphQL API with webhook support. Build custom integrations and extend the platform.", price: "Included in Pro+" },
        { name: "Onboarding & Training", desc: "Live onboarding sessions, custom playbooks, and team training for smooth deployment.", price: "₱8,500" }
      ],
      features: [
        { icon: "⚡", title: "Real-Time Collaboration", desc: "Every update is live across your team. No refresh needed, no sync delays, no version conflicts." },
        { icon: "🔗", title: "300+ Integrations", desc: "Connect Slack, Google Workspace, Salesforce, HubSpot, Jira, and 290+ more out of the box." },
        { icon: "🤖", title: "Workflow Automation", desc: "Build no-code automation in minutes. Trigger actions, route tasks, and eliminate manual repetition." },
        { icon: "📊", title: "Advanced Analytics", desc: "Custom dashboards, team performance insights, and scheduled reports to your inbox every Monday." },
        { icon: "🔒", title: "Enterprise Security", desc: "SOC 2 Type II certified, GDPR compliant, SSO via SAML/OIDC, and end-to-end encryption." },
        { icon: "🚀", title: "99.99% Uptime SLA", desc: "Multi-region infrastructure with automatic failover. Your team can work 24/7 without interruption." }
      ],
      testimonials: [
        { name: "Sarah Chen", role: "Head of Operations, Acme Corp", text: "We replaced 6 tools with this one platform and our team productivity jumped 40% in the first month. The automation alone is worth it.", rating: "★★★★★" },
        { name: "Marcus Williams", role: "CTO, TechStartup PH", text: "The API is well-documented and the integrations are solid. We built our entire data pipeline on top of this in 2 weeks.", rating: "★★★★★" },
        { name: "Elena Ramirez", role: "Product Manager", text: "Finally a platform that actually listens to feedback. Three features I requested in Q1 shipped in Q2. Incredible velocity.", rating: "★★★★★" },
        { name: "James Park", role: "Director of Engineering", text: "The 99.99% uptime is real. We've been on it for 18 months and had zero unplanned downtime during business hours.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "10,000+", label: "Teams Using It" },
        { val: "99.99%", label: "Uptime SLA" },
        { val: "300+", label: "Integrations" },
        { val: "<12ms", label: "API Response" },
        { val: "SOC 2", label: "Certified" },
        { val: "4.8★", label: "G2 Rating" }
      ],
      cta: { primary: "Start Free Trial", secondary: "View Demo", newsletter: "Get Product Updates", getStarted: "Try Free for 14 Days" },
      sectionTitles: { products: "Pricing Plans", services: "Platform Features", about: "Why We Built This", features: "What's Included", testimonials: "What Teams Say", process: "Getting Started", contact: "Talk to Sales" },
      pills: ["Automation", "Analytics", "Collaboration", "Integrations", "Security"],
      teamRoles: ["CEO & Co-Founder", "CTO", "Head of Product", "Customer Success Lead", "Head of Sales", "Engineering Lead"],
      processSteps: [
        { num: "01", title: "Sign Up", desc: "Create your free account in 60 seconds. No credit card required. Full access for 14 days." },
        { num: "02", title: "Import", desc: "Connect your existing tools and import your data. We support CSV import and 300+ direct integrations." },
        { num: "03", title: "Configure", desc: "Set up your workspace, invite your team, and configure your first workflows with our guided setup." },
        { num: "04", title: "Automate", desc: "Build your first automation in under 10 minutes with our no-code workflow builder. Save hours immediately." },
        { num: "05", title: "Scale", desc: "As you grow, upgrade your plan. Your data, workflows, and configurations carry over seamlessly." }
      ],
      valuePropTriad: [
        { title: "Replace, Don't Add", desc: "Stop paying for 8 different SaaS tools. One platform that does everything better, with one login and one bill." },
        { title: "Automation That Ships", desc: "Our no-code builder is powerful enough for engineers but accessible enough for ops. Your best hours saved, automatically." },
        { title: "Built to Scale", desc: "Start with 5 people, scale to 5,000. The architecture never becomes a bottleneck as your team grows." }
      ],
      locationCity: "Manila",
      partnerNames: ["Slack", "Google Workspace", "Salesforce", "HubSpot", "Jira", "Zapier", "Stripe", "AWS"],
      variantLabels: ["Starter", "Pro", "Business", "Enterprise", "Developer", "Team Edition", "Agency Pack", "White Label"],
      footerTagline: "The platform that brings your team, data, and workflows together — so you can focus on what matters."
    },

    agency: {
      taglines: [
        "We Build Brands That Win Markets",
        "Strategy First. Creative Always. Results Guaranteed.",
        "The Agency That Treats Your Business Like Its Own",
        "Creative Intelligence. Commercial Results."
      ],
      heroSubs: [
        "From brand strategy to digital execution — we're a full-service agency that does the work and shows you the numbers.",
        "Award-winning creative work backed by data-driven strategy. We help brands enter markets, dominate categories, and grow revenue.",
        "Not a factory. Not a freelancer. A committed team that understands your market, builds your brand, and delivers measurable outcomes."
      ],
      products: [
        { name: "Brand Strategy & Identity", desc: "Market research, positioning, competitive analysis, visual identity system, and brand guidelines from scratch.", price: "From ₱85,000", badge: "Foundation" },
        { name: "Website Design & Development", desc: "Custom-designed, conversion-optimised website built on modern stack. SEO-ready, mobile-first, and fast.", price: "From ₱95,000" },
        { name: "Performance Marketing", desc: "Meta and Google Ads management with full funnel reporting. ROAS-focused with monthly strategy reviews.", price: "From ₱35,000/mo" },
        { name: "Content Strategy & Production", desc: "Monthly content calendar, copywriting, photography, video, and social management for all platforms.", price: "From ₱28,000/mo", badge: "Popular" },
        { name: "SEO & Growth", desc: "Technical SEO audit, keyword strategy, content production, and link building. Ranking within 90 days.", price: "From ₱22,000/mo" },
        { name: "Packaging & Print Design", desc: "Product packaging, merchandising, retail displays, and print collateral that works on shelf and online.", price: "From ₱45,000" },
        { name: "Campaign Concepting", desc: "Full campaign development — concept, script, production, media plan, and post-campaign analysis.", price: "From ₱120,000" },
        { name: "Brand Audit", desc: "A full assessment of your current brand, positioning, digital presence, and competitive landscape with a prioritised roadmap.", price: "₱45,000", badge: "Start Here" }
      ],
      features: [
        { icon: "🎯", title: "Strategy Before Execution", desc: "We never start designing before we understand your market, customers, and competitive position. Strategy is the product." },
        { icon: "📊", title: "Data-Driven Creative", desc: "Every creative decision is informed by market research, customer interviews, and competitive analysis — not personal taste." },
        { icon: "🤝", title: "Dedicated Account Team", desc: "A senior strategist, creative director, and project manager assigned to your account from day one." },
        { icon: "📈", title: "Transparent Reporting", desc: "Live dashboard access to all campaign metrics. Monthly strategy reviews with our senior team included." },
        { icon: "🔄", title: "Integrated Services", desc: "Strategy, creative, and media under one roof. No handoff delays, no finger-pointing between vendors." },
        { icon: "⚡", title: "Proven Track Record", desc: "Over ₱2B in client revenue attributed to our work. We track outcomes, not just outputs." }
      ],
      testimonials: [
        { name: "Martin Uy", role: "CEO, Philippine FMCG Brand", text: "They rebranded us from the ground up and we saw a 68% revenue increase in the 12 months following launch. Best investment we've made.", rating: "★★★★★" },
        { name: "Diana Tan", role: "Founder, D2C Health Brand", text: "Our ROAS went from 1.4x to 4.8x in 6 months under their media management. They're obsessed with outcomes.", rating: "★★★★★" },
        { name: "James Reyes", role: "CMO, Tech Startup", text: "The website they built for us converts at 4.2% — triple our old site. Every decision was backed by user research.", rating: "★★★★★" },
        { name: "Angela Santos", role: "Marketing Director", text: "Finally an agency that asks hard questions before proposing anything. They understand our business better than some internal staff.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "₱2B+", label: "Client Revenue" },
        { val: "4.8★", label: "Client Rating" },
        { val: "150+", label: "Brands Grown" },
        { val: "12 yr", label: "Market Experience" },
        { val: "3x", label: "Average ROAS" },
        { val: "NPS 72", label: "Client Score" }
      ],
      cta: { primary: "Start a Project", secondary: "View Our Work", newsletter: "Get Strategy Insights", getStarted: "Book a Discovery Call" },
      sectionTitles: { products: "Our Services", services: "What We Do", about: "Why We're Different", features: "The Agency Difference", testimonials: "Client Results", process: "How We Work", contact: "Start a Conversation" },
      pills: ["Branding", "Digital Marketing", "Web Design", "Content", "SEO"],
      teamRoles: ["Creative Director", "Brand Strategist", "Performance Marketer", "Content Lead", "Account Manager", "Head of Growth"],
      processSteps: [
        { num: "01", title: "Discovery", desc: "A 2-hour working session with your leadership team. We map your market, customers, and competitive landscape." },
        { num: "02", title: "Strategy", desc: "We develop a positioning strategy, creative brief, and 90-day roadmap before any design work begins." },
        { num: "03", title: "Create", desc: "Our creative team executes against the brief. Three rounds of feedback are built into every deliverable." },
        { num: "04", title: "Launch", desc: "We manage the launch across all channels — paid, owned, and earned. Coordinated, not piecemeal." },
        { num: "05", title: "Optimise", desc: "Monthly strategy reviews with senior staff. We track outcomes and adjust based on what the data shows." }
      ],
      valuePropTriad: [
        { title: "Strategy Is the Product", desc: "Most agencies sell deliverables. We sell outcomes. Strategy comes before any pixel is designed." },
        { title: "Senior Team, Always", desc: "Your account is managed by people with 10+ years of experience. No account is ever given to a junior team." },
        { title: "Revenue Obsessed", desc: "We track revenue impact, not vanity metrics. Every engagement has measurable commercial goals and we report against them." }
      ],
      locationCity: "Makati",
      partnerNames: ["Meta Business", "Google Partners", "Shopify Plus", "HubSpot", "Canva Enterprise", "Adobe", "Figma", "Notion"],
      variantLabels: ["Brand Launch", "Market Entry", "Growth Campaign", "Digital Transformation", "Rebrand", "Category Play", "D2C Launch", "B2B Lead Gen"],
      footerTagline: "A full-service creative agency that builds brands and drives commercial results."
    },

    photography: {
      taglines: [
        "Photography That Tells the Truth Beautifully",
        "Every Frame, Intentional",
        "Commercial & Portrait Photography — World-Class",
        "Images That Work as Hard as Your Business"
      ],
      heroSubs: [
        "Commercial, portrait, and editorial photography that captures what matters — with editorial precision and technical excellence.",
        "From campaign shoots to intimate portraits, our team delivers images that are technically flawless and emotionally resonant.",
        "Photography isn't decoration. It's the first thing people see and the last thing they forget. We make it count."
      ],
      products: [
        { name: "Commercial Product Photography", desc: "Hero product shots, detail images, and lifestyle context. Studio and location. Delivered in 5 business days.", price: "From ₱18,000", badge: "Most Requested" },
        { name: "Personal Brand Portrait Session", desc: "2-hour session, 3 looks, 30 final images. Location scouting included. For entrepreneurs and executives.", price: "₱12,000" },
        { name: "Food & Beverage Photography", desc: "Styled hero shots for menus, social media, and delivery platforms. Food stylist included.", price: "From ₱22,000" },
        { name: "Corporate Headshots", desc: "Professional headshots for your full team. Studio setup at your office. 1 retouched image per person.", price: "₱3,500/person" },
        { name: "Event Coverage", desc: "Full-day event photography with 200+ edited images delivered within 72 hours. Second shooter available.", price: "From ₱25,000", badge: "Popular" },
        { name: "Real Estate Photography", desc: "Interior, exterior, and aerial. Twilight shots included. Virtual staging available for vacant properties.", price: "From ₱8,000" },
        { name: "E-Commerce Pack", desc: "White background, lifestyle, and detail shots for 20 products. Optimised for Lazada, Shopee, and Shopify.", price: "From ₱35,000", badge: "Best Value" },
        { name: "Campaign & Editorial Shoot", desc: "Full creative production with art direction, styling, makeup, and location. For brands with a story to tell.", price: "From ₱120,000" }
      ],
      features: [
        { icon: "📸", title: "Full Creative Team", desc: "Every major shoot includes a photographer, creative director, and assistant. Art direction is part of the package." },
        { icon: "⚡", title: "Fast Turnaround", desc: "Product shoots delivered in 5 business days. Portraits in 72 hours. Events within 48 hours. Always." },
        { icon: "🎨", title: "Brand-Consistent Editing", desc: "We develop and follow your brand's editing preset so every image feels consistent across all your channels." },
        { icon: "📍", title: "Location Scouting", desc: "We find the right location for your brief — whether that's our studio, a venue, or a street in Binondo." },
        { icon: "📋", title: "Usage Rights", desc: "All images come with full commercial licensing for digital, print, and advertising. No per-use fees." },
        { icon: "🔄", title: "Reshoot Guarantee", desc: "If the images don't meet the agreed brief, we reshoot at no cost. We've never had to." }
      ],
      testimonials: [
        { name: "Mia Santos", role: "Brand Manager, FMCG", text: "The food photography completely changed how our brand looked online. Orders on Grab increased 35% after we updated our photos.", rating: "★★★★★" },
        { name: "David Lim", role: "Founder, D2C Skincare", text: "Our product images are so good that customers screenshot them. The detail shots especially — you can see every ingredient texture.", rating: "★★★★★" },
        { name: "Ana Reyes", role: "Executive Coach", text: "My portrait session was professional, relaxed, and the results were exactly what I needed for my rebrand. Now used across LinkedIn, website, and speaking decks.", rating: "★★★★★" },
        { name: "Marcus Tan", role: "Event Director", text: "They covered our 500-person conference and delivered 400 edited images in 48 hours. Every key moment captured perfectly.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "800+", label: "Clients Shot" },
        { val: "4.9★", label: "Client Rating" },
        { val: "72h", label: "Portrait Delivery" },
        { val: "100%", label: "Usage Rights" },
        { val: "5 Days", label: "Product Turnaround" },
        { val: "0", label: "Reshoots Needed" }
      ],
      cta: { primary: "Book a Session", secondary: "View Portfolio", newsletter: "Get Photography Tips", getStarted: "Check Availability" },
      sectionTitles: { products: "Our Services", services: "Photography Services", about: "The Team Behind the Lens", features: "Why Brands Choose Us", testimonials: "Client Feedback", process: "How We Work", contact: "Book a Session" },
      pills: ["Commercial", "Portrait", "Food & Bev", "Events", "E-Commerce"],
      teamRoles: ["Lead Photographer", "Creative Director", "Food Stylist", "Retoucher", "Photo Assistant", "Studio Manager"],
      processSteps: [
        { num: "01", title: "Brief", desc: "We start with a detailed creative brief — usage rights, brand guidelines, reference images, and deliverables." },
        { num: "02", title: "Prep", desc: "Location scouting, prop sourcing, shot list finalisation, and call time confirmation happen 72 hours before shoot day." },
        { num: "03", title: "Shoot", desc: "Professionally directed shoot day with our full team. You're involved in reviews at key points to ensure we're on brief." },
        { num: "04", title: "Edit", desc: "Images are culled, retouched, and colour-graded consistently with your brand's visual identity." },
        { num: "05", title: "Deliver", desc: "Full-resolution files via a private Dropbox gallery. Web-ready versions included. Full commercial licensing." }
      ],
      valuePropTriad: [
        { title: "Images That Convert", desc: "We approach every shoot as a commercial problem, not an aesthetic one. Beautiful images that drive clicks, sales, and recall." },
        { title: "Full Creative Team", desc: "You get a photographer, director, and stylist — not just someone with a camera. Production quality on every job." },
        { title: "Zero Licensing Headaches", desc: "Every image comes with full commercial rights. No model release complications, no per-use fees, no surprises." }
      ],
      locationCity: "Makati",
      partnerNames: ["Nikon", "Canon", "Sony Alpha", "Profoto", "Phase One", "Lightroom CC", "Capture One", "DJI"],
      variantLabels: ["Hero Shot", "Detail Series", "Lifestyle Context", "Campaign Visual", "Editorial Spread", "Social Set", "Print Master", "Web Optimised"],
      footerTagline: "Commercial photography that makes your brand impossible to ignore."
    },

    real_estate: {
      taglines: [
        "Find Your Perfect Property in the Philippines",
        "Expert Guidance Through Every Property Decision",
        "Premium Properties — Trusted Advisors",
        "Your Next Chapter Starts Here"
      ],
      heroSubs: [
        "From BGC condominiums to Tagaytay retreats — we connect buyers with the right properties through expert market knowledge and honest advice.",
        "Full-service real estate representation for buyers, sellers, and investors. Local expertise, national reach, no conflicts of interest.",
        "We don't just list properties. We understand what you're building — and we find the property that fits your life, not just your budget."
      ],
      products: [
        { name: "BGC Studio Condominium", desc: "33 sqm studio on the 22nd floor. Fully furnished, with balcony and city view. Ready for occupancy.", price: "₱6.8M", badge: "Available" },
        { name: "Ortigas 2-Bedroom Unit", desc: "78 sqm two-bedroom in a prime Ortigas building. Parking included. Near MRT and business district.", price: "₱8.2M" },
        { name: "Tagaytay Leisure Farm", desc: "3,000 sqm agricultural lot with mountain view, existing structure, and fruit trees. Perfect weekend retreat.", price: "₱12.5M" },
        { name: "Makati Commercial Space", desc: "120 sqm ground-floor commercial unit on a high-foot-traffic corner. Ready for F&B or retail.", price: "₱28,000/mo", badge: "For Lease" },
        { name: "Alabang House & Lot", desc: "320 sqm lot, 4-bedroom house in a gated subdivision. Pool, 3-car garage, staff quarters.", price: "₱32M" },
        { name: "Quezon City Townhouse", desc: "3-storey townhouse, 3 bedrooms, 2.5 bathrooms, and a rooftop garden in a quiet compound.", price: "₱9.5M", badge: "New Listing" },
        { name: "Cebu Beachfront Lot", desc: "500 sqm beachfront lot in a private development. Only 4 remaining. Title on hand, no encumbrances.", price: "₱18M" },
        { name: "Pasig Office Floor", desc: "Full floor of 850 sqm in a Grade-A Pasig building. 10-year-old building, excellent condition.", price: "₱180,000/mo" }
      ],
      features: [
        { icon: "🏠", title: "Expert Market Knowledge", desc: "Our agents specialise by district. They know the actual transaction prices, developer track records, and HOA quality." },
        { icon: "📋", title: "Full Transaction Support", desc: "Title verification, due diligence, financing coordination, and notarisation handled by our legal team." },
        { icon: "🔍", title: "Off-Market Access", desc: "We maintain relationships with owners who sell privately. Access listings you won't find on any portal." },
        { icon: "💰", title: "Investment Advice", desc: "Rental yield analysis, capital appreciation projections, and developer track record assessment. Buy with data, not hope." },
        { icon: "📸", title: "Professional Marketing", desc: "For sellers: professional photography, video walk-throughs, and targeted digital advertising included." },
        { icon: "🤝", title: "No Conflict of Interest", desc: "We represent buyers or sellers — never both in the same transaction. Your interests always come first." }
      ],
      testimonials: [
        { name: "Mark and Grace Santos", role: "First-Time Buyers", text: "Found us a BGC unit at 8% below market by accessing their off-market network. The due diligence they did on the title saved us from a problematic purchase.", rating: "★★★★★" },
        { name: "Carlos Reyes", role: "Property Investor", text: "I've done 7 transactions through them. Their yield analysis has been accurate every time. Best real estate advisors in Metro Manila.", rating: "★★★★★" },
        { name: "Ana Limjoco", role: "Seller, Makati Condo", text: "Sold my unit in 18 days at asking price. Their photography and targeted marketing attracted the right buyer immediately.", rating: "★★★★★" },
        { name: "James Ong", role: "Commercial Tenant", text: "They found us a Pasig office space that met every spec on our list and negotiated excellent lease terms. Would use again for our next expansion.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "500+", label: "Transactions Closed" },
        { val: "4.9★", label: "Client Rating" },
        { val: "15 yr", label: "Market Experience" },
        { val: "Off-Market", label: "Exclusive Access" },
        { val: "18 Days", label: "Avg Selling Time" },
        { val: "₱0", label: "Conflicts of Interest" }
      ],
      cta: { primary: "View Listings", secondary: "Book a Viewing", newsletter: "Get Market Updates", getStarted: "Talk to an Agent" },
      sectionTitles: { products: "Current Listings", services: "Our Services", about: "25 Years of Philippine Property", features: "Why Clients Trust Us", testimonials: "Client Experiences", process: "How We Work", contact: "Speak to an Agent" },
      pills: ["Condominiums", "Houses", "Commercial", "Lots", "For Lease"],
      teamRoles: ["Senior Property Advisor", "Legal & Due Diligence", "Sales Manager", "Property Analyst", "Marketing Lead", "Transaction Coordinator"],
      processSteps: [
        { num: "01", title: "Consultation", desc: "We start with a 60-minute consultation to understand your needs, budget, timeline, and investment goals." },
        { num: "02", title: "Search", desc: "We curate a shortlist from our listing database, developer partnerships, and off-market seller network." },
        { num: "03", title: "Due Diligence", desc: "Title verification, encumbrance check, developer background, and HOA financial health reviewed before any offer." },
        { num: "04", title: "Negotiate", desc: "We negotiate on your behalf — price, inclusions, payment terms, and handover conditions." },
        { num: "05", title: "Close", desc: "We coordinate the full documentation, escrow, and transfer process so the closing is seamless." }
      ],
      valuePropTriad: [
        { title: "Off-Market Access", desc: "Many of the best properties in the Philippines never appear on public listings. Our seller network gives you priority access." },
        { title: "Data-Driven Advice", desc: "We show you actual comparable transaction prices, rental yields, and capital appreciation history. Not just listing prices." },
        { title: "No Conflicts, Ever", desc: "We represent one party per transaction. Your advisor's only job is to get you the best possible outcome." }
      ],
      locationCity: "Makati",
      partnerNames: ["Ayala Land", "SM Development", "Megaworld", "Federal Land", "DMCI Homes", "Robinsons Land", "Vista Land", "Empire East"],
      variantLabels: ["Studio Unit", "1-Bedroom", "2-Bedroom", "Penthouse", "Commercial", "Industrial Lot", "Farm Lot", "Leisure Property"],
      footerTagline: "Expert real estate representation for buyers, sellers, and investors in the Philippines."
    },

    healthcare: {
      taglines: [
        "Your Health, Our Priority",
        "Expert Medical Care — Accessible, Compassionate, Thorough",
        "Where Patients Come First",
        "Comprehensive Healthcare Under One Roof"
      ],
      heroSubs: [
        "Board-certified physicians, modern diagnostics, and a care team that listens. Booking available online, same-day appointments for urgent concerns.",
        "Compassionate, evidence-based medical care delivered by specialists you can trust. We take the time to understand your health — not just your symptoms.",
        "Modern medicine, human touch. Our clinical team delivers thorough consultations, accurate diagnostics, and follow-up care that's actually followed through."
      ],
      products: [
        { name: "General Consultation", desc: "Comprehensive 30-minute consultation with a board-certified physician. Includes basic vitals and health history review.", price: "₱800", badge: "Same Day" },
        { name: "Executive Health Package", desc: "Full blood panel, ECG, chest X-ray, abdominal ultrasound, and physician interpretation. Includes health report.", price: "₱8,500" },
        { name: "Pediatric Consultation", desc: "Complete child wellness check with our pediatrician. Includes developmental assessment and immunisation review.", price: "₱900" },
        { name: "Annual Wellness Package", desc: "CBC, lipid panel, blood chemistry, urinalysis, and 45-min physician review. Recommended annually for adults 30+.", price: "₱4,200", badge: "Most Popular" },
        { name: "Dermatology Consultation", desc: "30-minute consultation with our board-certified dermatologist. Includes skin assessment and treatment plan.", price: "₱1,500" },
        { name: "Dental Cleaning & Check-Up", desc: "Professional cleaning, full oral examination, and X-ray. Identifies issues before they become painful or expensive.", price: "₱1,200" },
        { name: "Teleconsultation", desc: "30-minute video consultation with your preferred physician. Available 7 days a week, 7AM–9PM.", price: "₱600" },
        { name: "Rapid Diagnostic Panel", desc: "CBC, blood chemistry, and urinalysis with results in 2 hours. Walk-in and appointment both accepted.", price: "₱1,800", badge: "Fast Results" }
      ],
      features: [
        { icon: "👨‍⚕️", title: "Board-Certified Specialists", desc: "Every physician on our team is board-certified in their specialty. We don't hire based on availability — we hire based on excellence." },
        { icon: "📅", title: "Same-Day Appointments", desc: "We hold slots daily for urgent concerns. No weeks-long waits for a consultation when you need care today." },
        { icon: "📋", title: "Comprehensive Health Records", desc: "Full digital health records accessible through our patient portal. Your history, labs, and prescriptions in one place." },
        { icon: "💻", title: "Teleconsultation Available", desc: "See your physician from home via video. Available 7 days a week. Prescriptions sent digitally." },
        { icon: "🔬", title: "On-Site Laboratory", desc: "Full diagnostic lab on site. Results for most tests within 2 hours. No need to go to a separate facility." },
        { icon: "❤", title: "Continuity of Care", desc: "We follow up after every significant consultation. Your health doesn't end when you leave the clinic." }
      ],
      testimonials: [
        { name: "Elena Santos", role: "Patient Since 2021", text: "My family has been coming here for three years. The doctors take their time, explain everything clearly, and the same-day appointments are a lifesaver.", rating: "★★★★★" },
        { name: "Dr. Mark Reyes", role: "Referring Physician", text: "I refer complex cases here because their diagnostics are thorough and their specialist consultations are genuinely helpful — not just confirmatory.", rating: "★★★★★" },
        { name: "John Tan", role: "Executive Health Package Patient", text: "The executive check-up was the most comprehensive I've had. They found a pre-diabetes indicator that three previous doctors missed.", rating: "★★★★★" },
        { name: "Maria Lim", role: "Regular Patient", text: "The teleconsult saved me a sick day when I had a UTI. Got a consult at 8PM, had my prescription in 20 minutes. Excellent service.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "15+", label: "Specialist Physicians" },
        { val: "4.9★", label: "Patient Rating" },
        { val: "Same Day", label: "Urgent Appointments" },
        { val: "2 Hours", label: "Lab Results" },
        { val: "7 Days", label: "Week Coverage" },
        { val: "100%", label: "Board-Certified" }
      ],
      cta: { primary: "Book Appointment", secondary: "View Services", newsletter: "Get Health Tips", getStarted: "Schedule Now" },
      sectionTitles: { products: "Our Services", services: "Medical Services", about: "Our Approach to Care", features: "Why Patients Choose Us", testimonials: "Patient Experiences", process: "Your Visit, Step by Step", contact: "Book an Appointment" },
      pills: ["General Medicine", "Diagnostics", "Pediatrics", "Dental", "Teleconsult"],
      teamRoles: ["Medical Director", "Internal Medicine Specialist", "Pediatrician", "Dermatologist", "Dentist", "Head Nurse"],
      processSteps: [
        { num: "01", title: "Book", desc: "Schedule online, by phone, or walk in. Same-day slots available for urgent concerns." },
        { num: "02", title: "Arrive", desc: "Check in at reception. Your medical history and current concern are recorded before you see the doctor." },
        { num: "03", title: "Consult", desc: "Your physician gives you a thorough consultation — no rushed 5-minute visits. Every question answered." },
        { num: "04", title: "Diagnose", desc: "If labs or imaging are needed, our on-site facility processes most results within 2 hours." },
        { num: "05", title: "Follow Up", desc: "We follow up with significant results and schedule your next visit before you leave. Continuity of care guaranteed." }
      ],
      valuePropTriad: [
        { title: "Time to Actually Listen", desc: "Our physicians have 30-minute minimum consultation slots. We understand your health history before proposing a plan." },
        { title: "All Under One Roof", desc: "Consultation, laboratory, diagnostics, and pharmacy in the same clinic. No coordination headaches between providers." },
        { title: "Continuity That Matters", desc: "We call after significant results. We remind you when it's time for your next check-up. Your health doesn't end at the door." }
      ],
      locationCity: "Quezon City",
      partnerNames: ["PhilHealth", "Maxicare", "Intellicare", "Medicard", "Pacific Cross", "Caritas Health", "St. Luke's Network", "Asian Hospital"],
      variantLabels: ["Basic Package", "Wellness Plan", "Executive Check", "Family Package", "Senior Care", "Pediatric Plan", "Specialist Consult", "Preventive Care"],
      footerTagline: "Compassionate, evidence-based healthcare with same-day appointments and board-certified physicians."
    },

    ecommerce_generic: {
      taglines: [
        "Premium Products — Curated for Excellence",
        "Shop Smarter. Live Better.",
        "Everything You Need, Delivered to Your Door",
        "Quality That Speaks for Itself"
      ],
      heroSubs: [
        "Carefully curated products, fast delivery, and a customer experience that makes shopping feel effortless. Discover what the fuss is about.",
        "We hand-select every product in our catalog. If we wouldn't buy it ourselves, it doesn't make the cut.",
        "Premium products with honest descriptions, fast metro delivery, and 30-day returns. Shopping the way it should be."
      ],
      products: [
        { name: "Premium Starter Pack", desc: "Our most popular bundle: top-rated essentials curated by our team. Everything you need to get started.", price: "₱2,800", badge: "Bestseller" },
        { name: "Signature Collection Item", desc: "Our flagship product — designed for quality, engineered for longevity. The one thing our customers reorder most.", price: "₱1,800" },
        { name: "Limited Edition Bundle", desc: "A curated set of our top three products at a special bundle price. Available while stocks last.", price: "₱4,200", badge: "Limited" },
        { name: "Daily Essential", desc: "The product that shows up in our customers' reorder lists every month. Simple, effective, and worth it.", price: "₱950" },
        { name: "Gift Set", desc: "Beautifully packaged for gifting. Includes our three best-loved products in a premium gift box with ribbon.", price: "₱3,500", badge: "Gift Ready" },
        { name: "Professional Grade", desc: "Our top-of-line product for those who want the best. Used by professionals, loved by enthusiasts.", price: "₱6,200" },
        { name: "Starter Kit", desc: "New to us? Start here. Our three most accessible products at a first-order price.", price: "₱1,500", badge: "New Customers" },
        { name: "Monthly Subscription Box", desc: "Our curated monthly selection delivered to your door. Cancel anytime, skip any month.", price: "₱1,200/mo" }
      ],
      features: [
        { icon: "✓", title: "Quality-First Curation", desc: "Every product goes through a 30-day test period before it makes our catalog. We reject more than we accept." },
        { icon: "⚡", title: "Fast Metro Delivery", desc: "Same-day delivery for orders before 2PM across Metro Manila. Provincial orders arrive in 2–3 business days." },
        { icon: "↩", title: "30-Day Returns", desc: "Not happy? Return it within 30 days, no questions asked. We process refunds within 24 hours." },
        { icon: "💳", title: "Secure & Flexible Payments", desc: "GCash, Maya, credit card, installment plans, and COD available. Your data is always encrypted." },
        { icon: "📦", title: "Premium Packaging", desc: "Every order is packed carefully and beautifully. Unboxing should feel as good as the product itself." },
        { icon: "💬", title: "Real Human Support", desc: "Chat, email, or call — a real person responds within 2 hours on business days. No bots, no scripts." }
      ],
      testimonials: [
        { name: "Maria Santos", role: "Regular Customer", text: "I've been ordering from here for a year and every single product has exceeded my expectations. Fast delivery, great packaging, and they actually care.", rating: "★★★★★" },
        { name: "James Reyes", role: "First-Time Buyer", text: "Was skeptical at first but the quality is genuinely excellent. Arrived next day, packaging was premium, and the product itself is worth double the price.", rating: "★★★★★" },
        { name: "Ana Cruz", role: "Gift Buyer", text: "Ordered the gift set for my mom's birthday. The packaging alone got a reaction, and she loves the products. Will definitely order again.", rating: "★★★★★" },
        { name: "Carlo Tan", role: "Subscription Member", text: "The monthly box is the highlight of my month. Curation is always spot-on and I've discovered products I'd never have found otherwise.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "50,000+", label: "Orders Shipped" },
        { val: "4.9★", label: "Customer Rating" },
        { val: "Same Day", label: "Metro Delivery" },
        { val: "30 Days", label: "Returns" },
        { val: "99%", label: "Satisfaction Rate" },
        { val: "2 Hrs", label: "Support Response" }
      ],
      cta: { primary: "Shop Now", secondary: "View Collection", newsletter: "Get New Arrivals", getStarted: "Start Shopping" },
      sectionTitles: { products: "Our Collection", services: "What We Offer", about: "Why We Started This", features: "The Difference", testimonials: "What Customers Say", process: "How It Works", contact: "Get In Touch" },
      pills: ["New Arrivals", "Bestsellers", "Bundles", "Gift Sets", "Sale"],
      teamRoles: ["Founder & CEO", "Head Buyer", "Operations Manager", "Customer Experience", "Marketing Lead", "Fulfillment Supervisor"],
      processSteps: [
        { num: "01", title: "Discover", desc: "Browse our curated catalog. Every product has detailed descriptions, real photos, and honest reviews." },
        { num: "02", title: "Choose", desc: "Add to cart and checkout in under 2 minutes. Multiple payment options with zero hidden fees." },
        { num: "03", title: "Confirm", desc: "We confirm your order within 15 minutes and send a tracking link as soon as it's dispatched." },
        { num: "04", title: "Receive", desc: "Same-day delivery within Metro Manila for orders placed before 2PM. Always carefully packed." },
        { num: "05", title: "Love It", desc: "Not satisfied for any reason? Message us and we'll make it right. 30-day no-questions return policy." }
      ],
      valuePropTriad: [
        { title: "Curated, Not Catalogued", desc: "We don't list everything. We list the best. Every product passed a 30-day internal test before appearing here." },
        { title: "Delivery That Delivers", desc: "Same-day metro, next-day provincial. We know the anxiety of waiting — so we make the wait as short as possible." },
        { title: "Service After the Sale", desc: "We follow up on every order. Return a product, exchange it, or get advice on using it better. We're here after the checkout." }
      ],
      locationCity: "Manila",
      partnerNames: ["Lazada", "Shopee", "Grab", "Lalamove", "GCash", "PayMaya", "GHL Systems", "Entrego"],
      variantLabels: ["Classic", "Premium", "Signature", "Limited Edition", "Starter", "Pro", "Bundle Pack", "Gift Edition"],
      footerTagline: "Premium products, fast delivery, and customer service that actually cares."
    },

    business_generic: {
      taglines: [
        "Excellence in Every Engagement",
        "The Professional Standard",
        "Results That Speak for Themselves",
        "Built on Trust, Delivered with Excellence"
      ],
      heroSubs: [
        "We deliver measurable results for businesses that take their work seriously. Expertise, reliability, and a genuine commitment to your success.",
        "Professional services built around your goals — not ours. We succeed when you succeed.",
        "A team that understands your industry, respects your time, and delivers what it promises. Every engagement, every time."
      ],
      products: [
        { name: "Core Service Package", desc: "Our most comprehensive service offering. Includes everything a growing business needs to operate at a professional level.", price: "From ₱25,000/mo", badge: "Most Popular" },
        { name: "Consultation & Strategy", desc: "A focused 2-hour working session with our senior team. Walk away with a clear action plan.", price: "₱8,500" },
        { name: "Implementation Package", desc: "Full hands-on implementation of our recommended strategy. We don't just advise — we execute.", price: "From ₱45,000" },
        { name: "Monthly Retainer", desc: "Ongoing support and services with a dedicated account manager. Priority response within 2 hours.", price: "From ₱18,000/mo" },
        { name: "Audit & Assessment", desc: "A thorough review of your current situation with a written report and prioritised recommendations.", price: "₱15,000" },
        { name: "Training & Workshops", desc: "On-site or virtual training sessions for your team. Customised to your industry and current knowledge level.", price: "From ₱12,000" },
        { name: "Project-Based Engagement", desc: "Defined scope, timeline, and deliverables. Fixed fee, no scope creep, and clear milestones.", price: "From ₱55,000" },
        { name: "Emergency Response", desc: "Rapid deployment for urgent situations. Available 24/7 with a 4-hour response commitment.", price: "₱8,500/hour" }
      ],
      features: [
        { icon: "🎯", title: "Senior Team Only", desc: "Your account is handled by professionals with 10+ years of relevant experience. No juniors on client work." },
        { icon: "📊", title: "Measurable Outcomes", desc: "We define success metrics before we start. You always know exactly what we're working toward and whether we're hitting it." },
        { icon: "📋", title: "Transparent Reporting", desc: "Regular reporting with full visibility into what's been done, what's in progress, and what's coming next." },
        { icon: "🤝", title: "Committed Partnership", desc: "We invest in understanding your business deeply. You get a partner who thinks like an insider, not a vendor." },
        { icon: "⚡", title: "Fast Response", desc: "Emails answered within 2 hours on business days. Urgent matters get a same-day response, always." },
        { icon: "🔒", title: "Full Confidentiality", desc: "NDA-protected from day one. Your information, strategies, and results are never shared without explicit permission." }
      ],
      testimonials: [
        { name: "Roberto Santos", role: "CEO, Mid-Sized Enterprise", text: "They've been our trusted partner for 4 years. Every engagement has delivered measurable outcomes and they've never missed a deadline.", rating: "★★★★★" },
        { name: "Diana Reyes", role: "Operations Director", text: "What sets them apart is that they actually understand our business. Recommendations are always practical, not theoretical.", rating: "★★★★★" },
        { name: "James Ong", role: "Managing Director", text: "The best decision we made was bringing them in on our restructuring. The results exceeded our projections by 30%.", rating: "★★★★★" },
        { name: "Maria Cruz", role: "Business Owner", text: "Professional, reliable, and they deliver what they promise. After years of dealing with vendors who overpromise, this is refreshing.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "200+", label: "Clients Served" },
        { val: "4.9★", label: "Client Rating" },
        { val: "10+ yrs", label: "Team Experience" },
        { val: "100%", label: "Deadline Hit Rate" },
        { val: "NPS 74", label: "Client Score" },
        { val: "2 Hrs", label: "Response Time" }
      ],
      cta: { primary: "Start a Conversation", secondary: "View Our Work", newsletter: "Get Industry Insights", getStarted: "Book a Consultation" },
      sectionTitles: { products: "Our Services", services: "What We Offer", about: "Why We Do This", features: "What Sets Us Apart", testimonials: "Client Outcomes", process: "How We Engage", contact: "Get In Touch" },
      pills: ["Strategy", "Implementation", "Consulting", "Training", "Support"],
      teamRoles: ["Managing Director", "Senior Consultant", "Project Lead", "Account Manager", "Analyst", "Operations Manager"],
      processSteps: [
        { num: "01", title: "Discover", desc: "We start with a thorough discovery session to understand your business, goals, and current challenges." },
        { num: "02", title: "Assess", desc: "A structured assessment of your current state against your desired outcomes and the gap between them." },
        { num: "03", title: "Plan", desc: "A detailed engagement plan with clear milestones, deliverables, owners, and success metrics." },
        { num: "04", title: "Execute", desc: "Senior team members execute the plan with weekly check-ins and transparent progress reporting." },
        { num: "05", title: "Review", desc: "Post-engagement review against the original success metrics and a roadmap for what comes next." }
      ],
      valuePropTriad: [
        { title: "Experience That Matters", desc: "Every team member has 10+ years of relevant experience. You get professionals who've solved similar problems before." },
        { title: "Commitments Kept", desc: "We don't overpromise. Our track record of 100% on-time delivery isn't a marketing line — it's our operating standard." },
        { title: "Partnership, Not Vendor", desc: "We invest in understanding your business deeply. The difference shows in recommendations that are practical, not theoretical." }
      ],
      locationCity: "Makati",
      partnerNames: ["Globe Business", "PLDT Enterprise", "AWS Philippines", "Microsoft Philippines", "SAP", "Oracle", "Accenture", "Deloitte"],
      variantLabels: ["Essential Package", "Professional Plan", "Enterprise Tier", "Startup Bundle", "Growth Package", "Premium Service", "Retainer Plan", "Project Based"],
      footerTagline: "Professional services delivered with expertise, reliability, and a genuine commitment to your outcomes."
    },

    portfolio_generic: {
      taglines: [
        "Work That Speaks Before You Do",
        "Craft Over Convention",
        "Selected Works — Purposefully Made",
        "Precision, Process, and Passion"
      ],
      heroSubs: [
        "A focused body of work built around one belief: that meaningful projects deserve exceptional execution. Every pixel earned.",
        "Creative work with commercial intent. The intersection of aesthetic rigour and measurable outcomes.",
        "I build things that work and make them look like they couldn't work any other way."
      ],
      products: [
        { name: "Brand Identity System", desc: "Logo, color, typography, and usage guidelines for a consumer health brand. 3-month engagement, 12 deliverables.", price: "Case Study", badge: "Featured" },
        { name: "E-Commerce Website", desc: "Custom Shopify build for a Philippine fashion label. 4.2% conversion rate. Launched 2024.", price: "Case Study" },
        { name: "Campaign Visual Direction", desc: "Art direction and visual production for a regional FMCG launch. 5 markets, 12 executions.", price: "Case Study" },
        { name: "Mobile App UI", desc: "End-to-end UI/UX for a fintech app. From research to production-ready Figma handoff.", price: "Case Study", badge: "Award Winner" },
        { name: "Editorial Photography", desc: "Campaign photography for a local fashion brand. 40 final images delivered in 5 days.", price: "Case Study" },
        { name: "Motion Graphics Series", desc: "Social-first motion graphics for a 90-day product launch campaign. 36 assets produced.", price: "Case Study" },
        { name: "Packaging Redesign", desc: "New packaging system for 12 SKUs. Sales increased 22% in the first quarter post-launch.", price: "Case Study" },
        { name: "Annual Report Design", desc: "Full publication design for a Philippine listed company. 68 pages, published 2024.", price: "Case Study" }
      ],
      features: [
        { icon: "◈", title: "Research First", desc: "Every project starts with a proper brief, competitor review, and audience understanding before any design begins." },
        { icon: "◉", title: "Focused Practice", desc: "I take on a limited number of projects at any time. Your work gets my full attention, not a fraction of it." },
        { icon: "◆", title: "Commercial Thinking", desc: "Design is not decoration. Every decision is made in service of a measurable business outcome." },
        { icon: "◊", title: "Full Process Transparency", desc: "Weekly check-ins, version history, and open-book feedback. You're involved at every stage, not just at the reveal." },
        { icon: "●", title: "Reliable Delivery", desc: "I've never missed a deadline. Timelines are planned with buffer, and problems are communicated immediately." },
        { icon: "◍", title: "Post-Launch Support", desc: "30 days of post-launch support included on every project. Questions, tweaks, and guidance as you go live." }
      ],
      testimonials: [
        { name: "Anton Cruz", role: "Founder, Consumer Brand", text: "The identity system transformed how customers perceive our brand. We closed a major retail deal within 3 months of the rebrand.", rating: "★★★★★" },
        { name: "Mia Reyes", role: "Marketing Director", text: "The process was as impressive as the output. Weekly check-ins, zero surprises, and every brief addressed thoughtfully.", rating: "★★★★★" },
        { name: "James Santos", role: "Startup CEO", text: "Our app UI won a regional design award. More importantly, user retention went up 40% after the redesign.", rating: "★★★★★" },
        { name: "Ana Tan", role: "Creative Director", text: "I refer clients here when I can't take the work. The output is always excellent and they always deliver on time.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "12+", label: "Years Practicing" },
        { val: "84", label: "Projects Delivered" },
        { val: "4", label: "Ongoing at Once" },
        { val: "0", label: "Missed Deadlines" },
        { val: "7", label: "Awards Won" },
        { val: "30 Day", label: "Post-Launch Support" }
      ],
      cta: { primary: "View Selected Work", secondary: "Start a Project", newsletter: "Get Process Notes", getStarted: "Let's Talk" },
      sectionTitles: { products: "Selected Work", services: "What I Do", about: "The Practice", features: "How I Work", testimonials: "Client Feedback", process: "The Process", contact: "Start a Project" },
      pills: ["Branding", "UI/UX", "Photography", "Motion", "Print"],
      teamRoles: ["Creative Director", "Senior Designer", "Strategist", "Motion Designer", "Photographer", "Developer"],
      processSteps: [
        { num: "01", title: "Brief", desc: "A proper written brief is the foundation of every good project. I don't start without one." },
        { num: "02", title: "Research", desc: "Audience analysis, competitor mapping, and reference curation before a single sketch is made." },
        { num: "03", title: "Concept", desc: "Two or three distinct creative directions presented with rationale. Not just visuals — strategy behind each." },
        { num: "04", title: "Refine", desc: "We select and develop the chosen direction together. Three rounds of feedback built into every engagement." },
        { num: "05", title: "Deliver", desc: "Final files in every format you need, with usage guidelines and 30 days of post-launch support." }
      ],
      valuePropTriad: [
        { title: "Deep over Wide", desc: "I take on four projects at once, maximum. Your work gets the attention it deserves — not a slice of a crowded schedule." },
        { title: "Strategy Before Aesthetics", desc: "Every creative decision starts with a business question. Beautiful work that doesn't perform is just decoration." },
        { title: "A Record Worth Trusting", desc: "84 projects delivered. Zero missed deadlines. Seven awards. The track record speaks for itself." }
      ],
      locationCity: "Manila",
      partnerNames: ["Adobe", "Figma", "Shopify", "Framer", "Webflow", "After Effects", "Lightroom", "Notion"],
      variantLabels: ["Brand System", "Digital Product", "Campaign", "Editorial", "Motion Series", "Print Collection", "Identity Refresh", "Launch Package"],
      footerTagline: "Purposeful creative work with commercial outcomes and a process that respects your time."
    },

    landing_generic: {
      taglines: [
        "Something Big Is Coming",
        "Be the First to Know",
        "The Wait Is Almost Over",
        "Early Access — Limited Spots"
      ],
      heroSubs: [
        "We're building something that changes the game. Join the waitlist and get exclusive early access before we open to the public.",
        "The smartest people in the industry are already on this list. Reserve your spot and see what the fuss is about when we launch.",
        "Limited early access. No spam — just one email when we're ready. Be in the first cohort."
      ],
      products: [
        { name: "Early Adopter Plan", desc: "Lifetime discount locked in for the first 500 members. Get the best price we'll ever offer, forever.", price: "₱0 now", badge: "Founding Member" },
        { name: "Priority Access", desc: "Skip the queue. The first 100 people on the list get onboarded in the first week.", price: "Limited" },
        { name: "Beta Program", desc: "Help shape the product before it launches. Direct line to the founding team for feedback.", price: "Invite Only", badge: "Exclusive" },
        { name: "Referral Rewards", desc: "Move up the waitlist by referring friends. Every referral jumps you forward and earns launch-day credits.", price: "Free" },
        { name: "Launch Bundle", desc: "Everything included at a pre-launch price available only to waitlist members. Expires at launch.", price: "Waitlist Only" },
        { name: "Annual Plan (Pre-Launch)", desc: "Lock in annual pricing before we publish our pricing page. Save 40% versus month-to-month.", price: "Pre-Launch Only" },
        { name: "Founding Team Access", desc: "Bi-weekly Zoom calls with the founding team. Ask anything, see the roadmap, and influence it.", price: "First 50 Members" },
        { name: "Launch Day Credit", desc: "₱500 credit applied to your first invoice when we launch. Available to all waitlist members.", price: "₱500 Credit" }
      ],
      features: [
        { icon: "🚀", title: "Launching Soon", desc: "We've been building for 18 months. It's almost ready. The waitlist gets first access before public launch." },
        { icon: "💰", title: "Founding Member Pricing", desc: "The first 500 members get locked-in lifetime pricing that will never increase, even as the product grows." },
        { icon: "🎯", title: "Built Around Your Feedback", desc: "Beta members directly influence the roadmap. The product is shaped by the people who need it most." },
        { icon: "🔒", title: "No Spam Promise", desc: "One email when we launch. That's it. We respect your inbox as much as you do." },
        { icon: "⚡", title: "Priority Onboarding", desc: "Waitlist members get dedicated onboarding support. You'll be fully set up in the first session." },
        { icon: "🌟", title: "Exclusive Community", desc: "Join a private community of early adopters. The best network in this space starts here." }
      ],
      testimonials: [
        { name: "Carlo Santos", role: "Early Beta User", text: "I've been in the beta for 6 weeks and this is exactly what the market needed. The founding team is responsive and the product ships fast.", rating: "★★★★★" },
        { name: "Maria Reyes", role: "Industry Professional", text: "I signed up for the waitlist and got an invite within a week. The founding member pricing alone made it a no-brainer.", rating: "★★★★★" },
        { name: "James Uy", role: "Beta Tester", text: "The beta program is genuinely collaborative. I've submitted 12 feature requests and 8 have shipped. That's unheard of.", rating: "★★★★★" },
        { name: "Ana Lim", role: "Founding Member", text: "Locked in the founding pricing and I'm already glad I did. The product has improved 10x since I joined and the price stays the same.", rating: "★★★★★" }
      ],
      metrics: [
        { val: "12,000+", label: "On the Waitlist" },
        { val: "500", label: "Founding Spots Left" },
        { val: "Q3 2025", label: "Launch Target" },
        { val: "18 mo", label: "In Development" },
        { val: "Beta", label: "Currently Active" },
        { val: "40%", label: "Launch Day Savings" }
      ],
      cta: { primary: "Join the Waitlist", secondary: "Learn More", newsletter: "Stay Updated", getStarted: "Reserve My Spot" },
      sectionTitles: { products: "What You Get", services: "Early Access Benefits", about: "Why We're Building This", features: "Why Join the Waitlist", testimonials: "Beta Tester Feedback", process: "What Happens Next", contact: "Have Questions?" },
      pills: ["Waitlist", "Beta Access", "Founding Pricing", "Referrals", "Community"],
      teamRoles: ["Co-Founder & CEO", "Co-Founder & CTO", "Head of Product", "Community Manager", "Growth Lead", "Engineering Lead"],
      processSteps: [
        { num: "01", title: "Join", desc: "Add your email to the waitlist. Takes 10 seconds. No commitment required." },
        { num: "02", title: "Confirm", desc: "Check your inbox for a confirmation email. You'll immediately see your position on the list." },
        { num: "03", title: "Move Up", desc: "Refer friends to move up the list. Each referral jumps you forward and earns launch-day credits." },
        { num: "04", title: "Get Invited", desc: "When it's your turn, you'll get a personal invite email with your onboarding link and founding member code." },
        { num: "05", title: "Launch", desc: "Full access from day one. Founding member pricing locked in forever. Priority support for the first 90 days." }
      ],
      valuePropTriad: [
        { title: "Founding Pricing, Forever", desc: "The first 500 members get pricing that never increases. As the product grows, your cost stays the same." },
        { title: "Shape the Roadmap", desc: "Beta members have direct access to the founding team. The product is literally built around your feedback." },
        { title: "First Mover Advantage", desc: "In this market, being early matters. The people who get in now are the ones who dominate their categories later." }
      ],
      locationCity: "Manila",
      partnerNames: ["Y Combinator", "Techstars", "Sequoia", "Founders Fund", "Product Hunt", "Hacker News", "Stripe Atlas", "AWS Activate"],
      variantLabels: ["Founding Access", "Beta Tier", "Early Adopter", "Launch Special", "Annual Pre-Buy", "Team Plan", "Lifetime Deal", "Referral Bonus"],
      footerTagline: "Something important is being built. Be part of it from the very beginning."
    }
  };

  // ─── Fallback bank builder ─────────────────────────────────────────────────
  function buildFallbackBank(intent) {
    const n = intent.primaryNiche || 'products';
    const b = intent.brandName || n;
    const cat = (intent.siteCategory || 'BUSINESS').toUpperCase();
    if (BANKS['business_generic']) {
      const base = Object.assign({}, BANKS['business_generic']);
      // Patch in the actual niche/brand
      base.taglines = [`Premium ${n} — World-Class Quality`, `${b} — Excellence Redefined`, `The Future of ${n}`, `${b} — Crafted for the Best`];
      base.heroSubs = [`${b} delivers premium ${n} with uncompromising quality and a commitment to excellence.`, `Experience the finest ${n} selection, curated for those who demand the best.`, `Trusted by thousands for ${n}. Discover why customers keep coming back.`];
      base.footerTagline = `Premium ${n} by ${b} — quality you can trust.`;
      base.sectionTitles = Object.assign({}, base.sectionTitles, { products: `${n} Collection`, about: `The ${b} Story` });
      return base;
    }
    return BANKS['ecommerce_generic'];
  }

  // ─── Main generate function ────────────────────────────────────────────────
  function generate(intent) {
    const subNiche = detectSubNiche(intent);
    const bank = BANKS[subNiche] || buildFallbackBank(intent);
    return Object.assign({ subNiche: subNiche }, bank);
  }

  // ─── Global export ─────────────────────────────────────────────────────────
  global.NicheContentEngine = {
    generate: generate,
    detectSubNiche: detectSubNiche
  };

})(typeof window !== 'undefined' ? window : global);
