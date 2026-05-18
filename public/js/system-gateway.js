/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM GATEWAY — Master Controller for the Website System Generator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Orchestrates the full execution line from a niche prompt to a fully rendered
 * multi-page Marcelo Design X-style site:
 *
 *   USER PROMPT
 *      │
 *      ▼
 *   IntelligenceEngine.generateSite()        ← multi-page brain
 *      │   (architecture + image prompts + signals)
 *      ▼
 *   DeterministicLayoutCompiler.compile()    ← layout stitcher
 *      │   (Stitch → Invert → Stamp → Emit)
 *      ▼
 *   compiled.emitted.documents[route].html   ← per-page HTML strings
 *      │
 *      ▼
 *   iframe.srcdoc  ← rendered in the review window on index.html
 *
 * Pipeline runs entirely client-side. No network calls. No API costs.
 * The 3 luxury stylesheets (style.css, modules.css, intelligence.css) are
 * inlined by AssetInversion automatically — they are also linked from
 * index.html so the dashboard chrome inherits the same cinematic system.
 *
 * @module SystemGateway
 */

import { IntelligenceEngine } from './intelligence/IntelligenceEngine.js';
import { DeterministicLayoutCompiler } from './compiler/DeterministicLayoutCompiler.js';

/* ─── Event bus (tiny pub/sub) ───────────────────────────────────────────── */

class EventBus {
  constructor() { this._listeners = {}; }
  on(event, fn) { (this._listeners[event] ||= []).push(fn); return this; }
  emit(event, payload) { (this._listeners[event] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }
}

/* ─── Master gateway ─────────────────────────────────────────────────────── */

export class SystemGateway extends EventBus {
  constructor(opts = {}) {
    super();
    this.locale = opts.locale || 'en-US';
    this.verbose = opts.verbose !== false;
    this.editorEnabled = opts.editorEnabled !== false;

    // Wire the two heavy engines once and reuse.
    this._engine = new IntelligenceEngine({ locale: this.locale, verbose: false });
    this._compiler = new DeterministicLayoutCompiler({
      locale: this.locale,
      verbose: false,
      editorEnabled: this.editorEnabled,
      emitHTML: true,
    });

    this._lastResult = null;
  }

  /**
   * Run the full pipeline for a niche prompt.
   * Emits 'stage', 'complete', and 'error' events for the UI.
   *
   * @param {string} prompt     — business niche description
   * @param {Object} overrides  — { businessName?, colors?, maxDepth? }
   * @returns {Promise<Object>} { plan, compiled, durationMs }
   */
  async run(prompt, overrides = {}) {
    if (!prompt || !prompt.trim()) {
      const err = new Error('A business niche prompt is required.');
      this.emit('error', { stage: 'INPUT', message: err.message });
      throw err;
    }

    const startedAt = performance.now();
    this.emit('start', { prompt });

    try {
      // ── Phase 1 — Intelligence (architecture + image prompts) ────────────
      this.emit('stage', { stage: 'INTELLIGENCE', message: 'Planning multi-page architecture and image prompts…' });
      const plan = await this._engine.generateSite(prompt, {
        businessName: overrides.businessName || undefined,
        maxDepth: overrides.maxDepth || 2,
        colors: overrides.colors,
      });
      this.emit('stage', {
        stage: 'INTELLIGENCE',
        status: 'done',
        message: `Architecture ready · ${Object.keys(plan.architecture.pages).length} pages · ${plan.imageAssets.length} image prompts`,
        plan,
      });

      // ── Phase 2 — Compile (stitch → invert → stamp → emit) ───────────────
      this.emit('stage', { stage: 'COMPILER', message: 'Stitching layout blocks · injecting luxury CSS · stamping editor attributes…' });
      const compiled = this._compiler.compile(plan);
      this.emit('stage', {
        stage: 'COMPILER',
        status: 'done',
        message: `Compiled · ${Object.keys(compiled.emitted?.documents || {}).length} HTML documents · CSS ${(compiled.cssBundleSize / 1024).toFixed(1)}KB · ${compiled.editorRegistry?.length || 0} editable nodes`,
        compiled,
      });

      const durationMs = Math.round(performance.now() - startedAt);
      const result = { plan, compiled, durationMs };
      this._lastResult = result;
      this.emit('complete', result);
      return result;

    } catch (err) {
      this.emit('error', {
        stage: err.stage || 'PIPELINE',
        message: err.message,
        error: err,
      });
      throw err;
    }
  }

  /**
   * Switch the iframe to display a different generated page.
   * @param {string} route — page route from the compiled site
   * @param {HTMLIFrameElement} iframe
   */
  renderRouteIntoIframe(route, iframe) {
    if (!this._lastResult) throw new Error('No site has been generated yet.');
    const doc = this._lastResult.compiled.emitted?.documents?.[route];
    if (!doc) throw new Error(`Route "${route}" was not emitted.`);
    iframe.srcdoc = doc.html;
    this.emit('route', { route, label: doc.label });
  }

  /** Get the most recent result (or null). */
  getLastResult() { return this._lastResult; }

  /** Get the deployable JSON bundle from the most recent generation. */
  exportBundle() {
    if (!this._lastResult) return null;
    return this._engine.exportBundle(this._lastResult.plan);
  }
}

/* ─── Auto-wire to index.html dashboard ──────────────────────────────────── */
/*
 * The script tag in index.html imports this module; the IIFE below picks up
 * the dashboard's `#generateBtn`, `#nichePrompt`, and `#previewFrame` and
 * runs the full pipeline on click. Any host page can re-use SystemGateway
 * without this auto-wire by importing the class directly.
 */

(function autoWire() {
  if (typeof document === 'undefined') return;

  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const btn = document.getElementById('generateBtn');
    const promptEl = document.getElementById('nichePrompt');
    const businessNameEl = document.getElementById('businessName');
    const iframe = document.getElementById('previewFrame');
    const statusEl = document.getElementById('pipelineStatus');
    const logEl = document.getElementById('pipelineLog');
    const routeBar = document.getElementById('routeBar');
    const reviewWindow = document.getElementById('reviewWindow');
    const metricsBar = document.getElementById('metricsBar');
    const downloadBtn = document.getElementById('downloadBundle');

    // The auto-wire is a no-op if the host page doesn't have the dashboard.
    if (!btn || !promptEl || !iframe) return;

    const gateway = new SystemGateway({ verbose: true });
    window.__mdxGateway = gateway; // expose for debugging

    /* ── UI helpers ─────────────────────────────────────────────────────── */

    function setStatus(text, tone = 'info') {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.dataset.tone = tone;
    }

    function appendLog(stage, message, status = 'info') {
      if (!logEl) return;
      const row = document.createElement('div');
      row.className = 'log-row';
      row.dataset.status = status;
      row.innerHTML = `<span class="log-stage">${stage}</span><span class="log-message">${message}</span>`;
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function clearLog() { if (logEl) logEl.innerHTML = ''; }

    function setBusy(isBusy) {
      btn.disabled = isBusy;
      btn.classList.toggle('is-busy', isBusy);
      btn.querySelector('.btn-label').textContent = isBusy ? 'Generating…' : 'Generate Website System';
    }

    function renderRouteBar(compiled) {
      if (!routeBar) return;
      const docs = compiled.emitted?.documents || {};
      const routes = Object.keys(docs);
      routeBar.innerHTML = routes.map((r, i) => {
        const doc = docs[r];
        return `<button type="button" class="route-pill${i === 0 ? ' is-active' : ''}" data-route="${r}">
          <span class="route-pill-label">${doc.label || r}</span>
          <span class="route-pill-path">${r}</span>
        </button>`;
      }).join('');
      routeBar.querySelectorAll('.route-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          routeBar.querySelectorAll('.route-pill').forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          gateway.renderRouteIntoIframe(pill.dataset.route, iframe);
        });
      });
    }

    function renderMetrics(plan, compiled, durationMs) {
      if (!metricsBar) return;
      const pageCount = Object.keys(compiled.emitted?.documents || {}).length;
      const imageCount = plan.imageAssets?.length || 0;
      const editableCount = compiled.editorRegistry?.length || 0;
      const cssKb = (compiled.cssBundleSize / 1024).toFixed(1);
      metricsBar.innerHTML = `
        <div class="metric"><span class="metric-value">${pageCount}</span><span class="metric-label">Pages</span></div>
        <div class="metric"><span class="metric-value">${imageCount}</span><span class="metric-label">Image Prompts</span></div>
        <div class="metric"><span class="metric-value">${editableCount}</span><span class="metric-label">Editable Nodes</span></div>
        <div class="metric"><span class="metric-value">${cssKb}KB</span><span class="metric-label">Luxury CSS</span></div>
        <div class="metric"><span class="metric-value">${durationMs}ms</span><span class="metric-label">Generation</span></div>
      `;
    }

    /* ── Gateway event listeners ────────────────────────────────────────── */

    gateway
      .on('start', ({ prompt }) => {
        clearLog();
        setStatus('Pipeline initialised', 'info');
        appendLog('START', `Niche: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`);
      })
      .on('stage', ({ stage, message, status }) => {
        appendLog(stage, message, status || 'info');
        if (!status) setStatus(message, 'info');
        else if (status === 'done') setStatus(message, 'success');
      })
      .on('complete', ({ plan, compiled, durationMs }) => {
        setStatus(`Generation complete — ${durationMs}ms`, 'success');
        appendLog('COMPLETE', `All stages finished in ${durationMs}ms.`, 'success');

        renderRouteBar(compiled);
        renderMetrics(plan, compiled, durationMs);

        // Render the home page (first route) into the iframe immediately.
        const firstRoute = Object.keys(compiled.emitted?.documents || {})[0];
        if (firstRoute) gateway.renderRouteIntoIframe(firstRoute, iframe);

        if (reviewWindow) reviewWindow.classList.add('is-visible');
        if (downloadBtn) downloadBtn.disabled = false;
      })
      .on('error', ({ stage, message }) => {
        setStatus(`Error — ${message}`, 'error');
        appendLog(stage, `✗ ${message}`, 'error');
      });

    /* ── Generate button ────────────────────────────────────────────────── */

    btn.addEventListener('click', async () => {
      const prompt = promptEl.value.trim();
      const businessName = businessNameEl ? businessNameEl.value.trim() : '';
      if (!prompt) {
        setStatus('Please enter a business niche prompt.', 'error');
        promptEl.focus();
        return;
      }

      setBusy(true);
      try {
        await gateway.run(prompt, businessName ? { businessName } : {});
      } catch (err) {
        // Errors already surfaced via 'error' event.
        console.error(err);
      } finally {
        setBusy(false);
      }
    });

    /* ── Download bundle button ─────────────────────────────────────────── */

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const bundle = gateway.exportBundle();
        if (!bundle) return;
        const blob = new Blob([bundle], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mdx-site-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  });
})();
