// ---------------------------------------------------------------------------
// True Prompt-Driven HTML Renderer
//
// Every website is assembled from:
//   1. PromptIntelligence  — mood, style, section focus, page set
//   2. DesignDNA palette   — primary / secondary / accent hues
//   3. Niche copy          — brand-voice content per page
//
// 8 distinct CSS architectures (one per DesignMood) ensure two prompts
// describing different personalities within the same niche produce visually
// unrelated sites. Multi-page output stores real HTML per route so buttons
// navigate to /about, /menu, /work, /contact — never back to /#.
// ---------------------------------------------------------------------------

import type { ISharedContext } from './core/types';
import type { DesignDNAArtifact } from './engines/design-dna';
import type { PlanningArtifact } from './engines/planning';
import { analyzePrompt, type PromptIntelligence, type DesignMood } from './prompt-intelligence';

// Re-export so prompt-intelligence can import the type without circular dep.
export type Niche = 'sports' | 'restaurant' | 'portfolio' | 'ecommerce' | 'saas' | 'agency' | 'business';

export type { DesignMood };

export interface MultiPageOutput {
  /** Complete HTML for each page, keyed by path e.g. '/', '/about', '/menu' */
  pages: Record<string, string>;
  /** Navigation items used in every page header */
  nav: Array<{ label: string; href: string }>;
  /** Niche-specific page name for the gallery/shop/menu/work route */
  gallerySlug: string;
  primaryPage: string; // HTML of the homepage (shortcut for htmlContent column)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
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

function esc(s: unknown): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function ph(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80&h=${h}`;
}

function img(id: string, w: number, h: number, alt: string, cls = '', fallback = '#111'): string {
  return `<img src="${ph(id,w,h)}" alt="${esc(alt)}" loading="lazy" class="${cls}" onerror="this.style.visibility='hidden'" style="background:${fallback}" />`;
}

const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/></svg>`;
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="20" height="20" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;

// ---------------------------------------------------------------------------
// Photo banks keyed by niche
// ---------------------------------------------------------------------------
const PHOTOS: Record<Niche, { hero: string[]; showcase: string; gallery: string[]; team: string[] }> = {
  sports: {
    hero:     ['1546519638-68e109498ffc','1574629810360-7efbbe195018','1519861531473-9200262188bf'],
    showcase: '1574623452334-1e0ac2b3ccb4',
    gallery:  ['1608245449230-4ac19066d2d0','1518609878373-06d740f60d8b','1551958219-acbc608c6377','1552674605-db6ffd4facb5','1577471488278-16eec37ffcc2','1517649763962-0c623066013b'],
    team:     ['1535713875002-d1d0cf277b29','1500648767791-00dcc994a43e','1438761681033-6461ffad8d80','1472099645785-5658abf4ff4e'],
  },
  restaurant: {
    hero:     ['1517248135467-4c7edcad34c4','1414235077428-338989a2e8c0','1466978913421-da2e5dbfca53'],
    showcase: '1414235077428-338989a2e8c0',
    gallery:  ['1546069901-ba9599a7e63c','1565299624946-b28f40a0ae38','1567620905732-2d1ec7ab7445','1540189549336-e6e99c3679fe','1559339352-11d035aa65de','1432139509613-5c4255815697'],
    team:     ['1600565597073-4d5c0e7a0dd0','1577219491135-ce391730fb2c','1567532939604-b6b5b0db2604','1438761681033-6461ffad8d80'],
  },
  portfolio: {
    hero:     ['1452587925148-ce544e77e70d','1581291518857-4d27a4f0e37a','1517048676732-d65bc937f952'],
    showcase: '1492551557933-34265f7af79e',
    gallery:  ['1559028012-481c04fa702d','1558655146-9f40138edfeb','1561070791-2526d30994b5','1545239351-1141bd82e8a6','1487058792275-0ad4aaf24ca7','1505740420928-5e560c06d30e'],
    team:     ['1507003211169-0a1dd7228f2d','1438761681033-6461ffad8d80','1534528741775-53994a69daeb','1472099645785-5658abf4ff4e'],
  },
  ecommerce: {
    hero:     ['1483985988355-763728e1935b','1490481651871-ab68de25d43d','1441986300917-64674bd600d8'],
    showcase: '1441986300917-64674bd600d8',
    gallery:  ['1523275335684-37898b6baf30','1542291026-7eec264c27ff','1505740420928-5e560c06d30e','1553062407-98eeb64c6a62','1491553895911-0055eca6402d','1525507119028-ed4c629a60a3'],
    team:     ['1535713875002-d1d0cf277b29','1507003211169-0a1dd7228f2d','1534528741775-53994a69daeb','1438761681033-6461ffad8d80'],
  },
  saas: {
    hero:     ['1551434678-e076c223a692','1496181133206-80ce9b88a853','1460925895917-afdab827c52f'],
    showcase: '1551434678-e076c223a692',
    gallery:  ['1551288049-bebda4e38f71','1504384308090-c894fdcc538d','1517694712202-14dd9538aa97','1556761175-5973dc0f32e7','1531403009284-440f080d1e12','1498050108023-c5249f4df085'],
    team:     ['1507003211169-0a1dd7228f2d','1438761681033-6461ffad8d80','1472099645785-5658abf4ff4e','1534528741775-53994a69daeb'],
  },
  agency: {
    hero:     ['1497366216548-37526070297c','1497366811353-6870744d04b2','1522202176988-66273c2fd55f'],
    showcase: '1522202176988-66273c2fd55f',
    gallery:  ['1542744173-8e7e53415bb0','1556761175-b413da4baf72','1559136555-9303baea8ebd','1531973576160-7125cd663d86','1553877522-43269d4ea984','1434626881859-4b2b9e2b81e8'],
    team:     ['1507003211169-0a1dd7228f2d','1500648767791-00dcc994a43e','1438761681033-6461ffad8d80','1472099645785-5658abf4ff4e'],
  },
  business: {
    hero:     ['1486406146926-c627a92ad1ab','1497215842964-222b430dc094','1507679799987-c73779587ccf'],
    showcase: '1497215842964-222b430dc094',
    gallery:  ['1568992687947-868a62a9f521','1454165804606-c3d57bc86b40','1556740738-b6a63e27c4df','1521737604893-d14cc237f11d','1531482615713-2afd69097998','1542744173-8e7e53415bb0'],
    team:     ['1507003211169-0a1dd7228f2d','1438761681033-6461ffad8d80','1534528741775-53994a69daeb','1472099645785-5658abf4ff4e'],
  },
};

// ---------------------------------------------------------------------------
// Mood → CSS architecture tokens
// ---------------------------------------------------------------------------
interface MoodTokens {
  fontHref: string;
  display: string;
  body: string;
  bg: string; surface: string; text: string; muted: string; border: string;
  radius: string;
  headingCase: string;
  headingWeight: number;
  headingTracking: string;
  heroSize: string;      // clamp for h1 in hero
  h2Size: string;        // clamp for section headings
  btnShape: string;      // border-radius for buttons
  dark: boolean;
  shadow: string;
  sectionPad: string;
}

const MOOD_TOKENS: Record<DesignMood, MoodTokens> = {
  'cinematic-dark': {
    fontHref:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800;900&family=Barlow:wght@400;500&display=swap',
    display:"'Barlow Condensed',sans-serif", body:"'Barlow',sans-serif",
    bg:'#04050a', surface:'#0c0d14', text:'#f0f0f4', muted:'#60637a', border:'rgba(255,255,255,.07)',
    radius:'6px', headingCase:'uppercase', headingWeight:900, headingTracking:'-.01em',
    heroSize:'clamp(3.6rem,9vw,7.2rem)', h2Size:'clamp(2.2rem,5vw,4rem)',
    btnShape:'4px', dark:true, shadow:'0 20px 50px -15px rgba(0,0,0,.7)', sectionPad:'clamp(70px,9vw,130px)',
  },
  'athletic-bold': {
    fontHref:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600&display=swap',
    display:"'Barlow Condensed',sans-serif", body:"'Barlow',sans-serif",
    bg:'#0a0a0c', surface:'#141418', text:'#f5f5f7', muted:'#8a8a9a', border:'rgba(255,255,255,.09)',
    radius:'8px', headingCase:'uppercase', headingWeight:800, headingTracking:'-.01em',
    heroSize:'clamp(3rem,8vw,6.5rem)', h2Size:'clamp(2rem,4.8vw,3.6rem)',
    btnShape:'6px', dark:true, shadow:'0 16px 44px -12px rgba(0,0,0,.65)', sectionPad:'clamp(64px,8vw,116px)',
  },
  'minimal-clean': {
    fontHref:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap',
    display:"'Inter',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif",
    bg:'#fafafa', surface:'#fff', text:'#111', muted:'#777', border:'#e4e4e4',
    radius:'4px', headingCase:'none', headingWeight:300, headingTracking:'-.04em',
    heroSize:'clamp(2.8rem,7vw,5.8rem)', h2Size:'clamp(1.8rem,3.8vw,2.8rem)',
    btnShape:'3px', dark:false, shadow:'0 8px 30px -8px rgba(0,0,0,.12)', sectionPad:'clamp(80px,10vw,144px)',
  },
  'editorial-elegant': {
    fontHref:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500&display=swap',
    display:"'Cormorant Garamond',Georgia,serif", body:"'Jost',system-ui,sans-serif",
    bg:'#fdf8f2', surface:'#fff', text:'#241b14', muted:'#7a6e62', border:'#e6d8c8',
    radius:'3px', headingCase:'none', headingWeight:600, headingTracking:'0',
    heroSize:'clamp(2.8rem,6.5vw,5.4rem)', h2Size:'clamp(2rem,4vw,3.2rem)',
    btnShape:'2px', dark:false, shadow:'0 10px 40px -10px rgba(60,30,10,.18)', sectionPad:'clamp(72px,9vw,132px)',
  },
  'tech-modern': {
    fontHref:'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap',
    display:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif",
    bg:'#0b0f1a', surface:'#111826', text:'#e8edf5', muted:'#8892a4', border:'rgba(255,255,255,.09)',
    radius:'12px', headingCase:'none', headingWeight:700, headingTracking:'-.025em',
    heroSize:'clamp(2.6rem,5.8vw,4.8rem)', h2Size:'clamp(1.9rem,3.8vw,3rem)',
    btnShape:'999px', dark:true, shadow:'0 14px 40px -12px rgba(0,0,0,.6)', sectionPad:'clamp(68px,8vw,120px)',
  },
  'warm-inviting': {
    fontHref:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@300;400;500&display=swap',
    display:"'Cormorant Garamond',Georgia,serif", body:"'Jost',system-ui,sans-serif",
    bg:'#fef9f0', surface:'#fffbf5', text:'#2c1f18', muted:'#7a6e62', border:'#e8d9c4',
    radius:'4px', headingCase:'none', headingWeight:600, headingTracking:'0',
    heroSize:'clamp(2.8rem,6vw,5rem)', h2Size:'clamp(1.9rem,3.8vw,3rem)',
    btnShape:'2px', dark:false, shadow:'0 10px 40px -10px rgba(60,30,10,.15)', sectionPad:'clamp(68px,9vw,128px)',
  },
  'creative-expressive': {
    fontHref:'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap',
    display:"'Syne',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif",
    bg:'#f5f4ef', surface:'#fdfcf8', text:'#0d0d0d', muted:'#666', border:'#ddd',
    radius:'20px', headingCase:'none', headingWeight:800, headingTracking:'-.03em',
    heroSize:'clamp(3rem,7.5vw,6rem)', h2Size:'clamp(2rem,4.5vw,3.4rem)',
    btnShape:'999px', dark:false, shadow:'0 12px 40px -10px rgba(0,0,0,.14)', sectionPad:'clamp(72px,9vw,128px)',
  },
  'professional-trust': {
    fontHref:'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;500;600&display=swap',
    display:"'Merriweather',Georgia,serif", body:"'Source Sans 3',system-ui,sans-serif",
    bg:'#ffffff', surface:'#f4f7fa', text:'#0f2540', muted:'#5b6b7e', border:'#dde6ef',
    radius:'10px', headingCase:'none', headingWeight:700, headingTracking:'-.01em',
    heroSize:'clamp(2.4rem,5.4vw,4.4rem)', h2Size:'clamp(1.9rem,3.6vw,2.9rem)',
    btnShape:'8px', dark:false, shadow:'0 10px 36px -10px rgba(15,37,64,.16)', sectionPad:'clamp(68px,8vw,120px)',
  },
};

// ---------------------------------------------------------------------------
// Color resolution
// ---------------------------------------------------------------------------
interface ColorSet { primary: string; secondary: string; accent: string }

function resolveColors(mood: DesignMood, design: DesignDNAArtifact | undefined, fp: number): ColorSet {
  const p = design?.colorPalette;
  let primary = p?.primary ?? '#2563eb';
  let secondary = p?.secondary ?? '#7c3aed';
  let accent = p?.accent ?? '#06b6d4';

  // For neon moods, override dull defaults with vivid palettes
  if (mood === 'cinematic-dark' || mood === 'athletic-bold') {
    const neons: [string, string, string][] = [
      ['#ff3b30','#ff9500','#ff2d55'], ['#00e676','#00b0ff','#29b6f6'],
      ['#ffcc00','#ff6b00','#ff3b30'], ['#e040fb','#7c4dff','#00e5ff'],
    ];
    const pick = neons[fp % neons.length];
    primary = p?.primary && p.primary !== '#1d4ed8' ? p.primary : pick[0];
    accent  = pick[1]; secondary = pick[2];
  }
  if (mood === 'minimal-clean') {
    primary = '#111'; secondary = '#555'; accent = '#111';
  }
  if (mood === 'warm-inviting' || mood === 'editorial-elegant') {
    primary = p?.primary && p.primary !== '#1d4ed8' ? p.primary : '#8b4513';
    secondary = '#c8860a'; accent = '#d4a96a';
  }
  // Rotate primary/secondary based on fingerprint bit
  if ((fp & 1) === 1 && mood !== 'minimal-clean' && mood !== 'cinematic-dark') {
    const tmp = primary; primary = secondary; secondary = tmp;
  }
  return { primary, secondary, accent };
}

// ---------------------------------------------------------------------------
// CSS builder — shared structural CSS + mood-specific tokens
// ---------------------------------------------------------------------------
function buildCSS(t: MoodTokens, c: ColorSet): string {
  const onDark = '#ffffff';
  const onLight = '#ffffff';
  const btnOnColor = t.dark ? onDark : onLight;
  const gradMain = `linear-gradient(120deg,${c.primary},${c.secondary} 55%,${c.accent})`;

  return `
:root{
  --bg:${t.bg};--surf:${t.surface};--text:${t.text};--muted:${t.muted};--bdr:${t.border};
  --primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};
  --on-primary:${btnOnColor};
  --display:${t.display};--body:${t.body};
  --radius:${t.radius};--shadow:${t.shadow};
  --grad:${gradMain};
  --pad:${t.sectionPad};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--body);background:var(--bg);color:var(--text);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,.display{font-family:var(--display);line-height:1.06;letter-spacing:${t.headingTracking};font-weight:${t.headingWeight};text-transform:${t.headingCase}}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
section{padding:var(--pad) 0}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:${t.btnShape};font-family:var(--body);font-size:1rem;font-weight:600;cursor:pointer;border:2px solid transparent;transition:transform .25s,box-shadow .25s,background .22s,color .22s,border-color .22s;${t.headingCase==='uppercase'?'text-transform:uppercase;letter-spacing:.06em;font-size:.95rem':''}}.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--grad);color:var(--on-primary);box-shadow:0 12px 32px -10px ${c.primary}}
.btn-primary:hover{box-shadow:0 20px 44px -10px ${c.primary}}
.btn-outline{background:transparent;border-color:${t.dark?'rgba(255,255,255,.35)':t.border};color:var(--text)}
.btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.btn-white{background:#fff;color:${c.primary}}

/* NAV */
header{position:fixed;top:0;left:0;right:0;z-index:100;transition:all .3s}
header.scrolled{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--bdr);box-shadow:var(--shadow)}
.nav{display:flex;align-items:center;justify-content:space-between;height:76px}
.logo{font-family:var(--display);font-size:1.4rem;font-weight:${t.headingWeight};text-transform:${t.headingCase};display:flex;align-items:center;gap:10px}
.logo .mark{width:38px;height:38px;border-radius:${t.radius};background:var(--grad);display:grid;place-items:center;color:#fff;font-size:1.05rem}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{font-size:.96rem;color:var(--muted);font-weight:500;text-transform:${t.headingCase};transition:color .2s;position:relative}
.nav-links a::after{content:'';position:absolute;left:0;bottom:-5px;width:0;height:2px;background:var(--primary);transition:width .25s}
.nav-links a:hover,.nav-links a.active{color:var(--text)}.nav-links a:hover::after,.nav-links a.active::after{width:100%}
.burger{display:none;background:none;border:0;cursor:pointer;padding:8px;color:var(--text)}
.burger svg{display:block}
.mobile-nav{display:none;flex-direction:column;position:fixed;top:76px;left:0;right:0;background:color-mix(in srgb,var(--bg) 97%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--bdr);padding:12px 24px 20px;z-index:99}
.mobile-nav a{padding:13px 0;border-bottom:1px solid var(--bdr);font-weight:500;text-transform:${t.headingCase};display:block;color:var(--text)}

/* HERO — variants */
.hero{position:relative;overflow:hidden}
.hero-split{padding-top:clamp(120px,14vw,180px);padding-bottom:clamp(60px,7vw,100px)}
.hero-split .grid{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
.hero-split h1{font-size:${t.heroSize};margin:18px 0 20px}
.hero-split .lead{font-size:clamp(1.05rem,1.6vw,1.26rem);color:var(--muted);max-width:540px;margin-bottom:30px}
.hero-split .ctas{display:flex;gap:12px;flex-wrap:wrap}
.hero-split .trust{margin-top:34px;display:flex;align-items:center;gap:14px;color:var(--muted);font-size:.9rem}
.hero-media{border-radius:calc(${t.radius} * 2);overflow:hidden;background:var(--grad);box-shadow:var(--shadow)}
.hero-media img{width:100%;aspect-ratio:4/5;object-fit:cover}
.hero-fullbleed{min-height:95vh;display:flex;align-items:flex-end;padding-bottom:clamp(56px,8vw,100px)}
.hero-fullbleed .bg-img{position:absolute;inset:0;z-index:-1}
.hero-fullbleed .bg-img img{width:100%;height:100%;object-fit:cover}
.hero-fullbleed::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.28) 0,rgba(0,0,0,.5) 55%,${t.bg} 100%)}
.hero-fullbleed h1{font-size:${t.heroSize};color:#fff;max-width:14ch;margin:16px 0}
.hero-fullbleed .lead{color:rgba(255,255,255,.82);max-width:600px;font-size:clamp(1rem,1.6vw,1.2rem);margin-bottom:28px}
.hero-centered{padding-top:clamp(130px,16vw,200px);padding-bottom:clamp(60px,7vw,100px);text-align:center}
.hero-centered h1{font-size:${t.heroSize};max-width:12ch;margin:14px auto 20px}
.hero-centered .lead{max-width:540px;margin:0 auto 30px;color:var(--muted)}
.hero-tag{display:inline-flex;align-items:center;gap:8px;padding:7px 15px;border-radius:999px;background:color-mix(in srgb,var(--primary) 15%,transparent);color:var(--primary);font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:1px solid color-mix(in srgb,var(--primary) 25%,transparent)}
.hero-tag .dot{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:blink 2.4s infinite}
@keyframes blink{50%{opacity:.3}}

/* MARQUEE */
.marquee{overflow:hidden;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);background:var(--surf);padding:20px 0}
.marquee-track{display:flex;gap:50px;white-space:nowrap;animation:mq 26s linear infinite;font-family:var(--display);font-size:1.25rem;font-weight:${t.headingWeight};text-transform:${t.headingCase};color:var(--muted);opacity:.7}
@keyframes mq{to{transform:translateX(-50%)}}

/* SECTION HEADS */
.sec-head{max-width:660px;margin:0 auto clamp(40px,5vw,60px);text-align:center}
.sec-head h2{font-size:${t.h2Size};margin-bottom:14px}
.sec-head p{color:var(--muted);font-size:1.08rem}
.sec-head.left{margin-left:0;text-align:left}

/* CARDS */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:32px 28px;transition:transform .3s,box-shadow .3s,border-color .3s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--grad);transform:scaleX(0);transition:transform .35s;transform-origin:left}
.card:hover{transform:translateY(-6px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--primary) 35%,transparent)}.card:hover::before{transform:scaleX(1)}
.card .n{font-family:var(--display);font-size:2.4rem;font-weight:${t.headingWeight};background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:12px;display:block;text-transform:${t.headingCase}}
.card h3{font-size:1.28rem;margin-bottom:8px}
.card p{color:var(--muted)}

/* SHOWCASE SPLIT */
.showcase{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.showcase.flip .s-img{order:-1}
.showcase h2{font-size:${t.h2Size};margin-bottom:16px}
.showcase .desc{color:var(--muted);font-size:1.08rem;line-height:1.7;margin-bottom:24px}
.showcase ul{list-style:none;display:grid;gap:12px;margin-bottom:28px}
.showcase li{display:flex;align-items:flex-start;gap:10px;font-weight:500}
.showcase li svg{color:var(--accent);flex-shrink:0;margin-top:2px}
.s-img{border-radius:calc(${t.radius}*1.5);overflow:hidden;background:var(--grad);box-shadow:var(--shadow)}
.s-img img{width:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .7s}
.s-img:hover img{transform:scale(1.04)}

/* GALLERY / TILES */
.tile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tile{position:relative;border-radius:var(--radius);overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--secondary));cursor:pointer;aspect-ratio:4/3}
.tile img{width:100%;height:100%;object-fit:cover;transition:transform .55s}
.tile:hover img{transform:scale(1.08)}
.tile .lbl{position:absolute;left:0;right:0;bottom:0;padding:18px;color:#fff;background:linear-gradient(0deg,rgba(0,0,0,.7),transparent);z-index:1}
.tile .lbl b{font-family:var(--display);font-size:1.15rem;display:block;font-weight:${t.headingWeight};text-transform:${t.headingCase}}
.tile .lbl span{font-size:.8rem;opacity:.8;text-transform:uppercase;letter-spacing:.08em}

/* STATS */
.stats-band{background:var(--surf);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);text-align:center}
.stat-item{padding:clamp(32px,5vw,60px) 20px;border-right:1px solid var(--bdr)}.stat-item:last-child{border-right:0}
.stat-n{font-family:var(--display);font-size:clamp(2.4rem,5vw,3.8rem);font-weight:${t.headingWeight};background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;text-transform:${t.headingCase}}
.stat-l{color:var(--muted);font-weight:500;margin-top:6px;font-size:.96rem}

/* TESTIMONIALS */
.q-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:32px;display:flex;flex-direction:column;gap:16px}
.q-card .stars{display:flex;gap:3px;color:var(--accent)}
.q-card blockquote{font-size:1.08rem;font-weight:500;line-height:1.55;flex:1;font-family:${t.dark?"var(--body)":"var(--display)"}}
.q-card .who{display:flex;align-items:center;gap:12px;padding-top:14px;border-top:1px solid var(--bdr)}
.q-card .ava{width:46px;height:46px;border-radius:50%;overflow:hidden;background:var(--grad);flex-shrink:0}
.q-card .ava img{width:100%;height:100%;object-fit:cover}
.q-card b{display:block;font-family:var(--display);font-size:1rem;text-transform:${t.headingCase}}
.q-card small{color:var(--muted);font-size:.83rem}

/* CTA BAND */
.cta-band{border-radius:calc(${t.radius}*2);padding:clamp(48px,7vw,88px) 32px;text-align:center;color:#fff;overflow:hidden;position:relative;background:var(--grad);box-shadow:var(--shadow)}
.cta-band::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.2),transparent 50%);pointer-events:none}
.cta-band h2{font-size:clamp(2rem,4.5vw,3.2rem);margin-bottom:12px;position:relative}
.cta-band p{font-size:1.15rem;opacity:.93;margin-bottom:28px;position:relative}

/* PRICING */
.price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:start}
.price-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:34px 28px}
.price-card.featured{border-color:var(--primary);border-width:2px;position:relative;transform:scale(1.03)}
.price-card .badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--grad);color:#fff;border-radius:999px;padding:4px 16px;font-size:.78rem;font-weight:700;white-space:nowrap;text-transform:uppercase;letter-spacing:.06em}
.price-card h3{font-size:1.2rem;margin-bottom:8px}
.price-card .amount{font-family:var(--display);font-size:2.8rem;font-weight:${t.headingWeight};margin:14px 0 4px;text-transform:${t.headingCase};background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.price-card .per{font-size:.86rem;color:var(--muted);margin-bottom:22px}
.price-card ul{list-style:none;display:grid;gap:10px;margin-bottom:26px}
.price-card li{display:flex;align-items:center;gap:9px;font-size:.95rem;color:var(--muted)}
.price-card li svg{color:var(--accent);flex-shrink:0}

/* TEAM */
.team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.team-card{text-align:center}
.team-photo{border-radius:var(--radius);overflow:hidden;background:var(--grad);aspect-ratio:1/1;margin-bottom:14px}
.team-photo img{width:100%;height:100%;object-fit:cover}
.team-card h3{font-size:1.15rem;margin-bottom:4px}
.team-card span{font-size:.88rem;color:var(--muted)}

/* CONTACT */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
.contact-info{display:grid;gap:14px;margin-top:24px}
.contact-info-row{display:flex;align-items:flex-start;gap:12px;font-weight:500;font-size:.98rem}
.contact-info-row::before{content:'→';color:var(--primary);font-size:1.1rem;margin-top:1px;flex-shrink:0}
form{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:32px;display:grid;gap:14px}
label{font-size:.82rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
input,textarea,select{width:100%;padding:13px 15px;border-radius:${t.btnShape};border:1px solid var(--bdr);background:var(--bg);color:var(--text);font-family:var(--body);font-size:.98rem;transition:border-color .2s,box-shadow .2s}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 16%,transparent)}
textarea{resize:vertical;min-height:120px}

/* FOOTER */
footer{background:var(--surf);border-top:1px solid var(--bdr);padding:62px 0 28px}
.foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px}
.foot-grid h4{font-family:var(--display);font-size:1rem;font-weight:${t.headingWeight};text-transform:${t.headingCase};margin-bottom:14px}
.foot-grid a{display:block;color:var(--muted);padding:5px 0;font-size:.92rem;transition:color .2s}.foot-grid a:hover{color:var(--primary)}
.foot-desc{color:var(--muted);max-width:270px;font-size:.92rem;line-height:1.6;margin-top:12px}
.foot-bottom{border-top:1px solid var(--bdr);padding-top:22px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:.86rem;flex-wrap:wrap;gap:10px}

/* ABOUT PAGE */
.page-hero{padding:clamp(110px,14vw,170px) 0 clamp(48px,6vw,80px)}
.page-hero h1{font-size:${t.h2Size};margin-bottom:16px}
.page-hero p{color:var(--muted);font-size:1.1rem;max-width:620px}
.values-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.value-item{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:28px 24px}
.value-item h3{font-size:1.2rem;margin-bottom:8px}
.value-item p{color:var(--muted);font-size:.96rem}
.value-item .n{font-family:var(--display);font-size:2rem;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:10px;display:block;text-transform:${t.headingCase}}

/* MENU / GALLERY PAGE */
.menu-section{padding-top:clamp(110px,14vw,170px)}
.menu-intro{margin-bottom:clamp(40px,5vw,60px)}
.menu-category{margin-bottom:clamp(48px,6vw,80px)}
.menu-category h2{font-size:${t.h2Size};margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid ${c.primary}}
.menu-items{display:grid;gap:14px}
.menu-item{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;padding:20px 0;border-bottom:1px solid var(--bdr)}
.menu-item h3{font-size:1.15rem;margin-bottom:4px}
.menu-item p{color:var(--muted);font-size:.94rem}
.menu-item .price{font-family:var(--display);font-size:1.3rem;font-weight:${t.headingWeight};color:var(--primary);text-transform:${t.headingCase};white-space:nowrap}

/* REVEAL */
.reveal{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.4,0,.2,1),transform .7s cubic-bezier(.4,0,.2,1)}
.reveal.in{opacity:1;transform:none}

@media(max-width:920px){
  .hero-split .grid,.showcase,.contact-grid,.grid-2{grid-template-columns:1fr}
  .showcase.flip .s-img{order:0}
  .hero-media{max-width:480px;margin:0 auto}
  .grid-3,.grid-4,.tile-grid{grid-template-columns:1fr 1fr}
  .stats-row{grid-template-columns:1fr 1fr}.stat-item{border-right:0;border-bottom:1px solid var(--bdr)}.stat-item:last-child{border-bottom:0}
  .foot-grid,.price-grid{grid-template-columns:1fr 1fr}
  .team-grid{grid-template-columns:1fr 1fr}
  .values-grid{grid-template-columns:1fr}
  .nav-links{display:none}.burger{display:block}.nav-cta{display:none}
}
@media(max-width:580px){
  .grid-3,.grid-4,.tile-grid,.foot-grid,.price-grid,.team-grid{grid-template-columns:1fr}
  .price-card.featured{transform:none}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
  `;
}

// ---------------------------------------------------------------------------
// Niche copy for all pages
// ---------------------------------------------------------------------------
interface NicheContent {
  tagline: string;
  heroHead: (b: string) => string;
  heroSub: string;
  primaryCta: string;
  secondaryCta: string;
  gallerySlug: string; // URL slug for the gallery/menu/work page
  galleryLabel: string;
  features: { title: string; body: string }[];
  showcase: { title: string; body: string; points: string[] };
  gallery: { title: string; sub: string; items: { label: string; meta: string }[] };
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  cta: { title: string; body: string };
  about: { title: string; sub: string; story: string; values: { title: string; body: string }[] };
  pricing?: { plans: { name: string; price: string; period: string; features: string[]; featured?: boolean }[] };
  contact: { title: string; sub: string };
  teamBio: string;
}

function buildNicheContent(niche: Niche): NicheContent {
  const map: Record<Niche, NicheContent> = {
    sports: {
      tagline:'Built for the game',
      heroHead:(b)=>`Dominate with <span class="grad">${b}</span>`,
      heroSub:'Performance gear engineered for athletes who refuse to settle. Built for speed, built for impact, built to win.',
      primaryCta:'Shop the drop', secondaryCta:'View all gear',
      gallerySlug:'gear', galleryLabel:'Gear',
      features:[
        {title:'Pro-grade tech',body:'Same materials trusted by elite players on the biggest stages.'},
        {title:'Lightweight speed',body:'Maximum responsiveness with minimum weight — nothing slows you down.'},
        {title:'Built to endure',body:'Tested to outlast the grind. This gear shows up every single game.'},
      ],
      showcase:{title:'Train harder. Play longer.',body:'Every product is pressure-tested by athletes before it reaches you. From the hardwood to the blacktop — gear that performs when the clock is running out.',points:['Worn by pros and amateurs alike','Engineered for explosive movement','Backed by a performance guarantee']},
      gallery:{title:'The lineup',sub:'Hand-picked gear for every athlete in the game.',items:[{label:'Signature kicks',meta:'Footwear'},{label:'Pro jerseys',meta:'Apparel'},{label:'Game balls',meta:'Equipment'},{label:'Compression',meta:'Base layer'},{label:'Training packs',meta:'Practice'},{label:'Court accessories',meta:'Extras'}]},
      stats:[{value:'50K+',label:'Athletes equipped'},{value:'4.9★',label:'Player rating'},{value:'24h',label:'Fast shipping'}],
      testimonials:[{quote:'Best gear I have ever played in. The grip and feel are unreal on court.',name:'Marcus Reyes',role:'Point guard'},{quote:'Took a full season of abuse and still looks brand new. These guys get it.',name:'DeShawn Cole',role:'Forward'},{quote:'My team all ordered from here. Fast shipping and the fit is perfect.',name:'Coach Rivera',role:'Head coach'}],
      cta:{title:'Ready to level up?',body:'Gear up with the kit trusted by players who play to win.'},
      about:{title:'Our story',sub:'Started by athletes. Built for athletes.',story:'We built this brand because we were tired of choosing between quality and price. Every product we carry has been tested by real athletes in real games — not just in a lab. If it does not perform, it does not make the cut.',values:[{title:'Performance first',body:'We never compromise on how gear performs in the game.'},{title:'Athlete-tested',body:'Every product passes real-world athlete testing before launch.'},{title:'Inclusive sport',body:'Great gear should be accessible — not just for the pros.'},{title:'Built to last',body:'We design for durability so you buy once, not twice.'}]},
      contact:{title:'Get on the team',sub:'Questions about sizing, drops, or team orders? We will get you suited up fast.'},
      teamBio:'Our team is made up of former athletes and coaches who know exactly what you need on the court.',
    },
    restaurant: {
      tagline:'Crafted daily',
      heroHead:(b)=>`A taste worth <span class="grad">remembering</span> at ${b}`,
      heroSub:'Seasonal ingredients, bold flavors, and an atmosphere designed for the people you love. Reserve a table or order ahead.',
      primaryCta:'Reserve a table', secondaryCta:'View our menu',
      gallerySlug:'menu', galleryLabel:'Menu',
      features:[{title:'Seasonal menu',body:'A rotating menu built around the freshest local produce each week.'},{title:'Crafted with care',body:'Recipes perfected over years, plated by a team that treats every dish as art.'},{title:'Award-winning',body:'Recognised by critics, loved by regulars who keep coming back for more.'}],
      showcase:{title:'Where every detail is intentional',body:'From the first sip to the last bite, the experience is designed to slow you down and savour the moment. Warm lighting, considered plating, and service that anticipates what you need.',points:['Locally sourced, seasonally inspired','A wine list curated to match','Service that feels like home']},
      gallery:{title:'From our kitchen',sub:'A glimpse of what is waiting on your table tonight.',items:[{label:'Signature plate',meta:'Chef special'},{label:'Fresh starters',meta:'To begin'},{label:'House mains',meta:'The heart'},{label:'Dessert of the day',meta:'Sweet'},{label:'Seasonal drinks',meta:'To sip'},{label:'Sunday brunch',meta:'Weekends'}]},
      stats:[{value:'4.9',label:'Average rating'},{value:'120+',label:'Dishes daily'},{value:'15K',label:'Happy guests'}],
      testimonials:[{quote:'The best dining experience in the city. Every dish told a story.',name:'Maria Santos',role:'Food critic'},{quote:'The ambiance, the flavours, the service — flawless from start to finish.',name:'James Cruz',role:'Regular guest'},{quote:'We book this place for every celebration. It never disappoints.',name:'Liza Reyes',role:'Local foodie'}],
      cta:{title:'Hungry yet?',body:'Reserve your table now and taste the difference a little care makes.'},
      about:{title:'Our story',sub:'A kitchen built on passion, a table built on community.',story:'This restaurant was born from a simple belief: that food should bring people together. We have been doing this for years and the philosophy has never changed — seasonal ingredients, honest cooking, and a room that makes you feel welcome the moment you walk in.',values:[{title:'Seasonal always',body:'Our menu changes with what is fresh, local and at its best.'},{title:'Zero waste kitchen',body:'We cook with full respect for ingredients and for the planet.'},{title:'Community roots',body:'We partner with local farms and producers we trust and believe in.'},{title:'Inclusive table',body:'Every guest deserves to feel special — that is not negotiable.'}]},
      contact:{title:'Find us',sub:'Book a table, ask about private events, or just say hello.'},
      teamBio:'Our kitchen is led by chefs who have spent years mastering their craft — and who still get excited about every service.',
    },
    portfolio: {
      tagline:'Selected work',
      heroHead:(b)=>`Work that <span class="grad">speaks</span> — by ${b}`,
      heroSub:'A curated collection of projects built with intention, craft, and an obsessive eye for detail. Let us make something that lasts.',
      primaryCta:'View the work', secondaryCta:'Get in touch',
      gallerySlug:'work', galleryLabel:'Work',
      features:[{title:'Concept-led',body:'Every project begins with a clear idea and ends with work that earns attention.'},{title:'Craft all the way',body:'From brief to delivery, handled with care and relentless attention to the details that matter.'},{title:'Genuinely original',body:'No templates, no shortcuts — work that could only come from here.'}],
      showcase:{title:'A process built on craft',body:'Great work is not an accident. It is the result of deep listening, sharp thinking, and a commitment to getting the details right — the ones most people never notice but always feel.',points:['Concept-led, never formulaic','Obsessive about the details','Collaborative from the start']},
      gallery:{title:'Featured projects',sub:'A selection of recent work across brand, editorial and motion.',items:[{label:'Brand identity',meta:'2025'},{label:'Editorial design',meta:'2025'},{label:'Product design',meta:'2024'},{label:'Motion study',meta:'2024'},{label:'Art direction',meta:'2024'},{label:'Case study',meta:'2023'}]},
      stats:[{value:'80+',label:'Projects shipped'},{value:'12',label:'Awards won'},{value:'9yr',label:'Of craft'}],
      testimonials:[{quote:'A rare talent. The work elevated our entire brand overnight.',name:'Andrea Lim',role:'Creative Director'},{quote:'Thoughtful, precise, and genuinely original. A joy to collaborate with.',name:'Marcus Tan',role:'Founder'},{quote:'Delivered beyond the brief, on time. I would work with them again instantly.',name:'Sofia Reyes',role:'Head of Brand'}],
      cta:{title:'Have a project in mind?',body:'Let us talk about bringing your vision to life.'},
      about:{title:'About me',sub:'A designer obsessed with the details that people feel but cannot name.',story:'I have been doing this for nearly a decade, working with brands from early-stage startups to global companies. What has never changed is the approach: start with the idea, get the thinking right, then chase the execution until it is perfect.',values:[{title:'Concept first',body:'Good design starts with clear thinking, not a colour palette.'},{title:'Craft matters',body:'The details that seem small are usually the ones people remember.'},{title:'Client partnership',body:'The best work comes from genuine collaboration and open dialogue.'},{title:'Honest work',body:'I only put my name on work I am genuinely proud of.'}]},
      contact:{title:'Work together',sub:'Got a brief, a half-formed idea, or just want to chat? Drop a line.'},
      teamBio:'I work with a small network of trusted collaborators — writers, developers, photographers — to deliver complete projects.',
    },
    ecommerce: {
      tagline:'New collection',
      heroHead:(b)=>`Pieces you will <span class="grad">love</span>, from ${b}`,
      heroSub:'Thoughtfully designed, ethically made, and delivered to your door. Discover pieces built to last and made to be loved.',
      primaryCta:'Shop the collection', secondaryCta:'Our story',
      gallerySlug:'shop', galleryLabel:'Shop',
      features:[{title:'Free shipping',body:'Fast, tracked, and free on every order over a small minimum. No surprises.'},{title:'Quality guaranteed',body:'Every product is backed by our promise — love it or your money back.'},{title:'Ships in 24h',body:'Orders placed before 5pm ship the same day, straight from our warehouse.'}],
      showcase:{title:'Made to be loved, built to last',body:'We obsess over materials, fit and finish so you do not have to. Each piece is designed to earn a permanent place in your life — and look better the more you use it.',points:['Ethically sourced materials','Designed in-house, made to last','Free returns, always']},
      gallery:{title:'Best sellers',sub:'The pieces our customers cannot stop reordering.',items:[{label:'Bestseller No.1',meta:'In stock'},{label:'New arrival',meta:'Just dropped'},{label:'Limited edition',meta:'Few left'},{label:'Customer favorite',meta:'Top rated'},{label:'Back in stock',meta:'Restocked'},{label:'Essential pick',meta:'Staple'}]},
      stats:[{value:'50K+',label:'Orders shipped'},{value:'4.8',label:'Customer rating'},{value:'98%',label:'Would reorder'}],
      testimonials:[{quote:'The quality blew me away. Worth every peso and then some.',name:'Karla Mendoza',role:'Verified buyer'},{quote:'Fast shipping, beautiful packaging, and the product is gorgeous.',name:'Paolo Garcia',role:'Repeat customer'},{quote:'I have recommended this shop to everyone I know. Obsessed.',name:'Nina Flores',role:'Verified buyer'}],
      cta:{title:'Ready to treat yourself?',body:'Browse the collection and find your next favourite thing.'},
      about:{title:'Our story',sub:'We started with a simple promise: beautiful things that last.',story:'This brand was built on the belief that you should not have to choose between quality and affordability. We design everything in-house, work with ethical manufacturers, and stand behind every single product we sell.',values:[{title:'Ethical sourcing',body:'We work with certified suppliers who share our values around people and planet.'},{title:'Designed to last',body:'We design for longevity — not for the landfill.'},{title:'Transparent pricing',body:'We show you exactly what things cost to make and why we charge what we do.'},{title:'Community first',body:'Every purchase supports the small team behind this brand.'}]},
      contact:{title:'We are here to help',sub:'Questions about sizing, orders, or returns? Our team replies within one business day.'},
      teamBio:'We are a small, passionate team of designers and product lovers who care deeply about what we make and how we make it.',
    },
    saas: {
      tagline:'Now in early access',
      heroHead:(b)=>`The smarter way to <span class="grad">ship</span>, by ${b}`,
      heroSub:'One platform to plan, build, and ship faster. Automate the busywork and give your team the clarity to do their best work.',
      primaryCta:'Start free trial', secondaryCta:'Book a demo',
      gallerySlug:'features', galleryLabel:'Features',
      features:[{title:'Lightning fast',body:'Built for speed at every layer. No loading spinners, no waiting around.'},{title:'Secure by default',body:'Enterprise-grade security and compliance baked in from day one.'},{title:'Integrates everywhere',body:'Connects to the tools you already use so nothing falls through the cracks.'}],
      showcase:{title:'Everything your team needs in one place',body:'Stop switching between a dozen tools. Bring your workflows, data, and people into a single source of truth that actually scales with you.',points:['Real-time sync across your stack','Automations that save hours weekly','SOC 2 Type II compliant']},
      gallery:{title:'Built for every team',sub:'Powerful modules that work together out of the box.',items:[{label:'Dashboards',meta:'Insights'},{label:'Automations',meta:'No-code'},{label:'Analytics',meta:'Real-time'},{label:'Collaboration',meta:'Teams'},{label:'Integrations',meta:'100+ apps'},{label:'Reporting',meta:'Exports'}]},
      stats:[{value:'99.9%',label:'Uptime'},{value:'10K+',label:'Teams onboard'},{value:'40%',label:'Time saved'}],
      testimonials:[{quote:'This replaced four tools for us and our team has never been more aligned.',name:'Elena Park',role:'Head of Ops'},{quote:'Setup took ten minutes and paid for itself in the first week.',name:'Ben Carter',role:'Engineering Lead'},{quote:'Genuinely the best product in its category. Customers for life.',name:'Aisha Khan',role:'Product Manager'}],
      cta:{title:'Ready to move faster?',body:'Start your free trial today — no credit card required.'},
      about:{title:'About us',sub:'A team of builders who got tired of bad tools.',story:'We have all been on teams that spend more time managing tools than doing actual work. We built this platform to fix that — to give teams one place that is fast, flexible, and actually pleasant to use every day.',values:[{title:'Speed always',body:'Every decision we make optimises for how fast our users can work.'},{title:'Opinionated defaults',body:'We make the hard choices so you do not have to configure everything from scratch.'},{title:'Honest roadmap',body:'We share our roadmap publicly and build what our users actually ask for.'},{title:'No dark patterns',body:'We never trick users into upgrading or hide features behind confusing gates.'}]},
      pricing:{plans:[{name:'Starter',price:'Free',period:'forever',features:['Up to 3 projects','1 user','Basic analytics','Community support']},{name:'Pro',price:'₱999',period:'/month',features:['Unlimited projects','Up to 10 users','Advanced analytics','Priority support','Integrations'],featured:true},{name:'Enterprise',price:'Custom',period:'per team',features:['Unlimited everything','Custom roles & SSO','SLA guarantee','Dedicated account manager']}]},
      contact:{title:'Talk to us',sub:'Want a walkthrough or custom quote? Tell us about your team.'},
      teamBio:'We are a fully remote team of engineers, designers and customer success folks spread across Asia and Europe.',
    },
    agency: {
      tagline:'Full-service studio',
      heroHead:(b)=>`Growth, <span class="grad">engineered</span> by ${b}`,
      heroSub:'We partner with ambitious brands to design, build, and scale digital experiences that move the metrics that matter.',
      primaryCta:'Start a project', secondaryCta:'See our work',
      gallerySlug:'work', galleryLabel:'Work',
      features:[{title:'Strategy first',body:'We start with your goals and reverse-engineer the work that gets you there.'},{title:'Design and build',body:'A single team that designs, ships, and iterates — no handoffs, no friction.'},{title:'Built to scale',body:'Systems and brands designed to grow with you, not hold you back.'}],
      showcase:{title:'Your partners, not just providers',body:'We embed with your team, learn your business, and treat your goals as our own. The result is work that does not just look good — it performs in the market.',points:['Embedded, senior-led teams','Outcomes over deliverables','Transparent, weekly cadence']},
      gallery:{title:'Recent engagements',sub:'A look at the brands we have helped scale.',items:[{label:'Brand strategy',meta:'Strategy'},{label:'Web platform',meta:'Build'},{label:'Campaign',meta:'Growth'},{label:'Product launch',meta:'GTM'},{label:'Rebrand',meta:'Identity'},{label:'Growth sprint',meta:'Performance'}]},
      stats:[{value:'3.2x',label:'Average ROI'},{value:'60+',label:'Brands scaled'},{value:'100%',label:'Client retention'}],
      testimonials:[{quote:'They transformed our digital presence and doubled our pipeline in months.',name:'David Ong',role:'CEO'},{quote:'The most strategic partner we have ever worked with. Period.',name:'Rachel Yu',role:'VP Marketing'},{quote:'Sharp, fast, and relentlessly focused on outcomes. Highly recommend.',name:'Tomas Rivera',role:'Founder'}],
      cta:{title:'Let us build something that performs.',body:'Tell us about your goals and we will show you the path to get there.'},
      about:{title:'About the studio',sub:'A creative studio built on the belief that good work drives results.',story:'We started as a small group of strategists and designers who were frustrated with agencies that prioritised billable hours over actual outcomes. We built a different kind of studio — one that measures success in the results we drive for our clients, not the hours we log.',values:[{title:'Outcomes first',body:'We measure every engagement by the results we drive, not the hours we bill.'},{title:'Senior only',body:'Every project is run by senior strategists and designers — no juniors hidden in the back room.'},{title:'Radical transparency',body:'We tell you what we honestly think, even when it is uncomfortable to hear.'},{title:'Long-term partners',body:'Our best relationships are with clients we have grown with over years.'}]},
      contact:{title:'Start the conversation',sub:'Share a little about your project and we will set up an intro call this week.'},
      teamBio:'We are a senior team of strategists, designers, and engineers who have scaled brands across Southeast Asia and beyond.',
    },
    business: {
      tagline:'Welcome',
      heroHead:(b)=>`Building something <span class="grad">remarkable</span> with ${b}`,
      heroSub:'We help you do more of what you do best. Simple, reliable, and designed around the people you serve.',
      primaryCta:'Get started', secondaryCta:'Learn more',
      gallerySlug:'services', galleryLabel:'Services',
      features:[{title:'Built for you',body:'Tailored to your needs, designed to make everyday work feel effortless.'},{title:'Dependable',body:'Reliability you can count on, backed by a team that genuinely cares.'},{title:'People first',body:'Every decision starts and ends with the people we are here to serve.'}],
      showcase:{title:'Simple by design, powerful in practice',body:'We strip away the complexity so you can focus on what matters. The result is something that just works — quietly, reliably, every single day.',points:['Trusted by businesses like yours','Clear pricing, no surprises','Real support from real people']},
      gallery:{title:'What we offer',sub:'Solutions designed to help you grow with confidence.',items:[{label:'Core service',meta:'Foundation'},{label:'Premium tier',meta:'Scale'},{label:'Support',meta:'Always on'},{label:'Consulting',meta:'Expert'},{label:'Onboarding',meta:'Guided'},{label:'Resources',meta:'Free'}]},
      stats:[{value:'10yr',label:'In business'},{value:'5K+',label:'Customers served'},{value:'4.9',label:'Satisfaction'}],
      testimonials:[{quote:'A trustworthy partner that consistently delivers. Could not ask for more.',name:'Grace Lim',role:'Client'},{quote:'Professional, responsive, and genuinely invested in our success.',name:'Henry Sy',role:'Customer'},{quote:'They made the whole process effortless. Highly recommended.',name:'Mae Tan',role:'Client'}],
      cta:{title:'Let us get started.',body:'Reach out today and see how we can help you grow.'},
      about:{title:'About us',sub:'A business built on honest work and genuine care.',story:'We have been doing this for over a decade and what has never changed is the core belief: do the work right, treat people well, and the rest takes care of itself. We are not the biggest and we are not trying to be — we are trying to be the best at what we do for the people who trust us.',values:[{title:'Trustworthy',body:'We do what we say and say what we do. Every time.'},{title:'Accessible',body:'We are always available and always responsive to the people we serve.'},{title:'Honest pricing',body:'No hidden fees, no surprise costs — just clear, fair value.'},{title:'Quality obsessed',body:'We hold ourselves to high standards because our clients deserve it.'}]},
      contact:{title:'Get in touch',sub:'Have a question or ready to begin? Send a message and we will reply within one business day.'},
      teamBio:'Our team has decades of combined experience and a genuine passion for helping businesses grow and succeed.',
    },
  };
  return map[niche];
}

// ---------------------------------------------------------------------------
// Shared shell: head + nav + footer
// ---------------------------------------------------------------------------
function buildHead(brand: string, pageTitle: string, desc: string, t: MoodTokens, css: string, base: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(pageTitle)} — ${esc(brand)}</title>
<meta name="description" content="${esc(desc)}"/>
${base ? `<base href="${base}" target="_top"/>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fontHref}" rel="stylesheet">
<style>${css}</style>
</head>`;
}

function buildNav(brand: string, navItems: Array<{label:string;href:string}>, primaryCta: string, active: string): string {
  const links = navItems.map(n => `<a href="${n.href}"${n.href===active?` class="active"`:''}>${esc(n.label)}</a>`).join('');
  const mobile = navItems.map(n => `<a href="${n.href}">${esc(n.label)}</a>`).join('');
  const initial = brand.charAt(0).toUpperCase();
  return `
<header>
  <div class="wrap nav">
    <a class="logo" href="."><span class="mark">${initial}</span>${esc(brand)}</a>
    <nav class="nav-links">${links}</nav>
    <div class="nav-cta"><a class="btn btn-primary" href="contact">${esc(primaryCta)}</a></div>
    <button class="burger" onclick="var m=document.querySelector('.mobile-nav');m.style.display=m.style.display==='flex'?'none':'flex'" aria-label="Menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
  </div>
  <nav class="mobile-nav">${mobile}<a class="btn btn-primary" href="contact" style="margin-top:12px;justify-content:center;display:flex">${esc(primaryCta)}</a></nav>
</header>`;
}

function buildFooter(brand: string, navItems: Array<{label:string;href:string}>, sub: string, gallerySlug: string, year: number): string {
  const initial = brand.charAt(0).toUpperCase();
  const links = navItems.slice(1).map(n=>`<a href="${n.href}">${esc(n.label)}</a>`).join('');
  return `
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="."><span class="mark">${initial}</span>${esc(brand)}</a>
        <p class="foot-desc">${esc(sub.slice(0,130))}</p>
      </div>
      <div><h4>Explore</h4><a href=".">Home</a><a href="about">About</a><a href="${esc(gallerySlug)}">${esc(gallerySlug.charAt(0).toUpperCase()+gallerySlug.slice(1))}</a></div>
      <div><h4>Company</h4>${links}</div>
      <div><h4>Connect</h4><a href="contact">Contact us</a><a href="contact">Support</a><a href="about">Our story</a></div>
    </div>
    <div class="foot-bottom">
      <span>© ${year} ${esc(brand)}. All rights reserved.</span>
      <span>Made with care.</span>
    </div>
  </div>
</footer>`;
}

const JS = `<script>
(function(){
  var h=document.querySelector('header');
  window.addEventListener('scroll',function(){h.classList.toggle('scrolled',window.scrollY>24);},{passive:true});
  var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:.13});
  document.querySelectorAll('.reveal').forEach(function(el,i){el.style.transitionDelay=(i%4*65)+'ms';io.observe(el);});
  var form=document.querySelector('form');if(form){form.addEventListener('submit',function(e){e.preventDefault();var b=form.querySelector('button[type=submit]');if(b){b.textContent='Sent!';b.disabled=true;}});}
})();
</script>`;

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

function buildHomePage(
  intel: PromptIntelligence, content: NicheContent, t: MoodTokens, c: ColorSet,
  brand: string, navItems: Array<{label:string;href:string}>, photos: typeof PHOTOS[Niche],
  year: number, css: string, base: string
): string {
  const fp = intel.fingerprint;
  const heroId = photos.hero[fp % photos.hero.length];
  const variant = fp % 3;

  // Hero section
  let heroHtml: string;
  if (intel.heroStyle === 'fullbleed-overlay') {
    heroHtml = `
<section class="hero hero-fullbleed" id="home">
  <div class="bg-img">${img(heroId,1600,1000,brand+' hero','')}</div>
  <div class="wrap" style="position:relative;z-index:2">
    <span class="hero-tag"><span class="dot"></span>${esc(content.tagline)}</span>
    <h1>${content.heroHead(esc(brand))}</h1>
    <p class="lead">${esc(content.heroSub)}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-primary" href="${esc(content.gallerySlug)}">${esc(content.primaryCta)}</a>
      <a class="btn btn-outline" href="about">${esc(content.secondaryCta)}</a>
    </div>
  </div>
</section>`;
  } else if (intel.heroStyle === 'centered-type') {
    heroHtml = `
<section class="hero hero-centered" id="home">
  <div class="wrap">
    <span class="hero-tag"><span class="dot"></span>${esc(content.tagline)}</span>
    <h1>${content.heroHead(esc(brand))}</h1>
    <p class="lead">${esc(content.heroSub)}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-primary" href="${esc(content.gallerySlug)}">${esc(content.primaryCta)}</a>
      <a class="btn btn-outline" href="about">${esc(content.secondaryCta)}</a>
    </div>
  </div>
</section>`;
  } else {
    // split-media (default)
    heroHtml = `
<section class="hero hero-split" id="home">
  <div class="wrap">
    <div class="grid">
      <div>
        <span class="hero-tag"><span class="dot"></span>${esc(content.tagline)}</span>
        <h1>${content.heroHead(esc(brand))}</h1>
        <p class="lead">${esc(content.heroSub)}</p>
        <div class="ctas">
          <a class="btn btn-primary" href="${esc(content.gallerySlug)}">${esc(content.primaryCta)}</a>
          <a class="btn btn-outline" href="about">${esc(content.secondaryCta)}</a>
        </div>
        <div class="trust">
          <div style="display:flex">${'<span style="width:34px;height:34px;border-radius:50%;background:var(--grad);margin-left:-8px;border:2px solid var(--bg);flex-shrink:0"></span>'.repeat(3)}</div>
          <span>Trusted by ${esc(content.stats[0].value)} ${intel.niche==='saas'?'teams':'customers'}</span>
        </div>
      </div>
      <div class="hero-media">${img(heroId,900,1100,brand,'')}</div>
    </div>
  </div>
</section>`;
  }

  // Marquee
  const mq = `<div class="marquee"><div class="marquee-track">${content.gallery.items.map(i=>`<span>${esc(i.label)} &nbsp;✦&nbsp; </span>`).join('').repeat(2)}</div></div>`;

  // Features
  const feats = `
<section>
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>Why ${esc(brand)}</span>
      <h2>${intel.niche==='sports'?'Engineered to perform':intel.niche==='restaurant'?'Crafted with intention':intel.niche==='portfolio'?'The approach':'Built around what matters'}</h2>
    </div>
    <div class="grid-3">${content.features.map((f,i)=>`<article class="card reveal"><span class="n">0${i+1}</span><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></article>`).join('')}</div>
  </div>
</section>`;

  // Showcase
  const showcase = `
<section>
  <div class="wrap showcase ${variant===1?'flip':''}">
    <div class="reveal">
      <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>The difference</span>
      <h2>${esc(content.showcase.title)}</h2>
      <p class="desc">${esc(content.showcase.body)}</p>
      <ul>${content.showcase.points.map(p=>`<li>${CHECK_SVG}<span>${esc(p)}</span></li>`).join('')}</ul>
      <a class="btn btn-primary" href="${esc(content.gallerySlug)}">${esc(content.primaryCta)}</a>
    </div>
    <div class="s-img reveal">${img(photos.showcase,900,700,content.showcase.title,'')}</div>
  </div>
</section>`;

  // Gallery preview (first 3)
  const galPrev = content.gallery.items.slice(0,3).map((item,i)=>{
    const pid = photos.gallery[i % photos.gallery.length];
    return `<div class="tile reveal">${img(pid,720,540,item.label,'')}<div class="lbl"><b>${esc(item.label)}</b><span>${esc(item.meta)}</span></div></div>`;
  }).join('');
  const gallerySection = `
<section>
  <div class="wrap">
    <div class="sec-head reveal"><h2>${esc(content.gallery.title)}</h2><p>${esc(content.gallery.sub)}</p></div>
    <div class="tile-grid">${galPrev}</div>
    <div style="text-align:center;margin-top:32px"><a class="btn btn-outline" href="${esc(content.gallerySlug)}">See everything</a></div>
  </div>
</section>`;

  // Stats
  const statsHtml = `
<section class="stats-band">
  <div class="wrap stats-row">${content.stats.map(s=>`<div class="stat-item reveal"><div class="stat-n">${esc(s.value)}</div><div class="stat-l">${esc(s.label)}</div></div>`).join('')}</div>
</section>`;

  // Testimonials
  const testi = `
<section>
  <div class="wrap">
    <div class="sec-head reveal"><h2>${intel.niche==='sports'?'What the players say':'Loved by the people we serve'}</h2><p>Real words from real people.</p></div>
    <div class="grid-3">${content.testimonials.map(t=>`<article class="q-card reveal"><div class="stars">${STAR_SVG.repeat(5)}</div><blockquote>"${esc(t.quote)}"</blockquote><div class="who"><div class="ava"></div><div><b>${esc(t.name)}</b><small>${esc(t.role)}</small></div></div></article>`).join('')}</div>
  </div>
</section>`;

  // CTA
  const ctaBand = `
<section>
  <div class="wrap">
    <div class="cta-band reveal">
      <h2>${esc(content.cta.title)}</h2>
      <p>${esc(content.cta.body)}</p>
      <a class="btn btn-white" href="contact">${esc(content.primaryCta)}</a>
    </div>
  </div>
</section>`;

  // Compose by variant
  let sections: string;
  if (variant === 0) {
    sections = heroHtml + mq + feats + showcase + gallerySection + statsHtml + testi + ctaBand;
  } else if (variant === 1) {
    sections = heroHtml + showcase + gallerySection + feats + testi + statsHtml + ctaBand;
  } else {
    sections = heroHtml + mq + gallerySection + showcase + statsHtml + feats + testi + ctaBand;
  }

  const nav = buildNav(brand, navItems, content.primaryCta, '.');
  const footer = buildFooter(brand, navItems, content.heroSub, content.gallerySlug, year);
  const head = buildHead(brand, content.tagline, content.heroSub, t, css, base);
  return `${head}<body>${nav}<main>${sections}</main>${footer}${JS}</body></html>`;
}

// ---------------------------------------------------------------------------

function buildAboutPage(
  intel: PromptIntelligence, content: NicheContent, t: MoodTokens,
  brand: string, navItems: Array<{label:string;href:string}>, photos: typeof PHOTOS[Niche],
  year: number, css: string, base: string
): string {
  const teamPhotos = photos.team.slice(0,4);
  const teamNames = ['Alex Rivera','Sam Torres','Jordan Lee','Casey Park'];
  const teamRoles: Record<Niche,string[]> = {
    sports:['Head of Product','Lead Designer','Performance Expert','Community Lead'],
    restaurant:['Executive Chef','Sous Chef','Pastry Chef','Front of House'],
    portfolio:['Creative Director','Lead Designer','Developer','Strategy'],
    ecommerce:['Founder & CEO','Head of Design','Operations Lead','Customer Success'],
    saas:['Co-founder & CEO','CTO','Head of Design','Head of Growth'],
    agency:['Strategy Director','Creative Director','Tech Lead','Client Partner'],
    business:['Founder & CEO','Operations Director','Head of Client Services','Team Lead'],
  };

  const teamHtml = teamPhotos.map((pid,i)=>`
    <div class="team-card reveal">
      <div class="team-photo">${img(pid,300,300,teamNames[i],'')}</div>
      <h3>${esc(teamNames[i])}</h3>
      <span>${esc((teamRoles[intel.niche]||teamRoles.business)[i])}</span>
    </div>`).join('');

  const valHtml = content.about.values.map((v,i)=>`
    <div class="value-item reveal">
      <span class="n">0${i+1}</span>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.body)}</p>
    </div>`).join('');

  const main = `
<section class="page-hero">
  <div class="wrap">
    <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>About us</span>
    <h1>${esc(content.about.title)}</h1>
    <p>${esc(content.about.sub)}</p>
  </div>
</section>
<section>
  <div class="wrap showcase">
    <div class="reveal">
      <h2>Our story</h2>
      <p class="desc" style="font-size:1.12rem;line-height:1.8">${esc(content.about.story)}</p>
      <a class="btn btn-primary" style="margin-top:8px" href="contact">${esc(content.primaryCta)}</a>
    </div>
    <div class="s-img reveal">${img(photos.showcase,900,700,'About '+brand,'')}</div>
  </div>
</section>
<section style="background:var(--surf)">
  <div class="wrap">
    <div class="sec-head reveal"><h2>What we believe</h2><p>The values that drive every decision we make.</p></div>
    <div class="values-grid">${valHtml}</div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="sec-head reveal"><h2>Meet the team</h2><p>${esc(content.teamBio)}</p></div>
    <div class="team-grid">${teamHtml}</div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="cta-band reveal">
      <h2>${esc(content.cta.title)}</h2>
      <p>${esc(content.cta.body)}</p>
      <a class="btn btn-white" href="contact">${esc(content.primaryCta)}</a>
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, content.primaryCta, 'about');
  const footer = buildFooter(brand, navItems, content.heroSub, content.gallerySlug, year);
  const head = buildHead(brand, 'About', content.about.sub, t, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${JS}</body></html>`;
}

// ---------------------------------------------------------------------------

function buildGalleryPage(
  intel: PromptIntelligence, content: NicheContent, t: MoodTokens,
  brand: string, navItems: Array<{label:string;href:string}>, photos: typeof PHOTOS[Niche],
  year: number, css: string, base: string
): string {
  // Restaurant gets a menu-style layout; others get a tile grid.
  let mainContent: string;

  if (intel.niche === 'restaurant') {
    const categories = [
      { name:'Starters', desc:'Light bites to begin', items:[
        {name:'Tuna tataki',desc:'Lightly seared tuna, ponzu, sesame',price:'₱380'},
        {name:'Burrata salad',desc:'Heirloom tomatoes, basil oil, aged balsamico',price:'₱420'},
        {name:'House bread',desc:'Warm sourdough, cultured butter, sea salt',price:'₱180'},
      ]},
      { name:'Mains', desc:'Hearty plates, big flavours', items:[
        {name:'Signature ramen',desc:'18-hour tonkotsu broth, chashu, soft egg',price:'₱680'},
        {name:'Pan-seared sea bass',desc:'Lemon butter, capers, seasonal greens',price:'₱920'},
        {name:'Wagyu short rib',desc:'48-hour braise, bone marrow gremolata',price:'₱1,480'},
        {name:'Mushroom risotto',desc:'Truffle oil, parmigiano, fresh herbs',price:'₱620'},
      ]},
      { name:'Desserts', desc:'Sweet endings', items:[
        {name:'Crème brûlée',desc:'Madagascan vanilla, seasonal berries',price:'₱320'},
        {name:'Chocolate fondant',desc:'Valrhona dark, vanilla ice cream',price:'₱360'},
      ]},
    ];
    const catHtml = categories.map(cat=>`
      <div class="menu-category reveal">
        <h2>${esc(cat.name)} <small style="font-family:var(--body);font-size:1rem;font-weight:400;color:var(--muted);margin-left:12px">${esc(cat.desc)}</small></h2>
        <div class="menu-items">
          ${cat.items.map(item=>`
            <div class="menu-item">
              <div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div>
              <div class="price">${esc(item.price)}</div>
            </div>`).join('')}
        </div>
      </div>`).join('');
    mainContent = `
<section class="menu-section">
  <div class="wrap">
    <div class="menu-intro reveal">
      <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>Our menu</span>
      <h1 style="font-size:${t.h2Size};margin-bottom:12px">A menu that changes with the seasons</h1>
      <p style="color:var(--muted);max-width:560px">Everything is made in-house, every day. We source locally and adjust the menu weekly around what is fresh and at its best.</p>
    </div>
    <div>${img(photos.gallery[0],1200,500,'Our menu','')} </div>
    <div style="margin-top:clamp(48px,6vw,80px)">${catHtml}</div>
  </div>
</section>`;
  } else if (intel.niche === 'saas') {
    const features = [
      {icon:'🎯',title:'Smart Dashboards',desc:'Customisable views that surface the data that matters most to your team — no noise, just signal.',badge:'Most used'},
      {icon:'⚡',title:'Automations',desc:'Build no-code workflows that run on triggers, schedules, or API events. Save hours every week.',badge:''},
      {icon:'📊',title:'Analytics',desc:'Real-time reporting with drill-down capability. Export to CSV, Excel, or connect to BI tools.',badge:''},
      {icon:'👥',title:'Team Collaboration',desc:'Comments, mentions, shared workspaces, and granular permission controls.',badge:''},
      {icon:'🔗',title:'Integrations',desc:'100+ native integrations including Slack, Notion, GitHub, Salesforce, and your favourite tools.',badge:'Popular'},
      {icon:'🔒',title:'Enterprise Security',desc:'SOC 2 Type II, SSO, audit logs, and data residency options for regulated industries.',badge:''},
    ];
    const featHtml = features.map((f,i)=>`
      <article class="card reveal" style="position:relative">
        ${f.badge?`<span style="position:absolute;top:16px;right:16px;font-size:.72rem;font-weight:700;background:var(--grad);color:#fff;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.06em">${f.badge}</span>`:''}
        <span style="font-size:2rem;display:block;margin-bottom:12px">${f.icon}</span>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.desc)}</p>
      </article>`).join('');
    mainContent = `
<section class="page-hero">
  <div class="wrap">
    <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>All features</span>
    <h1 style="font-size:${t.h2Size};margin-bottom:12px">Everything you need to move faster</h1>
    <p style="color:var(--muted);max-width:600px">One platform that replaces the stack of tools slowing your team down.</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="grid-3">${featHtml}</div>
  </div>
</section>`;
  } else {
    // Standard tile gallery
    const allTiles = content.gallery.items.map((item,i)=>{
      const pid = photos.gallery[i % photos.gallery.length];
      return `<div class="tile reveal">${img(pid,720,540,item.label,'')}<div class="lbl"><b>${esc(item.label)}</b><span>${esc(item.meta)}</span></div></div>`;
    }).join('');
    mainContent = `
<section class="page-hero">
  <div class="wrap">
    <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>${esc(content.galleryLabel)}</span>
    <h1 style="font-size:${t.h2Size};margin-bottom:12px">${esc(content.gallery.title)}</h1>
    <p style="color:var(--muted);max-width:560px">${esc(content.gallery.sub)}</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="tile-grid">${allTiles}</div>
  </div>
</section>`;
  }

  const ctaBand = `<section><div class="wrap"><div class="cta-band reveal"><h2>${esc(content.cta.title)}</h2><p>${esc(content.cta.body)}</p><a class="btn btn-white" href="contact">${esc(content.primaryCta)}</a></div></div></section>`;

  const nav = buildNav(brand, navItems, content.primaryCta, content.gallerySlug);
  const footer = buildFooter(brand, navItems, content.heroSub, content.gallerySlug, year);
  const head = buildHead(brand, content.galleryLabel, content.gallery.sub, t, css, base);
  return `${head}<body>${nav}<main>${mainContent}${ctaBand}</main>${footer}${JS}</body></html>`;
}

// ---------------------------------------------------------------------------

function buildContactPage(
  intel: PromptIntelligence, content: NicheContent, t: MoodTokens,
  brand: string, navItems: Array<{label:string;href:string}>,
  emailHandle: string, year: number, css: string, base: string
): string {
  const isRestaurant = intel.niche === 'restaurant';
  const extraInfo = isRestaurant
    ? `<div class="contact-info-row">Open: Tue–Sun, 11am–10pm</div>
       <div class="contact-info-row">Reservations recommended on weekends</div>
       <div class="contact-info-row">Private dining available for groups 10+</div>`
    : `<div class="contact-info-row">hello@${esc(emailHandle)}.com</div>
       <div class="contact-info-row">Mon–Fri, 9am–6pm</div>
       <div class="contact-info-row">We reply within one business day</div>`;

  const extraField = isRestaurant
    ? `<div><label>Party size</label><select name="party"><option>1–2 guests</option><option>3–4 guests</option><option>5–8 guests</option><option>9+ guests</option></select></div>
       <div><label>Preferred date</label><input type="date" name="date"/></div>`
    : `<div><label>Subject</label><input type="text" name="subject" placeholder="How can we help?"/></div>`;

  const main = `
<section class="page-hero">
  <div class="wrap">
    <span class="hero-tag" style="margin-bottom:18px"><span class="dot"></span>Contact</span>
    <h1 style="font-size:${t.h2Size};margin-bottom:12px">${esc(content.contact.title)}</h1>
    <p style="color:var(--muted);max-width:560px">${esc(content.contact.sub)}</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap contact-grid">
    <div class="reveal">
      <h2 style="font-size:clamp(1.6rem,3vw,2.4rem);margin-bottom:14px">Get in touch</h2>
      <p style="color:var(--muted);margin-bottom:8px">${esc(content.contact.sub)}</p>
      <div class="contact-info">
        ${extraInfo}
        <div class="contact-info-row">We respect your privacy — no spam, ever</div>
      </div>
    </div>
    <form class="reveal">
      <div><label>Your name</label><input type="text" name="name" placeholder="Full name" required/></div>
      <div><label>Email address</label><input type="email" name="email" placeholder="you@email.com" required/></div>
      ${extraField}
      <div><label>Message</label><textarea name="message" placeholder="Tell us what you need..." required></textarea></div>
      <button type="submit" class="btn btn-primary" style="justify-content:center">Send message</button>
    </form>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, content.primaryCta, 'contact');
  const footer = buildFooter(brand, navItems, content.heroSub, content.gallerySlug, year);
  const head = buildHead(brand, 'Contact', content.contact.sub, t, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${JS}</body></html>`;
}

// ---------------------------------------------------------------------------

function buildPricingPage(
  intel: PromptIntelligence, content: NicheContent, t: MoodTokens,
  brand: string, navItems: Array<{label:string;href:string}>,
  year: number, css: string, base: string
): string {
  if (!content.pricing) return '';
  const planHtml = content.pricing.plans.map(plan=>`
    <div class="price-card ${plan.featured?'featured':''}" style="position:relative">
      ${plan.featured?'<div class="badge">Most popular</div>':''}
      <h3>${esc(plan.name)}</h3>
      <div class="amount">${esc(plan.price)}</div>
      <div class="per">${esc(plan.period)}</div>
      <ul>${plan.features.map(f=>`<li>${CHECK_SVG}${esc(f)}</li>`).join('')}</ul>
      <a class="btn ${plan.featured?'btn-primary':'btn-outline'}" href="contact" style="width:100%;justify-content:center">${plan.price==='Free'?'Get started':'Start free trial'}</a>
    </div>`).join('');

  const faq = [
    {q:'Can I switch plans at any time?',a:'Yes, you can upgrade or downgrade at any time. Changes take effect at your next billing cycle.'},
    {q:'Is there a free trial?',a:'Yes — the Starter plan is free forever. No credit card required to get started.'},
    {q:'What payment methods do you accept?',a:'We accept all major credit cards, PayPal, and bank transfer for annual Enterprise plans.'},
    {q:'Can I get a refund?',a:'If you are not satisfied within the first 30 days, we will refund your payment — no questions asked.'},
  ];
  const faqHtml = faq.map(f=>`
    <details style="border-bottom:1px solid var(--bdr);padding:20px 0">
      <summary style="font-weight:600;cursor:pointer;font-size:1.08rem;font-family:var(--display)">${esc(f.q)}</summary>
      <p style="color:var(--muted);margin-top:10px;font-size:.98rem">${esc(f.a)}</p>
    </details>`).join('');

  const main = `
<section class="page-hero" style="text-align:center">
  <div class="wrap">
    <span class="hero-tag" style="margin-bottom:18px;margin-left:auto;margin-right:auto"><span class="dot"></span>Pricing</span>
    <h1 style="font-size:${t.h2Size};margin-bottom:12px">Simple, transparent pricing</h1>
    <p style="color:var(--muted);max-width:500px;margin:0 auto">No hidden fees. No surprise charges. Cancel anytime.</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="price-grid">${planHtml}</div>
    <div style="margin-top:clamp(56px,7vw,100px)">
      <div class="sec-head reveal"><h2>Frequently asked questions</h2></div>
      <div style="max-width:700px;margin:0 auto">${faqHtml}</div>
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, content.primaryCta, 'pricing');
  const footer = buildFooter(brand, navItems, content.heroSub, content.gallerySlug, year);
  const head = buildHead(brand, 'Pricing', 'Simple, transparent pricing', t, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${JS}</body></html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderMultiPageSite(
  context: ISharedContext,
  brandName: string,
  subdomain = '',
): MultiPageOutput {
  const design  = context.getArtifact<DesignDNAArtifact>('design-dna');
  // PlanningArtifact read for forward-compat; not currently used directly
  context.getArtifact<PlanningArtifact>('planning');
  const prompt  = context.input.userPrompt;
  const niche   = detectNiche(prompt);
  const intel   = analyzePrompt(prompt, brandName, niche);
  const t       = MOOD_TOKENS[intel.mood];
  const c       = resolveColors(intel.mood, design, intel.fingerprint);
  const content = buildNicheContent(niche);
  const photos  = PHOTOS[niche];
  const year    = new Date().getFullYear();
  const emailHandle = brandName.toLowerCase().replace(/[^a-z0-9]/g,'') || 'hello';
  const css     = buildCSS(t, c);

  // The <base> tag resolves relative URLs against the site's public path.
  const base = subdomain ? `/sites/${subdomain}/` : '';

  const navItems: Array<{label:string;href:string}> = [
    { label:'Home',                    href:'.' },
    { label:'About',                   href:'about' },
    { label:content.galleryLabel,      href:content.gallerySlug },
    { label:'Contact',                 href:'contact' },
  ];
  if (intel.pages.includes('pricing') && content.pricing) {
    navItems.splice(3, 0, { label:'Pricing', href:'pricing' });
  }

  const pages: Record<string,string> = {};

  pages['/'] = buildHomePage(intel, content, t, c, brandName, navItems, photos, year, css, base);
  pages['/about'] = buildAboutPage(intel, content, t, brandName, navItems, photos, year, css, base);
  pages[`/${content.gallerySlug}`] = buildGalleryPage(intel, content, t, brandName, navItems, photos, year, css, base);
  pages['/contact'] = buildContactPage(intel, content, t, brandName, navItems, emailHandle, year, css, base);
  if (intel.pages.includes('pricing') && content.pricing) {
    pages['/pricing'] = buildPricingPage(intel, content, t, brandName, navItems, year, css, base);
  }

  return {
    pages,
    nav: navItems,
    gallerySlug: content.gallerySlug,
    primaryPage: pages['/'],
  };
}

/** Backward-compatible single-page render (used by preview route & old code). */
export function renderSiteHtml(context: ISharedContext, brandName: string): string {
  return renderMultiPageSite(context, brandName).primaryPage;
}
