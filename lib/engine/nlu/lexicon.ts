// ---------------------------------------------------------------------------
// NLU LEXICON
//
// The knowledge base for the in-house understanding engine. Everything here is
// plain data — no network, no external model. The NLU engine reads a prompt and
// uses these lexicons to recognise the niche, the colours the user named, the
// products/services they listed, and to synthesise on-brand copy. All of it runs
// in the same process as the website generator.
// ---------------------------------------------------------------------------

import type { VisualMood, DesignStyle, WebsitePersonality, BusinessTone } from '../prompt-engine/types';

// ── Colour vocabulary → hex ────────────────────────────────────────────────
// Named colours the user might type, mapped to a representative hex. Used to
// honour explicit colour requests ("a warm brown and cream palette").
export const COLOR_HEX: Record<string, string> = {
  red: '#dc2626', crimson: '#b91c3c', scarlet: '#e02424', ruby: '#9b1c31',
  orange: '#ea580c', amber: '#d97706', tangerine: '#f97316',
  yellow: '#eab308', gold: '#caa017', golden: '#d4af37', mustard: '#c9a227',
  green: '#16a34a', emerald: '#059669', lime: '#65a30d', mint: '#34d399', forest: '#166534', sage: '#84a98c', olive: '#6b7233',
  teal: '#0d9488', cyan: '#0891b2', turquoise: '#14b8a6', aqua: '#06b6d4',
  blue: '#2563eb', navy: '#1e3a8a', azure: '#3b82f6', sapphire: '#1d4ed8', sky: '#0ea5e9', cobalt: '#1e40af',
  indigo: '#4f46e5', purple: '#7c3aed', violet: '#8b5cf6', lavender: '#a78bfa', plum: '#7e22ce', magenta: '#c026d3',
  pink: '#ec4899', rose: '#f43f5e', coral: '#fb7185', salmon: '#fb7185', peach: '#fca5a5', blush: '#fbcfe8',
  brown: '#92400e', chocolate: '#5b3a29', coffee: '#3d2817', mocha: '#6f4e37', espresso: '#2a1810', caramel: '#a9744f', tan: '#b08968', beige: '#d6c3a5', cream: '#f5ecd9', ivory: '#fffbf0',
  black: '#0a0a0a', charcoal: '#1f2937', slate: '#334155', gray: '#6b7280', grey: '#6b7280', silver: '#cbd5e1', white: '#fafafa',
  maroon: '#7f1d1d', burgundy: '#6b1430', wine: '#722f37',
};

// ── Niche detection ─────────────────────────────────────────────────────────
// Each niche carries the trigger words that imply it, ordered specific→broad.
// A later, more specific match (e.g. "ramen") outranks a broad one ("food").
export interface NicheDef {
  slug: string;
  broad: string;             // the umbrella industry the renderer understands
  triggers: string[];        // words/phrases that signal this niche
  specific?: boolean;        // specific sub-niches beat umbrella terms
}

export const NICHES: NicheDef[] = [
  // Food & drink
  { slug: 'coffee', broad: 'coffee', specific: true, triggers: ['coffee shop', 'coffee', 'espresso', 'cafe', 'café', 'barista', 'latte', 'cappuccino', 'cold brew', 'roastery', 'coffeehouse'] },
  { slug: 'ramen', broad: 'food', specific: true, triggers: ['ramen', 'noodle bar', 'izakaya', 'tonkotsu'] },
  { slug: 'sushi', broad: 'food', specific: true, triggers: ['sushi', 'sashimi', 'omakase', 'nigiri'] },
  { slug: 'bakery', broad: 'food', specific: true, triggers: ['bakery', 'patisserie', 'pastry shop', 'bread', 'croissant'] },
  { slug: 'pizza', broad: 'food', specific: true, triggers: ['pizza', 'pizzeria', 'trattoria'] },
  { slug: 'bar', broad: 'food', specific: true, triggers: ['cocktail bar', 'wine bar', 'brewery', 'taproom', 'pub'] },
  { slug: 'restaurant', broad: 'food', triggers: ['restaurant', 'bistro', 'diner', 'eatery', 'dining', 'food', 'steakhouse', 'seafood', 'grill', 'bbq', 'barbecue', 'food truck', 'catering', 'tapas', 'deli', 'vegan restaurant', 'farm to table'] },
  { slug: 'dessert', broad: 'food', specific: true, triggers: ['ice cream', 'gelato', 'dessert', 'creamery', 'chocolatier', 'donut', 'cupcake', 'candy shop'] },
  { slug: 'juicebar', broad: 'food', specific: true, triggers: ['juice bar', 'smoothie', 'bubble tea', 'boba', 'tea house', 'matcha'] },
  // Health / wellness
  { slug: 'yoga', broad: 'wellness', specific: true, triggers: ['yoga', 'pilates', 'meditation studio'] },
  { slug: 'spa', broad: 'wellness', specific: true, triggers: ['spa', 'massage', 'wellness center', 'wellness centre'] },
  { slug: 'salon', broad: 'beauty', specific: true, triggers: ['salon', 'hair salon', 'nail salon', 'beauty bar', 'nails', 'lash', 'lashes', 'brow', 'aesthetics', 'medspa', 'med spa'] },
  { slug: 'barber', broad: 'beauty', specific: true, triggers: ['barber', 'barbershop', 'grooming'] },
  { slug: 'tattoo', broad: 'beauty', specific: true, triggers: ['tattoo', 'tattoo studio', 'tattoo parlor', 'tattoo parlour', 'piercing'] },
  { slug: 'dental', broad: 'medical', specific: true, triggers: ['dental', 'dentist', 'orthodontist'] },
  { slug: 'clinic', broad: 'medical', triggers: ['clinic', 'medical', 'healthcare', 'therapy', 'physician'] },
  { slug: 'wellness', broad: 'wellness', triggers: ['wellness', 'health'] },
  // Fitness
  { slug: 'crossfit', broad: 'fitness', specific: true, triggers: ['crossfit', 'box gym'] },
  { slug: 'gym', broad: 'fitness', triggers: ['gym', 'fitness', 'workout', 'training', 'bodybuilding', 'hiit', 'boxing'] },
  // Creative
  { slug: 'photography', broad: 'photography', specific: true, triggers: ['photography', 'photographer', 'photo studio'] },
  { slug: 'videography', broad: 'photography', specific: true, triggers: ['videography', 'filmmaker', 'film studio', 'cinematography'] },
  { slug: 'design', broad: 'design', triggers: ['design studio', 'graphic design', 'branding studio', 'creative studio'] },
  { slug: 'architecture', broad: 'design', specific: true, triggers: ['architecture', 'architect', 'interior design'] },
  // Commerce
  { slug: 'fashion', broad: 'fashion', specific: true, triggers: ['fashion', 'streetwear', 'apparel', 'clothing', 'boutique', 'menswear', 'womenswear', 'shoes', 'sneakers', 'footwear', 'lingerie', 'swimwear', 'activewear', 'eyewear', 'handbags'] },
  { slug: 'jewelry', broad: 'fashion', specific: true, triggers: ['jewelry', 'jewellery', 'jeweler', 'jeweller', 'fine jewelry', 'watches', 'watchmaker', 'accessories'] },
  { slug: 'beauty', broad: 'beauty', triggers: ['beauty', 'cosmetics', 'skincare', 'makeup', 'perfume', 'fragrance'] },
  { slug: 'craft', broad: 'ecommerce', specific: true, triggers: ['candle', 'candles', 'handmade', 'artisanal', 'artisan', 'handcrafted', 'pottery', 'ceramics', 'soap', 'soap maker', 'leather goods', 'woodworking', 'crafts'] },
  { slug: 'florist', broad: 'ecommerce', specific: true, triggers: ['florist', 'flower shop', 'florals', 'floral studio', 'bouquet', 'plant shop', 'plant nursery', 'botanical'] },
  { slug: 'home', broad: 'ecommerce', specific: true, triggers: ['home decor', 'homeware', 'furniture', 'interior goods', 'home goods', 'stationery', 'kitchenware'] },
  { slug: 'pet', broad: 'ecommerce', specific: true, triggers: ['pet shop', 'pet store', 'pet grooming', 'dog grooming', 'pet care', 'pet supplies'] },
  { slug: 'ecommerce', broad: 'ecommerce', triggers: ['ecommerce', 'e-commerce', 'online store', 'shop', 'retail', 'store', 'marketplace', 'd2c', 'direct to consumer', 'subscription box', 'dropshipping'] },
  // Professional
  { slug: 'law', broad: 'law', specific: true, triggers: ['law firm', 'law', 'legal', 'attorney', 'lawyer'] },
  { slug: 'finance', broad: 'finance', triggers: ['finance', 'fintech', 'accounting', 'investment', 'wealth', 'insurance'] },
  { slug: 'consulting', broad: 'consulting', triggers: ['consulting', 'consultancy', 'advisory'] },
  { slug: 'agency', broad: 'agency', triggers: ['agency', 'marketing agency', 'advertising', 'digital agency'] },
  { slug: 'realestate', broad: 'realestate', specific: true, triggers: ['real estate', 'realty', 'property', 'realtor'] },
  // Tech
  { slug: 'saas', broad: 'saas', specific: true, triggers: ['saas', 'software', 'platform', 'app', 'dashboard', 'api', 'developer tool', 'analytics', 'cloud', 'b2b software', 'productivity', 'automation', 'crm', 'no-code'] },
  { slug: 'ai', broad: 'saas', specific: true, triggers: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'ai startup', 'data platform', 'ai assistant', 'generative ai'] },
  { slug: 'startup', broad: 'saas', triggers: ['startup', 'tech company', 'technology'] },
  { slug: 'crypto', broad: 'saas', specific: true, triggers: ['crypto', 'blockchain', 'web3', 'nft', 'defi'] },
  { slug: 'gaming', broad: 'gaming', specific: true, triggers: ['gaming', 'game studio', 'esports'] },
  // Hospitality / travel
  { slug: 'hotel', broad: 'travel', specific: true, triggers: ['hotel', 'resort', 'lodge', 'boutique hotel', 'overwater', 'beachfront resort', 'luxury resort'] },
  { slug: 'travel', broad: 'travel', triggers: ['travel', 'tour', 'tourism', 'vacation'] },
  // Music / events
  { slug: 'music', broad: 'music', triggers: ['music', 'band', 'dj', 'record label', 'musician', 'producer', 'singer', 'rapper', 'nightclub', 'concert venue', 'festival'] },
  { slug: 'event', broad: 'agency', specific: true, triggers: ['event', 'wedding', 'event planning', 'conference', 'expo', 'party planning'] },
  // Mission
  { slug: 'nonprofit', broad: 'nonprofit', triggers: ['nonprofit', 'non-profit', 'charity', 'foundation', 'ngo'] },
  { slug: 'education', broad: 'education', triggers: ['education', 'school', 'academy', 'course', 'tutoring', 'learning'] },
  { slug: 'portfolio', broad: 'portfolio', triggers: ['portfolio', 'personal site', 'resume site'] },
];

// ── Niche → design defaults (mood/style/personality/tone) ───────────────────
export interface NicheCopyProfile {
  mood?: VisualMood;
  designStyle?: DesignStyle;
  personality?: WebsitePersonality;
  tone?: BusinessTone;
  // Default product/service names used when the user listed nothing.
  products: Array<{ name: string; desc: string; price?: string }>;
  faqs: Array<{ q: string; a: string }>;
  // Niche-appropriate palette defaults.
  palette?: { primary: string; accent: string; background: string };
  // Niche-appropriate CTA labels for the hero and closing band.
  cta?: string;
  ctaSecondary?: string;
}

export const NICHE_PROFILES: Record<string, NicheCopyProfile> = {
  coffee: {
    mood: 'warm', designStyle: 'organic', personality: 'friendly', tone: 'casual',    products: [
      { name: 'Espresso', desc: 'A bold, full-bodied shot pulled from freshly ground single-origin beans.', price: '$3.50' },
      { name: 'Cappuccino', desc: 'Rich espresso crowned with velvety steamed milk and a layer of foam.', price: '$4.50' },
      { name: 'Iced Coffee', desc: 'Smooth cold-brewed coffee over ice for a refreshing lift.', price: '$4.00' },
      { name: 'Frappuccino', desc: 'A blended iced treat with espresso, milk, and a swirl of cream.', price: '$5.50' },
      { name: 'Pastries', desc: 'Freshly baked croissants, muffins, and cookies made every morning.', price: '$3.00' },
    ],
    faqs: [
      { q: 'Do you serve dairy-free milk?', a: 'Yes — we offer oat, almond, and soy milk on every drink at no extra charge.' },
      { q: 'Are your beans ethically sourced?', a: 'Always. We work directly with farms and roast in small batches for freshness.' },
      { q: 'Do you have seating and Wi-Fi?', a: 'We do — comfortable seating, fast free Wi-Fi, and plenty of outlets for working.' },
    ],
    palette: { primary: '#6f4e37', accent: '#caa017', background: '#1a0f08' },
    cta: 'View Our Menu', ctaSecondary: 'Find Us',
  },
  restaurant: {
    mood: 'warm', designStyle: 'organic', personality: 'friendly', tone: 'casual',    products: [
      { name: 'Signature Dish', desc: 'Our chef’s flagship plate, built around the season’s best ingredients.', price: '$24' },
      { name: 'Fresh Starters', desc: 'Bright, shareable small plates to begin the meal.', price: '$12' },
      { name: 'House Mains', desc: 'Hearty, satisfying mains made from scratch daily.', price: '$22' },
      { name: 'Desserts', desc: 'House-made sweets to finish on a high note.', price: '$10' },
    ],
    faqs: [
      { q: 'Do you take reservations?', a: 'Yes, you can book a table online or by phone — walk-ins are welcome too.' },
      { q: 'Do you cater to dietary needs?', a: 'We offer vegetarian, vegan, and gluten-free options on every menu.' },
      { q: 'Is there parking nearby?', a: 'There is street parking and a public lot a short walk from the entrance.' },
    ],
    palette: { primary: '#9a3412', accent: '#d4af37', background: '#1c1410' },
    cta: 'View Menu', ctaSecondary: 'Book a Table',
  },
  fitness: {
    mood: 'vibrant', designStyle: 'industrial', personality: 'energetic', tone: 'disruptive',    products: [
      { name: 'Group Classes', desc: 'High-energy coached sessions for every fitness level.', price: '$20/class' },
      { name: 'Personal Training', desc: 'One-on-one programming tailored to your goals.', price: '$70/session' },
      { name: 'Open Gym', desc: 'Full access to equipment whenever you want to train.', price: '$99/mo' },
      { name: 'Nutrition Coaching', desc: 'Guidance to fuel your training and recovery.', price: '$120/mo' },
    ],
    faqs: [
      { q: 'Do I need experience to start?', a: 'Not at all — our coaches scale every workout to your level on day one.' },
      { q: 'Can I try a class first?', a: 'Yes, your first session is free so you can see if we’re the right fit.' },
      { q: 'What are your hours?', a: 'We’re open early until late, seven days a week.' },
    ],
    palette: { primary: '#dc2626', accent: '#eab308', background: '#0c0c0d' },
    cta: 'Start Training', ctaSecondary: 'View Programs',
  },
  saas: {
    mood: 'light', designStyle: 'startup', personality: 'innovative', tone: 'technical',    products: [
      { name: 'Starter', desc: 'Everything you need to get going, free forever.', price: '$0' },
      { name: 'Pro', desc: 'Advanced features and integrations for growing teams.', price: '$29/mo' },
      { name: 'Business', desc: 'Scale with priority support and admin controls.', price: '$99/mo' },
      { name: 'Enterprise', desc: 'Custom limits, SSO, and a dedicated success manager.', price: 'Custom' },
    ],
    faqs: [
      { q: 'Is there a free plan?', a: 'Yes — our Starter plan is free forever, with no credit card required.' },
      { q: 'Can I integrate with my existing tools?', a: 'We connect with the tools you already use through native integrations and our API.' },
      { q: 'How secure is my data?', a: 'Your data is encrypted in transit and at rest, with SOC 2-aligned practices.' },
    ],
    palette: { primary: '#4f46e5', accent: '#06b6d4', background: '#0b1020' },
    cta: 'Start Free', ctaSecondary: 'Book a Demo',
  },
  fashion: {
    mood: 'contrast', designStyle: 'editorial', personality: 'bold', tone: 'casual',
    products: [
      { name: 'Signature Tee', desc: 'Heavyweight cotton with a perfect relaxed fit.', price: '$45' },
      { name: 'Everyday Hoodie', desc: 'Soft, structured, and built for daily wear.', price: '$95' },
      { name: 'Tailored Trousers', desc: 'A clean, modern cut that works day to night.', price: '$120' },
      { name: 'Statement Jacket', desc: 'The piece that pulls the whole look together.', price: '$220' },
    ],
    faqs: [
      { q: 'What is your return policy?', a: 'Free returns within 30 days on unworn items with tags attached.' },
      { q: 'How do I find my size?', a: 'Each product page has a detailed size guide and fit notes.' },
      { q: 'Do you ship internationally?', a: 'Yes, we ship worldwide with tracked delivery.' },
    ],
    palette: { primary: '#0a0a0a', accent: '#d4af37', background: '#0f0f0f' },
    cta: 'Shop the Collection', ctaSecondary: 'New Arrivals',
  },
  photography: {
    mood: 'dark', designStyle: 'minimal', personality: 'sophisticated', tone: 'professional',
    products: [
      { name: 'Portrait Session', desc: 'A relaxed studio or location shoot with edited gallery.', price: 'from $350' },
      { name: 'Wedding Coverage', desc: 'Full-day storytelling from prep to last dance.', price: 'from $2,400' },
      { name: 'Editorial & Brand', desc: 'Creative direction and imagery for brands and press.', price: 'on request' },
      { name: 'Prints', desc: 'Archival fine-art prints of your favourite frames.', price: 'from $60' },
    ],
    faqs: [
      { q: 'How long until I get my photos?', a: 'Edited galleries are delivered within two to three weeks.' },
      { q: 'Do you travel for shoots?', a: 'Yes — travel is available worldwide, with details quoted per booking.' },
      { q: 'Can we request specific shots?', a: 'Absolutely. We plan a shot list together before every session.' },
    ],
    palette: { primary: '#fafafa', accent: '#a3a3a3', background: '#0a0a0a' },
    cta: 'View Portfolio', ctaSecondary: 'Book a Session',
  },
  wellness: {
    mood: 'soft', designStyle: 'minimal', personality: 'calm', tone: 'empathetic',
    products: [
      { name: 'Signature Treatment', desc: 'Our most-loved session, tailored to how you feel today.', price: '$90' },
      { name: 'Wellness Membership', desc: 'Regular sessions and member-only perks.', price: '$120/mo' },
      { name: 'Group Classes', desc: 'Guided sessions in a supportive, welcoming setting.', price: '$25' },
      { name: 'Consultations', desc: 'A personalised plan built around your goals.', price: '$60' },
    ],
    faqs: [
      { q: 'Do I need to book in advance?', a: 'Booking ahead is recommended, though we welcome walk-ins when space allows.' },
      { q: 'Is it suitable for beginners?', a: 'Completely — every session is guided and tailored to your comfort.' },
      { q: 'What should I bring?', a: 'Just yourself; we provide everything you need on arrival.' },
    ],
    palette: { primary: '#84a98c', accent: '#cad2c5', background: '#f7f5f0' },
    cta: 'Book a Session', ctaSecondary: 'View Treatments',
  },
  law: {
    mood: 'light', designStyle: 'corporate', personality: 'authoritative', tone: 'authoritative',
    products: [
      { name: 'Consultations', desc: 'A confidential review of your situation and options.', price: 'Free' },
      { name: 'Business Law', desc: 'Formation, contracts, and ongoing counsel for companies.' },
      { name: 'Litigation', desc: 'Skilled representation when disputes reach the courtroom.' },
      { name: 'Advisory', desc: 'Proactive guidance to keep you protected.' },
    ],
    faqs: [
      { q: 'Do you offer a free consultation?', a: 'Yes, your first consultation is free and completely confidential.' },
      { q: 'How are fees structured?', a: 'We discuss fees transparently up front, with no surprises.' },
      { q: 'How quickly can we meet?', a: 'We can typically arrange an initial meeting within a few days.' },
    ],
    palette: { primary: '#1e3a8a', accent: '#b08968', background: '#f8fafc' },
    cta: 'Request a Consultation', ctaSecondary: 'Our Practice Areas',
  },
  agency: {
    mood: 'contrast', designStyle: 'editorial', personality: 'bold', tone: 'disruptive',
    products: [
      { name: 'Brand Strategy', desc: 'Positioning, voice, and identity that set you apart.' },
      { name: 'Web & Digital', desc: 'Sites and experiences built to convert.' },
      { name: 'Campaigns', desc: 'Integrated creative that earns attention.' },
      { name: 'Content', desc: 'Story-driven content across every channel.' },
    ],
    faqs: [
      { q: 'How do projects start?', a: 'Every engagement begins with a discovery session to align on goals.' },
      { q: 'What is your typical timeline?', a: 'Most projects run six to twelve weeks depending on scope.' },
      { q: 'Do you work with startups?', a: 'Yes — we partner with brands at every stage, from launch to scale.' },
    ],
    palette: { primary: '#7c3aed', accent: '#06b6d4', background: '#0b0b14' },
    cta: 'Start a Project', ctaSecondary: 'See Our Work',
  },
  general: {
    mood: 'light', designStyle: 'minimal', personality: 'trustworthy', tone: 'professional',
    products: [
      { name: 'Our Offering', desc: 'Thoughtfully designed and built around your needs.' },
      { name: 'How It Works', desc: 'A simple process from first hello to finished result.' },
      { name: 'Why Us', desc: 'Quality, care, and a genuine commitment to your goals.' },
    ],
    faqs: [
      { q: 'How do I get started?', a: 'Reach out through the contact form and we’ll be in touch quickly.' },
      { q: 'Where are you located?', a: 'Get in touch and we’ll share all the details you need.' },
      { q: 'What makes you different?', a: 'We care about the details and we follow through — every time.' },
    ],
    palette: { primary: '#2563eb', accent: '#06b6d4', background: '#0b1020' },
    cta: 'Get Started', ctaSecondary: 'Learn More',
  },

  // ── Commerce / retail ─────────────────────────────────────────────────────
  ecommerce: {
    mood: 'light', designStyle: 'minimal', personality: 'bold', tone: 'casual',    products: [
      { name: 'Best Sellers', desc: 'The pieces our customers reach for again and again.', price: 'Shop now' },
      { name: 'New Arrivals', desc: 'Fresh additions, added every week.', price: 'Shop now' },
      { name: 'Bundles & Sets', desc: 'Curated combinations at a better price.', price: 'Save 15%' },
      { name: 'Gift Cards', desc: 'Let them choose — delivered instantly by email.', price: 'from $25' },
    ],
    faqs: [
      { q: 'How fast is shipping?', a: 'Orders ship within one business day, with free delivery on orders over a set threshold.' },
      { q: 'What is your return policy?', a: 'Returns are free within 30 days — no questions asked, just send it back.' },
      { q: 'Do you ship internationally?', a: 'Yes, we ship worldwide with tracked delivery and clear duties up front.' },
    ],
    palette: { primary: '#111827', accent: '#f59e0b', background: '#0d0d0f' },
    cta: 'Shop Now', ctaSecondary: 'New Arrivals',
  },
  florist: {
    mood: 'soft', designStyle: 'organic', personality: 'elegant', tone: 'casual',    products: [
      { name: 'Signature Bouquet', desc: 'A lush, seasonal arrangement in our florist’s choice of blooms.', price: '$55' },
      { name: 'Wedding Florals', desc: 'Bespoke bouquets, centrepieces, and venue styling.', price: 'on request' },
      { name: 'Subscription', desc: 'Fresh flowers delivered weekly, fortnightly, or monthly.', price: 'from $40/wk' },
      { name: 'Plants & Gifts', desc: 'Potted greenery and gifts to pair with your blooms.', price: 'from $25' },
    ],
    faqs: [
      { q: 'Do you deliver same day?', a: 'Yes — order before early afternoon and we’ll deliver locally the same day.' },
      { q: 'Can I request specific flowers?', a: 'Absolutely. Tell us your colours and favourites and we’ll build around them.' },
      { q: 'Do you do weddings and events?', a: 'We do — from intimate bouquets to full venue styling. Get in touch to plan.' },
    ],
    palette: { primary: '#be185d', accent: '#84a98c', background: '#fbf7f4' },
    cta: 'Shop Bouquets', ctaSecondary: 'Wedding Enquiries',
  },
  pet: {
    mood: 'warm', designStyle: 'playful', personality: 'friendly', tone: 'casual',    products: [
      { name: 'Grooming', desc: 'Bath, trim, and full grooming by gentle, certified groomers.', price: 'from $45' },
      { name: 'Premium Food', desc: 'Vet-approved nutrition for every breed and life stage.', price: 'from $20' },
      { name: 'Toys & Accessories', desc: 'Durable, safe favourites to keep them happy.', price: 'from $8' },
      { name: 'Daycare & Boarding', desc: 'A safe, supervised home away from home.', price: 'from $30/day' },
    ],
    faqs: [
      { q: 'Do I need to book grooming ahead?', a: 'Booking ahead is best, though we welcome walk-ins when we have space.' },
      { q: 'Is your food vet-approved?', a: 'Every brand we stock is chosen with veterinary guidance for quality nutrition.' },
      { q: 'Do you offer daycare?', a: 'Yes — supervised daycare and overnight boarding in a safe, caring environment.' },
    ],
    palette: { primary: '#0d9488', accent: '#f59e0b', background: '#fbf8f2' },
    cta: 'Book Grooming', ctaSecondary: 'Shop Supplies',
  },
  craft: {
    mood: 'warm', designStyle: 'organic', personality: 'elegant', tone: 'casual',    products: [
      { name: 'Signature Piece', desc: 'Our most-loved design, hand-finished in small batches.', price: '$38' },
      { name: 'Seasonal Collection', desc: 'Limited runs inspired by the time of year.', price: 'from $24' },
      { name: 'Gift Sets', desc: 'Beautifully boxed combinations, ready to give.', price: 'from $45' },
      { name: 'Custom Orders', desc: 'Made to your colours and specifications.', price: 'on request' },
    ],
    faqs: [
      { q: 'Is everything really handmade?', a: 'Yes — every item is made and finished by hand in our own studio.' },
      { q: 'Can I order a custom piece?', a: 'We love custom work. Share your idea and we’ll quote and craft it for you.' },
      { q: 'How long does shipping take?', a: 'In-stock items ship within two days; custom pieces take one to two weeks.' },
    ],
    palette: { primary: '#b45309', accent: '#6b7233', background: '#fbf7f0' },
    cta: 'Shop the Collection', ctaSecondary: 'Custom Orders',
  },
  jewelry: {
    mood: 'dark', designStyle: 'luxury', personality: 'sophisticated', tone: 'luxury',    products: [
      { name: 'Engagement Rings', desc: 'Bespoke settings built around the stone of your choice.', price: 'from $1,200' },
      { name: 'Necklaces', desc: 'Delicate to statement, in gold, silver, and platinum.', price: 'from $280' },
      { name: 'Earrings', desc: 'Studs, hoops, and drops for every occasion.', price: 'from $180' },
      { name: 'Bespoke Design', desc: 'A one-of-a-kind piece, designed with you from sketch to setting.', price: 'on request' },
    ],
    faqs: [
      { q: 'Are your materials ethically sourced?', a: 'Always — we work only with conflict-free stones and responsibly sourced metals.' },
      { q: 'Do you offer custom design?', a: 'Yes. We design bespoke pieces with you, from first sketch to final setting.' },
      { q: 'Is there a warranty?', a: 'Every piece comes with a lifetime craftsmanship warranty and free resizing.' },
    ],
    palette: { primary: '#caa017', accent: '#fafafa', background: '#0a0a0c' },
    cta: 'Explore Collections', ctaSecondary: 'Book an Appointment',
  },
  home: {
    mood: 'soft', designStyle: 'minimal', personality: 'sophisticated', tone: 'casual',    products: [
      { name: 'Living', desc: 'Cushions, throws, and accents that make a room.', price: 'from $35' },
      { name: 'Kitchen & Dining', desc: 'Tableware and tools built for everyday use.', price: 'from $20' },
      { name: 'Lighting', desc: 'Warm, sculptural lighting for every corner.', price: 'from $90' },
      { name: 'Decor', desc: 'Finishing touches that pull a space together.', price: 'from $25' },
    ],
    faqs: [
      { q: 'Do you offer interior styling?', a: 'Yes — our team can help you style a room or your whole home. Just ask.' },
      { q: 'What are your materials?', a: 'We favour natural, durable materials chosen to age gracefully over time.' },
      { q: 'Do you deliver large items?', a: 'We offer white-glove delivery on furniture and large pieces.' },
    ],
    palette: { primary: '#6b7233', accent: '#b08968', background: '#faf8f4' },
    cta: 'Shop the Range', ctaSecondary: 'Styling Services',
  },

  // ── Beauty / personal care ────────────────────────────────────────────────
  beauty: {
    mood: 'soft', designStyle: 'minimal', personality: 'elegant', tone: 'casual',    products: [
      { name: 'Signature Facial', desc: 'A tailored treatment for your skin’s exact needs.', price: 'from $90' },
      { name: 'Makeup & Glam', desc: 'Event-ready looks by professional artists.', price: 'from $70' },
      { name: 'Skincare Range', desc: 'Clean, effective products we use and trust.', price: 'from $28' },
      { name: 'Memberships', desc: 'Monthly treatments and member-only perks.', price: 'from $120/mo' },
    ],
    faqs: [
      { q: 'Do I need to book ahead?', a: 'Booking ahead is recommended; we’ll always try to fit in walk-ins.' },
      { q: 'Are your products clean?', a: 'Yes — everything we use and sell is chosen to be gentle and effective.' },
      { q: 'Can I get a consultation first?', a: 'Of course. We start every new client with a quick skin consultation.' },
    ],
    palette: { primary: '#db2777', accent: '#caa017', background: '#fbf5f7' },
    cta: 'Book an Appointment', ctaSecondary: 'View Services',
  },
  barber: {
    mood: 'dark', designStyle: 'industrial', personality: 'bold', tone: 'casual',    products: [
      { name: 'Signature Cut', desc: 'A precision haircut tailored to your style and head shape.', price: '$35' },
      { name: 'Beard Trim & Shape', desc: 'Clean lines and a sharp finish, every time.', price: '$20' },
      { name: 'Hot-Towel Shave', desc: 'The full traditional shave experience.', price: '$40' },
      { name: 'Cut & Shave Combo', desc: 'The complete grooming reset.', price: '$60' },
    ],
    faqs: [
      { q: 'Do you take walk-ins?', a: 'We do, though booking ahead guarantees your slot and your barber.' },
      { q: 'Can I request a specific barber?', a: 'Absolutely — request your barber when you book online or call ahead.' },
      { q: 'Do you do kids’ cuts?', a: 'Yes, we cut for all ages with a steady, friendly hand.' },
    ],
    palette: { primary: '#b45309', accent: '#fafafa', background: '#0c0c0d' },
    cta: 'Book a Cut', ctaSecondary: 'View Services',
  },
  tattoo: {
    mood: 'dark', designStyle: 'artistic', personality: 'bold', tone: 'casual',    products: [
      { name: 'Custom Design', desc: 'A one-of-a-kind piece designed around your idea.', price: 'from $150' },
      { name: 'Fine-Line Work', desc: 'Delicate, precise linework and lettering.', price: 'from $120' },
      { name: 'Cover-Ups', desc: 'Expert reworking of older or unwanted tattoos.', price: 'on consult' },
      { name: 'Flash & Walk-Ins', desc: 'Ready-to-go designs for spontaneous days.', price: 'from $80' },
    ],
    faqs: [
      { q: 'Do I need a consultation first?', a: 'For custom work, yes — we’ll talk through your idea, placement, and quote.' },
      { q: 'Is the studio sterile?', a: 'Always. We follow strict hygiene standards with single-use, sterile equipment.' },
      { q: 'How do I book?', a: 'Send a reference and your idea through our contact page to start the process.' },
    ],
    palette: { primary: '#dc2626', accent: '#fafafa', background: '#0a0a0a' },
    cta: 'Book a Consultation', ctaSecondary: 'View Portfolio',
  },

  // ── Medical / health ──────────────────────────────────────────────────────
  medical: {
    mood: 'light', designStyle: 'minimal', personality: 'trustworthy', tone: 'empathetic',    products: [
      { name: 'Consultations', desc: 'A thorough assessment with a caring, qualified clinician.', price: 'Book now' },
      { name: 'Preventive Care', desc: 'Check-ups and screenings to keep you well.', price: 'Book now' },
      { name: 'Treatment Plans', desc: 'Personalised care built around your needs.', price: 'on consult' },
      { name: 'Follow-Up Care', desc: 'Ongoing support through every step of recovery.', price: 'included' },
    ],
    faqs: [
      { q: 'How do I book an appointment?', a: 'Book online or call our friendly reception — we’ll find a time that works.' },
      { q: 'Do you accept insurance?', a: 'We work with most major providers; contact us to confirm your cover.' },
      { q: 'Are new patients welcome?', a: 'Always. We’re accepting new patients and would love to care for you.' },
    ],
    palette: { primary: '#0284c7', accent: '#14b8a6', background: '#f6fafd' },
    cta: 'Book an Appointment', ctaSecondary: 'Our Services',
  },
  dental: {
    mood: 'light', designStyle: 'minimal', personality: 'trustworthy', tone: 'empathetic',    products: [
      { name: 'Check-Up & Clean', desc: 'A thorough exam and professional clean to keep teeth healthy.', price: 'from $120' },
      { name: 'Cosmetic Dentistry', desc: 'Whitening, veneers, and smile makeovers.', price: 'on consult' },
      { name: 'Orthodontics', desc: 'Clear aligners and braces for every age.', price: 'from $2,500' },
      { name: 'Emergency Care', desc: 'Same-day relief when you need it most.', price: 'Book now' },
    ],
    faqs: [
      { q: 'Are you taking new patients?', a: 'Yes — we welcome new patients and families. Book your first visit online.' },
      { q: 'Do you offer payment plans?', a: 'We do, with flexible, interest-free options on larger treatments.' },
      { q: 'I’m nervous about the dentist — can you help?', a: 'Absolutely. We specialise in gentle, anxiety-free care and take it at your pace.' },
    ],
    palette: { primary: '#0891b2', accent: '#34d399', background: '#f5fbfd' },
    cta: 'Book an Appointment', ctaSecondary: 'Our Treatments',
  },

  // ── Property / professional ───────────────────────────────────────────────
  realestate: {
    mood: 'light', designStyle: 'luxury', personality: 'sophisticated', tone: 'professional',    products: [
      { name: 'Buying', desc: 'Find and secure the right property at the right price.', price: 'Get started' },
      { name: 'Selling', desc: 'Expert pricing, marketing, and negotiation for top value.', price: 'Free appraisal' },
      { name: 'Renting', desc: 'Quality homes and responsive property management.', price: 'View listings' },
      { name: 'Investment', desc: 'Guidance to build and manage a property portfolio.', price: 'on consult' },
    ],
    faqs: [
      { q: 'How much is my property worth?', a: 'Book a free, no-obligation appraisal and we’ll give you an honest valuation.' },
      { q: 'Do you manage rentals?', a: 'Yes — full property management, from tenant screening to maintenance.' },
      { q: 'How do I start my search?', a: 'Tell us what you’re looking for and we’ll send tailored listings straight away.' },
    ],
    palette: { primary: '#1e3a8a', accent: '#caa017', background: '#f7f9fc' },
    cta: 'Browse Listings', ctaSecondary: 'Free Appraisal',
  },
  finance: {
    mood: 'light', designStyle: 'corporate', personality: 'trustworthy', tone: 'authoritative',    products: [
      { name: 'Financial Planning', desc: 'A tailored roadmap for your short- and long-term goals.', price: 'Free intro' },
      { name: 'Investment Advice', desc: 'Diversified strategies aligned to your risk and timeline.', price: 'on consult' },
      { name: 'Tax & Accounting', desc: 'Compliant, optimised, and stress-free.', price: 'from $250' },
      { name: 'Retirement Planning', desc: 'Build the future you’ve worked for.', price: 'on consult' },
    ],
    faqs: [
      { q: 'Is the first consultation free?', a: 'Yes — your initial consultation is free and completely confidential.' },
      { q: 'Are you independent?', a: 'We provide independent advice in your best interest, with transparent fees.' },
      { q: 'How are your fees structured?', a: 'We agree clear, upfront fees before any work begins — no surprises.' },
    ],
    palette: { primary: '#0f766e', accent: '#caa017', background: '#f7faf9' },
    cta: 'Book a Consultation', ctaSecondary: 'Our Services',
  },

  // ── Property / professional ───────────────────────────────────────────────
  design: {
    mood: 'light', designStyle: 'minimal', personality: 'sophisticated', tone: 'professional',    products: [
      { name: 'Brand & Identity', desc: 'Logos, systems, and guidelines that define you.', price: 'from $4,000' },
      { name: 'Digital & Web', desc: 'Sites and products designed to feel effortless.', price: 'from $6,000' },
      { name: 'Spatial & Interior', desc: 'Considered spaces that shape how people feel.', price: 'on consult' },
      { name: 'Art Direction', desc: 'Visual direction for campaigns and content.', price: 'on consult' },
    ],
    faqs: [
      { q: 'How do projects begin?', a: 'Every project starts with a discovery session to align on goals and scope.' },
      { q: 'What is your typical timeline?', a: 'Most engagements run four to ten weeks depending on scope.' },
      { q: 'Do you work with smaller budgets?', a: 'We tailor scope to your budget and can start focused, then grow.' },
    ],
    palette: { primary: '#171717', accent: '#f97316', background: '#fafafa' },
    cta: 'Start a Project', ctaSecondary: 'View Our Work',
  },

  // ── Hospitality / travel ──────────────────────────────────────────────────
  travel: {
    mood: 'vibrant', designStyle: 'cinematic', personality: 'energetic', tone: 'casual',    products: [
      { name: 'Signature Stays', desc: 'Beautiful rooms and suites in unforgettable settings.', price: 'from $180/night' },
      { name: 'Curated Experiences', desc: 'Tours, tastings, and adventures, expertly guided.', price: 'from $60' },
      { name: 'Tailored Itineraries', desc: 'A trip planned end to end, just for you.', price: 'on request' },
      { name: 'Group & Events', desc: 'Retreats, weddings, and getaways for any group.', price: 'on request' },
    ],
    faqs: [
      { q: 'How do I make a booking?', a: 'Book directly online or message us and we’ll handle every detail.' },
      { q: 'Can you plan a custom trip?', a: 'Absolutely — tell us your dates and dreams and we’ll build the itinerary.' },
      { q: 'What is your cancellation policy?', a: 'Flexible cancellation is available on most bookings; details are shown at checkout.' },
    ],
    palette: { primary: '#0e7490', accent: '#f59e0b', background: '#f4fafb' },
    cta: 'Book Your Stay', ctaSecondary: 'Explore Experiences',
  },
  hotel: {
    mood: 'dark', designStyle: 'luxury', personality: 'sophisticated', tone: 'luxury',    products: [
      { name: 'Rooms & Suites', desc: 'Elegant spaces designed for deep, easy rest.', price: 'from $220/night' },
      { name: 'Dining', desc: 'Seasonal menus and an unhurried table.', price: 'à la carte' },
      { name: 'Spa & Wellness', desc: 'Treatments and quiet to restore you fully.', price: 'from $120' },
      { name: 'Events & Weddings', desc: 'Unforgettable celebrations, flawlessly hosted.', price: 'on request' },
    ],
    faqs: [
      { q: 'What are your check-in times?', a: 'Check-in is from mid-afternoon and check-out late morning; early arrival on request.' },
      { q: 'Do you have on-site dining?', a: 'Yes — our restaurant and bar serve guests and visitors throughout the day.' },
      { q: 'Is parking available?', a: 'Complimentary on-site parking and valet are available for all guests.' },
    ],
    palette: { primary: '#1c1917', accent: '#caa017', background: '#0d0b0a' },
    cta: 'Book Your Stay', ctaSecondary: 'Explore Rooms',
  },

  // ── Music / entertainment ─────────────────────────────────────────────────
  music: {
    mood: 'dark', designStyle: 'artistic', personality: 'bold', tone: 'casual',    products: [
      { name: 'Latest Release', desc: 'Stream the newest single, EP, or album.', price: 'Listen now' },
      { name: 'Live Shows', desc: 'Upcoming dates, tickets, and tour news.', price: 'Get tickets' },
      { name: 'Studio Sessions', desc: 'Production, mixing, and mastering services.', price: 'on request' },
      { name: 'Merch', desc: 'Vinyl, apparel, and limited drops.', price: 'from $20' },
    ],
    faqs: [
      { q: 'Where can I stream your music?', a: 'Everywhere — Spotify, Apple Music, and all major platforms. Links are on the site.' },
      { q: 'How do I book you for a show?', a: 'Send dates and details through the contact page and we’ll get back fast.' },
      { q: 'Do you offer production services?', a: 'Yes — production, mixing, and mastering. Reach out to discuss your project.' },
    ],
    palette: { primary: '#7c3aed', accent: '#ec4899', background: '#0a0a0f' },
    cta: 'Listen Now', ctaSecondary: 'Tour Dates',
  },
  event: {
    mood: 'contrast', designStyle: 'editorial', personality: 'elegant', tone: 'casual',    products: [
      { name: 'Weddings', desc: 'Full planning and styling for your perfect day.', price: 'on request' },
      { name: 'Corporate Events', desc: 'Launches, conferences, and parties that impress.', price: 'on request' },
      { name: 'Private Celebrations', desc: 'Birthdays, anniversaries, and milestones.', price: 'on request' },
      { name: 'Day-Of Coordination', desc: 'We run the day so you can live it.', price: 'from $1,200' },
    ],
    faqs: [
      { q: 'How far in advance should we book?', a: 'For weddings, six to twelve months is ideal; smaller events need less lead time.' },
      { q: 'Do you handle vendors?', a: 'Yes — we manage every vendor, contract, and timeline on your behalf.' },
      { q: 'Can you work to a budget?', a: 'Always. We tailor every plan to your budget and priorities up front.' },
    ],
    palette: { primary: '#9d174d', accent: '#caa017', background: '#fbf6f8' },
    cta: 'Plan Your Event', ctaSecondary: 'View Our Work',
  },

  // ── Mission / learning ────────────────────────────────────────────────────
  nonprofit: {
    mood: 'warm', designStyle: 'organic', personality: 'friendly', tone: 'empathetic',    products: [
      { name: 'Donate', desc: 'Your gift goes directly to the cause and the people who need it.', price: 'Any amount' },
      { name: 'Volunteer', desc: 'Give your time and skills where they matter most.', price: 'Join us' },
      { name: 'Our Programs', desc: 'See the work your support makes possible.', price: 'Learn more' },
      { name: 'Partner With Us', desc: 'Corporate and community partnerships that scale impact.', price: 'Get in touch' },
    ],
    faqs: [
      { q: 'Where does my donation go?', a: 'The majority of every gift goes directly to programs — we publish full transparency reports.' },
      { q: 'How can I volunteer?', a: 'Sign up through our contact page and we’ll match you to where you’re needed.' },
      { q: 'Is my donation tax-deductible?', a: 'Yes — we’re a registered nonprofit and provide receipts for all donations.' },
    ],
    palette: { primary: '#15803d', accent: '#f59e0b', background: '#f6faf4' },
    cta: 'Donate Now', ctaSecondary: 'Get Involved',
  },
  education: {
    mood: 'light', designStyle: 'minimal', personality: 'friendly', tone: 'accessible',    products: [
      { name: 'Courses', desc: 'Structured programs that take you from basics to mastery.', price: 'from $49' },
      { name: 'Workshops', desc: 'Focused, hands-on sessions on a single skill.', price: 'from $29' },
      { name: '1:1 Tutoring', desc: 'Personalised guidance tailored to your goals.', price: 'from $40/hr' },
      { name: 'Certifications', desc: 'Recognised credentials to prove what you know.', price: 'on enrolment' },
    ],
    faqs: [
      { q: 'Do I need any experience?', a: 'No — we have courses for every level, from complete beginner to advanced.' },
      { q: 'Are courses self-paced?', a: 'Most are self-paced with lifetime access; some run on a live cohort schedule.' },
      { q: 'Do I get a certificate?', a: 'Yes — you earn a shareable certificate on completion of each course.' },
    ],
    palette: { primary: '#2563eb', accent: '#f59e0b', background: '#f6f9fe' },
    cta: 'Browse Courses', ctaSecondary: 'How It Works',
  },
};

// Map any niche slug to the profile that best represents it.
export function profileFor(slug: string, broad: string): NicheCopyProfile {
  if (NICHE_PROFILES[slug]) return NICHE_PROFILES[slug];
  if (NICHE_PROFILES[broad]) return NICHE_PROFILES[broad];
  // Broad-category fallbacks onto the closest authored profile. Every broad the
  // niche detector can emit is mapped to a profile whose copy genuinely fits the
  // category — so a florist never inherits fashion copy, nor a dentist spa copy.
  const map: Record<string, string> = {
    food: 'restaurant', beauty: 'beauty', medical: 'medical', travel: 'travel',
    music: 'music', design: 'design', consulting: 'agency', finance: 'finance',
    ecommerce: 'ecommerce', gaming: 'saas', education: 'education', nonprofit: 'nonprofit',
    realestate: 'realestate', portfolio: 'photography',
  };
  const mapped = map[broad];
  return (mapped && NICHE_PROFILES[mapped]) || NICHE_PROFILES.general;
}
