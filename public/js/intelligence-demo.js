/**
 * Intelligence Demo — Full Pipeline Demonstration
 * Shows the engine generating a complete luxury site from a niche prompt.
 */

import { IntelligenceEngine } from './intelligence/IntelligenceEngine.js';

const engine = new IntelligenceEngine({ verbose: true });

const NICHE = 'A luxury leather goods atelier in Milan specializing in hand-stitched minimalist accessories for the modern gentleman';

async function runDemo() {
  console.group('🔮 MDX Intelligence Engine — Full Pipeline Demo');
  console.time('Total Generation Time');

  const result = await engine.generateSite(NICHE, {
    businessName: 'Atelier Vittore',
    maxDepth: 2
  });

  console.timeEnd('Total Generation Time');

  // Display architecture
  console.group('📐 Site Architecture');
  console.table(Object.values(result.architecture.pages).map(p => ({
    route: p.route,
    label: p.label,
    template: p.template,
    sections: p.sections.length,
    purpose: p.purpose
  })));
  console.groupEnd();

  // Display nav tree
  console.group('🧭 Navigation Tree');
  console.log(result.architecture.navTree);
  console.groupEnd();

  // Display signals
  console.group('🔍 Extracted Signals');
  console.log(result.architecture.signals);
  console.groupEnd();

  // Display image prompts
  console.group('🖼️ Image Prompts (sample)');
  result.imageAssets.slice(0, 3).forEach((asset, i) => {
    console.group(`${asset.pageLabel} → ${asset.sectionName} (${asset.type})`);
    console.log('Prompt:', asset.imagePrompt?.prompt?.slice(0, 120) + '...');
    console.log('Negative:', asset.negativePrompt?.slice(0, 80) + '...');
    console.groupEnd();
  });
  console.groupEnd();

  // Display site spec
  console.group('📋 Site Specification');
  console.log(JSON.stringify(result.siteSpec, null, 2));
  console.groupEnd();

  // Display pipeline log
  console.group('⏱️ Pipeline Stages');
  result.pipeline.forEach(stage => {
    console.log(`[${stage.stage}] ${stage.message}`);
  });
  console.groupEnd();

  console.groupEnd();

  // Render to DOM
  renderDemo(result);
}

function renderDemo(result) {
  const app = document.getElementById('app');
  if (!app) return;

  const { architecture, imageAssets, siteSpec } = result;

  app.innerHTML = `
    <div class="intelligence-demo">
      <header class="demo-header">
        <div class="demo-badge">MDX Intelligence Engine</div>
        <h1>Generated Site: <em>${siteSpec?.siteName || 'Atelier Vittore'}</em></h1>
        <p class="demo-niche">"${NICHE}"</p>
        <div class="demo-meta">
          <span>${Object.keys(architecture.pages).length} pages</span>
          <span>${imageAssets.length} image assets</span>
          <span>${siteSpec?._metrics?.wordCount || '?'} words</span>
          <span>${result.durationMs}ms generation</span>
        </div>
      </header>

      <section class="demo-section">
        <h2>📐 Page Architecture</h2>
        <div class="page-map">
          ${Object.values(architecture.pages).map(page => `
            <div class="page-card">
              <div class="page-route">${page.route}</div>
              <h3>${page.label}</h3>
              <p>${page.purpose}</p>
              <div class="page-sections">
                ${page.sections.map(s => `<span class="section-tag">${s.name}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="demo-section">
        <h2>🔍 Extracted Signals</h2>
        <pre class="code-block">${JSON.stringify(architecture.signals, null, 2)}</pre>
      </section>

      <section class="demo-section">
        <h2>🖼️ Image Prompts</h2>
        <div class="prompt-grid">
          ${imageAssets.slice(0, 4).map(asset => `
            <div class="prompt-card">
              <div class="prompt-header">
                <span class="prompt-page">${asset.pageLabel}</span>
                <span class="prompt-type">${asset.type}</span>
              </div>
              <div class="prompt-context">${asset.sectionName}</div>
              <div class="prompt-text">${asset.imagePrompt?.prompt || 'N/A'}</div>
              <div class="prompt-meta">
                <span>${asset.promptMetadata?.estimatedCharCount || 0} chars</span>
                <span>${asset.promptMetadata?.shotType}</span>
                <span>${asset.promptMetadata?.lightingStyle}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="demo-section">
        <h2>📋 Strict JSON Site Spec</h2>
        <pre class="code-block">${JSON.stringify(siteSpec, null, 2)}</pre>
      </section>

      <section class="demo-section">
        <h2>⏱️ Pipeline Log</h2>
        <div class="pipeline-log">
          ${result.pipeline.map(stage => `
            <div class="pipeline-stage">
              <span class="stage-name">${stage.stage}</span>
              <span class="stage-msg">${stage.message}</span>
              <span class="stage-time">${new Date(stage.timestamp).toLocaleTimeString()}</span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

// Auto-run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDemo);
} else {
  runDemo();
}
