/**
 * ULTRA-PREMIUM 3D WEBSITE SYSTEM GENERATOR — PHASE 3
 * Master Controller: System Gateway
 * Mission: Pipeline coordinator, diagnostic tracker, iframe initializer.
 * Constraint: Synchronous sequential flow with cinematic progressive loading UI.
 */

(function(global) {
  'use strict';

  // ============================================================
  // 1. DOM ELEMENT CACHE (strict local scoping)
  // ============================================================

  const $ = (sel) => document.querySelector(sel);

  const DOM = {
    // Input & CTA
    promptInput:     $('#promptInput'),
    compileBtn:      $('#compileBtn'),
    ctaLabel:        $('#compileBtn .cta-label'),
    ctaSpinner:      $('#compileBtn .cta-spinner'),

    // Save CTA (hidden until a successful compile)
    saveBtn:         $('#saveBtn'),
    saveLabel:       $('#saveLabel'),

    // Loading overlay
    systemLoader:    $('#systemLoader'),
    loaderTitle:     $('#loaderTitle'),
    loaderDetail:    $('#loaderDetail'),
    loaderProgress:  $('#loaderProgress'),
    loaderStepCount: $('#loaderStepCount'),

    // Validation warning
    validationPanel: $('#validationPanel'),
    validationText:  $('#validationText'),

    // Preview
    previewWrapper:  $('#previewWrapper'),
    previewFrame:    $('#previewFrame'),

    // Diagnostics
    diagCategory:    $('#diagCategory'),
    diagNiche:       $('#diagNiche'),
    diagPalette:     $('#diagPalette'),
    paletteStrip:    $('#paletteStrip'),
    diagStackCount:  $('#diagStackCount'),
    diagSignature:   $('#diagSignature'),
    dots: {
      category: $('#dotCategory'),
      niche:    $('#dotNiche'),
      palette:  $('#dotPalette'),
      stack:    $('#dotStack')
    },
    statuses: {
      category: $('#statusCategory'),
      niche:    $('#statusNiche'),
      palette:  $('#statusPalette'),
      stack:    $('#statusStack')
    },

    // Toolbar
    btnRefresh:      $('#btnRefreshPreview'),
    btnOpenExternal: $('#btnOpenExternal')
  };

  // ============================================================
  // 2. CINEMATIC LOADING PHRASES
  // ============================================================

  const LOADING_PHRASES = [
    { phase: 'intel',  text: 'Extracting semantic industry vectors...' },
    { phase: 'intel',  text: 'Parsing niche taxonomy & brand identity...' },
    { phase: 'intel',  text: 'Resolving category architecture...' },
    { phase: 'aesthetic', text: 'Synthesizing dynamic color matrices...' },
    { phase: 'aesthetic', text: 'Calibrating chromatic offset coordinates...' },
    { phase: 'aesthetic', text: 'Generating procedural palette variants...' },
    { phase: 'spatial', text: 'Compiling custom 3D viewport spatial blocks...' },
    { phase: 'spatial', text: 'Configuring IntersectionObserver thresholds...' },
    { phase: 'spatial', text: 'Tuning parallax depth & rotateX envelopes...' },
    { phase: 'layout', text: 'Assembling agnostic component stack...' },
    { phase: 'layout', text: 'Shuffling structural layout modules...' },
    { phase: 'layout', text: 'Binding hyper-specific asset prompts...' },
    { phase: 'compiler', text: 'Compiling premium HTML/CSS environments...' },
    { phase: 'compiler', text: 'Injecting glassmorphism surface tokens...' },
    { phase: 'compiler', text: 'Writing multi-page virtual filesystem...' },
    { phase: 'router', text: 'Registering routes in memory matrix...' },
    { phase: 'router', text: 'Seeding VirtualFileSystem registry...' },
    { phase: 'iframe', text: 'Initializing preview iframe canvas...' },
    { phase: 'iframe', text: 'Mounting /home route with environmental parity...' },
    { phase: 'iframe', text: 'Activating 3D scroll-triggered animation hooks...' },
  ];

  // ============================================================
  // 3. STATE & CONFIG
  // ============================================================

  let lastBlueprint = null;
  let lastVfsPayload = null;
  let lastPrompt = '';
  let isPipelineRunning = false;
  let isSaving = false;
  let autosaveOnReady = false;
  let runningInIframe = false;
  let premiumCoreCss = null;
  let premiumCssPromise = null;
  const MIN_PROMPT_LENGTH = 8;

  // ============================================================
  //  PREMIUM CSS INLINER
  //  The compiler emits <link href="css/premium-core.css"> — a relative URL
  //  that breaks inside srcdoc iframes (editor) and on published subdomains.
  //  Fetch the stylesheet once and inline it into every compiled page so the
  //  saved HTML is fully self-contained and renders premium everywhere.
  // ============================================================

  function fetchPremiumCss() {
    if (premiumCoreCss !== null) return Promise.resolve(premiumCoreCss);
    if (premiumCssPromise) return premiumCssPromise;
    premiumCssPromise = fetch('/css/premium-core.css', { credentials: 'same-origin' })
      .then(function(r) { return r.ok ? r.text() : ''; })
      .then(function(css) {
        premiumCoreCss = css || '';
        return premiumCoreCss;
      })
      .catch(function() {
        premiumCoreCss = '';
        return '';
      });
    return premiumCssPromise;
  }

  function inlinePremiumCssInto(html) {
    if (!html || !premiumCoreCss) return html;
    // Replace any <link …href="…premium-core.css"…> with a <style> block.
    var linkRe = /<link[^>]+href=["']?[^"' >]*premium-core\.css["']?[^>]*>/gi;
    var styleBlock = '<style data-premium-core="inline">\n' + premiumCoreCss + '\n</style>';
    if (linkRe.test(html)) {
      return html.replace(linkRe, styleBlock);
    }
    // No link tag matched — inject just before </head> so it still loads.
    return html.replace(/<\/head>/i, styleBlock + '\n</head>');
  }

  function inlinePremiumCssInVfs(vfsPayload) {
    if (!vfsPayload || !premiumCoreCss) return vfsPayload;
    var out = {};
    for (var key in vfsPayload) {
      if (Object.prototype.hasOwnProperty.call(vfsPayload, key)) {
        out[key] = inlinePremiumCssInto(vfsPayload[key]);
      }
    }
    return out;
  }

  // ============================================================
  // 4. UTILITY: Micro-delays for UI breathing
  // ============================================================

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function yieldUI() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  // ============================================================
  // 5. VALIDATION WARNING SYSTEM (no browser alerts)
  // ============================================================

  function showValidation(message, type) {
    if (!DOM.validationPanel || !DOM.validationText) return;
    DOM.validationText.textContent = message;
    DOM.validationPanel.className = 'validation-panel validation-panel--' + (type || 'warning') + ' validation-panel--visible';
    DOM.promptInput.classList.add('prompt-textarea--error');
  }

  function hideValidation() {
    if (!DOM.validationPanel) return;
    DOM.validationPanel.classList.remove('validation-panel--visible');
    DOM.promptInput.classList.remove('prompt-textarea--error');
  }

  function validatePrompt(raw) {
    const prompt = (raw || '').trim();
    if (!prompt) {
      return { valid: false, message: 'A mission briefing is required. Describe your vision with precision.', type: 'warning' };
    }
    if (prompt.length < MIN_PROMPT_LENGTH) {
      return { valid: false, message: 'Briefing too brief. Provide at least ' + MIN_PROMPT_LENGTH + ' characters for semantic extraction.', type: 'warning' };
    }
    // Check for obvious non-text content
    if (/^[^a-zA-Z]+$/.test(prompt)) {
      return { valid: false, message: 'Briefing appears to contain no meaningful text. Describe your project in natural language.', type: 'error' };
    }
    return { valid: true };
  }

  // ============================================================
  // 6. LOADING OVERLAY CONTROLLER
  // ============================================================

  function showLoader() {
    if (!DOM.systemLoader) return;
    DOM.systemLoader.classList.add('system-loader--visible');
    updateLoaderProgress(0, LOADING_PHRASES[0].text);
  }

  function hideLoader() {
    if (!DOM.systemLoader) return;
    DOM.systemLoader.classList.remove('system-loader--visible');
  }

  function updateLoaderProgress(pct, detail) {
    if (DOM.loaderProgress) {
      DOM.loaderProgress.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    if (DOM.loaderDetail && detail) {
      DOM.loaderDetail.textContent = detail;
    }
    if (DOM.loaderStepCount) {
      const current = Math.ceil((pct / 100) * LOADING_PHRASES.length);
      DOM.loaderStepCount.textContent = current + ' / ' + LOADING_PHRASES.length;
    }
  }

  async function cycleLoaderPhrases(startIndex, endIndex, durationMs) {
    const span = endIndex - startIndex;
    const stepMs = durationMs / Math.max(1, span);
    for (let i = startIndex; i < endIndex; i++) {
      const phrase = LOADING_PHRASES[Math.min(i, LOADING_PHRASES.length - 1)];
      const pct = ((i + 1) / LOADING_PHRASES.length) * 100;
      updateLoaderProgress(pct, phrase.text);
      await sleep(stepMs);
    }
  }

  // ============================================================
  // 7. DIAGNOSTIC PANEL SYNC
  // ============================================================

  function setDiagnosticState(key, value, status) {
    const el = DOM[key];
    if (el && value !== undefined) {
      el.textContent = value;
    }
    const dot = DOM.dots[key];
    const label = DOM.statuses[key];
    if (dot && label) {
      dot.className = 'status-dot ' + (status || '');
      label.textContent = status === 'generating' ? 'Processing...'
        : (status === 'active' ? 'Resolved' : 'Idle');
    }
  }

  function clearDiagnostics() {
    setDiagnosticState('diagCategory', 'Analyzing semantic field...', 'generating');
    setDiagnosticState('diagNiche', 'Scanning lexical tokens...', 'generating');
    setDiagnosticState('diagPalette', 'Calibrating color matrices...', 'generating');
    if (DOM.paletteStrip) DOM.paletteStrip.innerHTML = '';
    setDiagnosticState('diagStackCount', 'Queueing components...', 'generating');
    if (DOM.diagSignature) DOM.diagSignature.textContent = '—';
  }

  function populateDiagnostics(blueprint) {
    if (!blueprint || !blueprint.intent) return;
    const d = window.ProceduralIntelligenceEngine.diagnostics(blueprint);

    setDiagnosticState('diagCategory', d.detectedCategory, 'active');
    setDiagnosticState('diagNiche', d.extractedNiche || 'General', 'active');

    const p = d.algorithmicPaletteCoordinates;
    const paletteText = p
      ? p.semanticSpace + ' (offset: ' + (p.offsetFactor || 0).toFixed(3) + ')'
      : '—';
    setDiagnosticState('diagPalette', paletteText, 'active');

    if (p && DOM.paletteStrip) {
      const swatches = [p.base, p.accent, p.secondary].filter(Boolean);
      DOM.paletteStrip.innerHTML = swatches.map(c =>
        '<div class="palette-swatch" style="background:' + c + ';" title="' + c + '"></div>'
      ).join('');
    }

    setDiagnosticState('diagStackCount', String(d.generatedComponentStackCount || 0), 'active');
    if (DOM.diagSignature) {
      DOM.diagSignature.textContent = d.generationSignature || '—';
    }
  }

  // ============================================================
  // 8. CTA STATE CONTROLLER
  // ============================================================

  function setCtaState(state) {
    if (!DOM.compileBtn) return;
    if (state === 'compiling') {
      DOM.compileBtn.classList.add('compiling');
      if (DOM.ctaLabel) DOM.ctaLabel.style.display = 'none';
      if (DOM.ctaSpinner) DOM.ctaSpinner.style.display = 'inline-block';
    } else {
      DOM.compileBtn.classList.remove('compiling');
      if (DOM.ctaLabel) DOM.ctaLabel.style.display = 'inline';
      if (DOM.ctaSpinner) DOM.ctaSpinner.style.display = 'none';
    }
  }

  // ============================================================
  // 9. IFRAME INITIALIZATION WITH ENVIRONMENTAL PARITY
  // ============================================================

  async function initializeIframeCanvas(vfsPayload, blueprint) {
    const iframe = DOM.previewFrame;
    const wrapper = DOM.previewWrapper;
    if (!iframe || !wrapper) return;

    wrapper.classList.add('has-content');

    // Write the compiled /home page directly into the iframe document
    const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    if (!doc) {
      console.warn('[SystemGateway] iframe document inaccessible');
      return;
    }

    doc.open();
    doc.write(vfsPayload['/home'] || '');
    doc.close();

    // Ensure environmental parity: the LayoutCompiler already injects Google Sans
    // and premium-core.css link into each compiled page. We verify and reinforce.
    await sleep(80);
    await yieldUI();

    // Inject the virtual-router bridge into the iframe so navigation works
    if (window.VirtualRouter && typeof window.VirtualRouter.injectIntoPreviewFrame === 'function') {
      window.VirtualRouter.injectIntoPreviewFrame(iframe);
    }

    // Seed the iframe's own VirtualFileSystem with all compiled pages
    if (iframe.contentWindow) {
      if (!iframe.contentWindow.VirtualFileSystem) {
        iframe.contentWindow.VirtualFileSystem = {};
      }
      for (const [path, html] of Object.entries(vfsPayload)) {
        iframe.contentWindow.VirtualFileSystem[path] = {
          html: html,
          meta: {
            title: (blueprint.intent.brandName || blueprint.intent.primaryNiche) +
                   ' — ' + path.replace('/', '').toUpperCase()
          }
        };
      }
    }

    // Activate the IntersectionObserver by dispatching a synthetic navigation event
    // This triggers the inline script inside the compiled HTML to re-bind observers
    await sleep(60);
    if (iframe.contentWindow) {
      const navEvent = new CustomEvent('virtualnavigate', {
        detail: { path: '/home', previous: null, meta: {} }
      });
      iframe.contentWindow.dispatchEvent(navEvent);
    }

    await yieldUI();
  }

  // ============================================================
  // 10. CORE PIPELINE SEQUENCE
  // ============================================================

  async function runPipeline() {
    if (isPipelineRunning) return;
    isPipelineRunning = true;

    try {
      // --- STEP 0: Validate input ---
      const rawPrompt = DOM.promptInput ? DOM.promptInput.value : '';
      const validation = validatePrompt(rawPrompt);
      if (!validation.valid) {
        showValidation(validation.message, validation.type);
        isPipelineRunning = false;
        return;
      }
      hideValidation();
      lastPrompt = rawPrompt.trim();

      // --- STEP 1: Lock UI & show loader ---
      setCtaState('compiling');
      hideSaveButton();
      showLoader();
      clearDiagnostics();
      await yieldUI();
      await sleep(120);

      // --- STEP 2: Run Procedural Intel Engine ---
      await cycleLoaderPhrases(0, 6, 680);
      const blueprint = window.ProceduralIntelligenceEngine.compile(rawPrompt);
      if (!blueprint || !blueprint.intent) {
        throw new Error('Intel Engine returned invalid blueprint');
      }
      lastBlueprint = blueprint;

      // --- Inject niche-specific content kit ---
      if (typeof window.NicheContentEngine !== 'undefined' && blueprint.intent) {
        blueprint.contentKit = window.NicheContentEngine.generate(blueprint.intent);
      }

      // --- STEP 3: Sync diagnostics to dashboard ---
      await cycleLoaderPhrases(6, 10, 400);
      populateDiagnostics(blueprint);
      await yieldUI();

      // --- STEP 4: Compile HTML via LayoutCompiler ---
      await cycleLoaderPhrases(10, 16, 720);
      const compiler = new window.LayoutCompiler(blueprint);
      const rawVfsPayload = compiler.compileAllPages();
      // Ensure the premium core stylesheet is available, then inline it into
      // every compiled page so the saved HTML renders premium everywhere
      // (editor srcdoc, published subdomain, exported, etc.).
      await fetchPremiumCss();
      const vfsPayload = inlinePremiumCssInVfs(rawVfsPayload);
      lastVfsPayload = vfsPayload;

      // --- STEP 5: Register to Virtual Router Memory ---
      await cycleLoaderPhrases(16, 18, 320);
      window.VirtualFileSystem = {};
      for (const [path, html] of Object.entries(vfsPayload)) {
        window.VirtualRouter.registerPage(path, html, {
          title: (blueprint.intent.brandName || blueprint.intent.primaryNiche) +
                 ' — ' + path.replace('/', '').toUpperCase()
        });
      }

      // --- STEP 6: Initialize Iframe Canvas ---
      await cycleLoaderPhrases(18, 20, 380);
      await initializeIframeCanvas(vfsPayload, blueprint);

      // --- STEP 7: Smooth fade loader ---
      updateLoaderProgress(100, 'System ready. Render complete.');
      await sleep(480);
      hideLoader();
      setCtaState('idle');

      // --- STEP 8: Reveal Save CTA so the user can persist this build ---
      showSaveButton();

      // --- STEP 9: Headless auto-save when launched from the dashboard ---
      // (the dashboard renders us inside a hidden iframe with autosave=1)
      if (autosaveOnReady) {
        autosaveOnReady = false;
        handleSave();
      }

    } catch (err) {
      console.error('[SystemGateway] Pipeline failure:', err);
      updateLoaderProgress(100, 'Compilation failed. Check console for telemetry.');
      await sleep(900);
      hideLoader();
      setCtaState('idle');
      const msg = (err && err.message) ? err.message : 'Unknown failure';
      showValidation('System compilation error: ' + msg, 'error');
      reportToParent({ type: 'engine:error', message: msg });
    } finally {
      isPipelineRunning = false;
    }
  }

  // Forward errors/status to the dashboard when we're embedded as a hidden
  // iframe. Same-origin, so a direct postMessage works.
  function reportToParent(payload) {
    if (!runningInIframe) return;
    try {
      window.parent.postMessage(payload, window.location.origin);
    } catch (_) { /* parent unavailable — ignore */ }
  }

  // ============================================================
  // 11. SAVE CONTROLLER — Persist precompiled HTML to /api/generate
  // ============================================================

  function showSaveButton() {
    if (!DOM.saveBtn) return;
    DOM.saveBtn.classList.add('is-ready');
    DOM.saveBtn.classList.remove('saving');
    DOM.saveBtn.removeAttribute('aria-hidden');
    if (DOM.saveLabel) DOM.saveLabel.textContent = 'Save to My Account';
  }

  function hideSaveButton() {
    if (!DOM.saveBtn) return;
    DOM.saveBtn.classList.remove('is-ready');
    DOM.saveBtn.classList.remove('saving');
    DOM.saveBtn.setAttribute('aria-hidden', 'true');
  }

  function setSaveState(state, labelOverride) {
    if (!DOM.saveBtn) return;
    if (state === 'saving') {
      DOM.saveBtn.classList.add('saving');
    } else {
      DOM.saveBtn.classList.remove('saving');
    }
    if (DOM.saveLabel && labelOverride) DOM.saveLabel.textContent = labelOverride;
  }

  /**
   * Extract the canonical compiled HTML from the most recent pipeline run.
   * Order of preference:
   *   1. The /home payload captured at compile time (most reliable)
   *   2. The /home entry registered in window.VirtualFileSystem
   *   3. The first compiled route, whichever exists
   */
  function extractCompiledHtml() {
    if (lastVfsPayload && lastVfsPayload['/home']) return lastVfsPayload['/home'];
    if (global.VirtualFileSystem && global.VirtualFileSystem['/home']) {
      const e = global.VirtualFileSystem['/home'];
      return typeof e === 'string' ? e : (e && e.html) || null;
    }
    if (lastVfsPayload) {
      const firstKey = Object.keys(lastVfsPayload)[0];
      if (firstKey) return lastVfsPayload[firstKey];
    }
    return null;
  }

  async function handleSave() {
    if (isSaving) return;
    if (!lastVfsPayload || !lastPrompt) {
      showValidation('Nothing to save yet. Compile a build first.', 'warning');
      return;
    }
    const html = extractCompiledHtml();
    if (!html || html.length < 500) {
      showValidation('Compiled HTML missing — recompile and try again.', 'error');
      return;
    }

    isSaving = true;
    setSaveState('saving', 'Saving to Database...');
    hideValidation();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          prompt: lastPrompt,
          precompiledHtml: html,
          businessName: (lastBlueprint && lastBlueprint.intent && lastBlueprint.intent.brandName) || undefined,
          mdxGenerated: true,
          siteSpec: lastBlueprint && lastBlueprint.intent ? {
            siteName: lastBlueprint.intent.brandName,
            industry: lastBlueprint.intent.primaryNiche
          } : undefined,
        }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) { /* ignore parse error */ }

      if (res.status === 401) {
        setSaveState('idle', 'Sign in required');
        showValidation('Please sign in to save websites to your account.', 'error');
        reportToParent({ type: 'engine:error', message: 'Sign in required', code: 'AUTH' });
        // Redirect to sign-in after a beat so the user sees the message.
        setTimeout(function() {
          (window.top || window).location.href = '/auth/signin';
        }, 1200);
        return;
      }

      if (!res.ok) {
        const msg = (data && data.error) ? data.error : ('Save failed (HTTP ' + res.status + ')');
        setSaveState('idle', 'Save to My Account');
        showValidation(msg, 'error');
        reportToParent({ type: 'engine:error', message: msg });
        return;
      }

      // Success — navigate the TOP window (so the dashboard host frame moves
      // to the editor, not just the inner iframe), matching the original
      // generate → editor flow.
      setSaveState('saving', 'Saved. Opening editor...');
      const target = '/editor/' + data.website.id;
      reportToParent({ type: 'engine:saved', websiteId: data.website.id, target: target });
      (window.top || window).location.href = target;
    } catch (err) {
      console.error('[SystemGateway] Save failure:', err);
      const msg = (err && err.message) ? err.message : 'unknown';
      setSaveState('idle', 'Save to My Account');
      showValidation('Network error saving website: ' + msg, 'error');
      reportToParent({ type: 'engine:error', message: msg });
    } finally {
      isSaving = false;
    }
  }

  // ============================================================
  // 12. EVENT BINDING
  // ============================================================

  function bindEvents() {
    if (DOM.compileBtn) {
      DOM.compileBtn.addEventListener('click', runPipeline);
    }

    if (DOM.saveBtn) {
      DOM.saveBtn.addEventListener('click', handleSave);
    }

    if (DOM.btnRefresh) {
      DOM.btnRefresh.addEventListener('click', () => {
        if (lastBlueprint) {
          runPipeline();
        }
      });
    }

    if (DOM.btnOpenExternal) {
      DOM.btnOpenExternal.addEventListener('click', () => {
        if (lastBlueprint && DOM.previewFrame && DOM.previewFrame.contentDocument) {
          const blob = new Blob([DOM.previewFrame.contentDocument.documentElement.outerHTML], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      });
    }

    // Clear validation on input
    if (DOM.promptInput) {
      DOM.promptInput.addEventListener('input', () => {
        if (DOM.promptInput.classList.contains('prompt-textarea--error')) {
          hideValidation();
        }
      });
      DOM.promptInput.addEventListener('focus', () => {
        hideValidation();
      });
    }
  }

  // ============================================================
  // 13. BOOTSTRAP
  // ============================================================

  function init() {
    bindEvents();

    // Detect whether the dashboard is hosting us inside a hidden iframe.
    try { runningInIframe = window.self !== window.top; } catch (_) { runningInIframe = true; }

    // Warm the premium-core.css fetch immediately so it is cached by the
    // time the pipeline reaches the inlining step.
    fetchPremiumCss();

    // The dashboard hands off the user's brief via ?prompt=…&autorun=1&autosave=1.
    // Honour those parameters before falling back to the demo seed so users
    // who clicked "Generate Website" on the dashboard see their own prompt
    // running immediately, not the Velasca placeholder.
    var seededFromUrl = false;
    var shouldAutorun = false;
    try {
      var params = new URLSearchParams(window.location.search);
      var urlPrompt = params.get('prompt');
      if (urlPrompt && DOM.promptInput) {
        DOM.promptInput.value = urlPrompt;
        seededFromUrl = true;
      }
      shouldAutorun = params.get('autorun') === '1';
      autosaveOnReady = params.get('autosave') === '1';
      // Strip query string so a refresh doesn't re-trigger the autorun.
      // Skip the rewrite inside an iframe — the dashboard owns the visible URL.
      if ((seededFromUrl || shouldAutorun) && !runningInIframe) {
        var clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, clean);
      }
    } catch (_) { /* URLSearchParams unavailable — fall through */ }

    // Seed demo prompt if empty (and the URL didn't supply one)
    if (!seededFromUrl && DOM.promptInput && !DOM.promptInput.value.trim()) {
      DOM.promptInput.value = 'Build a luxury e-commerce website for an Italian artisan shoe brand named Velasca, featuring rich obsidian textures, macro product photography, and editorial craft storytelling.';
    }

    // Auto-run when the dashboard requested it. Wait for the engine modules
    // (intelligence-engine, layout-compiler, virtual-router) to be present
    // since they may finish parsing after this script.
    if (shouldAutorun && seededFromUrl) {
      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        var ready = window.ProceduralIntelligenceEngine &&
                    window.LayoutCompiler &&
                    window.VirtualRouter;
        if (ready) {
          clearInterval(poll);
          runPipeline();
        } else if (attempts > 40) {
          // ~4 s window — give up and let the user click manually.
          clearInterval(poll);
          showValidation('Engine modules failed to load. Click "Compile" to retry.', 'error');
          reportToParent({ type: 'engine:error', message: 'Engine modules failed to load' });
        }
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 14. PUBLIC API
  // ============================================================

  global.SystemGateway = {
    run: runPipeline,
    save: handleSave,
    getLastBlueprint: () => lastBlueprint,
    getLastVfsPayload: () => lastVfsPayload,
    isRunning: () => isPipelineRunning,
    isSaving: () => isSaving,
    showValidation: showValidation,
    hideValidation: hideValidation,
    setDiagnosticState: setDiagnosticState,
    populateDiagnostics: populateDiagnostics,
    DOM: DOM
  };

})(typeof window !== 'undefined' ? window : global);
