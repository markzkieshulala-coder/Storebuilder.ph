/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GATEWAY DASHBOARD DEMO — Full Request→Pipeline→Persist→Response Cycle
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interactive dashboard UI that demonstrates the complete gateway flow:
 *   Form input → ApiGatewayController → IntelligenceEngine →
 *   DeterministicLayoutCompiler → DatabaseSerializer → Dashboard response
 *
 * Shows error handling, diagnostic reporting, and real-time status updates.
 */

import { GatewayConnector } from './gateway/GatewayConnector.js';

const connector = new GatewayConnector({
  verbose: true,
  maxRequestsPerWindow: 20,
  maxSites: 50
});

// Subscribe to events
const events = [];
connector.on('generation:start', (data) => {
  events.push({ time: Date.now(), name: 'generation:start', data });
});
connector.on('generation:complete', (data) => {
  events.push({ time: Date.now(), name: 'generation:complete', data });
});
connector.on('generation:error', (data) => {
  events.push({ time: Date.now(), name: 'generation:error', data });
});
connector.on('dashboard:siteLoaded', (data) => {
  events.push({ time: Date.now(), name: 'dashboard:siteLoaded', data });
});
connector.on('state:changed', (data) => {
  events.push({ time: Date.now(), name: 'state:changed', data });
});

function renderDashboard() {
  const app = document.getElementById('app');
  if (!app) return;

  const health = connector.health();

  app.innerHTML = `
    <div class="gateway-root">
      <header class="gateway-header">
        <h1>Gateway Connector</h1>
        <p>Dashboard Integration Layer — Full request→pipeline→persist→response cycle</p>
        <div class="status-bar">
          <span class="status-dot ${health.exceptions.critical > 0 ? 'error' : health.exceptions.total > 5 ? 'warn' : ''}"></span>
          <span>System ${health.status}</span>
          <span style="color:rgba(241,240,234,0.2)">|</span>
          <span>${health.storage.sites} sites stored</span>
          <span style="color:rgba(241,240,234,0.2)">|</span>
          <span>Quota ${health.storage.quotaUsed}</span>
        </div>
      </header>

      <section class="generator-panel">
        <form class="generator-form" id="genForm">
          <div class="form-group">
            <label class="form-label">Business Niche Description *</label>
            <textarea
              class="form-input form-input--textarea"
              id="nichePrompt"
              placeholder="Describe your business: e.g., 'A luxury leather goods atelier in Milan specializing in hand-stitched minimalist accessories...'"
            >A luxury leather goods atelier in Milan specializing in hand-stitched minimalist accessories for the modern gentleman</textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand Name (optional)</label>
              <input type="text" class="form-input" id="businessName" placeholder="e.g., Atelier Vittore" value="Atelier Vittore">
            </div>
            <div class="form-group">
              <label class="form-label">Locale</label>
              <select class="form-input" id="locale" style="cursor:pointer;">
                <option value="en-US" selected>English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="it-IT">Italiano</option>
                <option value="es-ES">Español</option>
                <option value="ja-JP">日本語</option>
                <option value="zh-CN">中文</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Generation Timeout (ms)</label>
              <input type="number" class="form-input" id="timeout" value="30000" min="5000" max="120000" step="1000">
            </div>
            <div class="form-group">
              <label class="form-label">Max Navigation Depth</label>
              <select class="form-input" id="maxDepth" style="cursor:pointer;">
                <option value="1">1 (Flat)</option>
                <option value="2" selected>2 (Standard)</option>
                <option value="3">3 (Deep)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="emitHTML" checked>
                <span>Emit standalone HTML documents</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="editorEnabled" checked>
                <span>Enable inline editing stamps</span>
              </label>
            </div>
          </div>

          <button type="submit" class="generate-btn" id="generateBtn">
            <span class="btn-text">Generate Complete Site</span>
          </button>
        </form>
      </section>

      <section class="results-panel" id="resultsPanel">
        <!-- Results injected here -->
      </section>

      <section class="error-panel" id="errorPanel">
        <!-- Errors injected here -->
      </section>

      <section class="event-log">
        <h2>Event Log</h2>
        <div class="event-list" id="eventList">
          ${renderEvents()}
        </div>
      </section>
    </div>
  `;

  // Bind form submit
  document.getElementById('genForm').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('generateBtn');
  const originalText = btn.querySelector('.btn-text').textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Generating...</span>';

  const request = {
    nichePrompt: document.getElementById('nichePrompt').value.trim(),
    businessName: document.getElementById('businessName').value.trim() || undefined,
    locale: document.getElementById('locale').value,
    timeoutMs: parseInt(document.getElementById('timeout').value),
    overrides: {
      maxDepth: parseInt(document.getElementById('maxDepth').value)
    },
    emitHTML: document.getElementById('emitHTML').checked,
    editorEnabled: document.getElementById('editorEnabled').checked
  };

  try {
    const result = await connector.generateSite(request, 'dashboard-session');
    renderResult(result);
    renderEvents();
  } catch (err) {
    console.error('Unexpected error:', err);
    renderError({
      ok: false,
      error: { code: 'UNEXPECTED', message: err.message },
      diagnostics: { errors: [{ code: 'UNEXPECTED', message: err.message, severity: 'critical' }] },
      safeToRetry: true
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-text">${originalText}</span>`;
  }
}

function renderResult(result) {
  const resultsPanel = document.getElementById('resultsPanel');
  const errorPanel = document.getElementById('errorPanel');
  if (!resultsPanel || !errorPanel) return;

  errorPanel.classList.remove('active');

  if (!result.ok) {
    renderError(result);
    return;
  }

  const { siteId, site, dashboard, diagnostics, meta } = result;
  const pages = Object.values(site?.pages || {});

  resultsPanel.classList.add('active');
  resultsPanel.innerHTML = `
    <div class="result-card">
      <h2><span class="icon">✅</span> Generation Successful</h2>
      <div class="stats-row">
        <div class="stat-chip">
          <div class="value">${dashboard?.stats?.pages || pages.length}</div>
          <div class="label">Pages Generated</div>
        </div>
        <div class="stat-chip">
          <div class="value">${dashboard?.stats?.editableNodes || 0}</div>
          <div class="label">Editable Nodes</div>
        </div>
        <div class="stat-chip">
          <div class="value">${((dashboard?.stats?.cssBundleSize || 0) / 1024).toFixed(1)}K</div>
          <div class="label">CSS Bundle</div>
        </div>
        <div class="stat-chip">
          <div class="value">${meta?.durationMs || 0}ms</div>
          <div class="label">Generation Time</div>
        </div>
        <div class="stat-chip">
          <div class="value">${((dashboard?.stats?.persistedSize || 0) / 1024).toFixed(1)}K</div>
          <div class="label">Persisted Size</div>
        </div>
      </div>
      <div class="page-list">
        ${pages.map(p => `
          <div class="page-item">
            <div class="page-item-left">
              <span class="page-route-badge">${p.route}</span>
              <span class="page-label">${p.title || p.label}</span>
              <span class="page-meta">${p.template} • ${p.sections?.length || 0} sections</span>
            </div>
            <div class="page-actions">
              <button class="page-action-btn" onclick="previewPage('${siteId}', '${p.route}')">Preview</button>
              <button class="page-action-btn" onclick="editPage('${siteId}', '${p.route}')">Edit</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="result-card">
      <h2><span class="icon">🔗</span> Navigation Structure</h2>
      <div class="page-list">
        ${(dashboard?.navTree || []).map(item => `
          <div class="page-item">
            <div class="page-item-left">
              <span class="page-route-badge">${item.route}</span>
              <span class="page-label">${item.label}</span>
              ${item.children?.length ? `<span class="page-meta">${item.children.length} child route(s)</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="result-card">
      <h2><span class="icon">🎨</span> Style Profile</h2>
      <div class="stats-row">
        ${Object.entries(dashboard?.site?.colors || {}).map(([name, value]) => `
          <div class="stat-chip">
            <div style="width:32px;height:32px;border-radius:50%;background:${value};margin:0 auto 0.5rem;border:1px solid rgba(241,240,234,0.1);"></div>
            <div class="value" style="font-size:0.9rem;font-family:monospace;">${value}</div>
            <div class="label">${name}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${dashboard?.editor?.enabled ? `
    <div class="result-card">
      <h2><span class="icon">✏️</span> Inline Editor Registry (First 10)</h2>
      <div class="page-list">
        ${(dashboard?.editor?.nodes || []).slice(0, 10).map(node => `
          <div class="page-item">
            <div class="page-item-left">
              <span class="page-route-badge" style="font-size:0.65rem;background:rgba(201,169,110,0.08);">${node.type}</span>
              <span class="page-label" style="font-size:0.8rem;">${node.preview}</span>
              <span class="page-meta">${node.category} • ${node.path}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="result-card">
      <h2><span class="icon">📊</span> Pipeline Diagnostics</h2>
      <div class="diagnostic-block">
        <h4>Completed Stages</h4>
        ${(diagnostics?.stages || []).map(s => `
          <div class="diagnostic-entry">
            <span class="diag-sev" style="background:rgba(74,222,128,0.15);color:#4ADE80;">✓</span>
            <span class="diag-code">${s}</span>
            <span class="diag-msg">Completed</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:1rem;color:rgba(241,240,234,0.4);font-size:0.8rem;">
        <strong>Site ID:</strong> <code style="font-family:monospace;color:#C9A96E;">${siteId}</code>
        <span style="margin:0 1rem;">|</span>
        <strong>Request ID:</strong> <code style="font-family:monospace;">${meta?.requestId || 'N/A'}</code>
        <span style="margin:0 1rem;">|</span>
        <strong>Generated:</strong> ${new Date(meta?.generatedAt).toLocaleString()}
      </div>
    </div>
  `;

  // Scroll to results
  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderError(result) {
  const errorPanel = document.getElementById('errorPanel');
  const resultsPanel = document.getElementById('resultsPanel');
  if (!errorPanel || !resultsPanel) return;

  resultsPanel.classList.remove('active');
  errorPanel.classList.add('active');

  const error = result.error || {};
  const diagnostics = result.diagnostics || {};

  errorPanel.innerHTML = `
    <div class="error-card">
      <h2>❌ Generation Failed</h2>
      <span class="error-code">${error.code || 'UNKNOWN'}</span>
      <p style="color:rgba(241,240,234,0.7);line-height:1.6;">${error.message || 'An unexpected error occurred.'}</p>

      ${error.recoverySuggestion ? `
      <div class="error-recovery">
        <strong>Recovery Suggestion:</strong> ${error.recoverySuggestion}
      </div>
      ` : ''}

      ${diagnostics.errors?.length ? `
      <div class="diagnostic-block">
        <h4>Diagnostic Details</h4>
        ${diagnostics.errors.map(e => `
          <div class="diagnostic-entry">
            <span class="diag-sev ${e.severity}">${e.severity}</span>
            <span class="diag-code">${e.code || 'ERROR'}</span>
            <span class="diag-msg">${e.message}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${result.safeToRetry !== undefined ? `
      <div style="margin-top:1.5rem;padding:1rem;background:#1A1A1C;border-radius:4px;">
        <span style="color:${result.safeToRetry ? '#4ADE80' : '#F87171'};font-weight:600;">
          ${result.safeToRetry ? '✓ Safe to retry' : '✗ Do not retry automatically'}
        </span>
      </div>
      ` : ''}
    </div>
  `;
}

function renderEvents() {
  const eventList = document.getElementById('eventList');
  if (!eventList) return '';

  const recentEvents = [...events].reverse().slice(0, 50);
  eventList.innerHTML = recentEvents.map(ev => {
    const time = new Date(ev.time).toLocaleTimeString();
    const dataSummary = ev.data ? JSON.stringify(ev.data).slice(0, 80) + '...' : '';
    return `
      <div class="event-item">
        <span class="event-time">${time}</span>
        <span class="event-name">${ev.name}</span>
        <span class="event-data">${dataSummary}</span>
      </div>
    `;
  }).join('') || '<div class="event-item"><span class="event-data">No events yet. Submit the form to start generation.</span></div>';
}

// Expose for inline onclick handlers
window.previewPage = (siteId, route) => {
  const html = connector.getPagePreview(siteId, route);
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

window.editPage = (siteId, route) => {
  const page = connector.loadPage(siteId, route);
  if (page.ok) {
    console.log('Edit page:', page);
    alert(`Edit mode activated for ${route}\n\nEditable nodes: ${page.editableNodes?.length || 0}\nContent blocks: ${page.contentBlocks?.length || 0}`);
  }
};

// Render dashboard on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderDashboard);
} else {
  renderDashboard();
}
