/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PAGE STITCHER — Multi-Page Layout Assembly Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Captures the multi-page plan from IntelligenceEngine, selects the correct
 * Phase 1 visual layout blocks for each section, and stitches copy text,
 * accurate image prompts, and link destinations smoothly into each page layout.
 *
 * @module PageStitcher
 * @author MDX Deterministic Layout Compiler
 */

export class PageStitcher {
  constructor(opts = {}) {
    this.locale = opts.locale || 'en-US';
    this.verbose = opts.verbose !== false;
    this._stitchLog = [];

    // Phase 1 layout block registry — maps section type → layout component
    this._layoutRegistry = this._buildLayoutRegistry();
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Stitch a complete site from an IntelligenceEngine result.
   *
   * @param {Object} plan      — output from IntelligenceEngine.generateSite()
   * @param {Object} overrides — optional content overrides per route
   * @returns {Object} stitched site with rendered page HTML, CSS, and metadata
   */
  stitch(plan, overrides = {}) {
    const startTime = performance.now();
    this._log('INIT', 'PageStitcher started', { pages: Object.keys(plan.architecture.pages).length });

    const site = {
      meta: plan.architecture.meta,
      signals: plan.architecture.signals,
      pages: {},
      navTree: plan.architecture.navTree,
      globalCSS: '',
      globalJS: '',
      _assemblyLog: []
    };

    // Stitch each page
    Object.values(plan.architecture.pages).forEach(page => {
      const pageOverrides = overrides[page.route] || {};
      site.pages[page.route] = this._stitchPage(page, plan, pageOverrides);
    });

    // Build global CSS/JS from all page heads
    site.globalCSS = this._extractGlobalStyles(site.pages);
    site.globalJS = this._extractGlobalScripts(site.pages);

    // Build inter-page link map
    site.linkMap = this._buildLinkMap(site.pages);

    const duration = Math.round(performance.now() - startTime);
    this._log('COMPLETE', 'All pages stitched', { duration, pageCount: Object.keys(site.pages).length });

    site._assemblyLog = [...this._stitchLog];
    return site;
  }

  /**
   * Stitch a single page for incremental updates.
   * @param {Object} page      — page spec from ArchitecturePlanner
   * @param {Object} plan      — full intelligence plan
   * @param {Object} overrides — content overrides for this page
   */
  stitchPage(page, plan, overrides = {}) {
    return this._stitchPage(page, plan, overrides);
  }

  /**
   * Get the layout component name for a section type.
   * @param {string} sectionType — e.g. 'hero', 'features', 'showcase'
   */
  resolveLayout(sectionType) {
    return this._layoutRegistry[sectionType] || null;
  }

  /**
   * Register a custom layout block.
   * @param {string} sectionType — section identifier
   * @param {Object} layoutSpec  — { component, cssClass, requiredSlots[] }
   */
  registerLayout(sectionType, layoutSpec) {
    this._layoutRegistry[sectionType] = layoutSpec;
    this._log('REGISTER', `Custom layout registered: ${sectionType}`);
  }

  /* ── PAGE STITCHING ───────────────────────────────────────────────────────── */

  _stitchPage(page, plan, overrides) {
    this._log('STITCH', `Stitching page: ${page.route}`, { sections: page.sections.length });

    const imageAssets = plan.imageAssets.filter(img => img.pageRoute === page.route);
    const siteSpec = plan.siteSpec || {};

    // Build the DOM document for this page
    const doc = this._createPageDocument(page, plan.architecture.meta);

    // Stitch each section into the body
    const stitchedSections = page.sections.map((section, index) => {
      const layout = this._resolveSectionLayout(section, page.route);
      const sectionContent = this._stitchSection(section, layout, {
        imageAssets: imageAssets.filter(img => img.sectionId === section.id),
        overrides: overrides[section.id] || {},
        pageRoute: page.route,
        pageLabel: page.label,
        sectionIndex: index,
        siteColors: siteSpec.colors || this._defaultColors(),
        siteFonts: siteSpec.fontPairing || { display: 'Playfair Display', body: 'Inter' }
      });

      // Append to document body
      const sectionNode = this._createSectionNode(section, sectionContent, layout, index);
      doc.body.appendChild(sectionNode);

      return {
        id: section.id,
        name: section.name,
        layout: layout.component,
        node: sectionNode,
        slotCount: (section.slots || []).length
      };
    });

    // Inject page-specific nav highlighting
    this._injectPageNav(doc, page.route, plan.architecture.navTree);

    // Inject footer on non-dynamic pages
    if (!page.isDynamic) {
      const footer = this._stitchFooter(plan.architecture.navTree, siteSpec.colors);
      doc.body.appendChild(footer);
    }

    return {
      route: page.route,
      label: page.label,
      template: page.template,
      title: this._buildTitle(page, plan.architecture.meta),
      head: this._serializeHead(doc.head),
      body: this._serializeBody(doc.body),
      sections: stitchedSections,
      isDynamic: !!page.isDynamic,
      parentRoute: page.parentRoute || null
    };
  }

  /* ── SECTION LAYOUT RESOLUTION ──────────────────────────────────────────── */

  _resolveSectionLayout(section, route) {
    const registry = this._layoutRegistry;
    const type = section.id;

    // Exact match
    if (registry[type]) return registry[type];

    // Fuzzy match by section name
    const nameLower = (section.name || '').toLowerCase();
    for (const [key, spec] of Object.entries(registry)) {
      if (nameLower.includes(key)) return spec;
    }

    // Fallback: generic container
    this._log('FALLBACK', `No layout match for "${type}", using generic container`);
    return {
      component: 'GenericContainer',
      cssClass: 'section-generic',
      requiredSlots: [],
      optionalSlots: ['headline', 'body', 'image']
    };
  }

  /* ── SECTION CONTENT STITCHING ────────────────────────────────────────────── */

  _stitchSection(section, layout, context) {
    const { imageAssets, overrides, pageRoute, sectionIndex, siteColors, siteFonts } = context;
    const slots = section.slots || [];
    const content = {};

    slots.forEach(slot => {
      const slotKey = slot.type;
      const overrideValue = overrides[slotKey];

      // Resolve content based on slot type
      switch (slot.type) {
        case 'headline':
        case 'sectionHeadline':
        case 'itemName':
        case 'formLabel':
          content[slotKey] = overrideValue || this._generateHeadline(slot, pageRoute, section, sectionIndex);
          break;

        case 'subheadline':
        case 'itemTagline':
        case 'itemDescription':
          content[slotKey] = overrideValue || this._generateBody(slot, pageRoute, section, sectionIndex);
          break;

        case 'heroImage':
        case 'itemImage':
        case 'showcaseItem':
          content[slotKey] = overrideValue || this._resolveImage(slot, imageAssets, pageRoute, section.id);
          break;

        case 'feature':
        case 'serviceItem':
        case 'caseStudy':
        case 'articleCard':
          content[slotKey] = overrideValue || this._generateCardGrid(slot, pageRoute, section, imageAssets);
          break;

        case 'ctaPrimary':
        case 'ctaSecondary':
        case 'cta':
          content[slotKey] = overrideValue || this._generateCTA(slot, pageRoute, section);
          break;

        case 'quote':
        case 'philosophyCard':
        case 'processStep':
          content[slotKey] = overrideValue || this._generateQuote(slot, pageRoute, section, sectionIndex);
          break;

        case 'attribution':
        case 'teamMember':
        case 'locationCard':
          content[slotKey] = overrideValue || this._generateAttribution(slot, pageRoute, section, sectionIndex);
          break;

        case 'formField':
          content[slotKey] = overrideValue || this._generateFormFields(slot);
          break;

        case 'specGroup':
          content[slotKey] = overrideValue || this._generateSpecs(slot, pageRoute);
          break;

        case 'sectionLabel':
          content[slotKey] = overrideValue || this._generateEyebrow(slot, pageRoute, sectionIndex);
          break;

        case 'price':
          content[slotKey] = overrideValue || this._generatePrice(slot, pageRoute);
          break;

        default:
          content[slotKey] = overrideValue || this._generateDefault(slot, pageRoute);
      }
    });

    // Inject CSS variables for this section
    content._css = this._buildSectionCSS(section, layout, siteColors, siteFonts);

    return content;
  }

  /* ── CONTENT GENERATORS ───────────────────────────────────────────────────── */

  _generateHeadline(slot, route, section, index) {
    const defaults = {
      '/': { hero: 'Crafted for the Discerning Few', features: 'Our Philosophy', showcase: 'Selected Works' },
      '/about': { hero: 'Our Story', philosophy: 'What We Stand For', team: 'The Atelier' },
      '/collection': { hero: 'The Collection', serviceList: 'Signature Pieces', process: 'Our Process' },
      '/services': { hero: 'What We Do', serviceList: 'Services', process: 'Our Approach' },
      '/contact': { hero: 'Begin a Conversation', contactForm: 'Get in Touch', locations: 'Visit Us' },
      '/works': { hero: 'Selected Works', caseStudies: 'Case Studies' },
      '/journal': { hero: 'Journal', articles: 'Latest Stories' }
    };
    const pageDefaults = defaults[route] || {};
    return pageDefaults[section.id] || `${section.name || 'Section'}`;
  }

  _generateBody(slot, route, section, index) {
    const defaults = {
      '/': {
        hero: 'Hand-stitched leather goods for those who understand that true luxury is felt before it is seen.',
        features: 'Every piece begins with a single thought: what would last a lifetime?',
        showcase: 'A curation of objects that exist at the intersection of utility and art.',
        statement: 'We do not follow trends. We follow materials to their natural conclusion.'
      },
      '/about': {
        hero: 'Founded in the ateliers of Milan, our practice is rooted in the belief that restraint is the highest form of expression.',
        philosophy: 'Three principles guide everything we make.',
        team: 'The hands behind the work.'
      },
      '/collection': {
        hero: 'Each collection is a meditation on a single material, explored through form, function, and the passage of time.',
        serviceList: 'Objects designed to be inherited.',
        process: 'From sketch to stitch, the journey of a single piece.'
      },
      '/contact': {
        hero: 'Whether you are seeking a bespoke commission or wish to visit our showroom, we welcome the conversation.',
        contactForm: 'Share your vision with us.',
        locations: 'Our flagship locations.'
      }
    };
    const pageDefaults = defaults[route] || {};
    return pageDefaults[section.id] || 'Explore our world.';
  }

  _resolveImage(slot, imageAssets, route, sectionId) {
    // Find the matching image asset
    const asset = imageAssets.find(img =>
      img.sectionId === sectionId &&
      (img.type === slot.type || img.type === 'heroImage' || img.type === 'itemImage')
    );

    if (asset) {
      return {
        src: this._keywordToImage(asset.imagePrompt?.name || 'luxury product'),
        alt: asset.imagePrompt?.name || 'Product imagery',
        prompt: asset.imagePrompt?.prompt || '',
        aspect: slot.aspect || asset.aspect || '16:9',
        slotType: slot.type,
        keyword: asset.imagePrompt?.name || 'luxury'
      };
    }

    // Fallback: generate from slot context
    const keyword = this._deriveKeyword(slot.context, route, sectionId);
    return {
      src: this._keywordToImage(keyword),
      alt: slot.context || 'Brand imagery',
      prompt: `Studio photography of ${keyword}`,
      aspect: slot.aspect || '16:9',
      slotType: slot.type,
      keyword
    };
  }

  _generateCardGrid(slot, route, section, imageAssets) {
    const count = slot.count || 3;
    const cards = [];

    for (let i = 0; i < count; i++) {
      const cardImage = imageAssets.find(img => img.sectionId === section.id && img.type === slot.type);
      const keyword = cardImage?.imagePrompt?.name || this._deriveKeyword(slot.context, route, section.id);

      cards.push({
        id: `${section.id}-card-${i}`,
        title: this._cardTitle(route, section.id, i),
        description: this._cardDescription(route, section.id, i),
        image: {
          src: this._keywordToImage(keyword),
          alt: this._cardTitle(route, section.id, i),
          keyword
        },
        link: this._cardLink(route, section.id, i),
        price: slot.type === 'serviceItem' ? this._cardPrice(i) : null
      });
    }

    return cards;
  }

  _generateCTA(slot, route, section) {
    const ctas = {
      'ctaPrimary': { label: 'Explore the Collection', href: '/collection', style: 'primary' },
      'ctaSecondary': { label: 'Our Story', href: '/about', style: 'ghost' },
      'cta': { label: 'Inquire Now', href: '/contact', style: 'primary' }
    };
    return ctas[slot.type] || { label: 'Learn More', href: route, style: 'primary' };
  }

  _generateQuote(slot, route, section, index) {
    const quotes = [
      'We do not follow trends. We follow materials to their natural conclusion.',
      'The best objects are those you forget you own — until you use them.',
      'Craft is not a matter of perfection. It is a matter of intention.',
      'Every stitch is a decision. Every decision is a philosophy.',
      'Luxury is not excess. Luxury is exactly enough.',
      'Time is the only material that cannot be sourced. We design with its passage in mind.'
    ];
    return quotes[index % quotes.length];
  }

  _generateAttribution(slot, route, section, index) {
    const names = ['Founder & Creative Director', 'Head of Atelier', 'Design Director', 'Master Craftsman'];
    const values = ['Marco Vittore', 'Elena Rossi', 'Davide Conti', 'Giuseppe Marino'];
    return { name: values[index % values.length], role: names[index % names.length] };
  }

  _generateFormFields(slot) {
    return [
      { label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
      { label: 'Email', type: 'email', placeholder: 'your@email.com', required: true },
      { label: 'Subject', type: 'text', placeholder: 'How can we help?', required: false },
      { label: 'Message', type: 'textarea', placeholder: 'Tell us about your vision...', required: true },
      { label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000', required: false }
    ];
  }

  _generateSpecs(slot, route) {
    return [
      { label: 'Material', value: 'Full-grain vegetable-tanned leather' },
      { label: 'Dimensions', value: '110 × 70 × 8 mm' },
      { label: 'Weight', value: '45 grams' },
      { label: 'Origin', value: 'Handmade in Milan, Italy' },
      { label: 'Hardware', value: 'Solid brass, hand-polished' }
    ];
  }

  _generateEyebrow(slot, route, index) {
    const eyebrows = {
      '/': { features: 'The Collection', showcase: 'Portfolio', statement: 'Philosophy' },
      '/about': { philosophy: 'Values', team: 'People' },
      '/collection': { serviceList: 'Signature Pieces', process: 'Process' },
      '/contact': { contactForm: 'Contact', locations: 'Locations' }
    };
    return (eyebrows[route] || {})[slot.sectionId || ''] || '';
  }

  _generatePrice(slot, route) {
    return { currency: '€', value: 285, label: 'Starting at' };
  }

  _generateDefault(slot, route) {
    return { type: slot.type, context: slot.context, placeholder: true };
  }

  /* ── CARD HELPERS ─────────────────────────────────────────────────────────── */

  _cardTitle(route, sectionId, index) {
    const titles = {
      '/collection': ['The Cardholder', 'The Briefcase', 'The Weekender'],
      '/services': ['Bespoke Design', 'Atelier Tours', 'Restoration'],
      '/works': ['Villa Project', 'Flagship Store', 'Private Residence']
    };
    const list = titles[route] || ['Service One', 'Service Two', 'Service Three'];
    return list[index % list.length];
  }

  _cardDescription(route, sectionId, index) {
    const descs = {
      '/collection': [
        'Minimalist leather cardholder with hand-stitched seams and burnished edges.',
        'Structured briefcase in full-grain leather with solid brass hardware.',
        'Oversized weekender with reinforced base and removable shoulder strap.'
      ],
      '/services': [
        'Commission a one-of-a-kind piece designed to your exact specifications.',
        'Private guided tours of our Milan atelier by appointment.',
        'Expert restoration and refurbishment of vintage leather goods.'
      ]
    };
    const list = descs[route] || ['Description one.', 'Description two.', 'Description three.'];
    return list[index % list.length];
  }

  _cardLink(route, sectionId, index) {
    const slugs = ['cardholder', 'briefcase', 'weekender', 'bespoke', 'tour', 'restoration'];
    return `/item/${slugs[index % slugs.length]}`;
  }

  _cardPrice(index) {
    const prices = [285, 1450, 2200, 3500, 150, 450];
    return { currency: '€', value: prices[index % prices.length] };
  }

  /* ── IMAGE KEYWORD RESOLUTION ─────────────────────────────────────────────── */

  _deriveKeyword(context, route, sectionId) {
    const keywordMap = {
      'hero': 'luxury leather goods studio',
      'features': 'minimalist leather accessories',
      'showcase': 'luxury craftsmanship detail',
      'collection': 'leather goods collection',
      'services': 'bespoke leather workshop',
      'about': 'luxury atelier interior',
      'contact': 'luxury showroom interior',
      'works': 'architectural interior design',
      'team': 'craftsman portrait studio'
    };
    return keywordMap[sectionId] || context || 'luxury product';
  }

  _keywordToImage(keyword) {
    // Map descriptive keywords to Unsplash source URLs
    const keywordMap = {
      'luxury leather goods studio': 'leather-goods-studio',
      'minimalist leather accessories': 'minimalist-leather-wallet',
      'luxury craftsmanship detail': 'leather-craft-detail',
      'leather goods collection': 'leather-collection-flatlay',
      'bespoke leather workshop': 'leather-workshop-craft',
      'luxury atelier interior': 'luxury-studio-interior',
      'luxury showroom interior': 'luxury-showroom',
      'architectural interior design': 'modern-architecture',
      'craftsman portrait studio': 'artisan-portrait',
      'cardholder': 'minimalist-leather-cardholder',
      'briefcase': 'leather-briefcase-luxury',
      'weekender': 'leather-weekender-bag',
      'bespoke': 'custom-leather-design',
      'tour': 'atelier-workspace',
      'restoration': 'vintage-leather-restoration',
      'luxury product': 'luxury-product-still-life'
    };

    const slug = keywordMap[keyword] || 'luxury-product';
    return `https://images.unsplash.com/photo-${this._unsplashId(slug)}?auto=format&fit=crop&w=1920&q=80`;
  }

  _unsplashId(slug) {
    // Deterministic hash from keyword to Unsplash photo ID
    const ids = {
      'leather-goods-studio': '1504198458649-3128b932f49e',
      'minimalist-leather-wallet': '1553062407-4eeb8e53f55e',
      'leather-craft-detail': '1473187982624-236a4f4ab18e',
      'leather-collection-flatlay': '1441986300917-64674bd600d8',
      'leather-workshop-craft': '1452860606245-08befc8ffda5',
      'luxury-studio-interior': '1497366216548-37526070297c',
      'luxury-showroom': '1497366814283-67d0fb983531',
      'modern-architecture': '1486325212027-8081e485255e',
      'artisan-portrait': '1507003211169-0a1dd7228f2d',
      'minimalist-leather-cardholder': '1544816155-4ab213116b83',
      'leather-briefcase-luxury': '1523275335684-37898b6baf30',
      'leather-weekender-bag': '1553062407-4eeb8e53f55e',
      'custom-leather-design': '1452860606245-08befc8ffda5',
      'atelier-workspace': '1497366216548-37526070297c',
      'vintage-leather-restoration': '1473187982624-236a4f4ab18e',
      'luxury-product-still-life': '1491933382434-500287f9b54b'
    };
    return ids[slug] || '1491933382434-500287f9b54b';
  }

  /* ── DOM CONSTRUCTION ─────────────────────────────────────────────────────── */

  _createPageDocument(page, meta) {
    const html = document.implementation.createHTMLDocument(page.label);

    // Inject base meta
    html.title = this._buildTitle(page, meta);

    // Preconnect
    html.head.appendChild(this._meta('preconnect', 'https://fonts.googleapis.com'));
    html.head.appendChild(this._meta('preconnect', 'https://fonts.gstatic.com', { crossorigin: true }));

    // Viewport
    html.head.appendChild(this._meta('viewport', 'width=device-width, initial-scale=1.0'));

    return html;
  }

  _createSectionNode(section, content, layout, index) {
    const node = document.createElement('section');
    node.className = `${layout.cssClass} section-${section.id}`;
    node.setAttribute('data-section', section.id);
    node.setAttribute('data-section-index', String(index));
    node.setAttribute('data-section-name', section.name);

    // Inject layout-specific HTML
    node.innerHTML = this._renderLayoutHTML(layout.component, section, content);

    return node;
  }

  _renderLayoutHTML(component, section, content) {
    const renderers = {
      InteractiveCanvasHero: () => this._renderHero(section, content),
      InteractiveFeatureGrid: () => this._renderFeatureGrid(section, content),
      CinematicViewportShowcase: () => this._renderShowcase(section, content),
      GenericContainer: () => this._renderGeneric(section, content)
    };

    const renderer = renderers[component] || renderers.GenericContainer;
    return renderer();
  }

  _renderHero(section, content) {
    const headline = content.headline || content.sectionHeadline || '';
    const sub = content.subheadline || '';
    const cta1 = content.ctaPrimary || { label: 'Explore', href: '/collection', style: 'primary' };
    const cta2 = content.ctaSecondary || { label: 'Our Story', href: '/about', style: 'ghost' };
    const img = content.heroImage || { src: '', alt: '', keyword: '' };

    return `
      <div class="hero-canvas-container">
        <canvas class="hero-particle-canvas" data-keyword="${img.keyword || ''}"></canvas>
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content-wrapper">
        <div class="hero-text-block">
          <h1 class="hero-headline">${this._escape(headline)}</h1>
          <p class="hero-subheadline">${this._escape(sub)}</p>
          <div class="hero-cta-row">
            <a href="${cta1.href}" class="btn btn-primary hero-cta" data-cta="primary">${cta1.label}</a>
            <a href="${cta2.href}" class="btn btn-ghost hero-cta" data-cta="secondary">${cta2.label}</a>
          </div>
        </div>
      </div>
      <div class="hero-image-backdrop" style="background-image:url('${img.src}')" data-image-keyword="${img.keyword || ''}" role="img" aria-label="${img.alt}"></div>
    `;
  }

  _renderFeatureGrid(section, content) {
    const label = content.sectionLabel || '';
    const headline = content.sectionHeadline || '';
    const cards = content.feature || content.serviceItem || [];

    let cardsHTML = '';
    cards.forEach((card, i) => {
      cardsHTML += `
        <article class="feature-card" data-card-index="${i}" data-card-id="${card.id}" data-item-slug="${card.link.replace('/item/', '')}">
          <div class="feature-card-lighting"></div>
          <div class="feature-card-image" style="background-image:url('${card.image.src}')" data-image-keyword="${card.image.keyword}" role="img" aria-label="${card.image.alt}"></div>
          <div class="feature-card-content">
            <h3 class="feature-card-title">${this._escape(card.title)}</h3>
            <p class="feature-card-desc">${this._escape(card.description)}</p>
            ${card.price ? `<span class="feature-card-price">${card.price.currency}${card.price.value}</span>` : ''}
            <a href="${card.link}" class="feature-card-link">
              <span>View</span>
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            </a>
          </div>
        </article>
      `;
    });

    return `
      <div class="feature-grid-wrapper">
        <div class="section-label">${this._escape(label)}</div>
        <h2 class="section-headline">${this._escape(headline)}</h2>
        <div class="feature-grid">${cardsHTML}</div>
      </div>
    `;
  }

  _renderShowcase(section, content) {
    const items = content.showcaseItem || [];

    let itemsHTML = '';
    items.forEach((item, i) => {
      itemsHTML += `
        <div class="showcase-item" data-showcase-index="${i}">
          <div class="showcase-image-container">
            <div class="showcase-image" style="background-image:url('${item.src}')" data-image-keyword="${item.keyword}" role="img" aria-label="${item.alt}"></div>
            <div class="showcase-parallax-bg" style="background-image:url('${item.src}')" data-image-keyword="${item.keyword}"></div>
          </div>
          <div class="showcase-content">
            <h3 class="showcase-item-title">${this._escape(item.alt || 'Untitled')}</h3>
          </div>
        </div>
      `;
    });

    return `
      <div class="showcase-wrapper">
        <div class="showcase-items">${itemsHTML}</div>
      </div>
    `;
  }

  _renderGeneric(section, content) {
    // Simple generic container rendering
    const headline = content.headline || content.sectionHeadline || section.name;
    const body = content.subheadline || content.itemDescription || '';

    return `
      <div class="generic-section-wrapper">
        <h2>${this._escape(headline)}</h2>
        <p>${this._escape(body)}</p>
      </div>
    `;
  }

  /* ── FOOTER STITCHING ──────────────────────────────────────────────────────── */

  _stitchFooter(navTree, colors) {
    const footer = document.createElement('footer');
    footer.className = 'luxury-footer';

    const columns = navTree.map(node => `
      <div class="footer-column" data-nav-route="${node.route}">
        <h4 class="footer-column-title">${node.label}</h4>
        <ul class="footer-column-links">
          ${(node.children || []).map(child => `
            <li><a href="${child.route}" data-link-type="child">${child.label}</a></li>
          `).join('')}
          <li><a href="${node.route}" data-link-type="parent">All ${node.label}</a></li>
        </ul>
      </div>
    `).join('');

    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand-block">
          <div class="footer-brand" data-footer="brand">MDX</div>
          <p class="footer-tagline">Cinematic luxury, engineered.</p>
          <div class="footer-social">
            <a href="#" aria-label="Instagram" data-social="instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
            <a href="#" aria-label="Pinterest" data-social="pinterest"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14c0 2 1.5 3 3 3s3-2 3-4c0-3-1.5-5-3.5-5S7 10 7 13c0 1.5.5 2.5 1 3l-1 3 3-1c1 .5 2 .5 2.5.5"/></svg></a>
            <a href="#" aria-label="LinkedIn" data-social="linkedin"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
          </div>
        </div>
        <div class="footer-columns">${columns}</div>
      </div>
      <div class="footer-bar">
        <span class="footer-copy">© ${new Date().getFullYear()} MDX. All rights reserved.</span>
        <a href="/" class="footer-legal" data-link-type="legal">Privacy</a>
      </div>
    `;

    return footer;
  }

  /* ── NAV INJECTION ────────────────────────────────────────────────────────── */

  _injectPageNav(doc, currentRoute, navTree) {
    const nav = document.createElement('nav');
    nav.className = 'luxury-nav';
    nav.setAttribute('data-current-route', currentRoute);

    const links = navTree.map(node => {
      const isActive = node.route === currentRoute;
      return `<a href="${node.route}" class="nav-link ${isActive ? 'active' : ''}" data-nav-route="${node.route}" ${isActive ? 'aria-current="page"' : ''}>${node.label}</a>`;
    }).join('');

    nav.innerHTML = `
      <div class="nav-inner">
        <a href="/" class="nav-brand" data-nav="brand">MDX</a>
        <div class="nav-links">${links}</div>
        <button class="nav-toggle" aria-label="Toggle menu" data-nav="toggle"><span></span><span></span></button>
      </div>
    `;

    doc.body.insertBefore(nav, doc.body.firstChild);
  }

  /* ── CSS & STYLE INJECTION ────────────────────────────────────────────────── */

  _buildSectionCSS(section, layout, colors, fonts) {
    return `
      .section-${section.id} {
        --section-color-primary: ${colors.primary};
        --section-color-secondary: ${colors.secondary};
        --section-color-accent: ${colors.accent};
        --section-color-bg: ${colors.background};
        --section-color-text: ${colors.text};
        --section-color-muted: ${colors.muted};
        --section-font-display: ${fonts.display};
        --section-font-body: ${fonts.body};
      }
    `;
  }

  _defaultColors() {
    return {
      primary: '#C9A96E',
      secondary: '#1A1A1C',
      accent: '#E8D5B7',
      background: '#0B0B0C',
      text: '#F1F0EA',
      muted: '#8A8A8A'
    };
  }

  /* ── HEAD / BODY SERIALIZATION ───────────────────────────────────────────── */

  _serializeHead(head) {
    return head.innerHTML;
  }

  _serializeBody(body) {
    return body.innerHTML;
  }

  /* ── GLOBAL EXTRACTION ───────────────────────────────────────────────────── */

  _extractGlobalStyles(pages) {
    // Collect all unique CSS from page heads
    const styles = new Set();
    Object.values(pages).forEach(page => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<html><head>${page.head}</head><body></body></html>`, 'text/html');
      doc.querySelectorAll('style').forEach(style => styles.add(style.textContent));
    });
    return Array.from(styles).join('\n');
  }

  _extractGlobalScripts(pages) {
    const scripts = new Set();
    Object.values(pages).forEach(page => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<html><head>${page.head}</head><body></body></html>`, 'text/html');
      doc.querySelectorAll('script').forEach(script => scripts.add(script.textContent || script.src));
    });
    return Array.from(scripts);
  }

  /* ── LINK MAP ───────────────────────────────────────────────────────────── */

  _buildLinkMap(pages) {
    const map = {};
    Object.values(pages).forEach(page => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<html><body>${page.body}</body></html>`, 'text/html');
      const links = Array.from(doc.querySelectorAll('a[href^="/"]')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim(),
        type: a.dataset.linkType || a.dataset.cta || 'default'
      }));
      map[page.route] = links;
    });
    return map;
  }

  /* ── UTILITIES ────────────────────────────────────────────────────────────── */

  _meta(name, content, attrs = {}) {
    const meta = document.createElement('meta');
    if (name === 'preconnect') {
      meta.setAttribute('rel', 'preconnect');
      meta.setAttribute('href', content);
      if (attrs.crossorigin) meta.setAttribute('crossorigin', '');
    } else {
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
    }
    return meta;
  }

  _buildTitle(page, meta) {
    return meta.defaultTitleTemplate?.replace('{page}', page.label) || `${page.label} — ${meta.siteName || 'MDX'}`;
  }

  _escape(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  _log(stage, message, data = {}) {
    const entry = { stage, message, data, time: Date.now() };
    this._stitchLog.push(entry);
    if (this.verbose) console.log(`[PageStitcher::${stage}] ${message}`, data);
  }

  /* ── LAYOUT REGISTRY ──────────────────────────────────────────────────────── */

  _buildLayoutRegistry() {
    return {
      hero: { component: 'InteractiveCanvasHero', cssClass: 'section-hero', requiredSlots: ['headline', 'subheadline', 'heroImage'] },
      pageHero: { component: 'InteractiveCanvasHero', cssClass: 'section-hero', requiredSlots: ['headline', 'subheadline', 'heroImage'] },
      features: { component: 'InteractiveFeatureGrid', cssClass: 'section-features', requiredSlots: ['sectionLabel', 'sectionHeadline', 'feature'] },
      featureGrid: { component: 'InteractiveFeatureGrid', cssClass: 'section-features', requiredSlots: ['sectionLabel', 'sectionHeadline', 'feature'] },
      serviceList: { component: 'InteractiveFeatureGrid', cssClass: 'section-features', requiredSlots: ['sectionLabel', 'sectionHeadline', 'serviceItem'] },
      showcase: { component: 'CinematicViewportShowcase', cssClass: 'section-showcase', requiredSlots: ['showcaseItem'] },
      caseStudies: { component: 'CinematicViewportShowcase', cssClass: 'section-showcase', requiredSlots: ['caseStudy'] },
      articles: { component: 'InteractiveFeatureGrid', cssClass: 'section-features', requiredSlots: ['articleCard'] },
      statement: { component: 'GenericContainer', cssClass: 'section-statement', requiredSlots: ['quote', 'attribution'] },
      philosophy: { component: 'GenericContainer', cssClass: 'section-philosophy', requiredSlots: ['philosophyCard'] },
      team: { component: 'GenericContainer', cssClass: 'section-team', requiredSlots: ['teamMember'] },
      process: { component: 'GenericContainer', cssClass: 'section-process', requiredSlots: ['processStep'] },
      itemHero: { component: 'InteractiveCanvasHero', cssClass: 'section-hero', requiredSlots: ['itemName', 'itemTagline', 'itemImage'] },
      itemDetails: { component: 'GenericContainer', cssClass: 'section-details', requiredSlots: ['specGroup'] },
      contactForm: { component: 'GenericContainer', cssClass: 'section-contact', requiredSlots: ['formLabel', 'formField'] },
      locations: { component: 'GenericContainer', cssClass: 'section-locations', requiredSlots: ['locationCard'] }
    };
  }
}
