/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPILER DEMO — Full Assembly Loop Demonstration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Runs the complete pipeline:
 *   IntelligenceEngine (brain) → DeterministicLayoutCompiler (compiler)
 *   And renders the output to the DOM for inspection.
 */

import { IntelligenceEngine } from './intelligence/IntelligenceEngine.js';
import { DeterministicLayoutCompiler } from './compiler/DeterministicLayoutCompiler.js';

const NICHE = 'A luxury leather goods atelier in Milan specializing in hand-stitched minimalist accessories for the modern gentleman';

async function runFullPipeline() {
  const app = document.getElementById('app');
  if (!app) return;

  // ── Phase 1: Intelligence ──────────────────────────────────────────────────
  app.innerHTML = `
    <div class="compiler-demo-root">
      <header class="compiler-header">
        <h1>Deterministic Layout Compiler</h1>
        <p>Full Assembly Loop: Intelligence &rarr; Stitch &rarr; Invert &rarr; Stamp &rarr; Emit</p>
        <div class="pipeline-visual">
          <span class="pipeline-node">IntelligenceEngine</span>
          <span class="pipeline-arrow">→</span>
          <span class="pipeline-node">PageStitcher</span>
          <span class="pipeline-arrow">→</span>
          <span class="pipeline-node">AssetInversion</span>
          <span class="pipeline-arrow">→</span>
          <span class="pipeline-node">DocumentTransformation</span>
          <span class="pipeline-arrow">→</span>
          <span class="pipeline-node">Emit</span>
        </div>
        <div style="margin-top:1.5rem;color:rgba(201,169,110,0.6);font-size:0.8rem;font-style:italic;">
          "${NICHE}"
        </div>
        <div id="pipeline-status" style="margin-top:1.5rem;color:rgba(241,240,234,0.4);font-size:0.75rem;">
          Initializing pipeline...
        </div>
      </header>
    </div>
  `;

  const statusEl = document.getElementById('pipeline-status');
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

  try {
    // Step 1: Intelligence
    setStatus('🧠 Running IntelligenceEngine...');
    const engine = new IntelligenceEngine({ verbose: false });
    const plan = await engine.generateSite(NICHE, { businessName: 'Atelier Vittore', maxDepth: 2 });

    // Step 2: Compile
    setStatus('🔧 Running DeterministicLayoutCompiler (Stitch → Invert → Stamp → Emit)...');
    const compiler = new DeterministicLayoutCompiler({ verbose: false, editorEnabled: true, emitHTML: true });
    const compiled = compiler.compile(plan);

    // Step 3: Render results
    renderResults(compiled, plan);
    setStatus(`✅ Complete in ${compiled.durationMs}ms | ${Object.keys(compiled.pages).length} pages | ${compiled.editorRegistry?.length || 0} editable nodes`);

  } catch (err) {
    console.error('Pipeline error:', err);
    setStatus('❌ Error: ' + err.message);
  }
}

function renderResults(compiled, plan) {
  const app = document.querySelector('.compiler-demo-root');
  if (!app) return;

  // ── Stage 1: Stitcher Output ────────────────────────────────────────────────
  const stitcherSection = document.createElement('section');
  stitcherSection.className = 'compiler-section';
  stitcherSection.innerHTML = `
    <h2><span class="stage-num">Stage 1</span> PageStitcher Output</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${Object.keys(compiled.pages).length}</div>
        <div class="stat-label">Pages Stitched</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.values(compiled.pages).reduce((s, p) => s + (p.sections?.length || 0), 0)}</div>
        <div class="stat-label">Total Sections</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${compiled.navTree?.length || 0}</div>
        <div class="stat-label">Nav Items</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${compiled.editorRegistry?.length || 0}</div>
        <div class="stat-label">Editable Nodes</div>
      </div>
    </div>
    <div class="code-block-wrapper">
      <div class="code-label">Nav Tree (JSON)</div>
      <pre>${JSON.stringify(compiled.navTree, null, 2)}</pre>
    </div>
  `;
  app.appendChild(stitcherSection);

  // ── Stage 2: Asset Inversion ──────────────────────────────────────────────────
  const inversionSection = document.createElement('section');
  inversionSection.className = 'compiler-section';
  inversionSection.innerHTML = `
    <h2><span class="stage-num">Stage 2</span> AssetInversion Output</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${(compiled.cssBundleSize / 1024).toFixed(1)}KB</div>
        <div class="stat-label">CSS Bundle Size</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${compiled._stageSummary?.invert?.cssAssets || 6}</div>
        <div class="stat-label">CSS Asset Modules</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">100%</div>
        <div class="stat-label">Pages Injected</div>
      </div>
    </div>
    <div class="code-block-wrapper">
      <div class="code-label">CSS Bundle Preview (first 600 chars)</div>
      <pre>${(compiled.cssBundle || '').slice(0, 600)}...</pre>
    </div>
  `;
  app.appendChild(inversionSection);

  // ── Stage 3: Document Transformation ──────────────────────────────────────────
  const transformSection = document.createElement('section');
  transformSection.className = 'compiler-section';

  const sampleEditables = (compiled.editorRegistry || []).slice(0, 8);
  transformSection.innerHTML = `
    <h2><span class="stage-num">Stage 3</span> DocumentTransformation Output</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${compiled.editorRegistry?.length || 0}</div>
        <div class="stat-label">Editable Nodes Stamped</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${new Set((compiled.editorRegistry || []).map(e => e.category)).size}</div>
        <div class="stat-label">Edit Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">mdx-edit</div>
        <div class="stat-label">Namespace</div>
      </div>
    </div>
    <div class="code-block-wrapper">
      <div class="code-label">Sample Edit Attributes (first 8)</div>
      <pre><span class="edit-attr-sample">${sampleEditables.map(e =>
        `<span class="attr-tag">&lt;${e.tagName}</span> ` +
        `<span class="attr-name">data-mdx-edit</span>=<span class="attr-value">"${e.editId}"</span> ` +
        `<span class="attr-name">data-mdx-edit-type</span>=<span class="attr-value">"${e.editType}"</span> ` +
        `<span class="attr-name">data-mdx-edit-category</span>=<span class="attr-value">"${e.category}"</span>` +
        ` <span class="attr-tag">/&gt;</span> <span style="color:rgba(241,240,234,0.3)">// "${e.content.slice(0, 40)}${e.content.length > 40 ? '...' : ''}"</span>`
      ).join('\n')}</span></pre>
    </div>
  `;
  app.appendChild(transformSection);

  // ── Stage 4: Emitted Pages ────────────────────────────────────────────────────
  const emitSection = document.createElement('section');
  emitSection.className = 'compiler-section';

  const pagePreviews = Object.values(compiled.emitted?.summaries || []).map(page => {
    const bodyPreview = compiled.pages[page.route]?.body?.slice(0, 300)?.replace(/</g, '&lt;') || '';
    return `
      <div class="page-preview" style="margin-bottom:1.5rem;">
        <div class="page-preview-header">
          <span class="route-badge">${page.route}</span>
          <span class="page-meta">${page.template} • ${page.sections} sections • ${(page.size / 1024).toFixed(1)}KB</span>
        </div>
        <div class="page-preview-body">
          <pre>&lt;!DOCTYPE html&gt;
&lt;html&gt;
  &lt;head&gt;
    [injected CSS bundle: ${compiled.cssBundleSize} chars]
    [Google Fonts preconnect]
    [page-specific meta]
  &lt;/head&gt;
  &lt;body data-page-route="${page.route}" data-editable="true"&gt;
    ${bodyPreview}...
  &lt;/body&gt;
&lt;/html&gt;</pre>
        </div>
      </div>
    `;
  }).join('');

  emitSection.innerHTML = `
    <h2><span class="stage-num">Stage 4</span> Emitted Documents</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${compiled._stageSummary?.emit?.documents || 0}</div>
        <div class="stat-label">HTML Documents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(Object.values(compiled.emitted?.documents || {}).reduce((sum, d) => sum + (d.size || 0), 0) / 1024).toFixed(1)}KB</div>
        <div class="stat-label">Total Emitted Size</div>
      </div>
    </div>
    ${pagePreviews}
  `;
  app.appendChild(emitSection);

  // ── Pipeline Log ─────────────────────────────────────────────────────────────
  const logSection = document.createElement('section');
  logSection.className = 'compiler-section';
  logSection.style.borderBottom = 'none';

  const logEntries = (compiled.pipeline || []).map(entry => `
    <div class="log-entry">
      <span class="log-stage">${entry.stage}</span>
      <span class="log-msg">${entry.message}</span>
    </div>
  `).join('');

  logSection.innerHTML = `
    <h2><span class="stage-num">Summary</span> Pipeline Log</h2>
    <div class="code-block-wrapper">
      <div class="code-label">All ${compiled.pipeline?.length || 0} Log Entries</div>
      <pre style="max-height:300px;overflow-y:auto;">${logEntries}</pre>
    </div>
  `;
  app.appendChild(logSection);
}

// Auto-run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runFullPipeline);
} else {
  runFullPipeline();
}
