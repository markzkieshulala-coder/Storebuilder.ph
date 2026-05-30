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
  { slug: 'restaurant', broad: 'food', triggers: ['restaurant', 'bistro', 'diner', 'eatery', 'dining', 'food'] },
  // Health / wellness
  { slug: 'yoga', broad: 'wellness', specific: true, triggers: ['yoga', 'pilates', 'meditation studio'] },
  { slug: 'spa', broad: 'wellness', specific: true, triggers: ['spa', 'massage', 'wellness center', 'wellness centre'] },
  { slug: 'salon', broad: 'beauty', specific: true, triggers: ['salon', 'hair salon', 'nail salon', 'beauty bar'] },
  { slug: 'barber', broad: 'beauty', specific: true, triggers: ['barber', 'barbershop', 'grooming'] },
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
  { slug: 'fashion', broad: 'fashion', specific: true, triggers: ['fashion', 'streetwear', 'apparel', 'clothing', 'boutique', 'menswear', 'womenswear'] },
  { slug: 'beauty', broad: 'beauty', triggers: ['beauty', 'cosmetics', 'skincare', 'makeup'] },
  { slug: 'ecommerce', broad: 'ecommerce', triggers: ['ecommerce', 'e-commerce', 'online store', 'shop', 'retail', 'store'] },
  // Professional
  { slug: 'law', broad: 'law', specific: true, triggers: ['law firm', 'law', 'legal', 'attorney', 'lawyer'] },
  { slug: 'finance', broad: 'finance', triggers: ['finance', 'fintech', 'accounting', 'investment', 'wealth', 'insurance'] },
  { slug: 'consulting', broad: 'consulting', triggers: ['consulting', 'consultancy', 'advisory'] },
  { slug: 'agency', broad: 'agency', triggers: ['agency', 'marketing agency', 'advertising', 'digital agency'] },
  { slug: 'realestate', broad: 'realestate', specific: true, triggers: ['real estate', 'realty', 'property', 'realtor'] },
  // Tech
  { slug: 'saas', broad: 'saas', specific: true, triggers: ['saas', 'software', 'platform', 'app', 'dashboard', 'api', 'developer tool'] },
  { slug: 'startup', broad: 'saas', triggers: ['startup', 'tech company', 'technology'] },
  { slug: 'crypto', broad: 'saas', specific: true, triggers: ['crypto', 'blockchain', 'web3', 'nft', 'defi'] },
  { slug: 'gaming', broad: 'gaming', specific: true, triggers: ['gaming', 'game studio', 'esports'] },
  // Hospitality / travel
  { slug: 'hotel', broad: 'travel', specific: true, triggers: ['hotel', 'resort', 'lodge', 'boutique hotel'] },
  { slug: 'travel', broad: 'travel', triggers: ['travel', 'tour', 'tourism', 'vacation'] },
  // Music / events
  { slug: 'music', broad: 'music', triggers: ['music', 'band', 'dj', 'record label', 'musician'] },
  { slug: 'event', broad: 'agency', specific: true, triggers: ['event', 'wedding', 'event planning'] },
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
  // Copy templates. {brand} is substituted with the brand name.
  heroes: string[];
  subs: string[];
  taglines: string[];
  abouts: string[];
  // Default product/service names if the user named none.
  products: Array<{ name: string; desc: string; price?: string }>;
  faqs: Array<{ q: string; a: string }>;
  // Default palette when the user named no colours.
  palette?: { primary: string; accent: string; background: string };
}

export const NICHE_PROFILES: Record<string, NicheCopyProfile> = {
  coffee: {
    mood: 'warm', designStyle: 'organic', personality: 'friendly', tone: 'casual',
    heroes: ['Freshly Brewed, Made for You', 'Your Daily Ritual, Perfected', 'Coffee Worth Slowing Down For'],
    subs: ['Single-origin beans, roasted in-house and poured with care every morning.', 'A neighbourhood cafe where every cup is crafted by hand.'],
    taglines: ['Brewed with love, served with care.', 'Good coffee, good company.'],
    abouts: ['{brand} began with a simple idea: that a great cup of coffee can make any day better. We source our beans ethically, roast them in small batches, and pour every drink with the kind of care you can taste.'],
    products: [
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
  },
  restaurant: {
    mood: 'warm', designStyle: 'organic', personality: 'friendly', tone: 'casual',
    heroes: ['A Table Waiting Just for You', 'Honest Food, Made Fresh Daily', 'Where Every Meal Feels Like Home'],
    subs: ['Seasonal dishes crafted from locally sourced ingredients.', 'Come hungry, leave happy — great food and warm hospitality.'],
    taglines: ['Made fresh. Served warm.', 'Good food brings people together.'],
    abouts: ['{brand} is a kitchen built around fresh, seasonal ingredients and the belief that a shared meal is something special. Our chefs craft every plate with care, so each visit feels like coming home.'],
    products: [
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
  },
  fitness: {
    mood: 'vibrant', designStyle: 'industrial', personality: 'energetic', tone: 'disruptive',
    heroes: ['Stronger Every Day', 'Train Hard. Live Strong.', 'Your Strongest Self Starts Here'],
    subs: ['Coaching, community, and programming built to get you real results.', 'No gimmicks — just smart training and a crew that shows up.'],
    taglines: ['Push your limits.', 'Show up. Work hard. Repeat.'],
    abouts: ['{brand} is more than a gym — it’s a community built around getting stronger together. Our certified coaches design programming for every level, so whether it’s your first session or your thousandth, you’ll leave better than you came.'],
    products: [
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
  },
  saas: {
    mood: 'light', designStyle: 'startup', personality: 'innovative', tone: 'technical',
    heroes: ['Ship Faster, Stress Less', 'The Platform Built for Modern Teams', 'Everything Your Team Needs, in One Place'],
    subs: ['Powerful, intuitive, and built to scale with you.', 'Automate the busywork and focus on what matters.'],
    taglines: ['Built for teams that move fast.', 'Software that works the way you do.'],
    abouts: ['{brand} helps teams do their best work with a platform that’s powerful without being complicated. We obsess over the details so you can stay focused on shipping, scaling, and growing.'],
    products: [
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
  },
  fashion: {
    mood: 'contrast', designStyle: 'editorial', personality: 'bold', tone: 'casual',
    heroes: ['Wear the Statement', 'Designed to Be Seen', 'The New Drop Is Here'],
    subs: ['Limited runs, considered design, made to last.', 'Pieces that move with you and stand out anywhere.'],
    taglines: ['Style without compromise.', 'Made to stand out.'],
    abouts: ['{brand} is built for people who dress with intention. Every piece is designed in-house, produced in small runs, and made from materials chosen to last — so your wardrobe says exactly what you mean.'],
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
  },
  photography: {
    mood: 'dark', designStyle: 'minimal', personality: 'sophisticated', tone: 'professional',
    heroes: ['Moments, Made Timeless', 'Stories Told in Light', 'Photography with a Point of View'],
    subs: ['Editorial, wedding, and portrait work shot with intention.', 'Images that hold up long after the moment has passed.'],
    taglines: ['Light. Frame. Story.', 'Captured, not staged.'],
    abouts: ['{brand} is a photography practice built on patience and a love of natural light. From intimate portraits to full-day events, the goal is always the same: honest images that feel like the moment they came from.'],
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
  },
  wellness: {
    mood: 'soft', designStyle: 'minimal', personality: 'calm', tone: 'empathetic',
    heroes: ['Find Your Calm', 'Space to Breathe', 'Wellness, On Your Terms'],
    subs: ['A calm space to slow down, reset, and feel like yourself again.', 'Mindful practice and treatments led by caring professionals.'],
    taglines: ['Breathe. Restore. Renew.', 'Care that meets you where you are.'],
    abouts: ['{brand} is a calm, welcoming space dedicated to your wellbeing. Our practitioners create a sense of ease the moment you arrive, with treatments and practice designed to leave you grounded and restored.'],
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
  },
  law: {
    mood: 'light', designStyle: 'corporate', personality: 'authoritative', tone: 'authoritative',
    heroes: ['Trusted Counsel When It Matters', 'Your Case, Our Commitment', 'Experienced Advocacy You Can Rely On'],
    subs: ['Clear advice, decisive action, and results you can trust.', 'Decades of combined experience working for you.'],
    taglines: ['Experience that protects you.', 'Counsel you can trust.'],
    abouts: ['{brand} provides clear, dependable legal counsel to individuals and businesses. Our attorneys combine deep experience with a genuine commitment to every client, guiding you through complex matters with clarity and confidence.'],
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
  },
  agency: {
    mood: 'contrast', designStyle: 'editorial', personality: 'bold', tone: 'disruptive',
    heroes: ['Ideas That Move People', 'We Build Brands Worth Talking About', 'Creative That Performs'],
    subs: ['Strategy, design, and storytelling under one roof.', 'We turn ambitious ideas into work that gets noticed.'],
    taglines: ['Bold ideas, real results.', 'We make brands matter.'],
    abouts: ['{brand} is a creative studio that helps ambitious brands stand out. We blend sharp strategy with standout design and storytelling that connects — work that does not just look good, but moves the needle.'],
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
  },
  general: {
    mood: 'light', designStyle: 'minimal', personality: 'trustworthy', tone: 'professional',
    heroes: ['Built Around What You Need', 'Welcome — Let’s Get Started', 'Simple, Reliable, Yours'],
    subs: ['Everything you’re looking for, thoughtfully put together.', 'Clear, dependable, and made with care.'],
    taglines: ['Made with care.', 'Simple done well.'],
    abouts: ['{brand} was built around a simple promise: to do things well and treat people right. We focus on quality, clarity, and care in everything we make.'],
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
  },
};

// Map any niche slug to the profile that best represents it.
export function profileFor(slug: string, broad: string): NicheCopyProfile {
  if (NICHE_PROFILES[slug]) return NICHE_PROFILES[slug];
  if (NICHE_PROFILES[broad]) return NICHE_PROFILES[broad];
  // Broad-category fallbacks onto the closest authored profile.
  const map: Record<string, string> = {
    food: 'restaurant', beauty: 'wellness', medical: 'wellness', travel: 'general',
    music: 'agency', design: 'agency', consulting: 'agency', finance: 'law',
    ecommerce: 'fashion', gaming: 'saas', education: 'general', nonprofit: 'general',
    realestate: 'law', portfolio: 'photography',
  };
  const mapped = map[broad];
  return (mapped && NICHE_PROFILES[mapped]) || NICHE_PROFILES.general;
}
