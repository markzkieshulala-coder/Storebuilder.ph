/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ASSET INVERSION — Luxury Stylesheet Injection Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Injects custom luxury stylesheets directly into the head rows of generated pages
 * to power 3D-animations, background glows, gradient typography, and keyframe
 * physics animations cleanly without external CSS dependencies.
 *
 * Operates as a head-transform pass that inverts asset loading into inline
 * deterministic declarations.
 *
 * @module AssetInversion
 * @author MDX Deterministic Layout Compiler
 */

export class AssetInversion {
  constructor(opts = {}) {
    this.targetVersion = opts.targetVersion || 'mdx-luxury-v1';
    this.inlineAll = opts.inlineAll !== false;
    this.minifyCSS = opts.minifyCSS !== false;
    this._inversionLog = [];
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Invert external CSS dependencies into inline <style> declarations
   * inside every generated page's head.
   *
   * @param {Object} stitchedSite — output from PageStitcher.stitch()
   * @param {Object} styleAssets  — map of assetName → CSS string
   * @returns {Object} site with inverted styles in every page head
   */
  invert(stitchedSite, styleAssets = {}) {
    const startTime = performance.now();
    this._log('INIT', 'AssetInversion started', { pages: Object.keys(stitchedSite.pages).length });

    // Merge default luxury stylesheet with provided assets
    const allAssets = { ...this._buildDefaultLuxuryStyles(), ...styleAssets };
    const compiledCSS = this._compileCSSBundle(allAssets);

    // Inject into every page head
    const pages = {};
    Object.entries(stitchedSite.pages).forEach(([route, page]) => {
      pages[route] = this._injectIntoPageHead(page, compiledCSS, allAssets);
    });

    const duration = Math.round(performance.now() - startTime);
    this._log('COMPLETE', 'All pages inverted', { duration, bundleSize: compiledCSS.length });

    return {
      ...stitchedSite,
      pages,
      _cssBundle: compiledCSS,
      _inversionLog: [...this._inversionLog],
      _assetManifest: Object.keys(allAssets)
    };
  }

  /**
   * Inject a single named stylesheet into a specific page.
   * @param {Object} page        — single page from PageStitcher
   * @param {string} assetName   — key from styleAssets
   * @param {string} cssContent  — raw CSS string
   */
  injectPageAsset(page, assetName, cssContent) {
    const minified = this._minify(cssContent);
    const injected = this._wrapAsStyleTag(minified, assetName);
    return this._appendToHead(page, injected);
  }

  /**
   * Generate a critical CSS extraction for above-the-fold content.
   * @param {string} fullCSS     — complete stylesheet
   * @param {Array} selectors    — critical selectors to extract
   */
  extractCriticalCSS(fullCSS, selectors = []) {
    const critical = [];
    const blocks = this._extractBlocks(fullCSS);

    selectors.forEach(sel => {
      const matching = blocks.filter(b => b.includes(sel));
      critical.push(...matching);
    });

    return this._minify(critical.join('\n'));
  }

  /**
   * Get the complete compiled CSS bundle for external use.
   * @param {Object} styleAssets — optional override assets
   */
  getCompiledBundle(styleAssets = {}) {
    const allAssets = { ...this._buildDefaultLuxuryStyles(), ...styleAssets };
    return this._compileCSSBundle(allAssets);
  }

  /* ── DEFAULT LUXURY STYLES ───────────────────────────────────────────────── */

  _buildDefaultLuxuryStyles() {
    return {
      'mdx-core': this._coreReset(),
      'mdx-glows': this._glowProperties(),
      'mdx-typography': this._typographyGradients(),
      'mdx-animations': this._keyframePhysics(),
      'mdx-utilities': this._utilityClasses(),
      'mdx-components': this._componentStyles()
    };
  }

  _coreReset() {
    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: var(--bg, #0B0B0C); color: var(--text, #F1F0EA);
        overflow-x: hidden; line-height: 1.6;
      }
      ::selection { background: rgba(201,169,110,0.25); color: #F1F0EA; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #0B0B0C; }
      ::-webkit-scrollbar-thumb { background: #2A2A2C; border-radius: 3px; }
      a { text-decoration: none; color: inherit; }
      button { border: none; background: none; cursor: pointer; font: inherit; }
      img { max-width: 100%; display: block; }
    `;
  }

  _glowProperties() {
    return `
      :root {
        --glow-primary: 201,169,110;
        --glow-accent: 232,213,183;
        --glow-intensity: 0.35;
        --glow-spread: 80px;
        --glow-ambient-color: rgba(var(--glow-primary), var(--glow-intensity));
        --glow-orb-color: rgba(var(--glow-accent), 0.08);
        --glow-rim-color: rgba(var(--glow-primary), 0.6);
      }
      .pssc-glow-ambient {
        position: relative;
        overflow: visible;
      }
      .pssc-glow-ambient::before {
        content: '';
        position: absolute;
        inset: -40px;
        background: radial-gradient(ellipse at 50% 50%, var(--glow-ambient-color) 0%, transparent 70%);
        filter: blur(var(--glow-spread));
        opacity: 0;
        transition: opacity 1.6s cubic-bezier(0.16,1,0.3,1);
        pointer-events: none;
        z-index: -1;
      }
      .pssc-glow-ambient.is-visible::before { opacity: 1; }
      .pssc-glow-orb {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, var(--glow-orb-color) 0%, transparent 70%);
        filter: blur(60px);
        pointer-events: none;
        animation: orbDrift 12s ease-in-out infinite alternate;
      }
      .pssc-glow-rim {
        position: relative;
      }
      .pssc-glow-rim::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        background: linear-gradient(135deg, var(--glow-rim-color), transparent 50%);
        opacity: 0;
        transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1);
        pointer-events: none;
        z-index: -1;
      }
      .pssc-glow-rim:hover::after { opacity: 1; }
    `;
  }

  _typographyGradients() {
    return `
      .pssc-grad-text {
        background: linear-gradient(135deg, #C9A96E 0%, #E8D5B7 50%, #F1F0EA 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pssc-grad-text-subtle {
        background: linear-gradient(180deg, rgba(201,169,110,0.9) 0%, rgba(241,240,234,0.6) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pssc-grad-text-bold {
        background: linear-gradient(45deg, #C9A96E, #E8D5B7, #C9A96E);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradShift 8s ease infinite;
      }
      @keyframes gradShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      .hero-headline {
        font-family: 'Playfair Display', serif;
        font-size: clamp(2.5rem, 6vw, 5.5rem);
        font-weight: 500;
        letter-spacing: -0.02em;
        line-height: 1.1;
        background: linear-gradient(135deg, #C9A96E 0%, #E8D5B7 50%, #F1F0EA 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .section-headline {
        font-family: 'Playfair Display', serif;
        font-size: clamp(2rem, 4vw, 3.5rem);
        font-weight: 500;
        letter-spacing: -0.01em;
        line-height: 1.15;
        color: #F1F0EA;
      }
      .section-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #C9A96E;
      }
      .section-body {
        font-family: 'Inter', sans-serif;
        font-size: clamp(0.95rem, 1.2vw, 1.15rem);
        font-weight: 300;
        line-height: 1.7;
        color: rgba(241,240,234,0.75);
      }
    `;
  }

  _keyframePhysics() {
    return `
      @keyframes floatDepth {
        0%, 100% { transform: translateY(0) scale(1); }
        33% { transform: translateY(-12px) scale(1.02); }
        66% { transform: translateY(6px) scale(0.98); }
      }
      @keyframes floatDepthReverse {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-18px) rotate(2deg); }
      }
      @keyframes orbDrift {
        0% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(30px, -20px) scale(1.05); }
        50% { transform: translate(-20px, 30px) scale(0.95); }
        75% { transform: translate(15px, 10px) scale(1.02); }
        100% { transform: translate(-10px, -15px) scale(1); }
      }
      @keyframes breathe {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.02); }
      }
      @keyframes revealUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes revealScale {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes lineGrow {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .pssc-float {
        animation: floatDepth 6s cubic-bezier(0.4,0,0.2,1) infinite;
      }
      .pssc-float-reverse {
        animation: floatDepthReverse 8s cubic-bezier(0.4,0,0.2,1) infinite;
      }
      .pssc-breathe {
        animation: breathe 4s ease-in-out infinite;
      }
      .pssc-reveal {
        animation: revealUp 1.2s cubic-bezier(0.16,1,0.3,1) forwards;
        animation-delay: var(--reveal-delay, 0s);
      }
      .pssc-reveal-scale {
        animation: revealScale 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
        animation-delay: var(--reveal-delay, 0s);
      }
    `;
  }

  _utilityClasses() {
    return `
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      .container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 clamp(1.5rem, 5vw, 4rem); }
      .container-narrow { max-width: 920px; }
      .section-spacing { padding: clamp(5rem, 10vh, 10rem) 0; }
      .flex-center { display: flex; align-items: center; justify-content: center; }
      .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
      .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 3rem; }
      .text-center { text-align: center; }
      .relative { position: relative; }
      .overflow-hidden { overflow: hidden; }
      .transition-slow { transition: all 1.6s cubic-bezier(0.16,1,0.3,1); }
      .transition-medium { transition: all 0.8s cubic-bezier(0.16,1,0.3,1); }
      .transition-fast { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
    `;
  }

  _componentStyles() {
    return `
      /* Navbar */
      .luxury-nav {
        position: fixed; inset: 0 0 auto 0; z-index: 1000;
        padding: 0 clamp(1.5rem, 5vw, 4rem);
        height: 72px; display: flex; align-items: center;
        background: transparent;
        transition: background 0.6s cubic-bezier(0.16,1,0.3,1), backdrop-filter 0.6s;
      }
      .luxury-nav.scrolled { background: rgba(11,11,12,0.85); backdrop-filter: blur(20px); }
      .nav-inner { display: flex; align-items: center; justify-content: space-between; width: 100%; }
      .nav-brand { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; color: #F1F0EA; }
      .nav-links { display: flex; gap: 2.5rem; }
      .nav-link { font-size: 0.8rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(241,240,234,0.6); position: relative; transition: color 0.4s; }
      .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 100%; height: 1px; background: #C9A96E; transform: scaleX(0); transform-origin: left; transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
      .nav-link:hover, .nav-link.active { color: #F1F0EA; }
      .nav-link:hover::after, .nav-link.active::after { transform: scaleX(1); }
      .nav-toggle { display: none; flex-direction: column; gap: 5px; }
      .nav-toggle span { width: 24px; height: 1px; background: #F1F0EA; transition: transform 0.3s, opacity 0.3s; }
      @media (max-width: 768px) {
        .nav-toggle { display: flex; }
        .nav-links { position: fixed; inset: 72px 0 0 0; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; background: rgba(11,11,12,0.97); backdrop-filter: blur(20px); transform: translateX(100%); transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .nav-links.open { transform: translateX(0); }
      }
      /* Buttons */
      .btn {
        display: inline-flex; align-items: center; gap: 0.5rem;
        padding: 0.875rem 2rem;
        font-size: 0.8rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
        border-radius: 2px;
        transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
        position: relative; overflow: hidden;
      }
      .btn-primary {
        background: #C9A96E; color: #0B0B0C;
        border: 1px solid #C9A96E;
      }
      .btn-primary:hover {
        background: transparent; color: #C9A96E;
        box-shadow: 0 0 40px rgba(201,169,110,0.15);
      }
      .btn-ghost {
        background: transparent; color: #F1F0EA;
        border: 1px solid rgba(241,240,234,0.3);
      }
      .btn-ghost:hover {
        border-color: #C9A96E; color: #C9A96E;
        background: rgba(201,169,110,0.05);
      }
      /* Feature Cards */
      .feature-card {
        position: relative; border-radius: 4px; overflow: hidden;
        background: #151517; border: 1px solid rgba(241,240,234,0.05);
        transition: all 0.6s cubic-bezier(0.16,1,0.3,1);
        cursor: pointer;
      }
      .feature-card:hover {
        transform: translateY(-8px);
        border-color: rgba(201,169,110,0.15);
        box-shadow: 0 24px 48px rgba(0,0,0,0.3);
      }
      .feature-card-lighting {
        position: absolute; inset: 0; pointer-events: none; z-index: 1;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(201,169,110,0.06), transparent 40%);
        opacity: 0; transition: opacity 0.6s;
      }
      .feature-card:hover .feature-card-lighting { opacity: 1; }
      .feature-card-image {
        aspect-ratio: 4 / 3; background-size: cover; background-position: center;
        transition: transform 0.8s cubic-bezier(0.16,1,0.3,1), filter 0.8s;
      }
      .feature-card:hover .feature-card-image {
        transform: scale(1.06);
        filter: blur(1px) brightness(0.85);
      }
      .feature-card-content { padding: 2rem; position: relative; z-index: 2; }
      .feature-card-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem; color: #F1F0EA; }
      .feature-card-desc { font-size: 0.85rem; color: rgba(241,240,234,0.6); line-height: 1.6; margin-bottom: 1rem; }
      .feature-card-price { font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: #C9A96E; display: block; margin-bottom: 1rem; }
      .feature-card-link {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.75rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
        color: #C9A96E; transition: gap 0.3s;
      }
      .feature-card-link:hover { gap: 0.8rem; }
      /* Footer */
      .luxury-footer {
        background: #0A0A0B; border-top: 1px solid rgba(241,240,234,0.06);
        padding: 6rem 0 3rem;
      }
      .footer-inner { display: grid; grid-template-columns: 1fr 2fr; gap: 4rem; max-width: 1280px; margin: 0 auto; padding: 0 clamp(1.5rem,5vw,4rem); }
      .footer-brand { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 600; color: #F1F0EA; }
      .footer-tagline { font-size: 0.85rem; color: rgba(241,240,234,0.5); margin-top: 0.5rem; }
      .footer-social { display: flex; gap: 1rem; margin-top: 1.5rem; }
      .footer-social a { color: rgba(241,240,234,0.5); transition: color 0.3s; }
      .footer-social a:hover { color: #C9A96E; }
      .footer-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
      .footer-column-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(241,240,234,0.4); margin-bottom: 1.5rem; }
      .footer-column-links { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
      .footer-column-links a { font-size: 0.85rem; color: rgba(241,240,234,0.6); position: relative; transition: color 0.3s; display: inline-block; }
      .footer-column-links a::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 1px; background: #C9A96E; transform: scaleX(0); transform-origin: left; transition: transform 0.4s; }
      .footer-column-links a:hover { color: #F1F0EA; }
      .footer-column-links a:hover::after { transform: scaleX(1); }
      .footer-bar { display: flex; justify-content: space-between; align-items: center; max-width: 1280px; margin: 3rem auto 0; padding: 1.5rem clamp(1.5rem,5vw,4rem) 0; border-top: 1px solid rgba(241,240,234,0.06); }
      .footer-copy { font-size: 0.75rem; color: rgba(241,240,234,0.35); }
      .footer-legal { font-size: 0.75rem; color: rgba(241,240,234,0.35); transition: color 0.3s; }
      .footer-legal:hover { color: #C9A96E; }
      @media (max-width: 768px) {
        .footer-inner { grid-template-columns: 1fr; gap: 3rem; }
        .footer-columns { grid-template-columns: repeat(2, 1fr); }
      }
    `;
  }

  /* ── COMPILATION ──────────────────────────────────────────────────────────── */

  _compileCSSBundle(assets) {
    let bundle = '';
    Object.entries(assets).forEach(([name, css]) => {
      const processed = this.inlineAll ? this._inline(css, name) : css;
      bundle += processed + '\n';
    });
    return this.minifyCSS ? this._minify(bundle) : bundle;
  }

  _inline(css, name) {
    return `/* === ${name} === */\n${css}\n`;
  }

  _minify(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '')           // remove comments
      .replace(/\s+/g, ' ')                          // collapse whitespace
      .replace(/\s*([{}:;,])\s*/g, '$1')              // trim around punctuation
      .replace(/;\s*}/g, '}')                         // remove last semicolon
      .replace(/0\s+(px|rem|em|%)/g, '0')             // zero units
      .trim();
  }

  _extractBlocks(css) {
    const blocks = [];
    const regex = /([^{]+)\{([^}]*)\}/g;
    let match;
    while ((match = regex.exec(css)) !== null) {
      blocks.push(`${match[1].trim()}{${match[2].trim()}}`);
    }
    return blocks;
  }

  /* ── INJECTION ────────────────────────────────────────────────────────────── */

  _injectIntoPageHead(page, compiledCSS, assets) {
    const styleBlock = this._wrapAsStyleTag(compiledCSS, 'mdx-luxury-bundle');

    // Parse existing head
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<html><head>${page.head}</head><body></body></html>`, 'text/html');

    // Inject compiled bundle
    const styleEl = doc.createElement('style');
    styleEl.setAttribute('data-asset-inversion', 'true');
    styleEl.setAttribute('data-bundle-version', this.targetVersion);
    styleEl.setAttribute('data-assets', Object.keys(assets).join(','));
    styleEl.textContent = compiledCSS;

    // Insert at beginning of head
    doc.head.insertBefore(styleEl, doc.head.firstChild);

    // Also inject preconnect for fonts
    const preconnect1 = doc.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    doc.head.insertBefore(preconnect1, styleEl);

    const preconnect2 = doc.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';
    doc.head.insertBefore(preconnect2, preconnect1);

    // Inject Google Fonts link
    const fontLink = doc.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap';
    doc.head.appendChild(fontLink);

    return {
      ...page,
      head: doc.head.innerHTML,
      _cssInjected: true,
      _cssAssets: Object.keys(assets),
      _cssBundleSize: compiledCSS.length
    };
  }

  _appendToHead(page, html) {
    return { ...page, head: html + page.head };
  }

  _wrapAsStyleTag(css, name) {
    return `<style data-asset="${name}" data-inversion="true">\n${css}\n</style>`;
  }

  /* ── LOGGING ───────────────────────────────────────────────────────────────── */

  _log(stage, message, data = {}) {
    const entry = { stage, message, data, time: Date.now() };
    this._inversionLog.push(entry);
    if (this.verbose !== false) console.log(`[AssetInversion::${stage}] ${message}`, data);
  }
}
