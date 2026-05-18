/**
 * ═══════════════════════════════════════════
 * PREMIUM STYLE SHEET COMPILER (PSSC)
 * Runtime CSS injection for scroll physics,
 * background glows, typography gradients,
 * and keyframe-driven floating depth elements.
 * ═══════════════════════════════════════════
 */

export class PremiumStyleSheetCompiler {
  constructor(options = {}) {
    this.options = {
      scrollSmoothDuration: options.scrollSmoothDuration ?? 800,
      glowColors: options.glowColors ?? {
        primary: 'rgba(201,169,110,0.18)',
        secondary: 'rgba(201,169,110,0.04)',
        accent: 'rgba(232,213,183,0.12)'
      },
      gradientFonts: options.gradientFonts ?? true,
      enablePhysicsAnimations: options.enablePhysicsAnimations ?? true,
      floatingDepthLayers: options.floatingDepthLayers ?? 3,
      ...options
    };
    this.styleEl = null;
    this.scrollListeners = [];
  }

  /* ─── CORE INJECTION ─── */
  inject() {
    if (this.styleEl) return this;
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'pssc-runtime';
    this.styleEl.textContent = this.compile();
    document.head.appendChild(this.styleEl);
    this.bindScrollPhysics();
    return this;
  }

  /* ─── CSS COMPILATION ─── */
  compile() {
    return [
      this.compileScrollResets(),
      this.compileGlowProperties(),
      this.compileTypographyGradients(),
      this.compileKeyframePhysics(),
      this.compileFloatingDepth(),
      this.compileMicroInteractions()
    ].join('\n');
  }

  /* ─── SCROLL RESETS ─── */
  compileScrollResets() {
    return `
      /* ── PSSC: Scroll Resets ── */
      html { scroll-behavior: smooth; }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      body.is-scrolling .float-depth,
      body.is-scrolling .float-depth-slow,
      body.is-scrolling .float-depth-fast {
        animation-play-state: paused;
      }
      .scroll-reset-section {
        position: relative;
        z-index: 1;
      }
    `;
  }

  /* ─── BACKGROUND GLOWS ─── */
  compileGlowProperties() {
    const { primary, secondary, accent } = this.options.glowColors;
    return `
      /* ── PSSC: Background Glow Properties ── */
      .pssc-glow-ambient {
        position: relative;
      }
      .pssc-glow-ambient::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        background: radial-gradient(ellipse at 50% 0%, ${primary} 0%, ${secondary} 40%, transparent 70%);
        filter: blur(50px);
        z-index: -1;
        pointer-events: none;
        opacity: 0.6;
        transition: opacity 0.6s ease;
      }
      .pssc-glow-ambient:hover::before {
        opacity: 1;
      }
      .pssc-glow-orb {
        position: relative;
        overflow: visible;
      }
      .pssc-glow-orb::after {
        content: '';
        position: absolute;
        top: -50%;
        left: 50%;
        transform: translateX(-50%);
        width: 70%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle, ${accent} 0%, transparent 70%);
        filter: blur(70px);
        z-index: -1;
        pointer-events: none;
        animation: psscOrbFloat 12s ease-in-out infinite;
      }
      .pssc-glow-rim {
        position: relative;
      }
      .pssc-glow-rim::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, ${primary}, transparent 60%, ${accent});
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        opacity: 0.3;
        transition: opacity 0.5s ease;
      }
      .pssc-glow-rim:hover::after {
        opacity: 0.7;
      }
    `;
  }

  /* ─── TYPOGRAPHY GRADIENTS ─── */
  compileTypographyGradients() {
    return `
      /* ── PSSC: Typography Gradient System ── */
      .pssc-text-gradient {
        background: linear-gradient(135deg, #F1F0EA 0%, #C9C7BD 40%, #9A9789 70%, #F1F0EA 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pssc-text-gradient-gold {
        background: linear-gradient(135deg, #E8D5B7 0%, #C9A96E 30%, #A67B3D 60%, #E8D5B7 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pssc-text-gradient-shimmer {
        background: linear-gradient(90deg, #F1F0EA, #C9A96E, #F1F0EA);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: psscTextShimmer 3s linear infinite;
      }
      .pssc-text-gradient-hero {
        background: linear-gradient(160deg, #FFFFFF 0%, #F0EFEA 20%, #D4D2C8 50%, #9A9789 80%, #F1F0EA 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `;
  }

  /* ─── KEYFRAME PHYSICS ANIMATIONS ─── */
  compileKeyframePhysics() {
    return `
      /* ── PSSC: Keyframe Physics ── */
      @keyframes psscOrbFloat {
        0%, 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 0.5; }
        25% { transform: translateX(-48%) translateY(-15px) scale(1.04); opacity: 0.7; }
        50% { transform: translateX(-52%) translateY(-8px) scale(1.06); opacity: 0.9; }
        75% { transform: translateX(-49%) translateY(-20px) scale(1.02); opacity: 0.6; }
      }
      @keyframes psscFloatDepth {
        0%, 100% { transform: translateY(0) rotateX(0deg) rotateZ(0deg); }
        20% { transform: translateY(-10px) rotateX(1.5deg) rotateZ(0.3deg); }
        40% { transform: translateY(-5px) rotateX(-0.8deg) rotateZ(-0.2deg); }
        60% { transform: translateY(-14px) rotateX(0.5deg) rotateZ(0.15deg); }
        80% { transform: translateY(-8px) rotateX(-0.3deg) rotateZ(-0.1deg); }
      }
      @keyframes psscRevealUp {
        from { opacity: 0; transform: translateY(50px) scale(0.96); filter: blur(8px); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
      @keyframes psscRevealFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes psscTextShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes psscLineExpand {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes psscPulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(201,169,110,0.08); }
        50% { box-shadow: 0 0 50px rgba(201,169,110,0.22), 0 0 80px rgba(201,169,110,0.08); }
      }
      @keyframes psscSlideInNav {
        from { opacity: 0; transform: translateY(-16px); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
      }
      @keyframes psscGrainShift {
        0%, 100% { transform: translate(0,0); }
        10% { transform: translate(-3%,-2%); }
        20% { transform: translate(2%,3%); }
        30% { transform: translate(-1%,1%); }
        40% { transform: translate(2%,-2%); }
        50% { transform: translate(-2%,2%); }
        60% { transform: translate(3%,-1%); }
        70% { transform: translate(-1%,-2%); }
        80% { transform: translate(1%,2%); }
        90% { transform: translate(-2%,-1%); }
      }
      @keyframes psscBreathe {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.03); opacity: 0.9; }
      }
      @keyframes psscSpinSlow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
  }

  /* ─── FLOATING DEPTH LAYERS ─── */
  compileFloatingDepth() {
    const layers = [];
    for (let i = 1; i <= this.options.floatingDepthLayers; i++) {
      const delay = (i - 1) * 2;
      const duration = 5 + i * 1.5;
      const depth = i * 15;
      layers.push(`
        .pssc-float-depth-${i} {
          animation: psscFloatDepth ${duration}s ease-in-out ${delay}s infinite;
          transform-style: preserve-3d;
          will-change: transform;
          --pssc-depth: ${depth}px;
        }
      `);
    }
    return `
      /* ── PSSC: Floating Depth Elements ── */
      .pssc-float-depth {
        animation: psscFloatDepth 6s ease-in-out infinite;
        transform-style: preserve-3d;
        will-change: transform;
      }
      .pssc-float-depth-slow {
        animation: psscFloatDepth 10s ease-in-out infinite;
        transform-style: preserve-3d;
        will-change: transform;
      }
      .pssc-float-depth-fast {
        animation: psscFloatDepth 3.5s ease-in-out infinite;
        transform-style: preserve-3d;
        will-change: transform;
      }
      ${layers.join('\n')}
    `;
  }

  /* ─── MICRO-INTERACTIONS ─── */
  compileMicroInteractions() {
    return `
      /* ── PSSC: Micro-Interactions ── */
      .pssc-transition-luxury {
        transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .pssc-transition-snap {
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .pssc-blur-on-hover {
        transition: filter 0.5s ease, transform 0.5s ease;
      }
      .pssc-blur-on-hover:hover {
        filter: blur(0px) brightness(1.05);
        transform: scale(1.02);
      }
      .pssc-press-depth:active {
        transform: translateY(1px) scale(0.995);
      }
      .pssc-grain-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.028;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        animation: psscGrainShift 8s steps(10) infinite;
      }
    `;
  }

  /* ─── SCROLL PHYSICS BINDING ─── */
  bindScrollPhysics() {
    let ticking = false;
    let lastScroll = 0;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          const velocity = currentScroll - lastScroll;

          document.body.classList.toggle('is-scrolling', Math.abs(velocity) > 2);
          document.body.classList.toggle('is-scrolling-up', velocity < 0);
          document.body.classList.toggle('is-scrolling-down', velocity > 0);

          lastScroll = currentScroll;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.scrollListeners.push(() => window.removeEventListener('scroll', onScroll));
  }

  /* ─── DYNAMIC STYLE ADDITION ─── */
  addRule(selector, declarations) {
    const rule = `${selector} { ${declarations} }`;
    this.styleEl.textContent += '\n' + rule;
    return this;
  }

  /* ─── CLEANUP ─── */
  destroy() {
    this.scrollListeners.forEach(unbind => unbind());
    this.scrollListeners = [];
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }
}
