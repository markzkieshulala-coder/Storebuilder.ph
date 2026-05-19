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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">An ultra-premium ${this.niche} experience engineered by procedural intelligence. Every surface, shadow, and motion is algorithmically unique.</p>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <a href="/shop" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Explore Collection</span></a>
              <a href="/process" class="btn-ghost" data-vr-link>View Craft</a>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">Editorial split-screen reveal. Dual-plane composition with premium asset blueprinting for ${this.niche}.</p>
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
            <p class="hero-sub hero-sub--monument hidden-3d" style="transition-delay:calc(var(--stagger) * 1);max-width:38ch;">${this.niche} — Monumental typography hero. Pure kinetic scale, zero distraction.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">Orbital perspective viewport. ${this.niche} presented in a spatial zero-gravity environment.</p>
            <div class="cta-row hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <a href="/collection" class="btn-premium" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Orbit Collection</span></a>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:36ch;">${this.niche} portfolio — Dark kinetic canvas with immersive video/showcase slots.</p>
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
              <div class="metric"><span class="metric-value">12+</span><span class="metric-label">Years Active</span></div>
              <div class="metric"><span class="metric-value">84</span><span class="metric-label">Projects Delivered</span></div>
              <div class="metric"><span class="metric-value">14</span><span class="metric-label">Awards Won</span></div>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this.niche} — Video Immersion Portal. Cinematic depth-of-field viewport.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:40ch;">Dashboard UI reveal hero. Glass-morphic tech terminal with live data abstraction.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1);max-width:36ch;">Data Vortex Typography Hero. Electric luminescence in ultra-deep navy spatial void.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this.niche} — Interactive live demo hero. Embedded functional preview.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">Creative Burst Hero — ${this.niche}. Maximum chromatic energy with controlled typographic discipline.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 4);max-width:36ch;margin-top:28px;">Manifesto Typography Wall. Agency positioning through pure typographic architecture.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">Showreel Gateway — ${this.niche}. One click to full cinematic immersion.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this.niche} — Countdown Singularity. Scarcity-engineered landing momentum.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this.niche} — Product Reveal Hero. Shroud-lift cinematic unboxing.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">${this.niche} — Cinematic Video Teaser Hero. Grain, glow, and narrative anticipation.</p>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:38ch;">Trust Statement Hero — ${this.niche}. Authority, credibility, and institutional confidence.</p>
            <div class="trust-logos hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <div class="trust-logo">Partner A</div>
              <div class="trust-logo">Partner B</div>
              <div class="trust-logo">Partner C</div>
              <div class="trust-logo">Partner D</div>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 2);max-width:36ch;">Service Showcase Hero — ${this.niche}. Business-class spatial presentation with executive clarity.</p>
            <div class="service-pills hidden-3d" style="transition-delay:calc(var(--stagger) * 3)">
              <span class="pill">Strategy</span><span class="pill">Design</span><span class="pill">Development</span><span class="pill">Growth</span>
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
            <p class="hero-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">${this.niche} — Building Exterior Panorama. Corporate scale and physical presence.</p>
          </div>
        </section>
      `;
    }

    // --- BODY BUILDERS -----------------------------------------------------
    _body_GRID_ASYMMETRIC_MASONRY(comp) {
      const assets = this._nextAssets(6);
      const cards = assets.map((a, i) => `
        <div class="masonry-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--card-z:${i * 20}px;" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <div class="card-visual">
            <div class="asset-slot" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="card-meta">
            <span class="card-index">0${i + 1}</span>
            <h3 class="card-title">${this.niche} — ${this._variantLabel(i)}</h3>
            <p class="card-desc">${a.prompt.slice(0, 110)}...</p>
          </div>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--masonry hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Curated ${this.niche} Selection</h2>
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
                <div class="spec-row"><span class="spec-key">Category</span><span class="spec-val">${this.niche}</span></div>
                <div class="spec-row"><span class="spec-key">Origin</span><span class="spec-val">Procedurally Generated</span></div>
                <div class="spec-row"><span class="spec-key">Palette</span><span class="spec-val">${this.palette.semanticLabel}</span></div>
                <div class="spec-row"><span class="spec-key">Signature</span><span class="spec-val">${this.blueprint.generationSignature}</span></div>
                <div class="spec-row"><span class="spec-key">Spatial Depth</span><span class="spec-val">${this.spatial.scenePerspective}px</span></div>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    _body_EDITORIAL_LOOKBOOK(comp) {
      const assets = this._nextAssets(4);
      const slides = assets.map((a, i) => `
        <div class="lookbook-slide hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});--slide-index:${i};" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.08).toFixed(2)}">
          <div class="lookbook-visual">
            <div class="asset-slot asset-slot--editorial" title="${a.prompt.replace(/"/g, '&quot;')}">
              <span class="asset-label">${a.cfgKey.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
          <div class="lookbook-caption">
            <span class="lookbook-chapter">Chapter 0${i + 1}</span>
            <h3 class="lookbook-title">${this._variantLabel(i)}</h3>
            <p class="lookbook-desc">${a.prompt.slice(0, 140)}...</p>
          </div>
        </div>
      `).join('');
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
      const testimonials = [
        { name: 'Elena Rossi', role: 'Creative Director', text: `Working with ${this.brand} redefined our entire approach to ${this.niche}. The procedural precision is unmatched.` },
        { name: 'Marcus Chen', role: 'CEO, Vantage', text: `A quantum leap in ${this.niche} presentation. Every interaction feels intentional and deeply considered.` },
        { name: 'Sofia Bergmann', role: 'Design Lead', text: `The spatial depth and chromatic intelligence behind ${this.brand} is unlike anything in the market today.` }
      ];
      const cards = testimonials.map((t, i) => `
        <div class="testimonial-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
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
              <h2 class="section-title">Curated Testimonials</h2>
            </div>
            <div class="testimonial-grid">${cards}</div>
          </div>
        </section>
      `;
    }

    _body_CRAFT_NARRATIVE(comp) {
      const steps = [
        { num: '01', title: 'Discovery', desc: `We map the semantic terrain of ${this.niche} to establish the creative coordinate system.` },
        { num: '02', title: 'Material Study', desc: `Procedural asset blueprints are generated with macro texture fidelity and cinematic composition.` },
        { num: '03', title: 'Spatial Engineering', desc: `3D perspective viewports are calibrated with unique translateZ and rotateX animation profiles.` },
        { num: '04', title: 'Chromatic Calibration', desc: `Algorithmic color systems derive from semantic keyword spaces — never from static templates.` },
        { num: '05', title: 'Assembly', desc: `Components are shuffled, sliced, and configured with asymmetrical alignments generated on the fly.` }
      ];
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
              <h2 class="section-title">Craft Narrative Timeline</h2>
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
      const metrics = [
        { val: '98%', label: 'Client Retention' },
        { val: '4.9', label: 'Average Rating' },
        { val: '340+', label: 'Projects' },
        { val: '12', label: 'Industry Awards' }
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
              <h2 class="section-title">Proof & Metrics</h2>
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
      const features = [
        { title: 'Real-time Analytics', desc: 'Live data pipelines with glass-morphic terminal aesthetics.' },
        { title: 'Spatial Workspaces', desc: '3D-perspective project rooms with natural scroll physics.' },
        { title: 'Auto-Scaling', desc: 'Algorithmic infrastructure that adapts to demand curves.' },
        { title: 'Procedural Security', desc: 'Entropy-derived encryption layers with zero-knowledge architecture.' },
        { title: 'Team Orchestration', desc: 'Role-based spatial dashboards for distributed studios.' },
        { title: 'API Mesh', desc: 'Unified graph endpoints with schema-first procedural typing.' }
      ];
      const cards = features.map((f, i) => `
        <div class="iso-card glass-panel hidden-3d" style="transition-delay:calc(var(--stagger) * ${i});" data-3d-depth="${(parseFloat(comp.animationProfile.parallaxDepth) + i * 0.05).toFixed(2)}">
          <div class="iso-icon">${String.fromCharCode(9702 + i)}</div>
          <h3 class="iso-title">${f.title}</h3>
          <p class="iso-desc">${f.desc}</p>
        </div>
      `).join('');
      return `
        <section class="section-body section-body--iso hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="section-inner">
            <div class="section-header hidden-3d" style="transition-delay:0s">
              <span class="micro">${comp.label}</span>
              <h2 class="section-title">Isometric Feature Grid</h2>
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
      const members = ['Creative Director', 'Lead Developer', '3D Spatial Engineer', 'Brand Strategist', 'Procedural Artist', 'UX Architect'];
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
      const partners = Array.from({length: 8}, (_, i) => `Partner ${String.fromCharCode(65 + i)}`);
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
      const props = [
        { title: 'Precision', desc: `Every ${this.niche} pixel is procedurally generated with semantic relevance.` },
        { title: 'Velocity', desc: 'From prompt to production-ready site in a single compilation cycle.' },
        { title: 'Uniqueness', desc: 'No two generations share the same palette, layout, or spatial profile.' }
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
              <p class="footer-tagline">Ultra-premium ${this.niche} experiences, procedurally generated.</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_BRAND_TEMPLE(comp) {
      return `
        <footer class="site-footer site-footer--temple hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-temple-text hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</h2>
            <p class="footer-temple-sub hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">Brand Temple Footer — ${this.niche}. Monumental closure with spiritual typographic scale.</p>
            <div class="footer-temple-links hidden-3d" style="transition-delay:calc(var(--stagger) * 2)">
              ${this.routes.slice(0, 5).map(r => `<a href="${r}" data-vr-link>${this._routeLabel(r)}</a>`).join('')}
            </div>
          </div>
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_CONTACT_ATELIER(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">Contact Atelier — ${this.niche}</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_MINIMAL_SIGNATURE(comp) {
      return `
        <footer class="site-footer site-footer--minimal hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <span class="footer-sig hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">${this.brand}</span>
            <p class="footer-credit hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">Minimal Signature Footer — ${this.niche} — Signature ${this.blueprint.generationSignature}</p>
          </div>
        </footer>
      `;
    }

    _footer_ENTERPRISE_CTA(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-cta-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Ready to scale ${this.niche}?</h2>
            <p class="footer-cta-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">Enterprise CTA Footer — Book a custom demo with our spatial engineering team.</p>
            <a href="/contact" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Book Demo</span></a>
          </div>
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_DEV_DOCS_HUB(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">Developer Docs Hub — ${this.niche}</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_NEW_BUSINESS_ALTAR(comp) {
      return `
        <footer class="site-footer site-footer--altar hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-altar-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Start a Project</h2>
            <p class="footer-altar-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">New Business Altar — ${this.niche}. High-intent conversion footer with sacramental typographic weight.</p>
            <a href="/contact" class="btn-premium hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" data-vr-link><span class="btn-shimmer"></span><span class="btn-label">Inquire</span></a>
          </div>
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_CULTURE_HUB(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">Culture Hub — ${this.niche}</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_WAITLIST_FORM(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner" style="align-items:center;text-align:center;">
            <h2 class="footer-wait-title hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">Join the Waitlist</h2>
            <p class="footer-wait-desc hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">Waitlist Form Footer — ${this.niche}. Scarcity-positioned email capture with ritual form design.</p>
            <form class="footer-form hidden-3d" style="transition-delay:calc(var(--stagger) * 2)" onsubmit="event.preventDefault();">
              <input type="email" class="footer-input" placeholder="your@email.com" />
              <button type="submit" class="btn-premium"><span class="btn-shimmer"></span><span class="btn-label">Notify Me</span></button>
            </form>
          </div>
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_CONTACT_FORM(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">Contact Form Footer — ${this.niche}</p>
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
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    _footer_CORPORATE_MAP(comp) {
      return `
        <footer class="site-footer hidden-3d" style="min-height:${comp.minH};--entry-duration:${comp.animationProfile.entryDuration};--entry-easing:${comp.animationProfile.entryEasing};--stagger:${comp.animationProfile.staggerDelay};" data-3d-depth="${comp.animationProfile.parallaxDepth}">
          <div class="footer-inner">
            <div class="footer-brand hidden-3d" style="transition-delay:calc(var(--stagger) * 0)">
              <span class="footer-name">${this.brand}</span>
              <p class="footer-tagline">Corporate Map Footer — ${this.niche}</p>
            </div>
            <div class="footer-map hidden-3d" style="transition-delay:calc(var(--stagger) * 1)">
              <div class="map-grid">
                ${Array.from({length: 36}, () => `<div class="map-cell"></div>`).join('')}
                <div class="map-pin"></div>
              </div>
            </div>
          </div>
          <p class="footer-credit">Generated by Ultra-Premium 3D System — Signature ${this.blueprint.generationSignature}</p>
        </footer>
      `;
    }

    // --- Utility: variant label generator -----------------------------------
    _variantLabel(index) {
      const labels = ['Origin', 'Heritage', 'Apex', 'Vanguard', 'Solstice', 'Zenith', 'Eclipse', 'Nebula'];
      return labels[index % labels.length];
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

    // --- Page compilation ---------------------------------------------------
    compilePage(path) {
      const isHome = path === '/home';
      const pageTitle = this.brand + ' — ' + this._routeLabel(path);

      const sectionsHTML = this.stack.map(comp => this._buildSection(comp)).join('\n');

      const html = `<!DOCTYPE html>
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
