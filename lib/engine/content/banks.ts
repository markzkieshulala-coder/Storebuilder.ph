// ---------------------------------------------------------------------------
// NICHE BANKS — Phase 3: fallback-only content banks.
//
// These are the LAST tier in the content resolution chain. They are ONLY consulted
// when prompt-tier and nlu-tier resolvers cannot produce content. All banks are
// keyed by normalized industry slug from normalizeIndustry().
// ---------------------------------------------------------------------------

import type { FaqItem, ProductItem, PricingPlan, TestimonialItem } from './types';

// ── Product banks ────────────────────────────────────────────────────────────

export interface ProductBank {
  eyebrow: string;
  items: ProductItem[];
}

export const SUBNICHE_PRODUCTS: Record<string, ProductBank> = {
  coffee: { eyebrow: 'Our Menu', items: [
    { name: 'Espresso', desc: 'A rich, full-bodied double shot with a thick golden crema.', price: '$3.50' },
    { name: 'Cappuccino', desc: 'Equal parts espresso, steamed milk, and velvety microfoam.', price: '$4.50' },
    { name: 'Caffè Latte', desc: 'Smooth espresso with steamed milk and a light layer of foam.', price: '$4.75' },
    { name: 'Flat White', desc: 'Ristretto shots topped with silky steamed milk — coffee-forward.', price: '$4.50' },
    { name: 'Iced Coffee', desc: 'Slow-steeped and served over ice for a crisp, refreshing cup.', price: '$4.25' },
    { name: 'Cold Brew', desc: 'Steeped 18 hours for a smooth, naturally sweet, low-acid finish.', price: '$5.00' },
    { name: 'Pour-Over', desc: 'Single-origin beans brewed by hand to highlight delicate notes.', price: '$5.50' },
    { name: 'Butter Croissant', desc: 'Flaky, golden, and baked fresh in-house every morning.', price: '$3.75' },
  ] },
  cafe: { eyebrow: 'Our Menu', items: [
    { name: 'Flat White', desc: 'Ristretto shots topped with silky steamed milk — coffee-forward.', price: '$4.50' },
    { name: 'Avocado Toast', desc: 'Sourdough, smashed avocado, chilli, and a soft poached egg.', price: '$11.00' },
    { name: 'Breakfast Bowl', desc: 'Eggs, greens, roasted veg, and house dressing — all day.', price: '$13.50' },
    { name: 'Almond Croissant', desc: 'Buttery croissant filled with frangipane and toasted almonds.', price: '$4.25' },
    { name: 'Iced Latte', desc: 'House espresso over cold milk and ice — smooth and refreshing.', price: '$4.75' },
    { name: 'Seasonal Cake', desc: 'A rotating slice baked fresh — ask about today\'s selection.', price: '$5.50' },
  ] },
  espresso: { eyebrow: 'Our Menu', items: [
    { name: 'Single Espresso', desc: 'A precise single shot pulled to highlight origin character.', price: '$3.00' },
    { name: 'Double Espresso', desc: 'Two shots of intense, balanced espresso with rich crema.', price: '$3.75' },
    { name: 'Cortado', desc: 'Equal espresso and warm milk — bold but beautifully smooth.', price: '$4.00' },
    { name: 'Macchiato', desc: 'Espresso "stained" with a dollop of textured milk foam.', price: '$3.75' },
    { name: 'Flat White', desc: 'Ristretto shots with silky microfoam — intensely coffee-forward.', price: '$4.50' },
    { name: 'Ristretto', desc: 'A short, concentrated extraction — sweeter and more intense.', price: '$3.50' },
  ] },
  ramen: { eyebrow: 'Our Menu', items: [
    { name: 'Tonkotsu Ramen', desc: '18-hour pork broth, chashu, soft egg, scallion, and nori.', price: '$16.00' },
    { name: 'Shoyu Ramen', desc: 'Soy-based clear broth with chicken, bamboo, and fresh noodles.', price: '$15.00' },
    { name: 'Miso Ramen', desc: 'Rich fermented-miso broth, corn, butter, and ground pork.', price: '$15.50' },
    { name: 'Spicy Tantanmen', desc: 'Sesame-chilli broth with minced pork and a fiery oil finish.', price: '$16.50' },
    { name: 'Vegetable Ramen', desc: 'Kombu-shiitake broth with seasonal vegetables and tofu.', price: '$14.50' },
    { name: 'Gyoza (6 pc)', desc: 'Pan-fried pork-and-cabbage dumplings with dipping sauce.', price: '$7.00' },
  ] },
  sushi: { eyebrow: 'Our Menu', items: [
    { name: 'Chef\'s Omakase', desc: 'An 8–12 piece journey through today\'s finest catch.', price: '$65.00' },
    { name: 'Salmon Nigiri (2 pc)', desc: 'Fresh salmon over hand-pressed seasoned rice.', price: '$7.00' },
    { name: 'Tuna Sashimi', desc: 'Five slices of premium daily-sourced bluefin tuna.', price: '$14.00' },
    { name: 'Dragon Roll', desc: 'Eel and cucumber topped with avocado and unagi glaze.', price: '$16.00' },
    { name: 'Spicy Tuna Roll', desc: 'Diced tuna, chilli mayo, and cucumber, finished with sesame.', price: '$12.00' },
    { name: 'Miso Soup', desc: 'Traditional dashi and miso with tofu, wakame, and scallion.', price: '$4.00' },
  ] },
  pizza: { eyebrow: 'Our Menu', items: [
    { name: 'Margherita', desc: 'San Marzano tomato, fresh mozzarella, basil, olive oil.', price: '$14.00' },
    { name: 'Marinara', desc: 'Tomato, garlic, oregano, and olive oil — no cheese, all flavour.', price: '$12.00' },
    { name: 'Diavola', desc: 'Spicy salami, mozzarella, tomato, and a chilli-oil finish.', price: '$16.00' },
    { name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, fontina, and parmesan.', price: '$17.00' },
    { name: 'Prosciutto & Rocket', desc: 'Cured ham, fresh rocket, and shaved parmesan after the bake.', price: '$18.00' },
    { name: 'Funghi', desc: 'Wild mushrooms, mozzarella, thyme, and truffle oil.', price: '$16.50' },
  ] },
  burger: { eyebrow: 'Our Menu', items: [
    { name: 'The Classic', desc: 'Fresh-ground patty, cheddar, lettuce, tomato, house sauce.', price: '$12.00' },
    { name: 'Double Smash', desc: 'Two smashed patties, American cheese, pickles, onions.', price: '$15.00' },
    { name: 'Bacon BBQ', desc: 'Smoked bacon, cheddar, crispy onions, and smoky BBQ sauce.', price: '$15.50' },
    { name: 'Mushroom Swiss', desc: 'Sautéed mushrooms, melted swiss, and garlic aioli.', price: '$14.50' },
    { name: 'Plant-Based', desc: 'House veggie patty, vegan cheese, and all the trimmings.', price: '$14.00' },
    { name: 'Hand-Cut Fries', desc: 'Skin-on fries with our signature seasoning blend.', price: '$5.00' },
  ] },
  bakery: { eyebrow: 'Fresh Today', items: [
    { name: 'Sourdough Loaf', desc: 'Naturally leavened, slow-fermented, with a crackling crust.', price: '$8.00' },
    { name: 'Butter Croissant', desc: 'Flaky, golden, and laminated by hand each morning.', price: '$3.75' },
    { name: 'Pain au Chocolat', desc: 'Buttery layers wrapped around rich dark chocolate batons.', price: '$4.25' },
    { name: 'Cinnamon Roll', desc: 'Soft, spiced, and finished with a cream-cheese glaze.', price: '$4.50' },
    { name: 'Fruit Danish', desc: 'Seasonal fruit on a vanilla custard pastry base.', price: '$4.75' },
    { name: 'Custom Cake', desc: 'Made to order for birthdays, weddings, and celebrations.', price: 'From $45' },
  ] },
  bar: { eyebrow: 'Cocktail List', items: [
    { name: 'Old Fashioned', desc: 'Bourbon, demerara, and aromatic bitters over a clear cube.', price: '$14.00' },
    { name: 'Negroni', desc: 'Equal parts gin, Campari, and sweet vermouth, orange twist.', price: '$13.00' },
    { name: 'Espresso Martini', desc: 'Vodka, coffee liqueur, and a fresh shot of espresso.', price: '$15.00' },
    { name: 'Margarita', desc: 'Blanco tequila, lime, and orange liqueur with a salt rim.', price: '$13.00' },
    { name: 'House Negroni Sbagliato', desc: 'Campari and vermouth lengthened with sparkling wine.', price: '$14.00' },
    { name: 'Seasonal Signature', desc: 'Ask your bartender about tonight\'s house creation.', price: '$16.00' },
  ] },
};

export const NICHE_PRODUCTS: Record<string, ProductBank> = {
  food: { eyebrow: 'Our Menu', items: [
    { name: 'Chef\'s Signature', desc: 'Our most-loved dish, crafted from the freshest seasonal produce.', price: '$24.00' },
    { name: 'Starter Selection', desc: 'A rotating plate of house starters to begin your meal.', price: '$12.00' },
    { name: 'Daily Special', desc: 'Ask your server about today\'s freshly prepared special.', price: '$22.00' },
    { name: 'House Dessert', desc: 'A handmade sweet finish, changed with the season.', price: '$9.00' },
    { name: 'Seasonal Plate', desc: 'Built around what\'s best at the market this week.', price: '$20.00' },
    { name: 'Sharing Board', desc: 'A generous selection designed for the table to share.', price: '$26.00' },
  ] },
  ecommerce: { eyebrow: 'Featured Products', items: [
    { name: 'Best Seller', desc: 'Our most popular product, loved by thousands of customers.', price: '$49.00' },
    { name: 'New Arrival', desc: 'Fresh in this season — premium quality, limited stock.', price: '$59.00' },
    { name: 'Editor\'s Pick', desc: 'Hand-selected by our team for exceptional quality and value.', price: '$45.00' },
    { name: 'Bundle Set', desc: 'Everything you need in one carefully curated package.', price: '$89.00' },
    { name: 'Premium Edition', desc: 'Our top-tier offering with elevated materials and finish.', price: '$79.00' },
    { name: 'Essentials Kit', desc: 'The everyday staples, thoughtfully sourced and built to last.', price: '$39.00' },
  ] },
  fashion: { eyebrow: 'The Collection', items: [
    { name: 'Signature Coat', desc: 'Tailored from premium wool with a clean, timeless silhouette.', price: '$320.00' },
    { name: 'Everyday Knit', desc: 'Soft, breathable, and cut for an effortless modern fit.', price: '$120.00' },
    { name: 'Tailored Trouser', desc: 'A refined straight-leg trouser in a versatile mid-weight.', price: '$160.00' },
    { name: 'Classic Shirt', desc: 'Crisp, structured, and finished with mother-of-pearl buttons.', price: '$110.00' },
    { name: 'Leather Accessory', desc: 'Full-grain leather, hand-finished and built to age beautifully.', price: '$95.00' },
    { name: 'Limited Edition', desc: 'A small-run piece from our latest seasonal drop.', price: '$240.00' },
  ] },
};

/** Resolve the product bank for a given niche. Returns null if no bank exists. */
export function resolveProductBank(extractedKeywords: string[], rawIndustry: string, normIndustry: string): ProductBank | null {
  for (const kw of extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_PRODUCTS[k]) return SUBNICHE_PRODUCTS[k];
  }
  if (SUBNICHE_PRODUCTS[rawIndustry.toLowerCase()]) return SUBNICHE_PRODUCTS[rawIndustry.toLowerCase()];
  return NICHE_PRODUCTS[normIndustry] || null;
}

// ── FAQ banks ────────────────────────────────────────────────────────────────

export const NICHE_FAQ: Record<string, FaqItem[]> = {
  food: [
    { q: 'Do you take reservations?', a: 'Yes — you can book a table through our contact page or by giving us a call. Walk-ins are always welcome too.' },
    { q: 'What are your opening hours?', a: 'We\'re open seven days a week. Check our contact section for today\'s hours — we\'re here morning through evening.' },
    { q: 'Do you cater to dietary requirements?', a: 'Absolutely. We offer vegetarian, vegan, and gluten-free options, and our team is happy to accommodate allergies.' },
    { q: 'Can I order for takeaway or delivery?', a: 'Yes — order ahead for pickup, and delivery is available through our partners in the local area.' },
    { q: 'Do you host private events?', a: 'We do — from intimate dinners to larger celebrations. Get in touch and we\'ll tailor a menu and space to suit you.' },
    { q: 'Where do you source your ingredients?', a: 'We work with trusted local suppliers and seasonal produce, so the menu reflects what\'s freshest right now.' },
    { q: 'Is there parking nearby?', a: 'There\'s street and nearby lot parking close by, and we\'re well served by public transport — details are on our contact page.' },
  ],
  sports: [
    { q: 'Do I need experience to join?', a: 'Not at all. Our programs scale to every level, and our coaches will guide you from your very first session.' },
    { q: 'What should I bring to my first class?', a: 'Just comfortable training clothes, a water bottle, and a willingness to work. We\'ll handle the rest.' },
    { q: 'Are there flexible membership options?', a: 'Yes — we offer monthly, class-pack, and annual memberships so you can train on your terms.' },
    { q: 'Do you offer personal training?', a: 'We do. One-on-one coaching is available for anyone who wants a fully personalised program.' },
    { q: 'Can I freeze or cancel my membership?', a: 'Of course — there are no long lock-ins. You can pause or cancel with a little notice whenever life gets busy.' },
    { q: 'Do you have changing rooms and showers?', a: 'Yes — full changing facilities, showers, and secure lockers are available for every member.' },
    { q: 'How big are your classes?', a: 'We keep class sizes small enough for real coaching attention while still bringing great group energy.' },
  ],
  wellness: [
    { q: 'How do I book a session?', a: 'You can book directly through our contact page or by calling us. We recommend booking ahead for popular times.' },
    { q: 'What should I expect on my first visit?', a: 'Arrive a few minutes early so we can welcome you, understand your needs, and make sure you\'re fully comfortable.' },
    { q: 'Do you offer packages or memberships?', a: 'Yes — we offer single sessions, multi-session packages, and memberships for regular guests.' },
    { q: 'Can I request a specific therapist or class?', a: 'Of course. Let us know your preference when booking and we\'ll do our best to accommodate you.' },
    { q: 'What is your cancellation policy?', a: 'We simply ask for a little notice so we can offer the slot to someone else. Life happens — just let us know.' },
    { q: 'Is this suitable for beginners?', a: 'Completely. Every session meets you where you are, and our team gently guides first-timers every step of the way.' },
    { q: 'What should I wear or bring?', a: 'Comfortable clothing is perfect, and we provide everything else you\'ll need. Just bring yourself and an open mind.' },
  ],
  photography: [
    { q: 'How do I book a shoot?', a: 'Reach out through our contact page with a few details about your project and we\'ll get back to you within 24 hours.' },
    { q: 'What\'s your turnaround time?', a: 'Proofs are typically delivered within 24–48 hours, with final edited images following shortly after.' },
    { q: 'Do you travel for shoots?', a: 'Yes — we shoot on location locally and can travel further afield for the right project.' },
    { q: 'Can we discuss the concept beforehand?', a: 'Absolutely. Every project starts with a conversation to align on vision, style, and deliverables.' },
    { q: 'Do you provide print rights?', a: 'Final galleries include a personal print release, and commercial licensing is available on request.' },
    { q: 'What happens if the weather turns?', a: 'For outdoor shoots we keep a flexible backup date in mind, so a little rain never costs you the moment.' },
    { q: 'How many images will I receive?', a: 'It varies by package, but you\'ll always receive a generous, carefully edited selection — quality over filler.' },
  ],
  fashion: [
    { q: 'What is your sizing and fit like?', a: 'Each product page includes a detailed size guide. If you\'re between sizes, our team is happy to advise.' },
    { q: 'What is your returns policy?', a: 'We offer easy 30-day returns on unworn items. Bespoke and made-to-order pieces are final sale.' },
    { q: 'Do you ship internationally?', a: 'Yes — we ship worldwide, with rates and delivery times calculated at checkout.' },
    { q: 'Do you offer styling advice?', a: 'We do. Book a personal styling consultation and we\'ll help you build pieces that work for your life.' },
    { q: 'How should I care for my pieces?', a: 'Every item comes with care guidance, and our fabrics are chosen to age beautifully when looked after well.' },
    { q: 'When do new collections drop?', a: 'We release seasonal collections through the year — join our list to hear about new arrivals first.' },
    { q: 'Are your materials responsibly sourced?', a: 'Yes — we work with considered, responsibly sourced materials and partners we\'re proud to stand behind.' },
  ],
  ecommerce: [
    { q: 'How long does shipping take?', a: 'Standard orders ship within 1–2 business days, with delivery typically in 3–5 days depending on location.' },
    { q: 'What is your return policy?', a: 'We offer hassle-free 30-day returns. If you\'re not happy, send it back for a full refund.' },
    { q: 'Do you ship internationally?', a: 'Yes — we ship to most countries, with shipping costs calculated at checkout.' },
    { q: 'How can I track my order?', a: 'You\'ll receive a tracking link by email as soon as your order leaves our warehouse.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major cards and popular digital wallets, with secure checkout on every order.' },
    { q: 'Are your products covered by a guarantee?', a: 'Everything we sell is quality-checked and backed by our satisfaction guarantee — shop with confidence.' },
    { q: 'Can I change or cancel my order?', a: 'If your order hasn\'t shipped yet, just reach out and we\'ll do our best to update or cancel it for you.' },
  ],
  agency: [
    { q: 'How do we start working together?', a: 'It begins with a discovery call to understand your goals, followed by a tailored proposal and scope.' },
    { q: 'What is your typical project timeline?', a: 'Timelines vary by scope, but most engagements run between four and twelve weeks from kickoff to delivery.' },
    { q: 'Do you work with our existing team?', a: 'Absolutely. We integrate seamlessly with in-house teams and can lead or support as needed.' },
    { q: 'How do you measure success?', a: 'We define clear KPIs at the outset and report against them throughout the engagement.' },
    { q: 'What industries do you specialise in?', a: 'We\'ve partnered across many sectors — what stays constant is our process for turning strategy into results.' },
    { q: 'Do you offer ongoing retainers?', a: 'Yes — beyond one-off projects, we offer monthly retainers for teams who want a long-term creative partner.' },
    { q: 'Who owns the work you produce?', a: 'You do. On final delivery and settlement, all rights to the work transfer fully to you.' },
  ],
  portfolio: [
    { q: 'Are you available for new projects?', a: 'Yes — reach out through the contact page and let\'s talk about what you have in mind.' },
    { q: 'What is your process like?', a: 'Every project starts with understanding your goals, followed by concepts, refinement, and delivery.' },
    { q: 'Do you work remotely?', a: 'I work with clients both locally and remotely, collaborating however suits your team best.' },
    { q: 'How do we get started?', a: 'Send a short brief through the contact form and I\'ll get back to you to discuss next steps.' },
    { q: 'How do you price your work?', a: 'Pricing is scoped per project so it fits the work involved — I\'ll always share a clear quote upfront.' },
    { q: 'Can I see more of your work?', a: 'The selection here is a highlight reel — get in touch and I\'m glad to share work relevant to your project.' },
    { q: 'How many revisions are included?', a: 'Each engagement includes generous revision rounds so we refine the work until it\'s genuinely right.' },
  ],
  hospitality: [
    { q: 'How do I make a booking?', a: 'You can book directly through our contact page or by calling our front desk — we\'re here to help.' },
    { q: 'What are your check-in times?', a: 'Check-in is from mid-afternoon and check-out is late morning. Early check-in is subject to availability.' },
    { q: 'Do you offer amenities and services?', a: 'Yes — from dining to concierge, we offer a full range of services to make your stay seamless.' },
    { q: 'Is parking available?', a: 'On-site and nearby parking options are available. Contact us ahead of your visit for details.' },
    { q: 'What is your cancellation policy?', a: 'Plans change — most stays can be cancelled or amended up to a few days before arrival at no charge.' },
    { q: 'Are pets welcome?', a: 'Selected rooms are pet-friendly. Let us know when booking and we\'ll make sure everyone\'s comfortable.' },
    { q: 'Do you cater to special occasions?', a: 'We love a celebration — tell us what you\'re marking and we\'ll help make the stay truly memorable.' },
  ],
  technology: [
    { q: 'How do I get started?', a: 'Getting started is easy — sign up, follow the guided onboarding, and you\'ll be up and running in minutes.' },
    { q: 'Is there a free plan available?', a: 'Yes, we offer a free plan with core features so you can try the platform before upgrading.' },
    { q: 'Can I cancel at any time?', a: 'Absolutely. There are no long-term contracts — change or cancel your plan whenever you like.' },
    { q: 'Do you offer customer support?', a: 'We provide support through chat and email, with priority and dedicated support on higher plans.' },
    { q: 'How secure is my data?', a: 'Security is foundational — data is encrypted in transit and at rest, with industry-standard safeguards throughout.' },
    { q: 'Do you integrate with other tools?', a: 'Yes — we connect with the tools teams already use, with an API for anything custom you need to build.' },
    { q: 'Can the platform scale with us?', a: 'Completely. From your first project to enterprise scale, the platform grows with your team without missing a beat.' },
  ],
  general: [
    { q: 'How do I get in touch?', a: 'The fastest way is through our contact page — we respond to every enquiry within 24 hours.' },
    { q: 'Where are you located?', a: 'You\'ll find our full address and opening hours in the contact section below.' },
    { q: 'What makes you different?', a: 'We pair genuine expertise with a relentless focus on quality and a service experience people remember.' },
    { q: 'Do you offer consultations?', a: 'Yes — reach out and we\'ll be happy to discuss exactly how we can help you.' },
    { q: 'How much do your services cost?', a: 'Pricing depends on what you need — get in touch and we\'ll put together a clear, honest quote for you.' },
    { q: 'How quickly can you start?', a: 'In most cases we can begin within days. Reach out and we\'ll find a timeline that works for you.' },
    { q: 'Do you guarantee your work?', a: 'We stand firmly behind everything we do, and we\'re not happy until you are.' },
  ],
};

/** Resolve niche FAQ bank. */
export function resolveNicheFaqs(normIndustry: string): FaqItem[] {
  return NICHE_FAQ[normIndustry] || NICHE_FAQ.general;
}

// ── CTA sub copy ─────────────────────────────────────────────────────────────

export const CTA_SUB_BY_NICHE: Record<string, string> = {
  food:         'Reserve your table or stop by today — we can\'t wait to welcome you.',
  sports:       'Book your first session today and feel the difference real coaching makes.',
  wellness:     'Book your treatment today and give yourself the rest you deserve.',
  photography:  'Tell us about your project — we\'ll bring your vision to life.',
  fashion:      'Explore the collection and find pieces made to last.',
  ecommerce:    'Browse the collection and enjoy fast, free shipping on every order.',
  agency:       'Let\'s talk about your goals and build something that moves the needle.',
  portfolio:    'Have a project in mind? Let\'s create something exceptional together.',
  hospitality:  'Book your stay today and experience hospitality done right.',
  technology:   'Get started in minutes. No credit card required.',
  homeservices: 'Get your free, no-obligation quote today — fast, friendly, and fully guaranteed.',
  automotive:   'Book your service today and get back on the road with total confidence.',
  general:      'Get in touch today — we\'d love to hear from you.',
};

// ── Testimonial banks ────────────────────────────────────────────────────────

export const TESTIMONIAL_ROLES: Record<string, string[]> = {
  food:         ['Regular Guest','Food Critic','Local Resident','Weekly Visitor'],
  sports:       ['Competitive Athlete','Personal Trainer','Team Coach','Amateur Enthusiast'],
  technology:   ['CTO, TechCorp','Head of Engineering, BuildFast','Lead Developer, DataFlow','VP Product, ScaleUp'],
  photography:  ['Art Director, Studio9','Creative Director, Brand Co','Marketing Lead, Vision Co','Publisher, Photo Weekly'],
  fashion:      ['Fashion Editor','Style Consultant','Brand Manager','Loyal Customer'],
  ecommerce:    ['Verified Buyer','Repeat Customer','Brand Partner','First-time Shopper'],
  portfolio:    ['Art Director, Studio9','Creative Director, Brand Co','Gallery Curator','Editorial Lead'],
  agency:       ['CMO, GrowthCo','Brand Director, ScaleUp','Founder, BuildFast','Head of Marketing, DataFlow'],
  homeservices: ['Homeowner','Property Manager','Repeat Customer','Local Resident'],
  automotive:   ['Loyal Customer','Fleet Manager','First-time Visitor','Local Driver'],
  general:      ['CEO, GrowthCo','Operations Director, ScaleUp','Founder, BuildFast','Product Lead, DataFlow'],
};

export const TESTIMONIAL_QUOTES: Record<string, string[]> = {
  food:        ['The atmosphere and food quality is something I look forward to every week.',
                'The best [mainKw] I\'ve had. Nothing else even comes close.',
                'Every visit feels special. The [secKw] is outstanding.'],
  sports:      ['Completely elevated my [mainKw] performance. My results have never been better.',
                'The [mainKw] program is world-class. I\'ve trained everywhere — this is the best.',
                'Incredible [mainKw] coaching. My technique improved dramatically in just weeks.'],
  technology:  ['Transformed how our team handles [mainKw]. The results speak for themselves.',
                'We\'ve tried every tool out there — nothing matches what [brand] delivers for [secKw].',
                'Our [mainKw] metrics improved by 3x within the first month.'],
  photography: ['Captured exactly the [mainKw] vision we had in mind. Stunning work.',
                'Every frame is gallery-worthy. The [secKw] is unmatched.',
                'Working on our [mainKw] shoot was effortless and inspiring.'],
  fashion:     ['My go-to for [mainKw]. Every piece feels considered.',
                'The [mainKw] collection is unlike anything else out there.',
                'Understands [secKw] better than any label I\'ve worked with.'],
  ecommerce:   ['Ordering [mainKw] was seamless — fast shipping and beautiful packaging.',
                'The only place I shop for [mainKw] now. Quality every single time.',
                'The [secKw] selection keeps me coming back month after month.'],
  agency:      ['Reimagined our [mainKw] from the ground up. Our brand has never looked sharper.',
                'The team treated our [mainKw] like their own. The results were undeniable.',
                'Our [secKw] engagement tripled after partnering with [brand].'],
  homeservices:['Handled our [mainKw] quickly and professionally. Spotless work and fair pricing.',
                'Finally, a team I can trust. Showed up on time and got the job done right.',
                'Honest, reliable, and tidy — the only company we call now.'],
  automotive:  ['Fixed my car right the first time and explained everything clearly. Honest shop.',
                'Fast, fair, and friendly. The only place I trust with my vehicle.',
                'Great [mainKw] service — no upselling, just quality work at a fair price.'],
  general:     ['Completely transformed our [mainKw] operations. The results are undeniable.',
                'Nothing compares to what [brand] delivers. Our [secKw] metrics improved by 3x.',
                'The [mainKw] experience is unmatched. Every team should use this.'],
};

// ── About body generators ────────────────────────────────────────────────────

type AboutFn = (brand: string, mainKw: string, secKw: string, audience: string, diff: string) => string;

export const ABOUT_BODY_BY_NICHE: Record<string, AboutFn> = {
  food: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was born from a genuine passion for ${mk.toLowerCase()} — not the kind that fades, but the kind that drives every decision from sourcing to service.`;
    const s2 = diff
      ? `Our ${diff} approach shows in every detail: ${sk.toLowerCase()}-forward cooking, carefully chosen ingredients, and a space ${aud ? 'for ' + aud : 'for everyone'} that invites you to stay.`
      : `We cook with care, source with intention, and create a space ${aud ? 'for ' + aud : 'for everyone'} to slow down and savour something worth coming back for.`;
    const s3 = `From the first bite to the last, every detail at ${b} is there for a reason.`;
    return `${s1} ${s2} ${s3}`;
  },
  sports: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was built ${aud ? 'for ' + aud : 'for athletes and enthusiasts'} who want more than just a workout — they want a system that actually produces results.`;
    const s2 = diff
      ? `Our ${diff} ${mk.toLowerCase()} programs combine expert ${sk.toLowerCase()} coaching with evidence-based methods and the kind of accountability that drives real progress.`
      : `We combine expert ${sk.toLowerCase()} coaching with proven programming and an environment that pushes you forward — session after session.`;
    const s3 = `Progress at ${b} is measured, tracked, and real — because your ${mk.toLowerCase()} goals deserve nothing less.`;
    return `${s1} ${s2} ${s3}`;
  },
  technology: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was built to solve the ${mk.toLowerCase()} problem ${aud ? aud + ' face' : 'teams face'} — not with layers of complexity, but with focused tools that work the first time.`;
    const s2 = diff
      ? `Our ${diff} engineering philosophy means we iterate fast, ship often, and build on a foundation designed for ${sk.toLowerCase()} at scale.`
      : `We move fast, iterate constantly, and ship software ${aud ? aud : 'teams'} actually want to use — no bloat, no feature graveyard.`;
    const s3 = `Every feature at ${b} earns its place. We cut what doesn't serve you.`;
    return `${s1} ${s2} ${s3}`;
  },
  photography: (b, mk, sk, aud, diff) => {
    const s1 = `${b} is a ${mk.toLowerCase()} studio driven by an obsession with light, moment, and the story that each frame can hold.`;
    const s2 = diff
      ? `A ${diff} perspective shapes every project — from the initial brief through the ${sk.toLowerCase()} to the final edited collection.`
      : `From first conversation to final delivery, every shoot is approached with care, craft, and a genuine respect for the subject.`;
    const s3 = `${b} works ${aud ? 'with ' + aud : 'with a range of clients'} — and every project gets the same full attention, without exception.`;
    return `${s1} ${s2} ${s3}`;
  },
  fashion: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was founded on the belief that ${mk.toLowerCase()} should be ${diff ? diff + ' and ' : ''}intentional — a deliberate expression of self, not just something to wear.`;
    const s2 = aud
      ? `Every piece we carry was chosen with ${aud} in mind: the edit is tight, the criteria demanding, and the standards uncompromised.`
      : `Every piece in our edit earns its place through material quality, construction, and a clear point of view.`;
    const s3 = `${b} is not about chasing trends — it's about building a wardrobe that lasts.`;
    return `${s1} ${s2} ${s3}`;
  },
  ecommerce: (b, mk, sk, aud, diff) => {
    const s1 = `${b} exists to bring${diff ? ' ' + diff : ''} ${mk.toLowerCase()} to ${aud ? aud : 'everyone who deserves better'} — without the overhead, the middlemen, or the compromises.`;
    const s2 = `Every product in our shop was chosen because it genuinely delivers: good materials, honest pricing, and the kind of quality that holds up over time.`;
    const s3 = `We curate with conviction. If it doesn't earn a place, it doesn't make it to you.`;
    return `${s1} ${s2} ${s3}`;
  },
  portfolio: (b, mk, sk, aud, diff) => {
    const s1 = `${b} is a ${mk.toLowerCase()} practice built on the belief that every brief deserves real thinking — not templates, not shortcuts, and not work that could belong to anyone else.`;
    const s2 = diff
      ? `A ${diff} perspective shapes every project: from initial concept through ${sk.toLowerCase()} to the final deliverable.`
      : `From concept to delivery, every project is approached with curiosity, precision, and a drive to make something that actually works.`;
    const s3 = `${b} works ${aud ? 'with ' + aud : 'with a range of clients'} — and every project receives the same complete attention.`;
    return `${s1} ${s2} ${s3}`;
  },
  agency: (b, mk, sk, aud, diff) => {
    const s1 = `${b} is a focused creative studio that lives at the intersection of ${mk.toLowerCase()} strategy and craft — we handle both because we believe you can't fully separate them.`;
    const s2 = diff
      ? `Our ${diff} approach means every brief gets more than execution: it gets real thinking, honest iteration, and a team genuinely invested in the outcome.`
      : `Every project gets rigorous strategy, focused execution, and a team that treats your ${sk.toLowerCase()} like their own.`;
    const s3 = `${b} works ${aud ? 'with ' + aud : 'with ambitious brands'} who want results — not decks.`;
    return `${s1} ${s2} ${s3}`;
  },
  wellness: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was created from the conviction that ${mk.toLowerCase()} should be genuinely accessible, thoughtfully designed, and led by practitioners who care about outcomes — not just attendance.`;
    const s2 = diff
      ? `Our ${diff} approach combines deep ${sk.toLowerCase()} expertise with personalised attention, so every session moves you forward in a way that actually sticks.`
      : `We combine expert-led ${sk.toLowerCase()} programming with a warm, judgement-free space where progress is always the primary goal.`;
    const s3 = `${aud ? (aud.charAt(0).toUpperCase() + aud.slice(1)) + ' come' : 'People come'} to ${b} to feel better — and that's exactly what happens.`;
    return `${s1} ${s2} ${s3}`;
  },
  professional: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was founded to deliver ${diff ? diff + ' ' : ''}${mk.toLowerCase()} that clients can actually rely on — expert counsel, clear communication, and outcomes that speak for themselves.`;
    const s2 = aud
      ? `We specialise in working with ${aud}, bringing deep ${sk.toLowerCase()} expertise and a genuine commitment to understanding each client's specific situation.`
      : `We bring deep ${sk.toLowerCase()} expertise, honest counsel, and a results-driven approach to every client relationship — without the jargon.`;
    const s3 = `${b} was built on trust, and trust is built on doing consistently excellent work.`;
    return `${s1} ${s2} ${s3}`;
  },
  hospitality: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was built for ${aud ? aud : 'those'} who believe ${mk.toLowerCase()} should be${diff ? ' ' + diff + ' and' : ''} exceptional — not adequate, not efficient, but genuinely memorable.`;
    const s2 = `Every detail at ${b} is considered: the spaces, the service, the ${sk.toLowerCase()}, and the moments between — because the best experiences rarely come down to a single thing.`;
    const s3 = `We set the scene. You make the memory.`;
    return `${s1} ${s2} ${s3}`;
  },
  homeservices: (b, mk, sk, aud, diff) => {
    const s1 = `${b} was built on a simple and uncommon promise: ${diff ? diff + ' ' : ''}${mk.toLowerCase()} done right, on time, and priced fairly — every single time.`;
    const s2 = `Our team is fully licensed and insured, communicates clearly from first call to final walkthrough, and treats every ${aud ? aud + ' ' : ''}home with the respect it deserves.`;
    const s3 = `You should never have to chase a contractor. At ${b}, you don't.`;
    return `${s1} ${s2} ${s3}`;
  },
  automotive: (b, mk, sk, aud, diff) => {
    const s1 = `${b} keeps ${aud ? aud : 'drivers'} moving with honest, ${diff ? diff + ', ' : ''}expert ${mk.toLowerCase()} — the kind of service that explains what was wrong, fixes it right, and charges fairly.`;
    const s2 = `Our certified technicians have seen everything, and they approach every vehicle — whether it's a daily driver or something special — with the same care and precision.`;
    const s3 = `No upselling. No surprises. Just reliable ${mk.toLowerCase()} from a team you can actually trust.`;
    return `${s1} ${s2} ${s3}`;
  },
};

// ── Feature description generators ──────────────────────────────────────────

export const FEATURE_SUFFIXES_BY_NICHE: Record<string, string[]> = {
  food:         ['Experience','Craft','Tradition','Flavour','Quality','Freshness','Recipe','Story'],
  sports:       ['Performance','Training','Edge','Power','Speed','Technique','Results','Program'],
  technology:   ['Engine','Platform','Suite','Intelligence','API','Dashboard','Flow','System'],
  photography:  ['Portfolio','Gallery','Shoot','Vision','Style','Process','Collection','Work'],
  fashion:      ['Collection','Look','Style','Season','Edit','Drop','Range','Line'],
  ecommerce:    ['Collection','Selection','Range','Shop','Bestsellers','Edit','Picks','Store'],
  portfolio:    ['Showcase','Project','Vision','Process','Series','Collection','Work','Study'],
  agency:       ['Strategy','Campaign','Brand','Studio','Approach','System','Method','Craft'],
  wellness:     ['Experience','Session','Journey','Ritual','Practice','Treatment','Care','Program'],
  professional: ['Service','Consultation','Advisory','Strategy','Solution','Expertise','Practice','Process'],
  hospitality:  ['Experience','Stay','Escape','Journey','Retreat','Event','Gathering','Moment'],
  homeservices: ['Service','Repair','Install','Maintenance','Solution','Care','Job','Work'],
  automotive:   ['Service','Repair','Care','Maintenance','Tune-Up','Detail','Diagnostic','Job'],
  general:      ['Experience','Service','Approach','Method','Solution','Practice','Process','Craft'],
};

export const FEATURE_DESC_BY_NICHE: Record<string, (kw: string) => string> = {
  food:         (kw) => `Authentic ${kw} crafted with passion and served with pride.`,
  sports:       (kw) => `Elevate your ${kw} performance with expert-level training and coaching.`,
  technology:   (kw) => `Powerful ${kw} capabilities built for modern engineering teams.`,
  photography:  (kw) => `Capturing the essence of ${kw} through a refined visual perspective.`,
  fashion:      (kw) => `Curated ${kw} pieces that define your individual style.`,
  ecommerce:    (kw) => `A seamless ${kw} shopping experience, from first browse to checkout.`,
  portfolio:    (kw) => `${kw.charAt(0).toUpperCase() + kw.slice(1)} work crafted with attention to every detail.`,
  agency:       (kw) => `Strategic ${kw} solutions that move your brand forward.`,
  wellness:     (kw) => `Expert ${kw} tailored to your goals and delivered with genuine care.`,
  professional: (kw) => `Dependable ${kw} that delivers measurable value for every client.`,
  hospitality:  (kw) => `Exceptional ${kw} crafted to create moments worth remembering.`,
  homeservices: (kw) => `Reliable ${kw} done right the first time — licensed, insured, and guaranteed.`,
  automotive:   (kw) => `Expert ${kw} that keeps your vehicle running safely and reliably.`,
  general:      (kw) => `Exceptional ${kw} tailored to your specific needs.`,
};

// ── Generic trust signals ────────────────────────────────────────────────────

export const GENERIC_TRUST_SIGNALS: Record<string, Array<{ number: string; label: string }>> = {
  technology:  [{number:'Fast',label:'Delivery'},{number:'Secure',label:'Platform'},{number:'Scalable',label:'Architecture'},{number:'24/7',label:'Monitoring'}],
  ecommerce:   [{number:'Fast',label:'Shipping'},{number:'Secure',label:'Checkout'},{number:'Easy',label:'Returns'},{number:'Quality',label:'Guaranteed'}],
  portfolio:   [{number:'Unique',label:'Approach'},{number:'End-to-End',label:'Service'},{number:'Fast',label:'Turnaround'},{number:'Quality',label:'Every Time'}],
  photography: [{number:'Studio',label:'Quality'},{number:'On-Site',label:'Available'},{number:'Fast',label:'Turnaround'},{number:'Custom',label:'Packages'}],
  fashion:     [{number:'Curated',label:'Selection'},{number:'Quality',label:'Materials'},{number:'Free',label:'Returns'},{number:'Worldwide',label:'Shipping'}],
  sports:      [{number:'All',label:'Skill Levels'},{number:'Expert',label:'Coaching'},{number:'Results',label:'Focused'},{number:'Flexible',label:'Scheduling'}],
  food:        [{number:'Fresh',label:'Daily'},{number:'Made',label:'In-House'},{number:'Custom',label:'Orders Welcome'},{number:'Open',label:'For You'}],
  agency:      [{number:'Strategy',label:'First'},{number:'Full-Service',label:'Team'},{number:'Results',label:'Driven'},{number:'Transparent',label:'Process'}],
  homeservices:[{number:'Licensed',label:'& Insured'},{number:'Same-Day',label:'Available'},{number:'Fair',label:'Pricing'},{number:'Satisfaction',label:'Guaranteed'}],
  automotive:  [{number:'ASE',label:'Certified'},{number:'Honest',label:'Pricing'},{number:'Fast',label:'Turnaround'},{number:'Quality',label:'Parts'}],
  general:     [{number:'Quality',label:'Focused'},{number:'Client',label:'First'},{number:'Expert',label:'Team'},{number:'Results',label:'Guaranteed'}],
};

// ── Gallery labels ────────────────────────────────────────────────────────────

export const GALLERY_LABEL_BY_NICHE: Record<string, string> = {
  portfolio: 'Portfolio', ecommerce: 'Shop', technology: 'Features',
  food: 'Menu', sports: 'Gallery', photography: 'Portfolio', fashion: 'Collection',
  agency: 'Work', homeservices: 'Our Work', automotive: 'Our Work', general: 'Gallery',
};

// ── Niche subject nouns ──────────────────────────────────────────────────────

export const NICHE_SUBJECT: Record<string, string> = {
  food: 'Flavour', restaurant: 'Cuisine', cafe: 'Coffee', coffee: 'Coffee',
  bar: 'Cocktails', bakery: 'Baking', pizza: 'Pizza', ramen: 'Ramen',
  sports: 'Performance', fitness: 'Fitness', basketball: 'Basketball', gym: 'Training',
  technology: 'Software', saas: 'Software', tech: 'Technology', ai: 'AI',
  photography: 'Photography', photo: 'Photography',
  fashion: 'Style', clothing: 'Fashion', apparel: 'Apparel',
  ecommerce: 'Products', shop: 'Shopping', store: 'Shopping',
  portfolio: 'Work', design: 'Design', creative: 'Creativity',
  agency: 'Strategy', marketing: 'Marketing', branding: 'Branding',
  wellness: 'Wellness', yoga: 'Yoga', spa: 'Wellness', meditation: 'Mindfulness',
  professional: 'Expertise', legal: 'Law', finance: 'Finance', consulting: 'Consulting',
  hospitality: 'Hospitality', hotel: 'Hospitality', travel: 'Travel',
  homeservices: 'Service', plumbing: 'Plumbing', cleaning: 'Cleaning',
  automotive: 'Automotive', car: 'Automotive',
  general: 'Excellence',
};

// ── Pricing plan generator (Phase 4C: niche-aware) ────────────────────────────
// Tiers are keyed by the canonical normalizeIndustry() value with a 'general'
// fallback for unknown niches. Restaurants get menus, wellness gets memberships,
// agencies get engagements — instead of a universal Starter/Pro/Enterprise SaaS
// ladder. Authored/prompt-driven pricing still wins upstream; this only fills the
// explicit-but-unauthored case.
export const PRICING_BANK: Record<string, PricingPlan[]> = {
  food: [
    { name: 'Lunch Menu',     price: '$18',    period: '/person', desc: 'A curated midday selection.',        features: ['Seasonal starters', 'Choice of main', 'House beverage'], featured: false },
    { name: 'Dinner Menu',    price: '$42',    period: '/person', desc: 'Our full evening experience.',       features: ['Everything in Lunch', 'Multi-course tasting', 'Wine pairing', 'Dessert selection'], featured: true },
    { name: 'Private Dining', price: 'Custom', period: 'by request', desc: 'Tailored events and group bookings.', features: ['Dedicated space', 'Bespoke menu', 'Personal service', 'Event coordination'], featured: false },
  ],
  wellness: [
    { name: 'Single Session',     price: '$35',  period: '/session', desc: 'Drop in whenever it suits you.',     features: ['One class or session', 'Mat & equipment', 'Newcomer guidance'], featured: false },
    { name: 'Monthly Membership', price: '$99',  period: '/mo',      desc: 'Unlimited access, month to month.',  features: ['Unlimited sessions', 'Priority booking', 'Member events'], featured: true },
    { name: 'Annual Membership',  price: '$899', period: '/yr',      desc: 'Best value for the committed.',      features: ['Everything monthly', 'Two months free', 'Guest passes', 'Wellness consultation'], featured: false },
  ],
  sports: [
    { name: 'Day Pass',           price: '$20',  period: '/day', desc: 'Full access for the day.', features: ['Gym floor access', 'One group class', 'Locker & towel'], featured: false },
    { name: 'Monthly Membership', price: '$59',  period: '/mo',  desc: 'Train on your schedule.',  features: ['Unlimited access', 'All group classes', 'Fitness assessment'], featured: true },
    { name: 'Annual Membership',  price: '$599', period: '/yr',  desc: 'Commit and save.',         features: ['Everything monthly', 'Two months free', 'Personal training intro', 'Guest passes'], featured: false },
  ],
  agency: [
    { name: 'Starter',    price: '$1,500', period: '/project', desc: 'For focused, single-goal work.',          features: ['Discovery session', 'Core deliverables', 'Two revision rounds'], featured: false },
    { name: 'Growth',     price: '$4,500', period: '/mo',      desc: 'Ongoing partnership for scaling brands.', features: ['Everything in Starter', 'Dedicated strategist', 'Monthly reporting', 'Priority turnaround'], featured: true },
    { name: 'Enterprise', price: 'Custom', period: 'let’s talk', desc: 'Full-service for established teams.',   features: ['Everything in Growth', 'Multi-channel campaigns', 'Dedicated team', 'Quarterly strategy'], featured: false },
  ],
  technology: [
    { name: 'Starter',      price: 'Free',   period: 'forever',   desc: 'Perfect for getting started.',  features: ['Core features', 'Up to 3 projects', 'Community support'], featured: false },
    { name: 'Professional', price: '$79',    period: '/mo',       desc: 'For teams ready to scale.',      features: ['Everything in Starter', 'Priority support', 'Unlimited projects', 'Advanced analytics'], featured: true },
    { name: 'Enterprise',   price: 'Custom', period: 'contact us', desc: 'Tailored to your organisation.', features: ['Everything in Professional', 'Dedicated manager', 'Custom integrations', 'SLA & onboarding'], featured: false },
  ],
  ecommerce: [
    { name: 'Standard', price: 'Free', period: '',    desc: 'Shop our full collection.',    features: ['Browse all products', 'Standard shipping', 'Easy returns'], featured: false },
    { name: 'Member',   price: '$9',   period: '/mo', desc: 'Perks for regular shoppers.',  features: ['Free shipping', 'Early access', 'Member pricing'], featured: true },
    { name: 'VIP',      price: '$25',  period: '/mo', desc: 'The full insider experience.', features: ['Everything in Member', 'Exclusive drops', 'Personal styling', 'Priority support'], featured: false },
  ],
  photography: [
    { name: 'Portrait Session', price: '$250',   period: '/session', desc: 'A focused personal shoot.',   features: ['One-hour session', 'One location', 'Edited gallery'], featured: false },
    { name: 'Event Coverage',   price: '$1,200', period: '/event',   desc: 'Full coverage for your day.', features: ['Up to 6 hours', 'Two photographers', 'Online gallery', 'Print release'], featured: true },
    { name: 'Custom Package',   price: 'Custom', period: 'by request', desc: 'Tailored to your project.', features: ['Bespoke planning', 'Multiple sessions', 'Album design', 'Commercial license'], featured: false },
  ],
  fashion: [
    { name: 'Studio Visit',     price: 'Free',   period: '',         desc: 'Explore the latest collection.', features: ['Browse collections', 'Style guidance', 'Lookbook access'], featured: false },
    { name: 'Styling Session',  price: '$150',   period: '/session', desc: 'Personalized styling support.',  features: ['One-on-one session', 'Curated edit', 'Fit consultation'], featured: true },
    { name: 'Wardrobe Package', price: 'Custom', period: 'by request', desc: 'A full seasonal wardrobe.',    features: ['Everything in Styling', 'Seasonal refresh', 'Priority access', 'Personal shopper'], featured: false },
  ],
  portfolio: [
    { name: 'Single Project', price: '$800',   period: '/project', desc: 'One focused engagement.',       features: ['Discovery call', 'One deliverable', 'Two revisions'], featured: false },
    { name: 'Full Project',   price: '$2,500', period: '/project', desc: 'End-to-end creative work.',     features: ['Everything in Single', 'Concept development', 'Multiple deliverables', 'Source files'], featured: true },
    { name: 'Retainer',       price: 'Custom', period: 'monthly',  desc: 'Ongoing creative partnership.', features: ['Everything in Full', 'Monthly allocation', 'Priority scheduling', 'Strategy sessions'], featured: false },
  ],
  professional: [
    { name: 'Consultation',        price: '$200',   period: '/hour', desc: 'Expert advice when you need it.', features: ['Initial assessment', 'Written summary', 'Follow-up call'], featured: false },
    { name: 'Standard Engagement', price: '$1,500', period: '/mo',   desc: 'Ongoing professional support.',   features: ['Everything in Consultation', 'Dedicated advisor', 'Priority response', 'Monthly review'], featured: true },
    { name: 'Full Retainer',       price: 'Custom', period: 'tailored', desc: 'Comprehensive representation.', features: ['Everything in Standard', 'Unlimited consultations', 'Dedicated team', 'Strategic planning'], featured: false },
  ],
  hospitality: [
    { name: 'Standard Room',   price: '$120',   period: '/night', desc: 'Comfort and convenience.',       features: ['Queen room', 'Daily housekeeping', 'Wi-Fi & breakfast'], featured: false },
    { name: 'Deluxe Suite',    price: '$240',   period: '/night', desc: 'Elevated space and amenities.',   features: ['Everything in Standard', 'Suite upgrade', 'Lounge access', 'Late checkout'], featured: true },
    { name: 'Private Retreat', price: 'Custom', period: 'by request', desc: 'The full exclusive experience.', features: ['Everything in Deluxe', 'Private villa', 'Personal concierge', 'Curated experiences'], featured: false },
  ],
  homeservices: [
    { name: 'Standard Service', price: '$89',    period: '/visit', desc: 'A single scheduled visit.', features: ['On-site assessment', 'Standard repair', 'Workmanship guarantee'], featured: false },
    { name: 'Service Plan',     price: '$29',    period: '/mo',    desc: 'Routine care, year-round.', features: ['Priority scheduling', 'Seasonal tune-ups', 'Discounted repairs'], featured: true },
    { name: 'Full Coverage',    price: 'Custom', period: 'annual', desc: 'Complete peace of mind.',   features: ['Everything in Plan', 'Emergency callouts', 'Parts & labor', 'Annual inspection'], featured: false },
  ],
  automotive: [
    { name: 'Standard Service', price: '$99',    period: '/visit', desc: 'Essential maintenance.', features: ['Multi-point inspection', 'Oil & filter', 'Fluid top-up'], featured: false },
    { name: 'Service Plan',     price: '$39',    period: '/mo',    desc: 'Keep it running right.', features: ['Priority booking', 'Scheduled servicing', 'Discounted parts'], featured: true },
    { name: 'Full Coverage',    price: 'Custom', period: 'annual', desc: 'Total vehicle care.',    features: ['Everything in Plan', 'Major repairs', 'Loaner vehicle', 'Annual safety check'], featured: false },
  ],
  general: [
    { name: 'Basic',    price: '$29',    period: '/mo', desc: 'Everything you need to begin.', features: ['Core features', 'Email support', 'Up to 3 projects'], featured: false },
    { name: 'Standard', price: '$79',    period: '/mo', desc: 'For growing needs.',            features: ['Everything in Basic', 'Priority support', 'Unlimited projects', 'Advanced features'], featured: true },
    { name: 'Premium',  price: 'Custom', period: 'tailored', desc: 'Tailored to you.',          features: ['Everything in Standard', 'Dedicated manager', 'Custom solutions', 'Onboarding & SLA'], featured: false },
  ],
};

export function buildNichePricingPlans(normIndustry: string): PricingPlan[] {
  const tiers = PRICING_BANK[normIndustry] || PRICING_BANK.general;
  // Deep-clone so the shared bank arrays/feature lists are never mutated downstream.
  return tiers.map(t => ({ ...t, features: [...t.features] }));
}
