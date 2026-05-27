import type { ISharedContext } from './core/types';
import type { DesignDNAArtifact } from './engines/design-dna';
import type { PlanningArtifact } from './engines/planning';

// ---------------------------------------------------------------------------
// True-diversity single-document HTML renderer.
//
// The orchestration pipeline emits design + planning intelligence; this module
// is the creative layer that turns that intelligence into ONE self-contained,
// fully responsive, animated HTML document. Unlike a template generator, every
// niche gets its own typography, color logic, section composition, layout
// rhythm and imagery — and a per-brand seed shuffles structure so two sites in
// the same niche do not look alike.
//
// Hard rules enforced here:
//   * No dead links. Every nav item / button targets a section that exists.
//   * No empty visuals. Every visual slot renders a real <img> (niche-aware
//     Unsplash photo) with a CSS-gradient fallback via onerror.
//   * No shared section order. Composition is chosen per niche + seed.
// ---------------------------------------------------------------------------

export type Niche = 'sports' | 'restaurant' | 'portfolio' | 'ecommerce' | 'saas' | 'agency' | 'business';

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const esc = escapeHtml;

// Deterministic hash so the same brand+niche always yields the same site, but
// different brands diverge in structure, accent rotation and layout variant.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function detectNiche(prompt: string): Niche {
  const p = prompt.toLowerCase();
  if (/(basketball|sneaker|jersey|athletic|sportswear|activewear|\bsports?\b|\bgym\b|fitness|workout|crossfit|\bnba\b|hoops|dribble|football|soccer|baseball|\bathlete|jogging|marathon)/.test(p)) return 'sports';
  if (/(restaurant|ramen|cafe|coffee|food|bistro|dining|menu|bakery|kitchen|eatery|grill|pizzeria|sushi|burger|brunch)/.test(p)) return 'restaurant';
  if (/(portfolio|photographer|photography|designer|artist|creative|illustrator|filmmaker|director|writer|author)/.test(p)) return 'portfolio';
  if (/(saas|software|\bapp\b|platform|dashboard|startup|productivity|analytics|workflow|automation|\bai\b|tool|api)/.test(p)) return 'saas';
  if (/(shop|store|ecommerce|e-commerce|apparel|fashion|\bproduct\b|products|boutique|skincare|jewelry|checkout|clothing|cosmetics)/.test(p)) return 'ecommerce';
  if (/(agency|studio|marketing|consult|branding|advertis)/.test(p)) return 'agency';
  return 'business';
}

// --- Imagery -----------------------------------------------------------------
// Curated Unsplash photo IDs per niche. `ph(id,w,h)` builds a sized URL; every
// <img> carries a gradient fallback so a blocked request never leaves a blank.
function ph(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80&h=${h}`;
}

interface PhotoBank {
  hero: string;
  showcase: string;
  gallery: string[];
}

const PHOTOS: Record<Niche, PhotoBank> = {
  sports: {
    hero: '1546519638-68e109498ffc',
    showcase: '1574623452334-1e0ac2b3ccb4',
    gallery: ['1608245449230-4ac19066d2d0', '1518609878373-06d740f60d8b', '1551958219-acbc608c6377', '1552674605-db6ffd4facb5', '1577471488278-16eec37ffcc2', '1517649763962-0c623066013b'],
  },
  restaurant: {
    hero: '1517248135467-4c7edcad34c4',
    showcase: '1414235077428-338989a2e8c0',
    gallery: ['1546069901-ba9599a7e63c', '1565299624946-b28f40a0ae38', '1567620905732-2d1ec7ab7445', '1540189549336-e6e99c3679fe', '1559339352-11d035aa65de', '1432139509613-5c4255815697'],
  },
  portfolio: {
    hero: '1452587925148-ce544e77e70d',
    showcase: '1517048676732-d65bc937f952',
    gallery: ['1559028012-481c04fa702d', '1558655146-9f40138edfeb', '1561070791-2526d30994b5', '1545239351-1141bd82e8a6', '1487058792275-0ad4aaf24ca7', '1505740420928-5e560c06d30e'],
  },
  ecommerce: {
    hero: '1483985988355-763728e1935b',
    showcase: '1441986300917-64674bd600d8',
    gallery: ['1523275335684-37898b6baf30', '1542291026-7eec264c27ff', '1505740420928-5e560c06d30e', '1491553895911-0055eca6402d', '1525507119028-ed4c629a60a3', '1560769629-975ec94e6a86'],
  },
  saas: {
    hero: '1551434678-e076c223a692',
    showcase: '1460925895917-afdab827c52f',
    gallery: ['1551288049-bebda4e38f71', '1504384308090-c894fdcc538d', '1517694712202-14dd9538aa97', '1556761175-5973dc0f32e7', '1531403009284-440f080d1e12', '1498050108023-c5249f4df085'],
  },
  agency: {
    hero: '1497366216548-37526070297c',
    showcase: '1522202176988-66273c2fd55f',
    gallery: ['1542744173-8e7e53415bb0', '1556761175-b413da4baf72', '1559136555-9303baea8ebd', '1551434678-e076c223a692', '1553877522-43269d4ea984', '1531973576160-7125cd663d86'],
  },
  business: {
    hero: '1486406146926-c627a92ad1ab',
    showcase: '1497215842964-222b430dc094',
    gallery: ['1568992687947-868a62a9f521', '1454165804606-c3d57bc86b40', '1556740738-b6a63e27c4df', '1542744173-8e7e53415bb0', '1521737604893-d14cc237f11d', '1531482615713-2afd69097998'],
  },
};

function imgTag(id: string, w: number, h: number, alt: string, cls: string, fallbackVar = '--grad-a'): string {
  return `<img src="${ph(id, w, h)}" alt="${esc(alt)}" loading="lazy" class="${cls}" onerror="this.style.display='none';this.parentElement.style.background='var(${fallbackVar})'" />`;
}

// --- Niche identity (fonts, palette logic, copy) -----------------------------

interface NicheTheme {
  fontHref: string;
  display: string;
  body: string;
  // palette overrides; if a value is null the design-dna palette is used.
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  dark: boolean;
  radius: string;
  // typographic personality
  headingCase: 'none' | 'uppercase';
  headingWeight: number;
  letterSpacing: string;
  heroFontSize: string;
}

const THEMES: Record<Niche, NicheTheme> = {
  sports: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap',
    display: "'Barlow Condensed', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    bg: '#0a0a0c', surface: '#15151a', text: '#f5f5f7', muted: '#9a9aa7', border: 'rgba(255,255,255,.10)',
    dark: true, radius: '10px', headingCase: 'uppercase', headingWeight: 800, letterSpacing: '-.01em',
    heroFontSize: 'clamp(3rem,8vw,6.5rem)',
  },
  restaurant: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@300;400;500&display=swap',
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Jost', system-ui, sans-serif",
    bg: '#fbf7f0', surface: '#fff', text: '#2a211a', muted: '#7a6e62', border: '#e8ddcd',
    dark: false, radius: '4px', headingCase: 'none', headingWeight: 600, letterSpacing: '0',
    heroFontSize: 'clamp(2.8rem,6.5vw,5.2rem)',
  },
  portfolio: {
    fontHref: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500&display=swap',
    display: "'DM Serif Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
    bg: '#fafafa', surface: '#fff', text: '#111', muted: '#777', border: '#ececec',
    dark: false, radius: '2px', headingCase: 'none', headingWeight: 400, letterSpacing: '-.02em',
    heroFontSize: 'clamp(2.6rem,7vw,5.6rem)',
  },
  ecommerce: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Nunito+Sans:wght@400;600;700&display=swap',
    display: "'Fraunces', Georgia, serif",
    body: "'Nunito Sans', system-ui, sans-serif",
    bg: '#ffffff', surface: '#f7f5f2', text: '#1c1917', muted: '#78716c', border: '#eae6e1',
    dark: false, radius: '16px', headingCase: 'none', headingWeight: 600, letterSpacing: '-.01em',
    heroFontSize: 'clamp(2.6rem,5.6vw,4.6rem)',
  },
  saas: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    bg: '#0b1020', surface: '#121a30', text: '#eef2ff', muted: '#9aa6c4', border: 'rgba(255,255,255,.08)',
    dark: true, radius: '14px', headingCase: 'none', headingWeight: 700, letterSpacing: '-.025em',
    heroFontSize: 'clamp(2.6rem,5.8vw,4.8rem)',
  },
  agency: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap',
    display: "'Syne', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    bg: '#0d0d0d', surface: '#171717', text: '#fafafa', muted: '#a3a3a3', border: 'rgba(255,255,255,.12)',
    dark: true, radius: '20px', headingCase: 'none', headingWeight: 800, letterSpacing: '-.03em',
    heroFontSize: 'clamp(2.8rem,7.5vw,6rem)',
  },
  business: {
    fontHref: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;500;600&display=swap',
    display: "'Merriweather', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    bg: '#ffffff', surface: '#f4f7fa', text: '#0f2540', muted: '#5b6b7e', border: '#dde6ef',
    dark: false, radius: '12px', headingCase: 'none', headingWeight: 700, letterSpacing: '-.01em',
    heroFontSize: 'clamp(2.5rem,5.4vw,4.4rem)',
  },
};

interface NicheCopy {
  eyebrow: string;
  headline: (b: string) => string;
  sub: string;
  primaryCta: string;
  secondaryCta: string;
  features: { title: string; body: string }[];
  showcaseTitle: string;
  showcaseBody: string;
  showcasePoints: string[];
  galleryNav: string;        // single-word nav label for the gallery section
  galleryTitle: string;
  galleryBlurb: string;
  galleryItems: { title: string; meta: string }[];
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  ctaTitle: string;
  ctaBody: string;
  contactTitle: string;
  contactBody: string;
}

function nicheCopy(niche: Niche, brand: string): NicheCopy {
  const map: Record<Niche, NicheCopy> = {
    sports: {
      eyebrow: 'Built for the game',
      headline: (b) => `Dominate the court with <span class="grad">${b}</span>`,
      sub: 'Performance gear engineered for athletes who refuse to settle. Built for speed, built for impact, built to win.',
      primaryCta: 'Shop the drop',
      secondaryCta: 'Watch the film',
      features: [
        { title: 'Pro-grade performance', body: 'Engineered with the same tech trusted by elite players on the biggest stages.' },
        { title: 'Lightweight power', body: 'Maximum responsiveness, minimum weight — so nothing slows you down.' },
        { title: 'Built to take hits', body: 'Tested to outlast the grind. Gear that shows up every single game.' },
      ],
      showcaseTitle: 'Train harder. Play longer. Win more.',
      showcaseBody: 'Every product is pressure-tested by athletes before it reaches you. From the hardwood to the blacktop, this is gear that performs when the pressure is on and the clock is running out.',
      showcasePoints: ['Worn by pros and amateurs alike', 'Engineered for explosive movement', 'Backed by a performance guarantee'],
      galleryNav: 'Gear',
      galleryTitle: 'The lineup',
      galleryBlurb: 'Hand-picked gear for every athlete in your game.',
      galleryItems: [
        { title: 'Signature kicks', meta: 'Footwear' }, { title: 'Pro jerseys', meta: 'Apparel' }, { title: 'Game balls', meta: 'Equipment' },
        { title: 'Compression fit', meta: 'Base layer' }, { title: 'Training gear', meta: 'Practice' }, { title: 'Court accessories', meta: 'Extras' },
      ],
      stats: [{ value: '50K+', label: 'Athletes equipped' }, { value: '4.9', label: 'Player rating' }, { value: '24h', label: 'Express shipping' }],
      testimonials: [
        { quote: 'Best gear I have ever played in. The grip and the feel are unreal on the court.', name: 'Marcus Reyes', role: 'Point guard' },
        { quote: 'Took a full season of abuse and still looks brand new. These guys get it.', name: 'DeShawn Cole', role: 'Forward' },
        { quote: 'Lightweight, responsive, and built to last. My game went up a level.', name: 'Tyler Briggs', role: 'Shooting guard' },
      ],
      ctaTitle: 'Ready to level up your game?',
      ctaBody: 'Gear up with the kit trusted by players who play to win.',
      contactTitle: 'Get on the team',
      contactBody: 'Questions about sizing, drops, or team orders? Hit us up and we will get you suited up fast.',
    },
    restaurant: {
      eyebrow: 'Crafted daily',
      headline: (b) => `A taste worth <span class="grad">remembering</span> at ${b}`,
      sub: 'Seasonal ingredients, bold flavors, and an atmosphere designed for the people you love. Reserve a table or order ahead in seconds.',
      primaryCta: 'Reserve a table',
      secondaryCta: 'View the menu',
      features: [
        { title: 'Seasonal menu', body: 'A rotating menu built around the freshest local produce, every single week.' },
        { title: 'Made with care', body: 'Recipes perfected over years, plated by a team that treats every dish as craft.' },
        { title: 'Award-winning', body: 'Recognized by critics and loved by regulars who keep coming back for more.' },
      ],
      showcaseTitle: 'Where every detail is intentional',
      showcaseBody: 'From the first sip to the last bite, the experience is designed to slow you down and savor the moment. Warm lighting, considered plating, and service that anticipates exactly what you need.',
      showcasePoints: ['Locally sourced, seasonally inspired', 'A wine list curated to match', 'Service that feels like home'],
      galleryNav: 'Menu',
      galleryTitle: 'From our kitchen',
      galleryBlurb: 'A glimpse of what is waiting on your table tonight.',
      galleryItems: [
        { title: 'Signature plate', meta: 'Chef special' }, { title: 'Fresh starters', meta: 'To begin' }, { title: 'House mains', meta: 'The heart' },
        { title: 'Dessert of the day', meta: 'Sweet' }, { title: 'Seasonal drinks', meta: 'To sip' }, { title: 'Brunch picks', meta: 'Weekends' },
      ],
      stats: [{ value: '4.9', label: 'Average rating' }, { value: '120+', label: 'Dishes served daily' }, { value: '15K', label: 'Happy guests' }],
      testimonials: [
        { quote: 'Hands down the best dining experience in the city. Every dish told a story.', name: 'Maria Santos', role: 'Food critic' },
        { quote: 'The ambiance, the flavors, the service — flawless from start to finish.', name: 'James Cruz', role: 'Regular guest' },
        { quote: 'We book this place for every celebration. It never disappoints.', name: 'Liza Reyes', role: 'Local foodie' },
      ],
      ctaTitle: 'Hungry yet?',
      ctaBody: 'Reserve your table now and taste the difference a little care makes.',
      contactTitle: 'Find us & reserve',
      contactBody: 'Book a table, ask about private events, or just say hello. We would love to host you.',
    },
    portfolio: {
      eyebrow: 'Selected work',
      headline: (b) => `Work that <span class="grad">speaks</span><br/>— by ${b}`,
      sub: 'A curated collection of projects built with intention, craft, and an obsessive eye for detail. Let us create something that lasts.',
      primaryCta: 'View the work',
      secondaryCta: 'About me',
      features: [
        { title: 'Visual storytelling', body: 'Every project begins with a story and ends with work that moves people.' },
        { title: 'End-to-end craft', body: 'From concept to delivery, handled with care and relentless attention to detail.' },
        { title: 'Distinctly original', body: 'No templates, no shortcuts — work that could only have come from one place.' },
      ],
      showcaseTitle: 'A process built on craft',
      showcaseBody: 'Great work is not an accident. It is the result of deep listening, sharp thinking, and a commitment to getting the details right — the ones most people never notice but always feel.',
      showcasePoints: ['Concept-led, never formulaic', 'Obsessive about the details', 'Collaborative from day one'],
      galleryNav: 'Work',
      galleryTitle: 'Featured projects',
      galleryBlurb: 'A selection of recent work across brand, editorial and motion.',
      galleryItems: [
        { title: 'Brand identity', meta: '2025' }, { title: 'Editorial', meta: '2025' }, { title: 'Product design', meta: '2024' },
        { title: 'Motion study', meta: '2024' }, { title: 'Art direction', meta: '2024' }, { title: 'Case study', meta: '2023' },
      ],
      stats: [{ value: '80+', label: 'Projects shipped' }, { value: '12', label: 'Awards won' }, { value: '9yr', label: 'Of craft' }],
      testimonials: [
        { quote: 'A rare talent. The work elevated our entire brand overnight.', name: 'Andrea Lim', role: 'Creative Director' },
        { quote: 'Thoughtful, precise, and genuinely original. A joy to collaborate with.', name: 'Marcus Tan', role: 'Founder' },
        { quote: 'Delivered beyond the brief and on time. I would work with them again instantly.', name: 'Sofia Reyes', role: 'Head of Brand' },
      ],
      ctaTitle: 'Have a project in mind?',
      ctaBody: 'Let us talk about how we can bring your vision to life.',
      contactTitle: 'Let us work together',
      contactBody: 'Got a brief, a half-formed idea, or just want to chat? Drop a line and let us make something.',
    },
    ecommerce: {
      eyebrow: 'New collection',
      headline: (b) => `Pieces you will <span class="grad">love</span>, from ${b}`,
      sub: 'Thoughtfully designed, ethically made, and delivered to your door. Discover pieces that are built to last and made to be loved.',
      primaryCta: 'Shop the collection',
      secondaryCta: 'Our story',
      features: [
        { title: 'Free shipping', body: 'Fast, tracked, and free on every order over a small minimum. No surprises.' },
        { title: 'Quality guaranteed', body: 'Every product is backed by our promise — love it or your money back.' },
        { title: 'Ships in 24h', body: 'Orders placed before 5pm ship the same day, straight from our warehouse.' },
      ],
      showcaseTitle: 'Made to be loved, built to last',
      showcaseBody: 'We obsess over materials, fit, and finish so you do not have to. Each piece is designed to earn a permanent place in your life — and look better the more you use it.',
      showcasePoints: ['Ethically sourced materials', 'Designed in-house, made to last', 'Free returns, always'],
      galleryNav: 'Shop',
      galleryTitle: 'Best sellers',
      galleryBlurb: 'The pieces our customers cannot stop reordering.',
      galleryItems: [
        { title: 'Bestseller No.1', meta: 'In stock' }, { title: 'New arrival', meta: 'Just dropped' }, { title: 'Limited edition', meta: 'Few left' },
        { title: 'Customer favorite', meta: 'Top rated' }, { title: 'Back in stock', meta: 'Restocked' }, { title: 'Essential pick', meta: 'Staple' },
      ],
      stats: [{ value: '50K+', label: 'Orders shipped' }, { value: '4.8', label: 'Customer rating' }, { value: '98%', label: 'Would reorder' }],
      testimonials: [
        { quote: 'The quality blew me away. Worth every peso and then some.', name: 'Karla Mendoza', role: 'Verified buyer' },
        { quote: 'Fast shipping, beautiful packaging, and the product is gorgeous.', name: 'Paolo Garcia', role: 'Repeat customer' },
        { quote: 'I have recommended this shop to everyone I know. Obsessed.', name: 'Nina Flores', role: 'Verified buyer' },
      ],
      ctaTitle: 'Ready to treat yourself?',
      ctaBody: 'Browse the collection and find your next favorite thing.',
      contactTitle: 'Questions? We are here',
      contactBody: 'Ask about sizing, orders, or returns. Our team replies within one business day.',
    },
    saas: {
      eyebrow: 'Now in early access',
      headline: (b) => `The smarter way to <span class="grad">ship</span>, by ${b}`,
      sub: 'One platform to plan, build, and ship faster. Automate the busywork and give your team the clarity to do their best work.',
      primaryCta: 'Start free trial',
      secondaryCta: 'Book a demo',
      features: [
        { title: 'Lightning fast', body: 'Built for speed at every layer. No loading spinners, no waiting around.' },
        { title: 'Secure by default', body: 'Enterprise-grade security and compliance baked in from day one.' },
        { title: 'Integrates everywhere', body: 'Connects to the tools you already use, so nothing falls through the cracks.' },
      ],
      showcaseTitle: 'Everything your team needs, in one place',
      showcaseBody: 'Stop switching between a dozen tools. Bring your workflows, data, and people together into a single source of truth that actually scales with you.',
      showcasePoints: ['Real-time sync across your stack', 'Automations that save hours weekly', 'SOC 2 Type II compliant'],
      galleryNav: 'Product',
      galleryTitle: 'Built for every team',
      galleryBlurb: 'Powerful modules that work together out of the box.',
      galleryItems: [
        { title: 'Dashboards', meta: 'Insights' }, { title: 'Automations', meta: 'No-code' }, { title: 'Analytics', meta: 'Real-time' },
        { title: 'Collaboration', meta: 'Teams' }, { title: 'Integrations', meta: '100+ apps' }, { title: 'Reporting', meta: 'Exports' },
      ],
      stats: [{ value: '99.9%', label: 'Uptime' }, { value: '10K+', label: 'Teams onboard' }, { value: '40%', label: 'Time saved' }],
      testimonials: [
        { quote: 'This replaced four tools for us and our team has never been more aligned.', name: 'Elena Park', role: 'Head of Ops' },
        { quote: 'Setup took ten minutes and paid for itself in the first week.', name: 'Ben Carter', role: 'Engineering Lead' },
        { quote: 'Genuinely the best product in its category. We are customers for life.', name: 'Aisha Khan', role: 'Product Manager' },
      ],
      ctaTitle: 'Ready to move faster?',
      ctaBody: 'Start your free trial today — no credit card required.',
      contactTitle: 'Talk to our team',
      contactBody: 'Want a walkthrough or a custom quote? Tell us about your team and we will be in touch.',
    },
    agency: {
      eyebrow: 'Full-service studio',
      headline: (b) => `Growth, <span class="grad">engineered</span> by ${b}`,
      sub: 'We partner with ambitious brands to design, build, and scale digital experiences that move the metrics that matter.',
      primaryCta: 'Start a project',
      secondaryCta: 'See our work',
      features: [
        { title: 'Strategy first', body: 'We start with your goals and reverse-engineer the work that gets you there.' },
        { title: 'Design + build', body: 'A single team that designs, ships, and iterates — no handoffs, no friction.' },
        { title: 'Built to scale', body: 'Systems and brands designed to grow with you, not hold you back.' },
      ],
      showcaseTitle: 'Your partners, not just providers',
      showcaseBody: 'We embed with your team, learn your business, and treat your goals as our own. The result is work that does not just look good — it performs in the market.',
      showcasePoints: ['Embedded, senior-led teams', 'Outcomes over deliverables', 'Transparent, weekly cadence'],
      galleryNav: 'Work',
      galleryTitle: 'Recent engagements',
      galleryBlurb: 'A look at the brands we have helped scale.',
      galleryItems: [
        { title: 'Brand strategy', meta: 'Strategy' }, { title: 'Web platform', meta: 'Build' }, { title: 'Campaign', meta: 'Growth' },
        { title: 'Product launch', meta: 'GTM' }, { title: 'Rebrand', meta: 'Identity' }, { title: 'Growth sprint', meta: 'Performance' },
      ],
      stats: [{ value: '3.2x', label: 'Avg. ROI' }, { value: '60+', label: 'Brands scaled' }, { value: '100%', label: 'Client retention' }],
      testimonials: [
        { quote: 'They transformed our digital presence and doubled our pipeline in months.', name: 'David Ong', role: 'CEO' },
        { quote: 'The most strategic partner we have ever worked with. Period.', name: 'Rachel Yu', role: 'VP Marketing' },
        { quote: 'Sharp, fast, and relentlessly focused on outcomes. Highly recommend.', name: 'Tomas Rivera', role: 'Founder' },
      ],
      ctaTitle: 'Let us build something that performs.',
      ctaBody: 'Tell us about your goals and we will show you the path to get there.',
      contactTitle: 'Start the conversation',
      contactBody: 'Share a little about your project and we will set up an intro call this week.',
    },
    business: {
      eyebrow: 'Welcome',
      headline: (b) => `Building something <span class="grad">remarkable</span> with ${b}`,
      sub: 'We help you do more of what you do best. Simple, reliable, and designed around the people you serve.',
      primaryCta: 'Get started',
      secondaryCta: 'Learn more',
      features: [
        { title: 'Built for you', body: 'Tailored to your needs and designed to make everyday work feel effortless.' },
        { title: 'Dependable', body: 'Reliability you can count on, backed by a team that genuinely cares.' },
        { title: 'People first', body: 'Every decision starts and ends with the people we are here to serve.' },
      ],
      showcaseTitle: 'Simple by design, powerful in practice',
      showcaseBody: 'We strip away the complexity so you can focus on what matters. The result is something that just works — quietly, reliably, beautifully, every single day.',
      showcasePoints: ['Trusted by businesses like yours', 'Clear pricing, no surprises', 'Real support from real people'],
      galleryNav: 'Services',
      galleryTitle: 'What we offer',
      galleryBlurb: 'Solutions designed to help you grow with confidence.',
      galleryItems: [
        { title: 'Core service', meta: 'Foundation' }, { title: 'Premium tier', meta: 'Scale' }, { title: 'Support', meta: 'Always on' },
        { title: 'Consulting', meta: 'Expert' }, { title: 'Onboarding', meta: 'Guided' }, { title: 'Resources', meta: 'Free' },
      ],
      stats: [{ value: '10yr', label: 'In business' }, { value: '5K+', label: 'Customers served' }, { value: '4.9', label: 'Satisfaction' }],
      testimonials: [
        { quote: 'A trustworthy partner that consistently delivers. Could not ask for more.', name: 'Grace Lim', role: 'Client' },
        { quote: 'Professional, responsive, and genuinely invested in our success.', name: 'Henry Sy', role: 'Customer' },
        { quote: 'They made the whole process effortless. Highly recommended.', name: 'Mae Tan', role: 'Client' },
      ],
      ctaTitle: 'Let us get started.',
      ctaBody: 'Reach out today and see how we can help you grow.',
      contactTitle: 'Get in touch',
      contactBody: 'Have a question or ready to begin? Send a message and we will reply within one business day.',
    },
  };
  return map[niche];
}

// --- Color resolution --------------------------------------------------------
// Pull the accent colors from design-dna (the only varying signal from the
// pipeline) but force the structural palette (bg/surface/text) to the niche
// theme so dark niches stay dark and light niches stay light.

interface ResolvedColors {
  primary: string; secondary: string; accent: string;
  bg: string; surface: string; text: string; muted: string; border: string;
}

function resolveColors(niche: Niche, design: DesignDNAArtifact | undefined, seed: number): ResolvedColors {
  const t = THEMES[niche];
  const p = design?.colorPalette;
  let primary = p?.primary ?? '#2563eb';
  let secondary = p?.secondary ?? '#7c3aed';
  let accent = p?.accent ?? '#06b6d4';

  // Sports overrides toward energetic neon if design-dna handed us something dull.
  if (niche === 'sports') {
    const neon = [['#ff3b30', '#ff9500'], ['#00e676', '#00b0ff'], ['#ff2d55', '#5856d6'], ['#ffcc00', '#ff3b30']];
    const pick = neon[seed % neon.length];
    primary = p?.primary && p.primary !== '#1d4ed8' ? p.primary : pick[0];
    accent = pick[1];
    secondary = primary;
  }

  // Rotate primary/secondary by seed so two same-niche brands differ in hue mix.
  if (seed % 2 === 1) {
    const tmp = primary; primary = secondary; secondary = tmp;
  }

  return { primary, secondary, accent, bg: t.bg, surface: t.surface, text: t.text, muted: t.muted, border: t.border };
}

// --- Star icon (only inline SVG kept; everything else is real imagery) -------
const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';

export function renderSiteHtml(context: ISharedContext, brandName: string): string {
  const design = context.getArtifact<DesignDNAArtifact>('design-dna');
  const planning = context.getArtifact<PlanningArtifact>('planning');
  const prompt = context.input.userPrompt;

  const niche = detectNiche(prompt);
  const seed = hashStr(brandName + '|' + niche);
  const brand = esc(brandName);
  const copy = nicheCopy(niche, brand);
  const theme = THEMES[niche];
  const c = resolveColors(niche, design, seed);
  const photos = PHOTOS[niche];
  const year = new Date().getFullYear();
  const initial = brand.charAt(0).toUpperCase();
  const emailHandle = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'hello';

  // Seed picks one of 3 section compositions (different layout rhythm / order).
  const variant = seed % 3;

  // Section anchors that ACTUALLY exist below — nav + buttons only ever target
  // these, so there are no dead links.
  const galleryAnchor = copy.galleryNav.toLowerCase();
  const navItems: { label: string; href: string }[] = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: copy.galleryNav, href: '#' + galleryAnchor },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Contact', href: '#contact' },
  ];

  const onColor = '#ffffff';

  const css = `
    :root{
      --c-primary:${c.primary};--c-secondary:${c.secondary};--c-accent:${c.accent};
      --c-bg:${c.bg};--c-surface:${c.surface};--c-text:${c.text};--c-muted:${c.muted};--c-border:${c.border};
      --on:${onColor};
      --font-display:${theme.display};--font-body:${theme.body};
      --h-weight:${theme.headingWeight};--h-spacing:${theme.letterSpacing};--h-case:${theme.headingCase};
      --radius:${theme.radius};--maxw:1200px;--ease:cubic-bezier(.4,0,.2,1);
      --grad-main:linear-gradient(120deg,var(--c-primary),var(--c-secondary) 55%,var(--c-accent));
      --grad-a:linear-gradient(135deg,var(--c-primary),var(--c-secondary));
      --grad-b:linear-gradient(135deg,var(--c-secondary),var(--c-accent));
      --grad-c:linear-gradient(135deg,var(--c-accent),var(--c-primary));
      --shadow:0 12px 40px -14px rgba(0,0,0,${theme.dark ? '.6' : '.18'});
      --shadow-lg:0 36px 90px -28px rgba(0,0,0,${theme.dark ? '.75' : '.35'});
    }
    *{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:var(--font-body);background:var(--c-bg);color:var(--c-text);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
    h1,h2,h3,.display{font-family:var(--font-display);line-height:1.04;letter-spacing:var(--h-spacing);font-weight:var(--h-weight);text-transform:var(--h-case)}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}
    .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
    .grad{background:var(--grad-main);-webkit-background-clip:text;background-clip:text;color:transparent}
    .btn{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;border-radius:${niche === 'restaurant' || niche === 'portfolio' ? '2px' : '999px'};font-weight:600;font-family:var(--font-body);font-size:1rem;cursor:pointer;border:1.5px solid transparent;transition:transform .25s var(--ease),box-shadow .25s var(--ease),background .25s,color .25s;letter-spacing:${niche === 'sports' ? '.06em' : '0'};text-transform:${niche === 'sports' ? 'uppercase' : 'none'}}
    .btn:hover{transform:translateY(-3px)}
    .btn-primary{background:var(--grad-main);color:var(--on);box-shadow:0 14px 34px -12px var(--c-primary)}
    .btn-primary:hover{box-shadow:0 22px 46px -12px var(--c-primary)}
    .btn-ghost{background:transparent;border-color:var(--c-border);color:var(--c-text)}
    .btn-ghost:hover{border-color:var(--c-primary);color:var(--c-primary)}
    .eyebrow{display:inline-flex;align-items:center;gap:9px;padding:8px 17px;border-radius:999px;background:color-mix(in srgb,var(--c-primary) 14%,transparent);color:var(--c-primary);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:var(--font-body)}
    .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--c-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--c-accent) 25%,transparent);animation:pulse 2.4s infinite}
    @keyframes pulse{50%{opacity:.4}}
    section{padding:clamp(68px,9vw,132px) 0;position:relative}
    .section-head{max-width:680px;margin:0 auto clamp(42px,5vw,68px);text-align:center}
    .section-head h2{font-size:clamp(2rem,4.4vw,3.3rem);margin-bottom:16px}
    .section-head p{color:var(--c-muted);font-size:1.12rem}

    header{position:fixed;top:0;left:0;right:0;z-index:50;transition:all .3s var(--ease)}
    header.scrolled{background:color-mix(in srgb,var(--c-bg) 85%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--c-border);box-shadow:var(--shadow)}
    .nav{display:flex;align-items:center;justify-content:space-between;height:78px}
    .logo{font-family:var(--font-display);font-weight:var(--h-weight);font-size:1.35rem;display:flex;align-items:center;gap:11px;text-transform:var(--h-case)}
    .logo .mark{width:36px;height:36px;border-radius:${niche === 'restaurant' || niche === 'portfolio' ? '6px' : '11px'};background:var(--grad-a);display:grid;place-items:center;color:var(--on);font-size:1rem;font-family:var(--font-display);box-shadow:var(--shadow)}
    .nav-links{display:flex;gap:34px;align-items:center}
    .nav-links a{font-size:.96rem;color:var(--c-muted);font-weight:500;transition:color .2s;position:relative}
    .nav-links a::after{content:"";position:absolute;left:0;bottom:-5px;width:0;height:2px;background:var(--c-primary);transition:width .25s var(--ease)}
    .nav-links a:hover{color:var(--c-text)}.nav-links a:hover::after{width:100%}
    .nav-cta{display:flex;align-items:center;gap:14px}
    .burger{display:none;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:8px}
    .burger span{width:24px;height:2px;background:var(--c-text);transition:.3s}
    .mobile-menu{display:none;flex-direction:column;gap:4px;padding:0 24px 18px;background:color-mix(in srgb,var(--c-bg) 96%,transparent);backdrop-filter:blur(18px)}
    .mobile-menu a{padding:13px 0;border-bottom:1px solid var(--c-border);color:var(--c-text);font-weight:500}

    /* HERO */
    .hero{position:relative;overflow:hidden}
    .hero-grid{display:grid;gap:56px;align-items:center}
    .hero h1{font-size:${theme.heroFontSize};margin:22px 0 22px}
    .hero p.lead{font-size:clamp(1.05rem,1.6vw,1.3rem);color:var(--c-muted);max-width:560px;margin-bottom:34px}
    .hero-actions{display:flex;gap:14px;flex-wrap:wrap}
    .hero-trust{margin-top:38px;display:flex;align-items:center;gap:16px;color:var(--c-muted);font-size:.92rem}
    .avatars{display:flex}
    .avatars span{width:38px;height:38px;border-radius:50%;border:2px solid var(--c-bg);margin-left:-10px;background:var(--grad-a)}
    .avatars span:nth-child(2){background:var(--grad-b)}.avatars span:nth-child(3){background:var(--grad-c)}
    .hero-media{position:relative}
    .hero-media .frame{position:relative;border-radius:calc(var(--radius) * 1.6);overflow:hidden;box-shadow:var(--shadow-lg);background:var(--grad-a)}
    .hero-media .frame img{width:100%;height:100%;object-fit:cover;aspect-ratio:4/5}
    .float-card{position:absolute;background:color-mix(in srgb,var(--c-surface) 92%,transparent);backdrop-filter:blur(14px);border:1px solid var(--c-border);border-radius:16px;padding:14px 18px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px;z-index:2}
    .float-card .ic{width:42px;height:42px;border-radius:12px;background:var(--grad-main);display:grid;place-items:center;color:var(--on)}
    .float-card .ic svg{width:20px;height:20px}
    .float-card b{font-family:var(--font-display);display:block;font-size:1.1rem}
    .float-card small{color:var(--c-muted);font-size:.78rem}
    .fc-1{top:8%;left:-22px;animation:float 6s ease-in-out infinite}
    .fc-2{bottom:9%;right:-18px;animation:float 7s ease-in-out infinite .6s}
    @keyframes float{50%{transform:translateY(-14px)}}

    /* HERO — sports cinematic full-bleed variant */
    .hero-cinematic{min-height:92vh;display:flex;align-items:flex-end;padding-bottom:clamp(60px,8vw,110px);color:#fff}
    .hero-cinematic .bgimg{position:absolute;inset:0;z-index:-2}
    .hero-cinematic .bgimg img{width:100%;height:100%;object-fit:cover}
    .hero-cinematic::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.55) 60%,var(--c-bg) 100%)}
    .hero-cinematic h1{font-size:${theme.heroFontSize};max-width:14ch}
    .hero-cinematic .lead{color:rgba(255,255,255,.85);max-width:600px}
    .hero-cinematic .eyebrow{background:color-mix(in srgb,var(--c-primary) 30%,transparent);color:#fff}

    /* MARQUEE */
    .marquee{border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border);padding:24px 0;overflow:hidden;background:var(--c-surface)}
    .marquee-track{display:flex;gap:60px;align-items:center;white-space:nowrap;animation:scroll 28s linear infinite;color:var(--c-muted);font-family:var(--font-display);font-size:1.3rem;font-weight:var(--h-weight);text-transform:${niche === 'sports' ? 'uppercase' : 'var(--h-case)'};opacity:.75}
    @keyframes scroll{to{transform:translateX(-50%)}}

    /* FEATURES */
    .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .card{background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:36px 30px;transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s;position:relative;overflow:hidden}
    .card::before{content:"";position:absolute;top:0;left:0;width:100%;height:3px;background:var(--grad-main);transform:scaleX(0);transform-origin:left;transition:transform .35s var(--ease)}
    .card:hover{transform:translateY(-7px);box-shadow:var(--shadow-lg);border-color:color-mix(in srgb,var(--c-primary) 40%,transparent)}
    .card:hover::before{transform:scaleX(1)}
    .card .num{font-family:var(--font-display);font-size:2.4rem;font-weight:var(--h-weight);background:var(--grad-main);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:14px;display:block}
    .card h3{font-size:1.35rem;margin-bottom:10px}
    .card p{color:var(--c-muted)}

    /* SHOWCASE */
    .showcase{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
    .showcase.flip .showcase-media{order:-1}
    .showcase h2{font-size:clamp(1.9rem,3.8vw,2.9rem);margin-bottom:18px}
    .showcase p{color:var(--c-muted);font-size:1.12rem;margin-bottom:26px}
    .showcase ul{list-style:none;display:grid;gap:14px;margin-bottom:30px}
    .showcase li{display:flex;gap:12px;align-items:flex-start;font-weight:500}
    .showcase li svg{width:22px;height:22px;color:var(--c-accent);flex-shrink:0;margin-top:3px}
    .showcase-media{position:relative;border-radius:calc(var(--radius) * 1.4);overflow:hidden;box-shadow:var(--shadow-lg);background:var(--grad-b)}
    .showcase-media img{width:100%;height:100%;object-fit:cover;aspect-ratio:4/3;transition:transform .8s var(--ease)}
    .showcase-media:hover img{transform:scale(1.05)}

    /* GALLERY */
    .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .gallery-grid.masonry .tile:nth-child(3n+1){grid-row:span 2}
    .tile{position:relative;overflow:hidden;border-radius:var(--radius);box-shadow:var(--shadow);cursor:pointer;background:var(--grad-a);aspect-ratio:4/3}
    .gallery-grid.masonry .tile:nth-child(3n+1){aspect-ratio:auto;min-height:100%}
    .tile img{width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease)}
    .tile:hover img{transform:scale(1.08)}
    .tile .label{position:absolute;left:0;right:0;bottom:0;padding:20px;color:#fff;z-index:1;background:linear-gradient(0deg,rgba(0,0,0,.72),transparent)}
    .tile .label b{font-family:var(--font-display);font-weight:var(--h-weight);font-size:1.15rem;display:block;text-transform:var(--h-case)}
    .tile .label span{font-size:.82rem;opacity:.85;text-transform:uppercase;letter-spacing:.08em}

    /* STATS */
    .stats{background:${theme.dark ? 'var(--grad-main)' : 'var(--c-surface)'};border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border)}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
    .stat .num{font-family:var(--font-display);font-size:clamp(2.6rem,5.2vw,3.8rem);font-weight:var(--h-weight);${theme.dark ? 'color:#fff' : 'background:var(--grad-main);-webkit-background-clip:text;background-clip:text;color:transparent'}}
    .stat .lbl{color:${theme.dark ? 'rgba(255,255,255,.8)' : 'var(--c-muted)'};font-weight:500;margin-top:6px}

    /* TESTIMONIALS */
    .quote-card{background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:34px;display:flex;flex-direction:column;gap:18px}
    .quote-card .stars{display:flex;gap:3px;color:var(--c-accent)}
    .quote-card .stars svg{width:18px;height:18px}
    .quote-card blockquote{font-size:1.1rem;font-weight:500;line-height:1.55;font-family:${niche === 'restaurant' || niche === 'portfolio' ? 'var(--font-display)' : 'var(--font-body)'}}
    .quote-card .who{display:flex;align-items:center;gap:12px;margin-top:auto}
    .quote-card .who .ava{width:48px;height:48px;border-radius:50%;background:var(--grad-a);flex-shrink:0}
    .quote-card .who b{display:block;font-family:var(--font-display);text-transform:var(--h-case)}
    .quote-card .who small{color:var(--c-muted)}

    /* CTA */
    .cta-band{position:relative;border-radius:calc(var(--radius) * 1.6);padding:clamp(50px,7vw,90px) 32px;text-align:center;color:#fff;overflow:hidden;background:var(--grad-main);box-shadow:var(--shadow-lg)}
    .cta-band::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 22% 22%,rgba(255,255,255,.22),transparent 50%)}
    .cta-band h2{font-size:clamp(2rem,4.6vw,3.3rem);margin-bottom:14px;position:relative}
    .cta-band p{font-size:1.18rem;opacity:.94;margin-bottom:30px;position:relative}
    .cta-band .btn{position:relative;background:#fff;color:var(--c-primary)}

    /* CONTACT */
    .contact{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
    .contact h2{font-size:clamp(1.9rem,3.8vw,2.8rem);margin-bottom:14px}
    .contact p{color:var(--c-muted);margin-bottom:24px}
    .contact .info{display:grid;gap:16px}
    .contact .info div{display:flex;align-items:center;gap:12px;font-weight:500}
    .contact .info svg{width:22px;height:22px;color:var(--c-primary);flex-shrink:0}
    form{display:grid;gap:14px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:32px}
    label{font-size:.85rem;font-weight:600;color:var(--c-muted)}
    input,textarea{width:100%;padding:14px 16px;border-radius:calc(var(--radius) * .6);border:1px solid var(--c-border);background:var(--c-bg);color:var(--c-text);font-family:inherit;font-size:.98rem;transition:border-color .2s,box-shadow .2s}
    input:focus,textarea:focus{outline:none;border-color:var(--c-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--c-primary) 16%,transparent)}

    /* FOOTER */
    footer{background:var(--c-surface);border-top:1px solid var(--c-border);padding:66px 0 32px}
    .foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:46px}
    .foot-grid h4{font-family:var(--font-display);margin-bottom:16px;font-size:1.05rem;text-transform:var(--h-case)}
    .foot-grid a{display:block;color:var(--c-muted);padding:6px 0;font-size:.93rem;transition:color .2s}
    .foot-grid a:hover{color:var(--c-primary)}
    .foot-bottom{border-top:1px solid var(--c-border);padding-top:24px;display:flex;justify-content:space-between;align-items:center;color:var(--c-muted);font-size:.88rem;flex-wrap:wrap;gap:12px}

    .reveal{opacity:0;transform:translateY(30px);transition:opacity .75s var(--ease),transform .75s var(--ease)}
    .reveal.in{opacity:1;transform:none}

    @media(max-width:920px){
      .hero-grid,.showcase,.contact{grid-template-columns:1fr}
      .showcase.flip .showcase-media{order:0}
      .hero-media{max-width:460px;margin:8px auto 0}
      .grid-3,.gallery-grid,.stats-grid,.foot-grid{grid-template-columns:1fr 1fr}
      .gallery-grid.masonry .tile:nth-child(3n+1){grid-row:auto;aspect-ratio:4/3}
      .nav-links{display:none}.burger{display:flex}.nav-cta .btn{display:none}
    }
    @media(max-width:560px){.grid-3,.gallery-grid,.stats-grid,.foot-grid{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
  `;

  // --- Section builders ------------------------------------------------------

  const navLinkHtml = navItems.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('');
  const mobileLinkHtml = navItems.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('');

  const heroCinematic = `
  <section class="hero hero-cinematic" id="home">
    <div class="bgimg">${imgTag(photos.hero, 1600, 1100, brand + ' hero', '', '--grad-main')}</div>
    <div class="wrap">
      <span class="eyebrow"><span class="dot"></span>${esc(copy.eyebrow)}</span>
      <h1 style="margin:20px 0">${copy.headline(brand)}</h1>
      <p class="lead">${esc(copy.sub)}</p>
      <div class="hero-actions" style="margin-top:30px">
        <a class="btn btn-primary" href="#${galleryAnchor}">${esc(copy.primaryCta)}</a>
        <a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" href="#about">${esc(copy.secondaryCta)}</a>
      </div>
    </div>
  </section>`;

  const heroSplit = `
  <section class="hero" id="home" style="padding-top:clamp(130px,16vw,200px);padding-bottom:clamp(60px,8vw,110px)">
    <div class="wrap hero-grid" style="grid-template-columns:1.05fr .95fr">
      <div>
        <span class="eyebrow"><span class="dot"></span>${esc(copy.eyebrow)}</span>
        <h1>${copy.headline(brand)}</h1>
        <p class="lead">${esc(copy.sub)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#${galleryAnchor}">${esc(copy.primaryCta)}</a>
          <a class="btn btn-ghost" href="#about">${esc(copy.secondaryCta)}</a>
        </div>
        <div class="hero-trust">
          <div class="avatars"><span></span><span></span><span></span></div>
          <span>Trusted by ${esc(copy.stats[0].value)} ${niche === 'saas' ? 'teams' : niche === 'portfolio' ? 'clients' : 'customers'}</span>
        </div>
      </div>
      <div class="hero-media">
        <div class="frame">${imgTag(photos.hero, 900, 1100, brand, '')}</div>
        <div class="float-card fc-1"><div class="ic">${STAR}</div><div><b>${esc(copy.stats[1].value)}</b><small>${esc(copy.stats[1].label)}</small></div></div>
        <div class="float-card fc-2"><div class="ic">${STAR}</div><div><b>${esc(copy.stats[2].value)}</b><small>${esc(copy.stats[2].label)}</small></div></div>
      </div>
    </div>
  </section>`;

  // Sports + agency lead with the cinematic hero; everyone else uses split.
  const hero = (niche === 'sports' || niche === 'agency') ? heroCinematic : heroSplit;

  const marqueeWords = copy.galleryItems.map((g) => g.title).concat(copy.galleryItems.map((g) => g.title));
  const marquee = `<div class="marquee"><div class="marquee-track">${marqueeWords.map((m) => `<span>${esc(m)} &nbsp;✦</span>`).join('')}</div></div>`;

  const featureCards = copy.features.map((f, i) => `
    <article class="card reveal">
      <span class="num">0${i + 1}</span>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.body)}</p>
    </article>`).join('');

  const features = `
  <section id="features">
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow"><span class="dot"></span>Why ${brand}</span>
        <h2 style="margin-top:18px">${niche === 'sports' ? 'Engineered to perform' : niche === 'restaurant' ? 'Crafted with intention' : 'Built around what matters'}</h2>
      </div>
      <div class="grid-3">${featureCards}</div>
    </div>
  </section>`;

  const showcasePoints = copy.showcasePoints.map((p) => `<li>${STAR}<span>${esc(p)}</span></li>`).join('');
  const showcase = `
  <section id="about">
    <div class="wrap showcase ${variant === 1 ? 'flip' : ''}">
      <div class="reveal">
        <span class="eyebrow"><span class="dot"></span>The difference</span>
        <h2 style="margin-top:18px">${esc(copy.showcaseTitle)}</h2>
        <p>${esc(copy.showcaseBody)}</p>
        <ul>${showcasePoints}</ul>
        <a class="btn btn-primary" href="#${galleryAnchor}">${esc(copy.primaryCta)}</a>
      </div>
      <div class="showcase-media reveal">${imgTag(photos.showcase, 1000, 760, copy.showcaseTitle, '')}</div>
    </div>
  </section>`;

  // Portfolio uses a masonry gallery; everyone else a uniform grid.
  const galleryClass = niche === 'portfolio' ? 'gallery-grid masonry' : 'gallery-grid';
  const galleryTiles = copy.galleryItems.map((g, i) => {
    const pid = photos.gallery[i % photos.gallery.length];
    const fb = ['--grad-a', '--grad-b', '--grad-c'][i % 3];
    return `<div class="tile reveal">${imgTag(pid, 720, 560, g.title, '', fb)}<div class="label"><b>${esc(g.title)}</b><span>${esc(g.meta)}</span></div></div>`;
  }).join('');

  const gallery = `
  <section id="${galleryAnchor}">
    <div class="wrap">
      <div class="section-head reveal">
        <h2>${esc(copy.galleryTitle)}</h2>
        <p>${esc(copy.galleryBlurb)}</p>
      </div>
      <div class="${galleryClass}">${galleryTiles}</div>
    </div>
  </section>`;

  const statCards = copy.stats.map((s) => `
    <div class="stat reveal"><div class="num">${esc(s.value)}</div><div class="lbl">${esc(s.label)}</div></div>`).join('');
  const stats = `<section class="stats"><div class="wrap stats-grid">${statCards}</div></section>`;

  const starRow = '<div class="stars">' + STAR.repeat(5) + '</div>';
  const testimonialCards = copy.testimonials.map((t) => `
    <article class="quote-card reveal">
      ${starRow}
      <blockquote>“${esc(t.quote)}”</blockquote>
      <div class="who"><div class="ava"></div><div><b>${esc(t.name)}</b><small>${esc(t.role)}</small></div></div>
    </article>`).join('');
  const testimonials = `
  <section id="reviews">
    <div class="wrap">
      <div class="section-head reveal"><h2>${niche === 'sports' ? 'What the players say' : 'Loved by the people we serve'}</h2><p>Real words from real people.</p></div>
      <div class="grid-3">${testimonialCards}</div>
    </div>
  </section>`;

  const cta = `
  <section>
    <div class="wrap">
      <div class="cta-band reveal">
        <h2>${esc(copy.ctaTitle)}</h2>
        <p>${esc(copy.ctaBody)}</p>
        <a class="btn" href="#contact">${esc(copy.primaryCta)}</a>
      </div>
    </div>
  </section>`;

  const contact = `
  <section id="contact">
    <div class="wrap contact">
      <div class="reveal">
        <span class="eyebrow"><span class="dot"></span>Get in touch</span>
        <h2 style="margin-top:18px">${esc(copy.contactTitle)}</h2>
        <p>${esc(copy.contactBody)}</p>
        <div class="info">
          <div>${STAR}<span>hello@${emailHandle}.com</span></div>
          <div>${STAR}<span>Mon–Fri, 9am–6pm</span></div>
          <div>${STAR}<span>We respect your privacy</span></div>
        </div>
      </div>
      <form class="reveal">
        <div><label>Name</label><input type="text" name="name" placeholder="Your name" required /></div>
        <div><label>Email</label><input type="email" name="email" placeholder="you@email.com" required /></div>
        <div><label>Message</label><textarea name="message" rows="4" placeholder="How can we help?" required></textarea></div>
        <button type="submit" class="btn btn-primary" style="justify-content:center">${esc(copy.primaryCta)}</button>
      </form>
    </div>
  </section>`;

  // Per-variant section ordering — same building blocks, different rhythm.
  let body: string;
  if (variant === 0) {
    body = hero + marquee + features + showcase + gallery + stats + testimonials + cta + contact;
  } else if (variant === 1) {
    body = hero + showcase + gallery + features + testimonials + stats + cta + contact;
  } else {
    body = hero + marquee + gallery + showcase + stats + features + testimonials + cta + contact;
  }

  const js = `
    (function(){
      var header=document.querySelector('header');
      function onScroll(){header.classList.toggle('scrolled',window.scrollY>20);}
      window.addEventListener('scroll',onScroll,{passive:true});onScroll();
      var burger=document.querySelector('.burger'),menu=document.querySelector('.mobile-menu');
      if(burger){burger.addEventListener('click',function(){var open=menu.style.display==='flex';menu.style.display=open?'none':'flex';});}
      document.querySelectorAll('.mobile-menu a').forEach(function(a){a.addEventListener('click',function(){menu.style.display='none';});});
      var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.14});
      document.querySelectorAll('.reveal').forEach(function(el,i){el.style.transitionDelay=(i%3*70)+'ms';io.observe(el);});
      var year=document.getElementById('yr');if(year){year.textContent=new Date().getFullYear();}
      var form=document.querySelector('form');if(form){form.addEventListener('submit',function(ev){ev.preventDefault();var b=form.querySelector('button');b.textContent='Thank you!';b.disabled=true;});}
    })();
  `;

  return `<!DOCTYPE html>
<html lang="en"${theme.dark ? ' data-theme="dark"' : ''}>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${brand} — ${esc(copy.eyebrow)}</title>
<meta name="description" content="${esc(copy.sub)}" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${theme.fontHref}" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="logo" href="#home"><span class="mark">${initial}</span>${brand}</a>
    <nav class="nav-links">${navLinkHtml}</nav>
    <div class="nav-cta">
      <a class="btn btn-primary" href="#contact">${esc(copy.primaryCta)}</a>
      <button class="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="mobile-menu">${mobileLinkHtml}<a class="btn btn-primary" href="#contact" style="margin-top:10px;justify-content:center">${esc(copy.primaryCta)}</a></div>
</header>

<main>${body}</main>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="#home" style="margin-bottom:14px"><span class="mark">${initial}</span>${brand}</a>
        <p style="color:var(--c-muted);max-width:300px">${esc(copy.sub.slice(0, 120))}</p>
      </div>
      <div><h4>Explore</h4><a href="#home">Home</a><a href="#about">About</a><a href="#${galleryAnchor}">${esc(copy.galleryNav)}</a></div>
      <div><h4>Company</h4><a href="#features">Features</a><a href="#reviews">Reviews</a><a href="#contact">Contact</a></div>
      <div><h4>Connect</h4><a href="#contact">Get in touch</a><a href="#contact">Support</a><a href="#contact">Careers</a></div>
    </div>
    <div class="foot-bottom">
      <span>© <span id="yr">${year}</span> ${brand}. All rights reserved.</span>
      <span>Crafted for ${esc(niche)}.</span>
    </div>
  </div>
</footer>
<script>${js}</script>
</body>
</html>`;
}
