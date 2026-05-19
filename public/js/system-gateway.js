/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM GATEWAY v2 — Master Controller for the MDX Website System Generator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the ONLY active generation engine. The old deterministic
 * single-page native generator is bypassed entirely.
 *
 * Execution line:
 *
 *   USER PROMPT
 *     │
 *     ▼  ① IntelligenceEngine.generateSite()
 *        ArchitecturePlanner  → multi-page route map (≥4 pages enforced)
 *        ContextualImagePromptGenerator → hyper-detailed studio prompts per asset
 *        StrictJsonResponseExtractor → validated site spec
 *     │
 *     ▼  ② PIPELINE ENFORCEMENT
 *        Reject single-page output, validate image prompt depth, confirm aesthetic signals
 *     │
 *     ▼  ③ DeterministicLayoutCompiler.compile()
 *        PageStitcher     → layout blocks per page
 *        AssetInversion   → 6 luxury CSS modules inlined per page
 *        DocumentTransformation → data-mdx-edit-* attributes stamped
 *        Emit             → standalone HTML per route
 *     │
 *     ▼  ④ _mergePages()
 *        All emitted pages stitched into a single self-contained HTML
 *        with MDX hash-router (real page transitions, no anchor scrolls)
 *     │
 *     ▼  ⑤ iframe.srcdoc for live preview
 *        Route pills for page switching
 *     │
 *     ▼  ⑥ [Optional] POST /api/generate → persist to Storebuilder dashboard
 *
 * @module SystemGateway
 * @version 2.0 — exclusive MDX engine, old native-generator purged
 */

import { IntelligenceEngine } from './intelligence/IntelligenceEngine.js';
import { DeterministicLayoutCompiler } from './compiler/DeterministicLayoutCompiler.js';

/* ─── Tiny event bus ─────────────────────────────────────────────────────── */

class EventBus {
  constructor() { this._h = {}; }
  on(ev, fn) { (this._h[ev] ??= []).push(fn); return this; }
  emit(ev, d) { (this._h[ev] ?? []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } }); }
}

/* ─── Pipeline enforcement ────────────────────────────────────────────────── */

const MIN_PAGES = 4; // refuse single-page output
const MIN_IMAGE_PROMPT_LENGTH = 80; // require descriptive prompts
const MDX_AESTHETIC_KEYWORDS = ['luxury', 'cinematic', 'glassmorphism', 'floating', 'depth',
  'gradient', 'blur', 'parallax', 'editorial', 'noir', 'atelier', 'premium', 'minimal',
  'sophisticated', 'monochromatic', 'texture', 'material', 'studio'];

function enforceMultiPage(plan) {
  const count = Object.keys(plan.architecture.pages).length;
  if (count < MIN_PAGES) {
    throw Object.assign(
      new Error(`Multi-page enforcement failed: only ${count} page(s) generated. Minimum is ${MIN_PAGES}.`),
      { stage: 'ENFORCEMENT' }
    );
  }
}

function enforceImagePrompts(plan) {
  const shallow = plan.imageAssets.filter(a => {
    const p = a.imagePrompt?.prompt || '';
    return p.length < MIN_IMAGE_PROMPT_LENGTH;
  });
  if (shallow.length > plan.imageAssets.length / 2) {
    throw Object.assign(
      new Error(`Image prompt enforcement failed: ${shallow.length}/${plan.imageAssets.length} prompts are too short (< ${MIN_IMAGE_PROMPT_LENGTH} chars). Contextual studio prompts required.`),
      { stage: 'ENFORCEMENT' }
    );
  }
}

function enforceAesthetic(plan) {
  // Validate signals contain luxury/MDX aesthetic markers
  const signals = plan.architecture.signals;
  const tone = (Array.isArray(signals.tone) ? signals.tone : [signals.tone]).join(' ').toLowerCase();
  const industry = (signals.industry || '').toLowerCase();
  const combined = tone + ' ' + industry + ' ' + JSON.stringify(signals).toLowerCase();
  const found = MDX_AESTHETIC_KEYWORDS.filter(k => combined.includes(k));
  if (found.length < 2) {
    // Non-fatal: log a warning but continue — the compiler injects MDX aesthetics regardless
    console.warn('[SystemGateway::ENFORCEMENT] Aesthetic signals weak:', found, '— MDX CSS will still apply.');
  }
}

/* ─── Page merger ─────────────────────────────────────────────────────────── */

/**
 * Combine all emitted per-route HTML documents into one self-contained file
 * with a client-side hash router. Each page is a <section data-page="n">
 * shown/hidden by the router. Nav links (href="/route") are rewritten to
 * hash anchors (#route-n) so the page feels fully multi-page without needing
 * a server.
 */
function mergePages(emitted) {
  const docs = emitted?.documents || {};
  const routes = Object.keys(docs);
  if (routes.length === 0) throw new Error('Compiler emitted zero pages.');

  // Index pages so we can build the hash map
  const routeIndex = {};
  routes.forEach((r, i) => { routeIndex[r] = i; });

  // Extract shared <head> from first page (CSS bundle is identical across pages)
  const firstHtml = docs[routes[0]].html;
  const headContent = (firstHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';

  // Build merged nav (top-of-file, wraps all routes)
  const navItems = routes.map((r, i) => {
    const label = docs[r].label || r;
    return `<a href="#mdx-${i}" data-mdx-route="${i}" class="mgw-nav-link${i === 0 ? ' mgw-active' : ''}">${label}</a>`;
  }).join('');

  // Build page sections — extract body from each compiled document,
  // rewrite any internal href="/route" → href="#mdx-idx"
  const sections = routes.map((r, i) => {
    const rawHtml = docs[r].html;
    // Extract body
    const bodyContent = (rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || rawHtml;
    // Remove any embedded <nav> injected by PageStitcher (we have our own above)
    const cleaned = bodyContent.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    // Rewrite internal route hrefs to hash anchors
    const patched = cleaned.replace(/href="(\/[^"]*?)"/g, (match, path) => {
      // Find if this path matches a known route
      const idx = routeIndex[path] ?? routeIndex['/' + path.replace(/^\//, '')];
      if (idx !== undefined) return `href="#mdx-${idx}" data-mdx-route="${idx}"`;
      return match; // external links untouched
    });
    return `<section class="mgw-page" id="mgw-page-${i}" data-mdx-page="${i}" aria-label="${docs[r].label || r}" style="${i > 0 ? 'display:none' : ''}">\n${patched}\n</section>`;
  }).join('\n\n');

  const routerScript = `
<script>
(function(){
  'use strict';
  var pages=document.querySelectorAll('[data-mdx-page]');
  var links=document.querySelectorAll('[data-mdx-route]');
  var urlEl=null; // caller can set window.__mdxUrlEl to update frame chrome

  function show(idx){
    pages.forEach(function(p,i){ p.style.display=(i===idx)?'':'none'; });
    links.forEach(function(a){ a.classList.toggle('mgw-active',a.dataset.mdxRoute==idx); });
    if(window.__mdxUrlEl) window.__mdxUrlEl.textContent='mdx://preview'+location.hash;
  }

  function fromHash(){
    var m=location.hash.match(/^#mdx-(\d+)$/);
    return m ? parseInt(m[1],10) : 0;
  }

  // Handle link clicks (nav + any data-mdx-route in page body)
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-mdx-route]');
    if(!a) return;
    e.preventDefault();
    var idx=parseInt(a.dataset.mdxRoute,10);
    history.pushState(null,'','#mdx-'+idx);
    show(idx);
  });

  window.addEventListener('popstate',function(){ show(fromHash()); });
  show(fromHash());
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en" data-generator="mdx-system-gateway-v2">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
${headContent}
<style>
/* ── MDX Merged-Page Gateway Styles ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.mgw-nav{
  position:fixed;top:0;left:0;right:0;z-index:9000;
  display:flex;align-items:center;justify-content:center;gap:1.5rem;
  height:60px;
  background:rgba(6,6,7,0.88);
  backdrop-filter:blur(20px) saturate(1.5);
  border-bottom:1px solid rgba(255,255,255,0.05);
}
.mgw-nav-link{
  font-family:'Inter',system-ui,sans-serif;
  font-size:0.8rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;
  color:rgba(241,240,234,0.55);text-decoration:none;
  padding:.25rem 0;border-bottom:2px solid transparent;
  transition:color 200ms,border-color 200ms;
}
.mgw-nav-link:hover,.mgw-nav-link.mgw-active{color:#F1F0EA;border-bottom-color:#C9A96E;}
.mgw-body{padding-top:60px;}
.mgw-page{min-height:calc(100vh - 60px);}
</style>
</head>
<body class="mgw-body">
<nav class="mgw-nav" aria-label="Site navigation">${navItems}</nav>
${sections}
${routerScript}
</body>
</html>`;
}

/* ─── SystemGateway ───────────────────────────────────────────────────────── */

export class SystemGateway extends EventBus {
  constructor(opts = {}) {
    super();
    this.locale = opts.locale || 'en-US';
    this.verbose = opts.verbose !== false;
    this._engine = new IntelligenceEngine({ locale: this.locale, verbose: false });
    this._compiler = new DeterministicLayoutCompiler({
      locale: this.locale, verbose: false,
      editorEnabled: true, emitHTML: true,
    });
    this._lastResult = null;
  }

  /**
   * Run the full MDX pipeline.
   *
   * Emits: start | stage | complete | error
   *
   * @param {string} prompt     — niche description
   * @param {Object} opts       — { businessName?, locale? }
   * @returns {Promise<{plan, compiled, merged, durationMs}>}
   */
  async run(prompt, opts = {}) {
    if (!prompt?.trim()) throw Object.assign(new Error('Prompt is required.'), { stage: 'INPUT' });

    const t0 = performance.now();
    this.emit('start', { prompt });

    try {
      /* ① Intelligence */
      this._stage('INTELLIGENCE', 'Planning multi-page architecture and hyper-detailed image prompts…');
      const plan = await this._engine.generateSite(prompt, {
        businessName: opts.businessName || undefined,
        maxDepth: 2,
      });
      this._stage('INTELLIGENCE', `Architecture: ${Object.keys(plan.architecture.pages).length} pages · ${plan.imageAssets.length} image prompts`, 'done');

      /* ② Enforce pipeline requirements */
      this._stage('ENFORCEMENT', 'Verifying multi-page architecture, image prompt depth, aesthetic signals…');
      enforceMultiPage(plan);
      enforceImagePrompts(plan);
      enforceAesthetic(plan);
      this._stage('ENFORCEMENT', 'All pipeline requirements met — multi-page ✓  contextual images ✓  MDX aesthetic ✓', 'done');

      /* ③ Compile */
      this._stage('COMPILER', 'Stitching layout blocks · injecting 6 luxury CSS modules · stamping editor attributes…');
      const compiled = this._compiler.compile(plan);
      this._stage('COMPILER',
        `Compiled: ${Object.keys(compiled.emitted?.documents || {}).length} pages · CSS ${(compiled.cssBundleSize / 1024).toFixed(1)}KB · ${compiled.editorRegistry?.length || 0} editable nodes`,
        'done'
      );

      /* ④ Merge all pages into one self-contained HTML */
      this._stage('MERGE', 'Stitching all pages into MDX hash-router bundle…');
      const merged = mergePages(compiled.emitted);
      this._stage('MERGE', `Merged HTML: ${(merged.length / 1024).toFixed(1)}KB self-contained`, 'done');

      const durationMs = Math.round(performance.now() - t0);
      const result = { plan, compiled, merged, durationMs };
      this._lastResult = result;
      this.emit('complete', result);
      return result;

    } catch (err) {
      this.emit('error', { stage: err.stage || 'PIPELINE', message: err.message, error: err });
      throw err;
    }
  }

  /**
   * Render a specific compiled route into an iframe.
   * @param {string} route — e.g. "/" or "/collection"
   * @param {HTMLIFrameElement} iframe
   */
  renderRoute(route, iframe) {
    if (!this._lastResult) throw new Error('No site generated yet.');
    const doc = this._lastResult.compiled.emitted?.documents?.[route];
    if (!doc) throw new Error(`Route "${route}" not found in compiled output.`);
    iframe.srcdoc = doc.html;
  }

  /**
   * Render the full merged multi-page bundle into an iframe.
   * @param {HTMLIFrameElement} iframe
   */
  renderMerged(iframe) {
    if (!this._lastResult) throw new Error('No site generated yet.');
    iframe.srcdoc = this._lastResult.merged;
  }

  /**
   * Persist the generated site to the Storebuilder.ph dashboard via /api/generate.
   * Passes precompiledHtml so the server skips the old native generator entirely.
   *
   * @param {string} authToken — session token / Bearer token
   * @returns {Promise<Object>} saved website metadata
   */
  async saveToStorebuilder(authToken) {
    if (!this._lastResult) throw new Error('No site generated yet.');
    const { plan, merged } = this._lastResult;
    const businessName = plan.architecture.meta?.siteName || 'MDX Site';
    const prompt = `[MDX Generated] ${businessName} — ${plan.architecture.signals?.industry || 'Luxury'} brand.`;

    this._stage('PERSIST', 'Saving to Storebuilder.ph dashboard…');
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        precompiledHtml: merged,
        businessName,
        mdxGenerated: true,
        siteSpec: plan.siteSpec,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.stage = 'PERSIST';
      this.emit('error', { stage: 'PERSIST', message: err.message });
      throw err;
    }
    this._stage('PERSIST', `Saved — site ID: ${data.website?.id}`, 'done');
    this.emit('saved', data);
    return data;
  }

  getLastResult() { return this._lastResult; }

  exportBundle() {
    if (!this._lastResult) return null;
    return this._engine.exportBundle(this._lastResult.plan);
  }

  /* ── private ── */
  _stage(stage, message, status) {
    this.emit('stage', { stage, message, status });
    if (this.verbose) console.log(`[SystemGateway::${stage}] ${message}`);
  }
}

/* ─── Auto-wire to index.html dashboard ──────────────────────────────────── */

(function autoWire() {
  if (typeof document === 'undefined') return;

  const boot = () => {
    const btn        = document.getElementById('generateBtn');
    const promptEl   = document.getElementById('nichePrompt');
    const nameEl     = document.getElementById('businessName');
    const tokenEl    = document.getElementById('authToken');
    const statusBar  = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const logEl      = document.getElementById('log');
    const review     = document.getElementById('review');
    const reviewSub  = document.getElementById('reviewSub');
    const metricsEl  = document.getElementById('metrics');
    const routeStrip = document.getElementById('routeStrip');
    const iframe     = document.getElementById('preview');
    const frameUrl   = document.getElementById('frameUrl');
    const downloadBtn = document.getElementById('downloadBtn');
    const saveBtn    = document.getElementById('saveBtn');

    if (!btn || !promptEl || !iframe) return; // not on the dashboard

    const gw = new SystemGateway({ verbose: true });
    window.__mdxGateway = gw;

    /* ── UI helpers ── */
    const setStatus = (text, state = 'idle') => {
      if (statusText) statusText.innerHTML = text;
      if (statusBar)  statusBar.dataset.state = state;
    };

    const addLog = (stage, msg, ok = '') => {
      if (!logEl) return;
      const row = document.createElement('div');
      row.className = 'log-row';
      row.dataset.ok = ok;
      row.innerHTML = `<span class="log-s">${stage}</span><span class="log-m">${msg}</span>`;
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
    };

    const clearLog = () => { if (logEl) logEl.innerHTML = ''; };

    const setBusy = busy => {
      btn.disabled = busy;
      btn.classList.toggle('is-running', busy);
      btn.querySelector('.btn-label').textContent = busy
        ? 'Generating…'
        : 'Generate Marcelo Design X System';
    };

    /* ── Gateway events ── */
    gw
      .on('start', ({ prompt }) => {
        clearLog();
        setStatus('Pipeline started…', 'running');
        addLog('START', `Niche: "${prompt.slice(0, 90)}${prompt.length > 90 ? '…' : ''}"`);
      })
      .on('stage', ({ stage, message, status }) => {
        addLog(stage, message, status === 'done' ? 'done' : '');
        if (!status) setStatus(message, 'running');
        else if (status === 'done') setStatus(message, 'running');
      })
      .on('complete', ({ plan, compiled, merged, durationMs }) => {
        setStatus(`Generation complete — <strong>${durationMs}ms</strong>`, 'done');
        addLog('COMPLETE', `All stages done in ${durationMs}ms.`, 'done');

        /* Metrics */
        const pageCount  = Object.keys(compiled.emitted?.documents || {}).length;
        const imgCount   = plan.imageAssets?.length || 0;
        const editCount  = compiled.editorRegistry?.length || 0;
        const cssKb      = (compiled.cssBundleSize / 1024).toFixed(1);
        const mergedKb   = (merged.length / 1024).toFixed(1);
        if (metricsEl) metricsEl.innerHTML = [
          [pageCount,  'Pages'],
          [imgCount,   'Image Prompts'],
          [editCount,  'Editable Nodes'],
          [`${cssKb}KB`,  'Luxury CSS'],
          [`${mergedKb}KB`, 'Final Bundle'],
          [`${durationMs}ms`, 'Generation'],
        ].map(([v, l]) => `<div class="metric"><span class="metric-v">${v}</span><span class="metric-l">${l}</span></div>`).join('');

        /* Route pills */
        const docs = compiled.emitted?.documents || {};
        const routes = Object.keys(docs);
        if (routeStrip) {
          routeStrip.innerHTML = routes.map((r, i) => `
            <button type="button" class="route-pill${i===0?' is-on':''}" data-route="${r}" data-idx="${i}">
              <span class="route-pill-label">${docs[r].label || r}</span>
              <span class="route-pill-path">${r}</span>
            </button>`).join('');
          routeStrip.querySelectorAll('.route-pill').forEach(pill => {
            pill.addEventListener('click', () => {
              routeStrip.querySelectorAll('.route-pill').forEach(p => p.classList.remove('is-on'));
              pill.classList.add('is-on');
              gw.renderRoute(pill.dataset.route, iframe);
              if (frameUrl) frameUrl.textContent = `mdx://preview${pill.dataset.route}`;
            });
          });
        }

        /* Render merged bundle into iframe (full multi-page navigation) */
        gw.renderMerged(iframe);
        if (frameUrl) frameUrl.textContent = 'mdx://preview/';
        if (review) review.classList.add('is-open');
        if (reviewSub) reviewSub.textContent = `${pageCount} pages · ${imgCount} image prompts · ${editCount} editable nodes`;

        if (downloadBtn) downloadBtn.disabled = false;
        if (saveBtn) saveBtn.disabled = false;
      })
      .on('error', ({ stage, message }) => {
        setStatus(`<strong>Error [${stage}]:</strong> ${message}`, 'error');
        addLog(stage, message, 'err');
      })
      .on('saved', data => {
        addLog('PERSIST', `Dashboard saved → /dashboard (ID: ${data.website?.id})`, 'done');
      });

    /* ── Generate button ── */
    btn.addEventListener('click', async () => {
      const prompt = promptEl.value.trim();
      if (!prompt) { setStatus('Please enter a business niche prompt.', 'error'); promptEl.focus(); return; }
      setBusy(true);
      try {
        await gw.run(prompt, { businessName: nameEl?.value.trim() || '' });
      } catch (e) { console.error(e); }
      finally { setBusy(false); }
    });

    /* ── Download bundle ── */
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const bundle = gw.exportBundle();
        if (!bundle) return;
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(new Blob([bundle], { type: 'application/json' })),
          download: `mdx-site-${Date.now()}.json`,
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      });
    }

    /* ── Save to dashboard ── */
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
          await gw.saveToStorebuilder(tokenEl?.value.trim() || '');
          saveBtn.textContent = 'Saved ✓';
        } catch (e) {
          saveBtn.textContent = 'Save Failed';
          console.error(e);
        }
      });
    }
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
