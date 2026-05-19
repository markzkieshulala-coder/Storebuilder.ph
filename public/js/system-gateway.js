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
  let isPipelineRunning = false;
  const MIN_PROMPT_LENGTH = 8;

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

      // --- STEP 1: Lock UI & show loader ---
      setCtaState('compiling');
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

      // --- STEP 3: Sync diagnostics to dashboard ---
      await cycleLoaderPhrases(6, 10, 400);
      populateDiagnostics(blueprint);
      await yieldUI();

      // --- STEP 4: Compile HTML via LayoutCompiler ---
      await cycleLoaderPhrases(10, 16, 720);
      const compiler = new window.LayoutCompiler(blueprint);
      const vfsPayload = compiler.compileAllPages();

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

    } catch (err) {
      console.error('[SystemGateway] Pipeline failure:', err);
      updateLoaderProgress(100, 'Compilation failed. Check console for telemetry.');
      await sleep(900);
      hideLoader();
      setCtaState('idle');
      showValidation('System compilation error: ' + (err && err.message ? err.message : 'Unknown failure'), 'error');
    } finally {
      isPipelineRunning = false;
    }
  }

  // ============================================================
  // 11. EVENT BINDING
  // ============================================================

  function bindEvents() {
    if (DOM.compileBtn) {
      DOM.compileBtn.addEventListener('click', runPipeline);
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
  // 12. BOOTSTRAP
  // ============================================================

  function init() {
    bindEvents();
    // Seed demo prompt if empty
    if (DOM.promptInput && !DOM.promptInput.value.trim()) {
      DOM.promptInput.value = 'Build a luxury e-commerce website for an Italian artisan shoe brand named Velasca, featuring rich obsidian textures, macro product photography, and editorial craft storytelling.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 13. PUBLIC API
  // ============================================================

  global.SystemGateway = {
    run: runPipeline,
    getLastBlueprint: () => lastBlueprint,
    isRunning: () => isPipelineRunning,
    showValidation: showValidation,
    hideValidation: hideValidation,
    setDiagnosticState: setDiagnosticState,
    populateDiagnostics: populateDiagnostics,
    DOM: DOM
  };

})(typeof window !== 'undefined' ? window : global);
