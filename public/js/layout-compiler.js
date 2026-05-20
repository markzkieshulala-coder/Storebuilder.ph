/**
 * ULTRA-PREMIUM 3D WEBSITE SYSTEM GENERATOR — PHASE 2
 * Core Module: Semantic 3D DOM Builder (LayoutCompiler)
 * Mission: Transform procedural blueprints into fully interactive 3D HTML/CSS environments.
 * Constraint: ZERO hardcoded page shells. Every DOM node is assembled from the blueprint at runtime.
 */

(function (global) {
  'use strict';

  // ============================================================
  // LAYOUT COMPILER CLASS
  // ============================================================

  class LayoutCompiler {
    constructor(blueprint) {
      if (!blueprint || !blueprint.intent || !blueprint.componentStack) {
        throw new Error('[LayoutCompiler] Invalid blueprint: intent and componentStack are required.');
      }
      this.blueprint = blueprint;
      this.intent = blueprint.intent;
      this.palette = blueprint.palette;
      this.stack = blueprint.componentStack;
      this.assets = blueprint.assetPrompts || [];
      this.spatial = blueprint.spatialProfile || {};
      this.routes = blueprint.routes || ['/home'];
      this.typeScale = blueprint.typeScale || {};
      this.brand = this.intent.brandName || this.intent.primaryNiche;
      this.niche = this.intent.primaryNiche;
      this.category = this.intent.siteCategory;
      this._assetIndex = 0;
      this.content = blueprint.contentKit || this._buildGenericContent();
    }

    _c(key, idx) {
      const arr = this.content && this.content[key];
      if (!arr || !arr.length) return null;
      const i = ((idx || 0) % arr.length + arr.length) % arr.length;
      return arr[i];
    }

    _buildGenericContent() {
      const n = this.niche, b = this.brand;
      return {
        taglines: [`Premium ${n}`, `${b} — Excellence`, `The ${n} Standard`, `${b} — Best in Class`],
        heroSubs: [
          `${b} delivers premium ${n} with uncompromising quality.`,
          `Experience the finest ${n}, curated for those who demand excellence.`,
          `Trusted by thousands for ${n}.`
        ],
        products: Array.from({length: 8}, (_, i) => ({
          name: `${b} ${['Essential','Premium','Signature','Elite','Reserve','Classic','Limited','Exclusive'][i]}`,
          desc: `Premium ${n} product, crafted with precision.`,
          price: ''
        })),
        features: [
          {icon:'◈', title:'Premium Quality', desc:`Every ${n} product meets our rigorous quality standards.`},
          {icon:'◉', title:'Expert Curation', desc:`Our team personally selects each item to meet the ${b} standard.`},
          {icon:'◆', title:'Fast Delivery', desc:'Same-day and next-day delivery available across major cities.'},
          {icon:'◊', title:'Customer First', desc:'30-day returns, live support, and a satisfaction guarantee on every order.'},
          {icon:'●', title:'Trusted Brand', desc:`${b} has served thousands of customers with a 4.9-star rating.`},
          {icon:'◍', title:'Secure Payments', desc:'All transactions are encrypted and protected.'}
        ],
        testimonials: [
          {name:'Ana Reyes', role:'Verified Customer', text:`Absolutely impressed with ${b}. Exceptional quality and fast delivery.`, rating:'★★★★★'},
          {name:'Marco Santos', role:'Regular Customer', text:`I've ordered from ${b} for over a year. Consistently excellent.`, rating:'★★★★★'},
          {name:'Sofia Cruz', role:'First-Time Buyer', text:`${b} completely exceeded my expectations.`, rating:'★★★★★'},
          {name:'James Lim', role:'Loyal Customer', text:`${b} is the only store I trust for ${n}.`, rating:'★★★★★'}
        ],
        metrics: [
          {val:'10,000+', label:'Happy Customers'},
          {val:'4.9★', label:'Rating'},
          {val:'500+', label:'Products'},
          {val:'99%', label:'Satisfaction'},
          {val:'24/7', label:'Support'},
          {val:'<24h', label:'Delivery'}
        ],
        cta: {primary:`Explore ${n}`, secondary:'View Collection', newsletter:'Get Updates', getStarted:'Get Started'},
        sectionTitles: {
          products:`${n} Collection`, services:'Our Services', about:`The ${b} Story`,
          features:'Why Choose Us', testimonials:'What Customers Say', process:'How It Works', contact:'Get In Touch'
        },
        pills: [n, 'Featured', 'New Arrivals', 'Best Sellers', 'Sale'],
        teamRoles: ['Founder & CEO','Head of Operations','Creative Director','Customer Success','Marketing Lead','Product Manager'],
        processSteps: [
          {num:'01', title:'Browse', desc:`Explore our curated ${n} catalog.`},
          {num:'02', title:'Select', desc:'Add to cart. Multiple payment options available.'},
          {num:'03', title:'Order', desc:'Secure checkout in under 2 minutes.'},
          {num:'04', title:'Pack', desc:`Each ${n} item carefully inspected and prepared.`},
          {num:'05', title:'Deliver', desc:'Fast trackable delivery. Free returns within 30 days.'}
        ],
        valuePropTriad: [
          {title:'Curated Quality', desc:`Only the finest ${n} makes our catalog.`},
          {title:'Effortless Experience', desc:'From discovery to delivery, smooth and enjoyable.'},
          {title:'Total Confidence', desc:'Every purchase backed by our satisfaction guarantee.'}
        ],
        locationCity: 'Manila',
        partnerNames: ['Partner A','Partner B','Partner C','Partner D','Partner E','Partner F','Partner G','Partner H'],
        variantLabels: ['Essential','Premium','Signature','Elite','Reserve','Classic','Limited','Exclusive'],
        footerTagline: `Premium ${n} — curated for excellence by ${b}.`
      };
    }

    // --- Picsum image helper -------------------------------------------------
    // Returns a deterministic, unique image URL for an asset slot.
    // Uses the asset's numeric seed so the same prompt always gives the same image.
    _img(asset, cls) {
      const w = 1200, h = 800;
      const seed = asset.seed || (this._assetIndex * 31 + 1);
      const url = `https://picsum.photos/seed/${seed}/${w}/${h}`;
      return `<img class="asset-img${cls ? ' ' + cls : ''}" src="${url}" alt="${this.niche}" loading="lazy" decoding="async">`;
    }

    // --- Asset Slot Rotator ------------------------------------------------
    _nextAsset() {
      const asset = this.assets[this._assetIndex % this.assets.length];
      this._assetIndex++;
      return asset || { prompt: this.niche, cfgKey: 'generic' };
    }

    _nextAssets(count) {
      const out = [];
      for (let i = 0; i < count; i++) out.push(this._nextAsset());
      return out;
    }

    // --- CSS Variable Injection --------------------------------------------
    _generateCSSVariables() {
      const p = this.palette;
      return `
        :root {
          /* === Phase-1 Procedural Palette === */
          --color-base: ${p.base};
          --color-surface: ${p.surface};
          --color-surface-elevated: ${p.surfaceElevated};
          --color-accent: ${p.accent};
          --color-accent-glow: ${p.accentGlow};
          --color-secondary: ${p.secondary};
          --color-text: ${p.textPrimary};
          --color-text-secondary: ${p.textSecondary};
          --color-border: ${p.border};

          /* === Procedural Typography Scale === */
          --font-hero: ${this.typeScale.hero || 'clamp(3rem, 7vw, 9rem)'};
          --font-h1: ${this.typeScale.h1 || 'clamp(2rem, 4vw, 5rem)'};
          --font-h2: ${this.typeScale.h2 || 'clamp(1.5rem, 2.5vw, 3rem)'};
          --font-body: ${this.typeScale.body || '1rem'};
          --font-micro: ${this.typeScale.micro || '0.72rem'};
          --line-height-global: ${this.typeScale.lineHeight || 1.45};
          --ls-hero: ${this.typeScale.letterSpacingHero || '-0.02em'};
          --ls-body: ${this.typeScale.letterSpacingBody || '0em'};

          /* === 3D Spatial Profile === */
          --perspective-scene: ${this.spatial.scenePerspective || 1200}px;
          --translate-z-element: ${this.spatial.elementTranslateZ || 80}px;
          --hover-lift-z: ${this.spatial.hoverLiftZ || 40}px;
          --mouse-tilt: ${this.spatial.mouseTiltIntensity || 0.2};
          --scroll-velocity: ${this.spatial.scrollVelocityFactor || 0.03};
          --ambient-float-amp: ${this.spatial.ambientFloatAmplitude || 16}px;
          --ambient-float-freq: ${this.spatial.ambientFloatFrequency || 0.4}s;
          --blur-backdrop: ${this.spatial.blurBackdrop || 16}px;
        }

        /* === Asset Slot System — Procedural Image Containers === */
        .asset-slot {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 320px;
          overflow: hidden;
          border-radius: 16px;
          background: ${p.surface};
          border: 1px solid ${p.border};
        }
        .asset-slot .asset-img {
          width: 100%;
          height: 100%;
          min-height: 320px;
          object-fit: cover;
          display: block;
          border-radius: inherit;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .asset-slot:hover .asset-img { transform: scale(1.04); }
        .asset-slot--macro  { border-radius: 20px; }
        .asset-slot--cinematic { border-radius: 0; min-height: 100%; }
        .asset-slot--editorial { min-height: 280px; border-radius: 14px; }
        .asset-slot--immersive { border-radius: 0; min-height: 100%; }
        .asset-slot--3d { border-radius: 50%; min-height: 280px; }
        .asset-slot .asset-label {
          position: absolute;
          bottom: 10px;
          left: 12px;
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          pointer-events: none;
          z-index: 2;
        }
        /* === Card & Grid Panels === */
        .card-panel, .product-card, .showcase-card, .capability-card,
        .feature-card, .team-card, .proof-card {
          background: ${p.surface};
          border: 1px solid ${p.border};
          border-radius: 18px;
          overflow: hidden;
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1),
                      box-shadow 0.35s ease;
        }
        .card-panel:hover, .product-card:hover, .showcase-card:hover,
        .capability-card:hover, .feature-card:hover {
          transform: translateY(-6px) translateZ(${this.spatial.hoverLiftZ || 40}px);
          box-shadow: 0 24px 56px rgba(0,0,0,0.35);
        }
        .card-visual { width: 100%; aspect-ratio: 4/3; overflow: hidden; }
        .card-visual .asset-img { width:100%; height:100%; object-fit:cover; display:block; }
        .card-body { padding: 20px 22px; }
        .card-title {
          font-size: var(--font-h2);
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 8px;
        }
        .card-desc { font-size: var(--font-body); color: var(--color-text-secondary); line-height: 1.5; }
      `;
    }

    // --- Navigation Builder --------------------------------------------------
    _buildNav(currentPath) {
      const links = this.routes
        .filter(r => r !== currentPath)
        .slice(0, 5)
        .map(r => {
          const label = r.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `<a href="${r}" class="nav-link" data-vr-link>${label}</a>`;
        })
        .join('');

      const homeLink = currentPath !== '/home'
        ? `<a href="/home" class="nav-link nav-brand" data-vr-link>${this.brand}</a>`
        : `<span class="nav-brand nav-brand--static">${this.brand}</span>`;

      return `
        <nav class="site-nav glass-panel" aria-label="Primary">
          <div class="nav-lockup">
            ${homeLink}
          </div>
          <div class="nav-links" role="menubar">
            ${links}
          </div>
          <button class="nav-cta btn-premium" data-vr-link="/contact">
            <span class="btn-shimmer"></span>
            <span class="btn-label">${this._ctaLabel()}</span>
          </button>
        </nav>
      `;
    }

    _ctaLabel() {
      if (this.content && this.content.cta && this.content.cta.primary) return this.content.cta.primary;
      const map = {
        E_COMMERCE: 'Shop Now',
        PORTFOLIO: 'Hire Me',
        SAAS: 'Start Free',
        AGENCY: 'Start Project',
        LANDING: 'Join Waitlist',
        BUSINESS: 'Contact'
      };
      return map[this.category] || 'Explore';
    }

    // --- Route Name Formatter -----------------------------------------------
    _routeLabel(path) {
      return path.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // ========================================================================
    // SEMANTIC SECTION BUILDERS
    // ========================================================================

    // --- HERO BUILDERS -----------------------------------------------------
    _hero_CINEMATIC_SHOWCASE(comp) {
      const a = this._nextAsset();
      const align = comp.alignment.horizontal;
      const textAlign = align === 'asymmetric' ? 'left' : align;
      const justify = align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start');
      return `
        <section class="section-hero hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="hero-backdrop" aria-hidden="true">
            <div class="hero-visual-slot">
              <div class="asset-slot asset-slot--macro" title="${a.prompt.replace(/"/g, '&quot;')}">
                <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            </div>
            <div class="hero-overlay"></div>
          </div>
          <div class="section-inner" style="align-items:${justify};text-align:${textAlign};padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.category.replace(/_/g, ' ')}</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 0) || `${this.brand} — premium ${this.niche} for those who demand the best.`}</p>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <a href="/shop" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">${(this.content && this.content.cta && this.content.cta.primary) || 'Explore Collection'}</span></a>
              <a href="/process" class="btn-ghost" data-vr-link>${(this.content && this.content.cta && this.content.cta.secondary) || 'Learn More'}</a>
            </div>
          </div>
        </section>
      `;
    }

    _hero_SPLIT_REVEAL(comp) {
      const a1 = this._nextAsset();
      const a2 = this._nextAsset();
      return `
        <section class="section-hero section-hero--split hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="split-panel split-panel--visual" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" title="${a1.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a1.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="split-panel split-panel--content" style="padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.niche}</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 1) || `Premium ${this.niche} — crafted with precision and delivered with care.`}</p>
            <div class="asset-slot asset-slot--editorial hidden-3d" style="margin-top:24px;transition-delay:calc(var(--stagger) * 3)" title="${a2.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a2.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        </section>
      `;
    }

    _hero_MONUMENTAL_TEXT(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--monument hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="monument-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--immersive" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <h1 class="hero-text hero-text--monument hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h1>
            <p class="hero-sub hero-sub--monument hidden-3d" style="transition-delay:calc(var(--stagger) * 1);max-width:38ch;">${this._c('heroSubs', 0) || `Premium ${this.niche}, built for those who demand excellence.`}</p>
            <a href="/work" class="btn-ghost hidden-3d" style="transition-delay:calc(var(--stagger) * 2);margin-top:32px;" data-vr-link>Enter Experience</a>
          </div>
        </section>
      `;
    }

    _hero_3D_ORBITAL(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--orbital hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="orbital-stage" aria-hidden="true">
            <div class="orbital-ring orbital-ring--outer"></div>
            <div class="orbital-ring orbital-ring--inner"></div>
            <div class="asset-slot asset-slot--3d" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">3D Product Stage</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 2) || `${this.brand} — trusted by thousands for premium ${this.niche}.`}</p>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <a href="/collection" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">${(this.content && this.content.cta && this.content.cta.primary) || 'Explore Collection'}</span></a>
            </div>
          </div>
        </section>
      `;
    }

    _hero_KINETIC_CANVAS(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--kinetic hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="kinetic-canvas" aria-hidden="true">
            <div class="kinetic-scanline"></div>
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:flex-start;text-align:left;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Creative Studio</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);mix-blend-mode:difference;">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:36ch;">${this._c('heroSubs', 0) || `${this.brand} — the premier destination for ${this.niche}.`}</p>
            <a href="/work" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 3)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">View Showreel</span></a>
          </div>
        </section>
      `;
    }

    _hero_TYPOGRAPHY_MONUMENT(comp) {
      return `
        <section class="section-hero section-hero--type hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <h1 class="hero-text hero-text--type-monument hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1);max-width:34ch;">${this.niche} — Typography Monument. Maximum contrast, absolute hierarchy.</p>
            <div class="type-metrics hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              ${(() => {
                const m = this.content && this.content.metrics;
                if (m && m.length >= 3) {
                  return m.slice(0,3).map(x => `<div class="metric"><span class="metric-value">${x.val}</span><span class="metric-label">${x.label}</span></div>`).join('');
                }
                return `<div class="metric"><span class="metric-value">10,000+</span><span class="metric-label">Happy Customers</span></div><div class="metric"><span class="metric-value">4.9★</span><span class="metric-label">Rating</span></div><div class="metric"><span class="metric-value">500+</span><span class="metric-label">Products</span></div>`;
              })()}
            </div>
          </div>
        </section>
      `;
    }

    _hero_VIDEO_IMMERSION(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--video hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="video-immersion-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="video-overlay"></div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="play-trigger hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="play-ring"></div>
              <div class="play-icon">&#9654;</div>
            </div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 1) || `Explore ${this.brand} — premium ${this.niche} for every need.`}</p>
          </div>
        </section>
      `;
    }

    _hero_DASHBOARD_REVEAL(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--saas hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.niche}</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:40ch;">${this._c('heroSubs', 1) || `${this.brand} — premium ${this.niche} for discerning customers.`}</p>
            <div class="dashboard-mockup glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 3);margin-top:40px;">
              <div class="dash-header">
                <span class="dash-dot"></span><span class="dash-dot"></span><span class="dash-dot"></span>
              </div>
              <div class="dash-body">
                <div class="dash-chart"></div>
                <div class="dash-metrics">
                  <div class="dash-metric"><div class="dash-bar" style="height:60%"></div></div>
                  <div class="dash-metric"><div class="dash-bar" style="height:85%"></div></div>
                  <div class="dash-metric"><div class="dash-bar" style="height:45%"></div></div>
                  <div class="dash-metric"><div class="dash-bar" style="height:92%"></div></div>
                </div>
              </div>
            </div>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 4);margin-top:28px;">
              <a href="/shop" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Start Free Trial</span></a>
              <a href="/services" class="btn-ghost" data-vr-link>View Demo</a>
            </div>
          </div>
        </section>
      `;
    }

    _hero_DATA_VORTEX(comp) {
      return `
        <section class="section-hero section-hero--vortex hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="vortex-bg" aria-hidden="true">
            ${Array.from({length: 6}, (_, i) => `<div class="vortex-ring" style="--ri:${i}"></div>`).join('')}
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <h1 class="hero-text hero-text--vortex hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1);max-width:36ch;">${this._c('heroSubs', 2) || `${this.brand} — premium ${this.niche} at its finest.`}</p>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              <a href="/services" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Launch Platform</span></a>
            </div>
          </div>
        </section>
      `;
    }

    _hero_INTERACTIVE_DEMO(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--demo hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="demo-stage glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
            <div class="asset-slot asset-slot--immersive" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="demo-overlay">
              <div class="demo-pulse"></div>
              <span class="demo-cta-text">Interactive Live Demo — Click to Engage</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};margin-top:28px;">
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 0) || `Experience ${this.brand} — premium ${this.niche}.`}</p>
          </div>
        </section>
      `;
    }

    _hero_CREATIVE_BURST(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--burst hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="burst-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this._c('heroSubs', 1) || `${this.brand} — premium ${this.niche} with unmatched variety.`}</p>
            <a href="/work" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">See Work</span></a>
          </div>
        </section>
      `;
    }

    _hero_MANIFESTO_WALL(comp) {
      return `
        <section class="section-hero section-hero--manifesto hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:flex-start;text-align:left;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="manifesto-lines">
              <div class="manifesto-line hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">We believe</div>
              <div class="manifesto-line hidden-3d manifesto-line--accent" style="transition-delay:calc(var(--stagger) * 1)">${this.niche}</div>
              <div class="manifesto-line hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">deserves</div>
              <div class="manifesto-line hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">radical clarity.</div>
            </div>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 4);max-width:36ch;margin-top:28px;">${this._c('heroSubs', 2) || `${this.brand} — where quality meets passion for ${this.niche}.`}</p>
          </div>
        </section>
      `;
    }

    _hero_SHOWREEL_GATEWAY(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--gateway hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="gateway-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="gateway-ring hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="gateway-play">&#9654;</div>
            </div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 0) || `${this.brand} — premium ${this.niche}.`}</p>
          </div>
        </section>
      `;
    }

    _hero_COUNTDOWN_SINGULARITY(comp) {
      return `
        <section class="section-hero section-hero--countdown hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="countdown-grid hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="countdown-unit"><span class="countdown-val">07</span><span class="countdown-label">Days</span></div>
              <div class="countdown-unit"><span class="countdown-val">14</span><span class="countdown-label">Hours</span></div>
              <div class="countdown-unit"><span class="countdown-val">33</span><span class="countdown-label">Minutes</span></div>
              <div class="countdown-unit"><span class="countdown-val">09</span><span class="countdown-label">Seconds</span></div>
            </div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);margin-top:24px;">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 1) || `Limited time — shop ${this.brand} premium ${this.niche} now.`}</p>
            <a href="/contact" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 3);margin-top:20px;" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Reserve Access</span></a>
          </div>
        </section>
      `;
    }

    _hero_PRODUCT_REVEAL(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--reveal hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="reveal-stage" aria-hidden="true">
            <div class="asset-slot asset-slot--macro" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="reveal-shroud"></div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Introducing</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 2) || `The newest ${this.niche} from ${this.brand} — now available.`}</p>
            <a href="/shop" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 3)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Pre-Order Now</span></a>
          </div>
        </section>
      `;
    }

    _hero_VIDEO_TEASER(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--teaser hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="teaser-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="teaser-grain"></div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="teaser-badge hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Cinematic Teaser</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this._c('heroSubs', 0) || `${this.brand} — the finest ${this.niche}, delivered to you.`}</p>
          </div>
        </section>
      `;
    }

    _hero_TRUST_STATEMENT(comp) {
      return `
        <section class="section-hero section-hero--trust hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="trust-seal hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="seal-ring"></div>
              <div class="seal-star">&#10022;</div>
            </div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:38ch;">${this._c('heroSubs', 1) || `${this.brand} — trusted by thousands for premium ${this.niche}.`}</p>
            <div class="trust-logos hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              ${(this.content && this.content.partnerNames || ['Partner A','Partner B','Partner C','Partner D']).slice(0, 4).map(p => `<div class="trust-logo">${p}</div>`).join('')}
            </div>
          </div>
        </section>
      `;
    }

    _hero_SERVICE_SHOWCASE(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--service hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="service-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="section-inner" style="align-items:flex-start;text-align:left;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Services</div>
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:36ch;">${this._c('heroSubs', 0) || `${this.brand} — premium ${this.niche} services you can trust.`}</p>
            <div class="service-pills hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              ${(this.content && this.content.pills || ['Featured','New Arrivals','Best Sellers','Sale']).slice(0, 4).map(p => `<span class="pill">${p}</span>`).join('')}
            </div>
          </div>
        </section>
      `;
    }

    _hero_BUILDING_EXTERIOR(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-hero section-hero--exterior hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="exterior-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="exterior-vignette"></div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <h1 class="hero-text hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h1>
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this._c('heroSubs', 2) || `${this.brand} — your trusted ${this.niche} destination.`}</p>
          </div>
        </section>
      `;
    }

    // --- BODY BUILDERS -----------------------------------------------------
    _body_GRID_ASYMMETRIC_MASONRY(comp) {
      const assets = this._nextAssets(6);
      const products = (this.content && this.content.products) || [];
      const sectionTitle = (this.content && this.content.sectionTitles && this.content.sectionTitles.products) || `${this.niche} Collection`;
      const cards = assets.map((a, i) => {
        const prod = products[i % products.length];
        const title = prod ? prod.name : `${this.niche} — ${this._variantLabel(i)}`;
        const desc = prod ? prod.desc : a.prompt.slice(0, 110);
        const price = prod && prod.price ? `<span class="card-price">${prod.price}</span>` : '';
        return `
        <div class="masonry-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--card-z:${i * 20}px;" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <div class="card-visual">
            <div class="asset-slot" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="card-meta">
            <span class="card-index">0${i + 1}</span>
            <h3 class="card-title">${title}</h3>
            <p class="card-desc">${desc}</p>
            ${price}
          </div>
        </div>
        `;
      }).join('');
      return `
        <section class="section-body section-body--masonry hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">${sectionTitle}</h2>
            </div>
            <div class="masonry-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_SHOWCASE_ASYMMETRIC_MASONRY(comp) {
      return this._body_GRID_ASYMMETRIC_MASONRY(comp);
    }

    _body_SPEC_LABORATORY(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--spec hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Specification Laboratory</h2>
            </div>
            <div class="spec-layout">
              <div class="spec-visual hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
                <div class="asset-slot asset-slot--macro" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
                  <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <div class="spec-hotspots">
                  <div class="hotspot" style="top:25%;left:30%"><span class="hotspot-ring"></span><span class="hotspot-label">Material</span></div>
                  <div class="hotspot" style="top:60%;left:70%"><span class="hotspot-ring"></span><span class="hotspot-label">Craft</span></div>
                  <div class="hotspot" style="top:45%;left:45%"><span class="hotspot-ring"></span><span class="hotspot-label">Origin</span></div>
                </div>
              </div>
              <div class="spec-sheet glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
                ${(() => {
                  const prod = this._c('products', 0);
                  const m0 = this._c('metrics', 0);
                  const m1 = this._c('metrics', 1);
                  const m2 = this._c('metrics', 2);
                  return `
                    <div class="spec-row"><span class="spec-key">Category</span><span class="spec-val">${this.niche}</span></div>
                    <div class="spec-row"><span class="spec-key">Brand</span><span class="spec-val">${this.brand}</span></div>
                    ${prod ? `<div class="spec-row"><span class="spec-key">Featured</span><span class="spec-val">${prod.name}</span></div>` : ''}
                    ${m0 ? `<div class="spec-row"><span class="spec-key">${m0.label}</span><span class="spec-val">${m0.val}</span></div>` : ''}
                    ${m1 ? `<div class="spec-row"><span class="spec-key">${m1.label}</span><span class="spec-val">${m1.val}</span></div>` : ''}
                    ${m2 ? `<div class="spec-row"><span class="spec-key">${m2.label}</span><span class="spec-val">${m2.val}</span></div>` : ''}
                  `;
                })()}
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_EDITORIAL_LOOKBOOK(comp) {
      const assets = this._nextAssets(4);
      const products = (this.content && this.content.products) || [];
      const slides = assets.map((a, i) => {
        const prod = products[i % products.length];
        const title = prod ? prod.name : this._variantLabel(i);
        const desc = prod ? prod.desc : a.prompt.slice(0, 140);
        const price = prod && prod.price ? ` — ${prod.price}` : '';
        return `
        <div class="lookbook-slide hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--slide-index:${i};" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.08).toFixed(2)}">
          <div class="lookbook-visual">
            <div class="asset-slot asset-slot--editorial" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="lookbook-caption">
            <span class="lookbook-chapter">Chapter 0${i + 1}${price}</span>
            <h3 class="lookbook-title">${title}</h3>
            <p class="lookbook-desc">${desc}</p>
          </div>
        </div>
        `;
      }).join('');
      return `
        <section class="section-body section-body--lookbook hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Editorial Lookbook</h2>
            </div>
            <div class="lookbook-track">${slides}</div>
          </div>
        </section>
      `;
    }

    _body_MATERIAL_PALETTE(comp) {
      const assets = this._nextAssets(5);
      const swatches = assets.map((a, i) => `
        <div class="material-swatch hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--swatch-index:${i};" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.06).toFixed(2)}">
          <div class="swatch-visual">
            <div class="asset-slot asset-slot--macro" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <span class="swatch-name">Material ${String.fromCharCode(65 + i)}</span>
          <span class="swatch-desc">${a.prompt.slice(0, 60)}...</span>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--material hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Material & Texture Palette</h2>
            </div>
            <div class="material-grid">${swatches}</div>
          </div>
        </section>
      `;
    }

    _body_IMMERSIVE_ATELIER(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--atelier hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="atelier-bg" aria-hidden="true">
            <div class="asset-slot asset-slot--immersive" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="atelier-overlay"></div>
          </div>
          <div class="section-inner" style="align-items:center;text-align:center;">
            <div class="atelier-quote hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="quote-mark">&ldquo;</span>
              <p class="quote-text">The atelier is where ${this.niche} becomes artifact.</p>
              <span class="quote-mark">&rdquo;</span>
            </div>
            <a href="/process" class="btn-ghost hidden-3d" style="transition-delay:calc(var(--stagger) * 1);margin-top:24px;" data-vr-link>Enter Atelier</a>
          </div>
        </section>
      `;
    }

    _body_TESTIMONIAL_CAROUSEL(comp) {
      const src = (this.content && this.content.testimonials) || [];
      const testimonials = src.length >= 3 ? src.slice(0, 4) : [
        {name:'Ana Reyes', role:'Verified Customer', text:`Absolutely love ${this.brand}. Exceptional quality!`, rating:'★★★★★'},
        {name:'Marco Santos', role:'Regular Customer', text:`Best ${this.niche} store I've found. Always reliable.`, rating:'★★★★★'},
        {name:'Sofia Cruz', role:'Happy Customer', text:`${this.brand} exceeded my expectations every single time.`, rating:'★★★★★'}
      ];
      const sectionTitle = (this.content && this.content.sectionTitles && this.content.sectionTitles.testimonials) || 'What Customers Say';
      const cards = testimonials.map((t, i) => `
        <div class="testimonial-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          ${t.rating ? `<div class="testimonial-rating">${t.rating}</div>` : ''}
          <p class="testimonial-text">&ldquo;${t.text}&rdquo;</p>
          <div class="testimonial-author">
            <div class="author-avatar"><span>${t.name.charAt(0)}</span></div>
            <div class="author-meta">
              <span class="author-name">${t.name}</span>
              <span class="author-role">${t.role}</span>
            </div>
          </div>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--testimonials hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">${sectionTitle}</h2>
            </div>
            <div class="testimonial-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_CRAFT_NARRATIVE(comp) {
      const src = (this.content && this.content.processSteps) || [];
      const steps = src.length >= 3 ? src : [
        {num:'01', title:'Browse', desc:`Explore our curated ${this.niche} catalog.`},
        {num:'02', title:'Select', desc:'Choose your products. Multiple payment options available.'},
        {num:'03', title:'Order', desc:'Secure checkout in under 2 minutes.'},
        {num:'04', title:'Pack', desc:`Every ${this.niche} item is carefully inspected before shipping.`},
        {num:'05', title:'Deliver', desc:'Fast trackable delivery. Free returns within 30 days.'}
      ];
      const sectionTitle = (this.content && this.content.sectionTitles && this.content.sectionTitles.process) || 'How It Works';
      const items = steps.map((s, i) => `
        <div class="timeline-node hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <div class="node-marker"><span class="node-num">${s.num}</span></div>
          <div class="node-content">
            <h3 class="node-title">${s.title}</h3>
            <p class="node-desc">${s.desc}</p>
          </div>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--timeline hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">${sectionTitle}</h2>
            </div>
            <div class="timeline-track">${items}</div>
          </div>
        </section>
      `;
    }

    _body_SPLIT_SCREEN_PRESENTATION(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--split hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="split-row">
            <div class="split-media hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
                <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            </div>
            <div class="split-content hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title" style="font-size:var(--font-h2);">Split-Screen Presentation</h2>
              <p class="section-lead">Dual-plane editorial composition for ${this.niche}. Asymmetric tension between visual and verbal hierarchy.</p>
              <a href="/work" class="btn-ghost" data-vr-link>Explore Project</a>
            </div>
          </div>
        </section>
      `;
    }

    _body_PROCESS_MATRIX(comp) {
      const cells = [
        { icon: '◈', title: 'Research', desc: `Semantic terrain mapping for ${this.niche}` },
        { icon: '◉', title: 'Prototype', desc: 'Rapid 3D spatial prototyping with live palette injection' },
        { icon: '◆', title: 'Produce', desc: 'Asset blueprint generation with photographic modifier binding' },
        { icon: '◊', title: 'Polish', desc: 'IntersectionObserver-calibrated entrance choreography' }
      ];
      const grid = cells.map((c, i) => `
        <div class="matrix-cell glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.06).toFixed(2)}">
          <span class="matrix-icon">${c.icon}</span>
          <h3 class="matrix-title">${c.title}</h3>
          <p class="matrix-desc">${c.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--matrix hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Process Matrix</h2>
            </div>
            <div class="matrix-grid">${grid}</div>
          </div>
        </section>
      `;
    }

    _body_PROJECT_TIMELINE(comp) {
      return this._body_CRAFT_NARRATIVE(comp);
    }

    _body_IMMERSIVE_SHOWREEL(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--showreel hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="showreel-stage">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="showreel-overlay">
              <div class="showreel-play">&#9654;</div>
              <span class="showreel-label">Immersive Showreel — ${this.niche}</span>
            </div>
          </div>
        </section>
      `;
    }

    _body_CLIENT_PROOF_GRID(comp) {
      const src = (this.content && this.content.metrics) || [];
      const metrics = src.length >= 4 ? src.slice(0, 6) : [
        {val:'10,000+', label:'Happy Customers'},
        {val:'4.9★', label:'Rating'},
        {val:'500+', label:'Products'},
        {val:'99%', label:'Satisfaction'}
      ];
      const cards = metrics.map((m, i) => `
        <div class="proof-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <span class="proof-val">${m.val}</span>
          <span class="proof-label">${m.label}</span>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--proof hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Our Track Record</h2>
            </div>
            <div class="proof-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_AWARDS_RECOGNITION(comp) {
      const awards = [
        { year: '2026', title: 'Awwwards Site of the Year', cat: this.niche },
        { year: '2025', title: 'CSS Design Awards — Best UI', cat: 'Procedural Systems' },
        { year: '2025', title: 'FWA — Innovation in 3D', cat: 'Spatial Web' },
        { year: '2024', title: 'Webby Awards — Visual Design', cat: this.niche }
      ];
      const list = awards.map((aw, i) => `
        <div class="award-row hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.04).toFixed(2)}">
          <span class="award-year">${aw.year}</span>
          <span class="award-title">${aw.title}</span>
          <span class="award-cat">${aw.cat}</span>
          <span class="award-badge">&#10022;</span>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--awards hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Awards & Recognition</h2>
            </div>
            <div class="awards-list">${list}</div>
          </div>
        </section>
      `;
    }

    _body_FEATURE_ISOMETRIC_GRID(comp) {
      const src = (this.content && this.content.features) || [];
      const features = src.length >= 4 ? src.slice(0, 6) : [
        {icon:'◈', title:`${this.niche} Quality`, desc:`Every product meets the highest standards of ${this.niche} excellence.`},
        {icon:'◉', title:'Expert Selection', desc:`Hand-picked by ${this.niche} specialists with decades of experience.`},
        {icon:'◆', title:'Fast Delivery', desc:'Same-day and next-day delivery available nationwide.'},
        {icon:'◊', title:'Customer First', desc:'30-day returns, live support, and a satisfaction guarantee.'},
        {icon:'●', title:'Trusted Brand', desc:`Thousands of satisfied ${this.niche} customers and growing.`},
        {icon:'◍', title:'Secure Checkout', desc:'All transactions are encrypted and protected.'}
      ];
      const sectionTitle = (this.content && this.content.sectionTitles && this.content.sectionTitles.features) || 'Why Choose Us';
      const cards = features.map((f, i) => `
        <div class="iso-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <div class="iso-icon">${f.icon || String.fromCharCode(9702 + i)}</div>
          <h3 class="iso-title">${f.title}</h3>
          <p class="iso-desc">${f.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--iso hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">${sectionTitle}</h2>
            </div>
            <div class="iso-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_ANALYTICS_SHOWCASE(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--analytics hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Analytics Showcase Stage</h2>
            </div>
            <div class="analytics-stage glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <div class="analytics-toolbar">
                <span class="analytics-title">${this.niche} Dashboard</span>
                <div class="analytics-pills">
                  <span class="a-pill a-pill--active">Live</span>
                  <span class="a-pill">1H</span>
                  <span class="a-pill">24H</span>
                  <span class="a-pill">7D</span>
                </div>
              </div>
              <div class="analytics-canvas">
                <div class="analytics-chart">
                  ${Array.from({length: 24}, (_, i) => `<div class="a-bar" style="height:${30 + Math.random() * 70}%;animation-delay:${i * 0.05}s"></div>`).join('')}
                </div>
                <div class="analytics-stats">
                  <div class="a-stat"><span class="a-stat-val">2.4M</span><span class="a-stat-label">Events</span></div>
                  <div class="a-stat"><span class="a-stat-val">99.97%</span><span class="a-stat-label">Uptime</span></div>
                  <div class="a-stat"><span class="a-stat-val">&lt;12ms</span><span class="a-stat-label">Latency</span></div>
                </div>
              </div>
            </div>
            <div class="asset-slot asset-slot--cinematic hidden-3d" style="margin-top:28px;transition-delay:calc(var(--stagger) * 1)" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        </section>
      `;
    }

    _body_INTEGRATION_ECOSYSTEM(comp) {
      const nodes = ['CRM', 'ERP', 'BI', 'ML', 'Auth', 'Storage', 'CDN', 'CI/CD'];
      const orbit = nodes.map((n, i) => `
        <div class="eco-node hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--node-angle:${(i / nodes.length) * 360}deg;" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.04).toFixed(2)}">
          <span class="node-name">${n}</span>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--ecosystem hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Integration Ecosystem Map</h2>
            </div>
            <div class="ecosystem-orbit">
              <div class="orbit-center glass-panel">${this.brand}</div>
              <div class="orbit-ring"></div>
              ${orbit}
            </div>
          </div>
        </section>
      `;
    }

    _body_PRICING_ARCHITECTURE(comp) {
      const tiers = [
        { name: 'Starter', price: '$0', desc: 'Individual creators exploring procedural workflows.', feats: ['1 Project', 'Basic Palette', 'Community Support'] },
        { name: 'Pro', price: '$49', desc: 'Teams shipping premium ${this.niche} experiences.', feats: ['Unlimited Projects', 'Custom Palettes', 'Priority Routing', 'Asset API'], highlight: true },
        { name: 'Enterprise', price: 'Custom', desc: 'Organizations requiring white-glove deployment.', feats: ['Dedicated Infra', 'SLA 99.99%', 'SSO & Audit', 'Custom Compiler'] }
      ];
      const cards = tiers.map((t, i) => `
        <div class="pricing-card ${t.highlight ? 'pricing-card--highlight' : ''} glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.06).toFixed(2)}">
          <span class="pricing-name">${t.name}</span>
          <span class="pricing-price">${t.price}</span>
          <span class="pricing-desc">${t.desc}</span>
          <ul class="pricing-feats">
            ${t.feats.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <a href="/contact" class="btn-premium ${t.highlight ? '' : 'btn-premium--subtle'}" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">${t.price === 'Custom' ? 'Contact Sales' : 'Select Plan'}</span></a>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--pricing hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Pricing Architecture</h2>
            </div>
            <div class="pricing-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_TESTIMONIAL_METRICS(comp) {
      return this._body_CLIENT_PROOF_GRID(comp);
    }

    _body_SECURITY_VAULT(comp) {
      return `
        <section class="section-body section-body--security hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Security & Compliance Vault</h2>
            </div>
            <div class="vault-grid">
              <div class="vault-cell glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
                <div class="vault-icon">&#128274;</div>
                <h3 class="vault-title">SOC 2 Type II</h3>
                <p class="vault-desc">Certified controls with continuous monitoring and automated evidence collection.</p>
              </div>
              <div class="vault-cell glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
                <div class="vault-icon">&#128209;</div>
                <h3 class="vault-title">GDPR Compliant</h3>
                <p class="vault-desc">Data residency controls, right-to-erasure workflows, and audit-ready logs.</p>
              </div>
              <div class="vault-cell glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
                <div class="vault-icon">&#9889;</div>
                <h3 class="vault-title">Zero-Knowledge</h3>
                <p class="vault-desc">Client-side encryption with procedural entropy-derived key rotation.</p>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_DEPLOYMENT_TIMELINE(comp) {
      return this._body_CRAFT_NARRATIVE(comp);
    }

    _body_CAPABILITY_MATRIX(comp) {
      const caps = [
        { title: 'Brand Strategy', desc: `Positioning ${this.niche} through semantic narrative architecture.` },
        { title: 'Visual Identity', desc: 'Algorithmic color systems and typographic monument design.' },
        { title: '3D Spatial Web', desc: 'Perspective viewport environments with scroll-driven choreography.' },
        { title: 'Procedural UI', desc: 'Dynamic component assembly with zero template repetition.' }
      ];
      const grid = caps.map((c, i) => `
        <div class="cap-cell glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.06).toFixed(2)}">
          <span class="cap-num">0${i + 1}</span>
          <h3 class="cap-title">${c.title}</h3>
          <p class="cap-desc">${c.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--caps hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Capability Matrix</h2>
            </div>
            <div class="cap-grid">${grid}</div>
          </div>
        </section>
      `;
    }

    _body_CASE_STUDY_THEATER(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--theater hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="theater-stage">
            <div class="asset-slot asset-slot--cinematic" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="theater-overlay">
              <div class="theater-meta glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
                <span class="theater-client">Client: ${this.brand}</span>
                <h3 class="theater-title">Case Study Theater — ${this.niche}</h3>
                <p class="theater-desc">Full-bleed cinematic presentation with editorial metadata overlay and glass-morphic info panel.</p>
                <a href="/work" class="btn-ghost" data-vr-link>Read Full Case Study</a>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_TEAM_PORTRAIT_GRID(comp) {
      const src = (this.content && this.content.teamRoles) || [];
      const members = src.length >= 4 ? src : ['Founder & CEO','Head of Operations','Creative Director','Customer Success','Marketing Lead','Product Manager'];
      const portraits = members.map((m, i) => {
        const a = this._nextAsset();
        return `
          <div class="portrait-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
            <div class="portrait-visual">
              <div class="asset-slot asset-slot--portrait" title="${a.prompt.replace(/"/g, '&quot;')}">
                <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            </div>
            <div class="portrait-meta">
              <span class="portrait-name">Team Member ${i + 1}</span>
              <span class="portrait-role">${m}</span>
            </div>
          </div>
        `;
      }).join('');
      return `
        <section class="section-body section-body--team hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Team Portrait Grid</h2>
            </div>
            <div class="portrait-grid">${portraits}</div>
          </div>
        </section>
      `;
    }

    _body_PROCESS_NARRATIVE(comp) {
      return this._body_CRAFT_NARRATIVE(comp);
    }

    _body_METRICS_PROOF_WALL(comp) {
      return this._body_CLIENT_PROOF_GRID(comp);
    }

    _body_PARTNER_ECOSYSTEM(comp) {
      const src = (this.content && this.content.partnerNames) || [];
      const partners = src.length >= 4 ? src : Array.from({length: 8}, (_, i) => `Partner ${String.fromCharCode(65 + i)}`);
      const orbs = partners.map((p, i) => `
        <div class="partner-orb hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.04).toFixed(2)}">
          <span class="orb-letter">${p.charAt(p.length - 1)}</span>
          <span class="orb-name">${p}</span>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--partners hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Partner Ecosystem Orbit</h2>
            </div>
            <div class="partner-orbit">${orbs}</div>
          </div>
        </section>
      `;
    }

    _body_VALUE_PROP_TRIAD(comp) {
      const src = (this.content && this.content.valuePropTriad) || [];
      const props = src.length >= 3 ? src : [
        {title:'Curated Quality', desc:`Only the finest ${this.niche} products make our catalog.`},
        {title:'Effortless Experience', desc:'From discovery to delivery — smooth and enjoyable every time.'},
        {title:'Total Confidence', desc:'Every purchase backed by our satisfaction guarantee.'}
      ];
      const cards = props.map((p, i) => `
        <div class="triad-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.06).toFixed(2)}">
          <span class="triad-num">0${i + 1}</span>
          <h3 class="triad-title">${p.title}</h3>
          <p class="triad-desc">${p.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--triad hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Value Proposition Triad</h2>
            </div>
            <div class="triad-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_SOCIAL_PROOF_WALL(comp) {
      return this._body_CLIENT_PROOF_GRID(comp);
    }

    _body_EARLY_ACCESS_GATE(comp) {
      return `
        <section class="section-body section-body--gate hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;">
            <div class="gate-badge hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Early Access</div>
            <h2 class="section-title hidden-3d" style="transition-delay:calc(var(--stagger) * 1);font-size:var(--font-h1);">${this.brand}</h2>
            <p class="section-lead hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:36ch;">Secure your position in the ${this.niche} early-access cohort. Limited seats per generation cycle.</p>
            <form class="gate-form hidden-3d" style="transition-delay:calc(var(--stagger) * 3)" onsubmit="event.preventDefault();">
              <input type="email" class="gate-input" placeholder="your@email.com" />
              <button type="submit" class="btn-premium"><span class="btn-shimmer"></span><span class="btn-label">Request Access</span></button>
            </form>
          </div>
        </section>
      `;
    }

    _body_FEATURE_SNEAK_PEEK(comp) {
      const a = this._nextAsset();
      return `
        <section class="section-body section-body--sneak hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Feature Sneak Peek</h2>
            </div>
            <div class="sneak-layout">
              <div class="sneak-visual hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
                <div class="asset-slot asset-slot--immersive" style="width:100%;height:100%" title="${a.prompt.replace(/"/g, '&quot;')}">
                  <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <div class="sneak-shroud"><span class="sneak-soon">Coming Soon</span></div>
              </div>
              <div class="sneak-content hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
                <h3 class="sneak-title">Next-Gen ${this.niche} Engine</h3>
                <p class="sneak-desc">A preview of the upcoming procedural pipeline upgrade. Real-time 3D compositing with neural asset synthesis.</p>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_SERVICE_EXPERTISE_GRID(comp) {
      const services = [
        { title: 'Strategic Consulting', desc: `Market positioning and competitive analysis for ${this.niche}.` },
        { title: 'Creative Direction', desc: 'Visual narrative architecture with algorithmic brand systems.' },
        { title: 'Digital Transformation', desc: 'End-to-end spatial web deployment with virtual routing.' },
        { title: 'Performance Marketing', desc: 'Conversion-optimized landing architectures with scarcity mechanics.' }
      ];
      const cards = services.map((s, i) => `
        <div class="service-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <span class="service-num">0${i + 1}</span>
          <h3 class="service-title">${s.title}</h3>
          <p class="service-desc">${s.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--services hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Service Expertise Grid</h2>
            </div>
            <div class="services-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_TEAM_TRUST_GRID(comp) {
      return this._body_TEAM_PORTRAIT_GRID(comp);
    }

    _body_LOCATION_ATLAS(comp) {
      return `
        <section class="section-body section-body--atlas hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Location & Atlas</h2>
            </div>
            <div class="atlas-layout">
              <div class="atlas-map glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
                <div class="map-grid">
                  ${Array.from({length: 64}, () => `<div class="map-cell"></div>`).join('')}
                  <div class="map-pin"></div>
                </div>
              </div>
              <div class="atlas-locations hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
                <div class="loc-card"><span class="loc-city">New York</span><span class="loc-addr">128 West 21st Street</span></div>
                <div class="loc-card"><span class="loc-city">London</span><span class="loc-addr">14 Clerkenwell Close</span></div>
                <div class="loc-card"><span class="loc-city">Singapore</span><span class="loc-addr">71 Robinson Road</span></div>
                <div class="loc-card"><span class="loc-city">Tokyo</span><span class="loc-addr">2-11-3 Minami-Aoyama</span></div>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_TESTIMONIAL_CREDIBILITY(comp) {
      return this._body_TESTIMONIAL_CAROUSEL(comp);
    }

    _body_HISTORY_TIMELINE(comp) {
      return this._body_CRAFT_NARRATIVE(comp);
    }

    // --- FOOTER BUILDERS -----------------------------------------------------
    _footer_NEWSLETTER_LUXURY(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `Premium ${this.niche} by ${this.brand}.`}</p>
            </div>
            <div class="footer-newsletter hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <span class="micro">Newsletter</span>
              <form class="footer-form" onsubmit="event.preventDefault();">
                <input type="email" class="footer-input" placeholder="your@email.com" />
                <button type="submit" class="btn-premium btn-premium--small"><span class="btn-shimmer"></span><span class="btn-label">Subscribe</span></button>
              </form>
            </div>
            <div class="footer-links hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              <span class="micro">Navigation</span>
              <div class="footer-linklist">
                ${this.routes.slice(0, 5).map(r => `<a href="${r}" data-vr-link>${this._routeLabel(r)}</a>`).join('')}
              </div>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_BRAND_TEMPLE(comp) {
      return `
        <footer class="site-footer site-footer--temple hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-temple-text hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h2>
            <p class="footer-temple-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${(this.content && this.content.footerTagline) || `Premium ${this.niche} — curated for excellence by ${this.brand}.`}</p>
            <div class="footer-temple-links hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              ${this.routes.slice(0, 5).map(r => `<a href="${r}" data-vr-link>${this._routeLabel(r)}</a>`).join('')}
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_CONTACT_ATELIER(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `Premium ${this.niche} by ${this.brand}.`}</p>
            </div>
            <div class="footer-contact hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <span class="micro">Contact</span>
              <a href="mailto:hello@${this.brand.toLowerCase().replace(/\s+/g, '')}.com">hello@${this.brand.toLowerCase().replace(/\s+/g, '')}.com</a>
              <span>+1 (555) 014-${Math.floor(Math.random() * 900 + 100)}</span>
            </div>
            <div class="footer-links hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              <span class="micro">Navigation</span>
              <div class="footer-linklist">
                ${this.routes.slice(0, 5).map(r => `<a href="${r}" data-vr-link>${this._routeLabel(r)}</a>`).join('')}
              </div>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_MINIMAL_SIGNATURE(comp) {
      return `
        <footer class="site-footer site-footer--minimal hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <span class="footer-sig hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</span>
            <p class="footer-tagline hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${(this.content && this.content.footerTagline) || `Premium ${this.niche} by ${this.brand}.`}</p>
          </div>
        </footer>
      `;
    }

    _footer_ENTERPRISE_CTA(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-cta-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Ready to scale ${this.niche}?</h2>
            <p class="footer-cta-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this._c('heroSubs', 2) || `Get in touch with the ${this.brand} team today.`}</p>
            <a href="/contact" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Book Demo</span></a>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_DEV_DOCS_HUB(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `${this.brand} — your ${this.niche} partner.`}</p>
            </div>
            <div class="footer-docs hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <span class="micro">Resources</span>
              <div class="footer-linklist">
                <a href="/docs" data-vr-link>Documentation</a>
                <a href="/api" data-vr-link>API Reference</a>
                <a href="/changelog" data-vr-link>Changelog</a>
                <a href="/status" data-vr-link>System Status</a>
              </div>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_NEW_BUSINESS_ALTAR(comp) {
      return `
        <footer class="site-footer site-footer--altar hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-altar-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Start a Project</h2>
            <p class="footer-altar-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this._c('heroSubs', 0) || `${this.brand} — let's build something great together.`}</p>
            <a href="/contact" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Inquire</span></a>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_CULTURE_HUB(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `${this.brand} — premium ${this.niche}.`}</p>
            </div>
            <div class="footer-culture hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <span class="micro">Culture</span>
              <div class="footer-linklist">
                <a href="/journal" data-vr-link>Journal</a>
                <a href="/careers" data-vr-link>Careers</a>
                <a href="/values" data-vr-link>Values</a>
                <a href="/events" data-vr-link>Events</a>
              </div>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_WAITLIST_FORM(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-wait-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Join the Waitlist</h2>
            <p class="footer-wait-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this._c('heroSubs', 1) || `Be first to access exclusive ${this.brand} ${this.niche} offers.`}</p>
            <form class="footer-form hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" onsubmit="event.preventDefault();">
              <input type="email" class="footer-input" placeholder="your@email.com" />
              <button type="submit" class="btn-premium"><span class="btn-shimmer"></span><span class="btn-label">Notify Me</span></button>
            </form>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_MINIMAL_LEGAL(comp) {
      return `
        <footer class="site-footer site-footer--legal hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <span class="footer-legal-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</span>
            <div class="footer-legal-links hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <a href="/privacy" data-vr-link>Privacy</a>
              <a href="/terms" data-vr-link>Terms</a>
              <a href="/cookies" data-vr-link>Cookies</a>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_CONTACT_FORM(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `${this.brand} — get in touch.`}</p>
            </div>
            <form class="footer-contact-form glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * 1)" onsubmit="event.preventDefault();">
              <div class="form-row">
                <input type="text" class="form-input" placeholder="Name" />
                <input type="email" class="form-input" placeholder="Email" />
              </div>
              <textarea class="form-textarea" placeholder="How can we help?"></textarea>
              <button type="submit" class="btn-premium"><span class="btn-shimmer"></span><span class="btn-label">Send Message</span></button>
            </form>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    _footer_CORPORATE_MAP(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">${(this.content && this.content.footerTagline) || `${this.brand} — serving ${this.niche} customers everywhere.`}</p>
            </div>
            <div class="footer-map hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <div class="map-grid">
                ${Array.from({length: 36}, () => `<div class="map-cell"></div>`).join('')}
                <div class="map-pin"></div>
              </div>
            </div>
          </div>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${this.brand}. All rights reserved.</p>
        </footer>
      `;
    }

    // --- Utility: variant label generator -----------------------------------
    _variantLabel(index) {
      return this._c('variantLabels', index) || ['Origin','Heritage','Apex','Vanguard','Solstice','Zenith','Eclipse','Nebula'][index % 8];
    }

    // --- Dispatch map -------------------------------------------------------
    _buildSection(comp) {
      const id = comp.id;
      const methodName = id.replace(/^([A-Z]+)_/, (_, prefix) => {
        const role = prefix.toLowerCase();
        return role + '_';
      });
      const method = this['_' + methodName];
      if (typeof method === 'function') {
        return method.call(this, comp);
      }
      // Fallback: generic section
      return `
        <section class="section-body hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner" style="align-items:center;text-align:center;padding-left:${comp.alignment.padX};padding-right:${comp.alignment.padX};">
            <div class="micro hidden-3d" style="transition-delay:0s">${comp.label}</div>
            <h2 class="section-title hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${comp.label}</h2>
            <p class="section-lead hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:48ch;">Procedurally assembled ${this.niche} section with unique spatial alignment, timing curves, and animation offsets.</p>
          </div>
        </section>
      `;
    }

    // --- IntersectionObserver script block ----------------------------------
    _generateObserverScript() {
      return `
        <script>
          (function() {
            'use strict';
            var observer = new IntersectionObserver(function(entries) {
              entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                  entry.target.classList.add('active-3d');
                  entry.target.classList.remove('hidden-3d');
                  observer.unobserve(entry.target);
                }
              });
            }, {
              root: null,
              rootMargin: '0px 0px -60px 0px',
              threshold: 0.08
            });

            document.querySelectorAll('.hidden-3d').forEach(function(el) {
              observer.observe(el);
            });

            // Re-bind observer after virtual navigation
            window.addEventListener('virtualnavigate', function() {
              setTimeout(function() {
                document.querySelectorAll('.hidden-3d').forEach(function(el) {
                  observer.observe(el);
                });
              }, 100);
            });
          })();
        <\/script>
      `.replace(/<\/script>/g, '</script>');
    }

    // --- Asset-slot image injector ------------------------------------------
    // After HTML is assembled as a string, walk every <div class="asset-slot…">
    // and inject a picsum <img> using the slot's sequential index as the seed.
    // This is deterministic: same site compile → same images.
    _injectImages(html) {
      let idx = 0;
      const brand = this.brand || this.niche || 'site';
      return html.replace(
        /(<div\s[^>]*class="[^"]*asset-slot[^"]*"[^>]*>)/g,
        (match) => {
          const seed = Math.abs(this._hashStr(brand + '-' + idx)) % 900000 + 100000;
          const img = `<img class="asset-img" src="https://picsum.photos/seed/${seed}/1200/800" alt="${this.niche}" loading="lazy" decoding="async" style="width:100%;height:100%;min-height:320px;object-fit:cover;display:block;border-radius:inherit;">`;
          idx++;
          return match + img;
        }
      );
    }

    _hashStr(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }

    // --- Page compilation ---------------------------------------------------
    compilePage(path) {
      const pageTitle = this.brand + ' — ' + this._routeLabel(path);
      const sectionsHTML = this.stack.map(comp => this._buildSection(comp)).join('\n');

      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/premium-core.css">
  <style>
    ${this._generateCSSVariables()}
  </style>
</head>
<body>
  <div class="site-ambient" aria-hidden="true"></div>
  <div class="site-shell">
    ${this._buildNav(path)}
    <main class="site-main" data-vr-mount>
      ${sectionsHTML}
    </main>
  </div>
  ${this._generateObserverScript()}
</body>
</html>`;

      // Inject real picsum images into every asset-slot so the page renders
      // with actual visuals rather than empty placeholder boxes.
      html = this._injectImages(html);

      return html;
    }

    // --- Multi-page compilation ---------------------------------------------
    compileAllPages() {
      const pages = {};
      for (const route of this.routes) {
        pages[route] = this.compilePage(route);
      }
      return pages;
    }
  }

  // ============================================================
  // GLOBAL API
  // ============================================================

  global.LayoutCompiler = LayoutCompiler;

})(typeof window !== 'undefined' ? window : global);
