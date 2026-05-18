/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE PLANNER — Multi-Page Site Map Intelligence
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Reads a business niche description, extracts intent signals, and dynamically
 * structures a complete multi-page site architecture with route maps, section
 * hierarchies, and content slot definitions. Rejects single-page landing sites.
 *
 * @module ArchitecturePlanner
 * @author MDX Intelligence Engine
 */

export class ArchitecturePlanner {
  /**
   * @param {Object} opts
   * @param {string} opts.nichePrompt — user business description
   * @param {string} opts.businessName — optional brand name override
   * @param {string} opts.locale — content locale (default: 'en-US')
   * @param {number} opts.maxDepth — max nav depth (default: 2)
   */
  constructor(opts = {}) {
    this.nichePrompt = (opts.nichePrompt || '').trim();
    this.businessName = opts.businessName || this._extractBusinessName();
    this.locale = opts.locale || 'en-US';
    this.maxDepth = opts.maxDepth || 2;

    // Signal extraction cache
    this._signals = null;
    this._pageMap = null;
    this._audit = null;
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────────────── */

  /** Run full analysis and return structured site architecture */
  plan() {
    this._signals = this._extractSignals();
    this._pageMap = this._buildPageMap();
    this._audit = this._runAudit();

    return {
      ok: this._audit.ok,
      audit: this._audit,
      meta: this._buildMeta(),
      pages: this._pageMap,
      navTree: this._buildNavTree(),
      routes: this._buildRoutes(),
      signals: this._signals,
      contentSlots: this._buildContentSlots(),
      assetManifest: this._buildAssetManifest()
    };
  }

  /** Quick-check: does the plan have ≥2 real pages? */
  isMultiPage() {
    if (!this._pageMap) this.plan();
    return Object.keys(this._pageMap).length >= 2;
  }

  /** Get page by route */
  getPage(route) {
    if (!this._pageMap) this.plan();
    return this._pageMap[route] || null;
  }

  /** Flatten all content slots across all pages (for batch prompt generation) */
  getAllContentSlots() {
    if (!this._pageMap) this.plan();
    const slots = [];
    Object.values(this._pageMap).forEach(page => {
      (page.sections || []).forEach(section => {
        (section.slots || []).forEach(slot => {
          slots.push({
            pageRoute: page.route,
            pageLabel: page.label,
            sectionId: section.id,
            sectionName: section.name,
            ...slot
          });
        });
      });
    });
    return slots;
  }

  /** Serialize plan to JSON (for StrictJsonResponseExtractor) */
  toJSON() {
    const plan = this.plan();
    return JSON.stringify(plan, null, 2);
  }

  /* ── SIGNAL EXTRACTION ────────────────────────────────────────────────────── */

  _extractSignals() {
    const text = this.nichePrompt.toLowerCase();
    const signals = {
      industry: null,
      subVertical: null,
      tone: [],
      audiences: [],
      products: [],
      services: [],
      features: [],
      values: [],
      verbs: [],
      nouns: [],
      geo: null,
      priceTier: 'mid',
      maturity: 'established',
      b2b: false,
      b2c: true,
      saas: false,
      ecommerce: false,
      portfolio: false,
      studio: false,
      agency: false
    };

    // Industry classification
    const industries = {
      fashion: ['fashion', 'apparel', 'clothing', 'garment', 'textile', 'couture', 'luxury fashion', 'streetwear'],
      jewelry: ['jewelry', 'jewellery', 'watch', 'timepiece', 'diamond', 'goldsmith', 'gemstone', 'ring', 'necklace'],
      interiors: ['interior', 'furniture', 'home decor', 'lighting', 'space design', 'residential design', 'hospitality'],
      wellness: ['wellness', 'spa', 'yoga', 'meditation', 'skincare', 'beauty', 'aesthetic', 'retreat'],
      food: ['restaurant', 'cafe', 'bakery', 'culinary', 'gourmet', 'wine', 'coffee', 'fine dining'],
      tech: ['software', 'saas', 'app', 'platform', 'ai', 'automation', 'fintech', 'healthtech', 'edtech'],
      automotive: ['automotive', 'car', 'vehicle', 'motorcycle', 'luxury car', 'showroom'],
      art: ['art', 'gallery', 'artist', 'sculpture', 'photography', 'creative studio', 'design studio'],
      professional: ['law firm', 'accounting', 'consulting', 'architecture', 'investment', 'private equity', 'wealth management']
    };

    for (const [key, keywords] of Object.entries(industries)) {
      if (keywords.some(k => text.includes(k))) { signals.industry = key; break; }
    }

    // Sub-verticals
    if (signals.industry === 'fashion') {
      if (text.includes('leather') || text.includes('bag')) signals.subVertical = 'leather-goods';
      else if (text.includes('sneaker') || text.includes('footwear')) signals.subVertical = 'footwear';
      else signals.subVertical = 'rtw';
    }
    if (signals.industry === 'interiors') {
      if (text.includes('lighting')) signals.subVertical = 'lighting';
      else signals.subVertical = 'furniture';
    }

    // Tone signals
    const toneMap = {
      luxury: ['luxury', 'luxurious', 'premium', 'high-end', 'exclusive', 'bespoke', 'artisan', 'handcrafted'],
      minimal: ['minimal', 'minimalist', 'clean', 'simple', 'understated', 'refined', 'quiet'],
      bold: ['bold', 'striking', 'powerful', 'aggressive', 'dominant', 'high-impact'],
      warm: ['warm', 'inviting', 'personal', 'intimate', 'welcoming', 'friendly'],
      modern: ['modern', 'contemporary', 'cutting-edge', 'innovative', 'forward-thinking'],
      timeless: ['timeless', 'classic', 'heritage', 'legacy', 'traditional', 'generational']
    };
    for (const [tone, words] of Object.entries(toneMap)) {
      if (words.some(w => text.includes(w))) signals.tone.push(tone);
    }
    if (signals.tone.length === 0) signals.tone.push('luxury', 'modern');

    // Audiences
    const audienceSignals = {
      'hhnw': ['hhnw', 'uhnw', 'billionaire', 'dynasty', 'family office'],
      'affluent': ['affluent', 'discerning', 'sophisticated', 'connoisseur'],
      'professional': ['executive', 'ceo', 'founder', 'entrepreneur', 'professional'],
      'millennial': ['millennial', 'gen-z', 'young professional', 'creative'],
      'couple': ['couple', 'wedding', 'anniversary', 'gift'],
      'collector': ['collector', 'connoisseur', 'enthusiast', 'aficionado']
    };
    for (const [aud, words] of Object.entries(audienceSignals)) {
      if (words.some(w => text.includes(w))) signals.audiences.push(aud);
    }

    // Business model flags
    signals.b2b = /\b(b2b|enterprise|corporate|business|wholesale|trade)\b/.test(text);
    signals.b2c = /\b(b2c|consumer|retail|direct)\b/.test(text) || !signals.b2b;
    signals.saas = /\b(saas|subscription|monthly|software)\b/.test(text);
    signals.ecommerce = /\b(shop|store|buy|purchase|cart|checkout|product)\b/.test(text);
    signals.portfolio = /\b(portfolio|showcase|gallery|work|case study)\b/.test(text);
    signals.studio = /\b(studio|atelier|workshop|craft|artisan)\b/.test(text);
    signals.agency = /\b(agency|firm|consultancy|collective)\b/.test(text);

    // Price tier
    if (/\b(affordable|accessible|democratic|entry)/.test(text)) signals.priceTier = 'entry';
    else if (/\b(mass market|mainstream|mid-range)/.test(text)) signals.priceTier = 'mid';
    else if (/\b(ultra|mega|bespoke|one-of-one|couture)/.test(text)) signals.priceTier = 'ultra';
    else signals.priceTier = 'luxury';

    // Maturity
    if (/\b(new|launch|startup|emerging|fresh)\b/.test(text)) signals.maturity = 'startup';
    else if (/\b(heritage|since|decades|legacy|generational)\b/.test(text)) signals.maturity = 'heritage';

    return signals;
  }

  _extractBusinessName() {
    // Try to find a proper noun that looks like a brand
    const text = this.nichePrompt;
    const matches = text.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2})\b/g);
    if (matches && matches.length > 0) {
      // Filter out common words
      const common = ['The', 'A', 'An', 'We', 'Our', 'I', 'It', 'This', 'That'];
      const candidates = matches.filter(m => !common.includes(m));
      if (candidates.length > 0) return candidates[0];
    }
    return 'Studio';
  }

  /* ── PAGE MAP BUILDER ───────────────────────────────────────────────────── */

  _buildPageMap() {
    const s = this._signals;
    const pages = {};

    // ── HOME ────────────────────────────────────────────────────────────────
    pages['/'] = {
      route: '/',
      label: 'Home',
      template: 'home',
      purpose: 'Primary brand impression + navigation hub',
      sections: [
        {
          id: 'hero',
          name: 'Cinematic Hero',
          purpose: 'Instant brand immersion',
          slots: [
            { type: 'headline', maxChars: 80, required: true, context: 'Primary value proposition' },
            { type: 'subheadline', maxChars: 160, required: true, context: 'Supporting narrative' },
            { type: 'ctaPrimary', maxChars: 30, required: true, context: 'Main action button' },
            { type: 'ctaSecondary', maxChars: 30, required: false, context: 'Secondary action' },
            { type: 'heroImage', required: true, context: 'Full-bleed cinematic backdrop', aspect: '16:9' }
          ]
        },
        {
          id: 'features',
          name: 'Feature Grid',
          purpose: 'Core offerings preview',
          slots: [
            { type: 'sectionLabel', maxChars: 40, required: true, context: 'Eyebrow text' },
            { type: 'sectionHeadline', maxChars: 60, required: true, context: 'Section title' },
            { type: 'feature', maxChars: 200, count: 3, required: true, context: 'Product/service cards', hasImage: true }
          ]
        },
        {
          id: 'showcase',
          name: 'Cinematic Showcase',
          purpose: 'Deep portfolio/collection immersion',
          slots: [
            { type: 'showcaseItem', count: 3, required: true, context: 'Large-format visual stories', hasImage: true, aspect: '21:9' }
          ]
        },
        {
          id: 'statement',
          name: 'Brand Statement',
          purpose: 'Emotional closing before footer',
          slots: [
            { type: 'quote', maxChars: 200, required: true, context: 'Brand philosophy or founder quote' },
            { type: 'attribution', maxChars: 60, required: false, context: 'Founder name or role' }
          ]
        }
      ]
    };

    // ── SERVICES / COLLECTION ───────────────────────────────────────────────
    const servicesLabel = s.industry === 'fashion' ? 'Collection' :
                          s.industry === 'jewelry' ? 'Collections' :
                          s.industry === 'interiors' ? 'Catalog' :
                          s.industry === 'art' ? 'Works' :
                          s.industry === 'food' ? 'Menu' : 'Services';

    pages[s.industry === 'fashion' || s.industry === 'jewelry' ? '/collection' : '/services'] = {
      route: s.industry === 'fashion' || s.industry === 'jewelry' ? '/collection' : '/services',
      label: servicesLabel,
      template: 'services',
      purpose: 'Comprehensive offering index with individual item detail routing',
      sections: [
        {
          id: 'pageHero',
          name: 'Page Hero',
          slots: [
            { type: 'headline', maxChars: 60, required: true, context: `${servicesLabel} page title` },
            { type: 'subheadline', maxChars: 160, required: true, context: 'Collection overview narrative' },
            { type: 'heroImage', required: true, context: `${servicesLabel} hero imagery`, aspect: '16:9' }
          ]
        },
        {
          id: 'serviceList',
          name: 'Service / Collection List',
          slots: [
            { type: 'serviceItem', count: 'dynamic', required: true, context: 'Individual service or product entries', hasImage: true, routesToDetail: true }
          ]
        },
        {
          id: 'process',
          name: 'Process / Philosophy',
          slots: [
            { type: 'processStep', count: 3, required: false, context: 'Behind-the-scenes or methodology steps' }
          ]
        }
      ]
    };

    // ── ABOUT ───────────────────────────────────────────────────────────────
    pages['/about'] = {
      route: '/about',
      label: 'About',
      template: 'about',
      purpose: 'Brand story, team, studio, and heritage narrative',
      sections: [
        {
          id: 'pageHero',
          name: 'Page Hero',
          slots: [
            { type: 'headline', maxChars: 60, required: true, context: 'About page title — brand story opener' },
            { type: 'subheadline', maxChars: 200, required: true, context: 'Origin story or founding narrative' },
            { type: 'heroImage', required: true, context: 'Studio, atelier, or team imagery', aspect: '16:9' }
          ]
        },
        {
          id: 'philosophy',
          name: 'Philosophy Grid',
          slots: [
            { type: 'philosophyCard', count: 3, required: true, context: 'Brand pillars or values' }
          ]
        },
        {
          id: 'team',
          name: 'Team / Atelier',
          slots: [
            { type: 'teamMember', count: 3, required: false, context: 'Key personnel or artisans', hasImage: true, aspect: '3:4' }
          ]
        }
      ]
    };

    // ── PRODUCT / ITEM DETAIL (template — instantiated per item) ────────────
    pages['/item/:slug'] = {
      route: '/item/:slug',
      label: 'Item Detail',
      template: 'item-detail',
      purpose: 'Individual product or service deep-dive page',
      isDynamic: true,
      parentRoute: s.industry === 'fashion' || s.industry === 'jewelry' ? '/collection' : '/services',
      sections: [
        {
          id: 'itemHero',
          name: 'Item Hero',
          slots: [
            { type: 'itemName', maxChars: 60, required: true, context: 'Product/service name' },
            { type: 'itemTagline', maxChars: 120, required: true, context: 'One-line essence statement' },
            { type: 'itemDescription', maxChars: 400, required: true, context: 'Full narrative description' },
            { type: 'itemImage', count: 3, required: true, context: 'Hero product photography', aspect: '4:5' },
            { type: 'price', maxChars: 30, required: false, context: 'Price or tier label' },
            { type: 'cta', maxChars: 30, required: true, context: 'Action button' }
          ]
        },
        {
          id: 'itemDetails',
          name: 'Specifications / Details',
          slots: [
            { type: 'specGroup', count: 3, required: false, context: 'Technical or material details' }
          ]
        }
      ]
    };

    // ── CONTACT ─────────────────────────────────────────────────────────────
    pages['/contact'] = {
      route: '/contact',
      label: 'Contact',
      template: 'contact',
      purpose: 'Inquiry channel with location and appointment booking',
      sections: [
        {
          id: 'pageHero',
          name: 'Page Hero',
          slots: [
            { type: 'headline', maxChars: 60, required: true, context: 'Contact page title' },
            { type: 'subheadline', maxChars: 160, required: true, context: 'Invitation to connect' },
            { type: 'heroImage', required: false, context: 'Flagship location or showroom', aspect: '16:9' }
          ]
        },
        {
          id: 'contactForm',
          name: 'Contact Form',
          slots: [
            { type: 'formLabel', maxChars: 40, required: true, context: 'Form headline' },
            { type: 'formField', count: 5, required: true, context: 'Form field labels and placeholders' }
          ]
        },
        {
          id: 'locations',
          name: 'Locations',
          slots: [
            { type: 'locationCard', count: 2, required: false, context: 'Physical addresses or showrooms' }
          ]
        }
      ]
    };

    // ── CONDITIONAL PAGES ───────────────────────────────────────────────────

    if (s.portfolio || s.studio || s.agency) {
      pages['/works'] = {
        route: '/works',
        label: 'Works',
        template: 'works',
        purpose: 'Case study or portfolio index',
        sections: [
          {
            id: 'pageHero',
            name: 'Page Hero',
            slots: [
              { type: 'headline', maxChars: 60, required: true, context: 'Portfolio page title' },
              { type: 'subheadline', maxChars: 160, required: true, context: 'Portfolio introduction' },
              { type: 'heroImage', required: true, context: 'Signature project hero', aspect: '16:9' }
            ]
          },
          {
            id: 'caseStudies',
            name: 'Case Study Grid',
            slots: [
              { type: 'caseStudy', count: 'dynamic', required: true, context: 'Individual project cards', hasImage: true, aspect: '4:3' }
            ]
          }
        ]
      };
    }

    if (s.journal || textIncludes(this.nichePrompt, ['blog', 'journal', 'news', 'insights', 'editorial'])) {
      pages['/journal'] = {
        route: '/journal',
        label: 'Journal',
        template: 'journal',
        purpose: 'Editorial content and brand storytelling',
        sections: [
          {
            id: 'pageHero',
            name: 'Page Hero',
            slots: [
              { type: 'headline', maxChars: 60, required: true, context: 'Journal page title' },
              { type: 'heroImage', required: false, context: 'Journal cover imagery', aspect: '16:9' }
            ]
          },
          {
            id: 'articles',
            name: 'Article Grid',
            slots: [
              { type: 'articleCard', count: 'dynamic', required: true, context: 'Editorial article previews', hasImage: true, aspect: '16:10' }
            ]
          }
        ]
      };
    }

    return pages;
  }

  /* ── NAV TREE ───────────────────────────────────────────────────────────── */

  _buildNavTree() {
    const tree = [];
    const pageList = Object.values(this._pageMap).filter(p => !p.isDynamic);

    pageList.forEach(page => {
      const node = {
        label: page.label,
        route: page.route,
        children: []
      };

      // If this page has dynamic children (like /collection → /item/:slug)
      const dynamicChild = Object.values(this._pageMap).find(p => p.isDynamic && p.parentRoute === page.route);
      if (dynamicChild) {
        node.children.push({
          label: dynamicChild.label,
          route: dynamicChild.route,
          isDynamic: true
        });
      }

      tree.push(node);
    });

    return tree;
  }

  /* ── ROUTE REGISTRY ─────────────────────────────────────────────────────── */

  _buildRoutes() {
    return Object.values(this._pageMap).map(page => ({
      path: page.route,
      label: page.label,
      template: page.template,
      isDynamic: !!page.isDynamic,
      parentRoute: page.parentRoute || null,
      sections: (page.sections || []).map(s => s.id)
    }));
  }

  /* ── META ───────────────────────────────────────────────────────────────── */

  _buildMeta() {
    const s = this._signals;
    return {
      siteName: this.businessName,
      defaultTitleTemplate: '{page} — ' + this.businessName,
      locale: this.locale,
      industry: s.industry,
      subVertical: s.subVertical,
      tone: s.tone,
      priceTier: s.priceTier,
      maturity: s.maturity,
      primaryAudience: s.audiences[0] || 'affluent',
      businessModel: {
        b2b: s.b2b,
        b2c: s.b2c,
        saas: s.saas,
        ecommerce: s.ecommerce
      }
    };
  }

  /* ── CONTENT SLOTS ──────────────────────────────────────────────────────── */

  _buildContentSlots() {
    return this.getAllContentSlots();
  }

  /* ── ASSET MANIFEST ─────────────────────────────────────────────────────── */

  _buildAssetManifest() {
    const slots = this.getAllContentSlots();
    const images = slots.filter(s => s.hasImage || s.type.includes('Image'));
    const copy = slots.filter(s => !s.hasImage && !s.type.includes('Image'));

    return {
      totalSlots: slots.length,
      imageAssets: images.length,
      copyAssets: copy.length,
      imageBreakdown: this._groupBy(images, 'context'),
      copyBreakdown: this._groupBy(copy, 'context'),
      byPage: Object.fromEntries(
        Object.entries(this._pageMap).map(([route, page]) => [
          route,
          {
            label: page.label,
            imageCount: page.sections.reduce((sum, sec) =>
              sum + (sec.slots || []).filter(sl => sl.hasImage || sl.type.includes('Image')).length, 0
            ),
            copyCount: page.sections.reduce((sum, sec) =>
              sum + (sec.slots || []).filter(sl => !sl.hasImage && !sl.type.includes('Image')).reduce((c, sl) => c + (sl.count || 1), 0), 0
            )
          }
        ])
      )
    };
  }

  /* ── AUDIT ──────────────────────────────────────────────────────────────── */

  _runAudit() {
    const issues = [];
    const pageCount = Object.keys(this._pageMap).length;

    if (pageCount < 2) {
      issues.push({ severity: 'error', code: 'SINGLE_PAGE', message: 'Site plan has fewer than 2 pages — forcing multi-page expansion' });
    }
    if (!this._signals.industry) {
      issues.push({ severity: 'warn', code: 'UNKNOWN_INDUSTRY', message: 'No clear industry detected — defaulting to luxury studio' });
    }
    if (this._signals.tone.length === 0) {
      issues.push({ severity: 'warn', code: 'NO_TONE', message: 'No tone signals found — defaulting to luxury+modern' });
    }

    // Check all pages have routes starting with /
    Object.values(this._pageMap).forEach(page => {
      if (!page.route.startsWith('/')) {
        issues.push({ severity: 'error', code: 'INVALID_ROUTE', message: `Page "${page.label}" has invalid route: ${page.route}` });
      }
    });

    // Check for orphaned dynamic pages
    Object.values(this._pageMap).filter(p => p.isDynamic).forEach(page => {
      if (page.parentRoute && !this._pageMap[page.parentRoute]) {
        issues.push({ severity: 'error', code: 'ORPHAN_DYNAMIC', message: `Dynamic page ${page.route} has missing parent ${page.parentRoute}` });
      }
    });

    return {
      ok: !issues.some(i => i.severity === 'error'),
      pageCount,
      navDepth: this.maxDepth,
      issues
    };
  }

  /* ── UTILS ──────────────────────────────────────────────────────────────── */

  _groupBy(arr, key) {
    return arr.reduce((obj, item) => {
      const val = item[key] || 'uncategorized';
      obj[val] = (obj[val] || 0) + (item.count || 1);
      return obj;
    }, {});
  }
}

function textIncludes(text, words) {
  const t = text.toLowerCase();
  return words.some(w => t.includes(w.toLowerCase()));
}
