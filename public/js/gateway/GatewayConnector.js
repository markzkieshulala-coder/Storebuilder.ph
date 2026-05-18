/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GATEWAY CONNECTOR — Dashboard UI Orchestrator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wires ApiGatewayController → DatabaseSerializer into a unified interface
 * for the user dashboard UI. Handles the complete request→pipeline→persist→
 * response cycle with exception handling throughout.
 *
 * @module GatewayConnector
 * @author MDX Gateway Routing Layer
 */

import { ApiGatewayController } from './ApiGatewayController.js';
import { DatabaseSerializer } from './DatabaseSerializer.js';
import { ExceptionHandler } from './ExceptionHandler.js';

export class GatewayConnector {
  constructor(opts = {}) {
    this.api = new ApiGatewayController({
      maxNicheLength: opts.maxNicheLength || 500,
      maxRequestsPerWindow: opts.maxRequestsPerWindow || 10,
      defaultTimeout: opts.defaultTimeout || 30000,
      verbose: opts.verbose !== false
    });

    this.db = new DatabaseSerializer({
      storageKey: opts.storageKey || 'mdx_sites_v1',
      maxSites: opts.maxSites || 50,
      compression: opts.compression !== false
    });

    this.exceptions = new ExceptionHandler({
      verbose: opts.verbose !== false,
      circuitThreshold: opts.circuitThreshold || 5
    });

    this._dashboardState = {
      currentSite: null,
      currentPage: null,
      editorMode: false,
      generationInProgress: false
    };

    this._listeners = new Map(); // eventName → callback[]
  }

  /* ── PUBLIC API: GENERATION ───────────────────────────────────────────────── */

  /**
   * Main dashboard entry: generate a complete site from a niche prompt.
   * Full cycle: receive → sanitize → pipeline → persist → dashboard-ready response.
   *
   * @param {Object} request — dashboard form data
   *   @param {string} request.nichePrompt — business description (required)
   *   @param {string} [request.businessName] — brand name override
   *   @param {string} [request.locale] — 'en-US' | 'en-GB' | 'fr-FR' | etc.
   *   @param {Object} [request.overrides] — manual signal overrides
   *   @param {boolean} [request.emitHTML] — emit standalone HTML (default true)
   *   @param {boolean} [request.editorEnabled] — enable inline edit stamps (default true)
   * @param {string} [clientId] — dashboard session identifier
   * @returns {Promise<Object>} { ok, siteId, site, dashboard, diagnostics, meta }
   */
  async generateSite(request = {}, clientId = 'dashboard') {
    const startTime = performance.now();
    this._setState({ generationInProgress: true });
    this._emit('generation:start', { request, clientId });

    try {
      // ── Step 1: API Gateway ─────────────────────────────────────────────────
      const gatewayRequest = {
        ...request,
        clientId,
        emitHTML: request.emitHTML !== false,
        editorEnabled: request.editorEnabled !== false
      };

      const apiResponse = await this.api.generate(gatewayRequest);

      if (!apiResponse.ok) {
        this._emit('generation:error', { error: apiResponse.error, diagnostics: apiResponse.diagnostics });
        this._setState({ generationInProgress: false });
        return {
          ok: false,
          error: apiResponse.error,
          diagnostics: apiResponse.diagnostics,
          meta: apiResponse.meta
        };
      }

      // ── Step 2: Persist to Database ─────────────────────────────────────────
      this._emit('generation:persist', { siteId: null, stage: 'saving' });

      const dbResult = this.db.saveSite(apiResponse.site, {
        requestId: apiResponse.requestId,
        nichePrompt: request.nichePrompt,
        businessName: request.businessName || apiResponse.meta?.businessName,
        locale: apiResponse.meta?.locale || 'en-US',
        durationMs: apiResponse.meta?.durationMs || 0
      });

      if (!dbResult.ok) {
        this._emit('generation:error', { error: { code: dbResult.error, message: dbResult.message } });
        this._setState({ generationInProgress: false });
        return {
          ok: false,
          error: { code: dbResult.error, message: dbResult.message },
          diagnostics: { stage: 'persist', dbResult },
          meta: apiResponse.meta
        };
      }

      // ── Step 3: Build Dashboard Response ──────────────────────────────────
      const siteId = dbResult.siteId;
      this._setState({ currentSite: siteId, generationInProgress: false });

      const dashboardPayload = this._buildDashboardPayload(apiResponse, siteId, dbResult);

      this._emit('generation:complete', {
        siteId,
        durationMs: apiResponse.meta?.durationMs,
        pages: Object.keys(apiResponse.site?.pages || {}).length
      });

      return {
        ok: true,
        siteId,
        site: apiResponse.site,
        dashboard: dashboardPayload,
        diagnostics: apiResponse.diagnostics,
        meta: {
          ...apiResponse.meta,
          persistedSize: dbResult.size,
          siteId
        }
      };

    } catch (err) {
      const handled = this.exceptions.handle(err, {
        requestId: 'dashboard-' + Date.now(),
        context: 'GatewayConnector.generateSite',
        inputs: { nichePrompt: request.nichePrompt?.slice(0, 100) }
      });

      this._emit('generation:error', {
        error: { code: handled.errorCode, message: handled.diagnostics.errorMessage },
        recoverySuggestion: handled.recoverySuggestion
      });

      this._setState({ generationInProgress: false });

      return {
        ok: false,
        error: {
          code: handled.errorCode,
          message: handled.diagnostics.errorMessage,
          recoverySuggestion: handled.recoverySuggestion
        },
        diagnostics: handled.diagnostics,
        safeToRetry: handled.safeToRetry
      };
    }
  }

  /**
   * Quick health check for dashboard status bar.
   */
  health() {
    const apiHealth = this.api.health();
    const dbStats = this.db.getStats();
    const exceptionStats = this.exceptions.getStats();

    return {
      ok: apiHealth.ok,
      status: 'operational',
      api: apiHealth,
      storage: {
        sites: dbStats.totalSites,
        totalSize: dbStats.totalSize,
        quotaUsed: `${Math.round((dbStats.totalSize / (5 * 1024 * 1024)) * 100)}%`
      },
      exceptions: {
        total: exceptionStats.total,
        critical: exceptionStats.bySeverity.critical || 0
      },
      circuits: this.exceptions.getCircuitStates()
    };
  }

  /* ── PUBLIC API: DASHBOARD OPERATIONS ───────────────────────────────────────── */

  /**
   * Load a site into the dashboard.
   * @param {string} siteId
   */
  loadSite(siteId) {
    const site = this.db.getSite(siteId);
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    this._setState({ currentSite: siteId, currentPage: null });
    this._emit('dashboard:siteLoaded', { siteId, pages: Object.keys(site.pages || {}).length });

    return {
      ok: true,
      site: this._buildDashboardSite(site),
      pages: Object.values(site.pages || {}).map(p => ({
        route: p.route,
        label: p.label,
        template: p.template,
        title: p.title,
        sections: p.sections?.length || 0
      })),
      navTree: site.navTree || [],
      mediaAssets: Object.values(site.mediaAssets || {}).length,
      editableNodes: site.meta?.editableNodes || 0
    };
  }

  /**
   * Load a specific page for editing.
   * @param {string} siteId
   * @param {string} route
   */
  loadPage(siteId, route) {
    const page = this.db.getPage(siteId, route);
    if (!page) return { ok: false, error: 'PAGE_NOT_FOUND' };

    this._setState({ currentPage: route });

    return {
      ok: true,
      page: {
        route: page.route,
        label: page.label,
        template: page.template,
        title: page.title,
        head: page.head,
        body: page.body,
        sections: page.sections || []
      },
      contentBlocks: this._getPageContentBlocks(siteId, route),
      editableNodes: this._getPageEditableNodes(siteId, route)
    };
  }

  /**
   * Update a content block inline.
   * @param {string} siteId
   * @param {string} route
   * @param {string} sectionId
   * @param {string} blockId
   * @param {Object} updates
   */
  updateBlock(siteId, route, sectionId, blockId, updates) {
    const result = this.db.updateContentBlock(siteId, route, sectionId, blockId, updates);
    if (result.ok) {
      this._emit('dashboard:blockUpdated', { siteId, route, sectionId, blockId });
    }
    return result;
  }

  /**
   * Update the style profile.
   * @param {string} siteId
   * @param {Object} updates
   */
  updateStyle(siteId, updates) {
    const result = this.db.updateStyleProfile(siteId, updates);
    if (result.ok) {
      this._emit('dashboard:styleUpdated', { siteId, colors: updates.colors });
    }
    return result;
  }

  /**
   * List all sites for the dashboard gallery.
   */
  listSites(filters = {}) {
    return this.db.listSites(filters);
  }

  /**
   * Delete a site.
   * @param {string} siteId
   */
  deleteSite(siteId) {
    const result = this.db.deleteSite(siteId);
    if (result.ok && this._dashboardState.currentSite === siteId) {
      this._setState({ currentSite: null, currentPage: null });
    }
    this._emit('dashboard:siteDeleted', { siteId });
    return result;
  }

  /**
   * Toggle favorite status.
   * @param {string} siteId
   */
  toggleFavorite(siteId) {
    const result = this.db.toggleFavorite(siteId);
    this._emit('dashboard:favoriteToggled', { siteId, favorite: result.favorite });
    return result;
  }

  /**
   * Get generation statistics for the dashboard.
   */
  getStats() {
    const apiStats = this.api.getStats();
    const dbStats = this.db.getStats();
    const exceptionStats = this.exceptions.getStats();

    return {
      generations: apiStats,
      storage: dbStats,
      errors: exceptionStats,
      dashboard: this._dashboardState
    };
  }

  /* ── PUBLIC API: PREVIEW & EXPORT ─────────────────────────────────────────── */

  /**
   * Get a full HTML preview document for a page.
   * @param {string} siteId
   * @param {string} route
   */
  getPagePreview(siteId, route) {
    const page = this.db.getPage(siteId, route);
    const site = this.db.getSite(siteId);
    if (!page || !site) return null;

    const styleProfile = site.styleProfile || {};

    return `<!DOCTYPE html>
<html lang="en" data-preview="true" data-site="${siteId}" data-route="${route}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.title || route} — Preview</title>
${styleProfile.cssBundle ? `<style>${styleProfile.cssBundle}</style>` : ''}
</head>
<body data-page-route="${route}">
${page.body || ''}
</body>
</html>`;
  }

  /**
   * Export a site as a downloadable ZIP-like JSON bundle.
   * @param {string} siteId
   */
  exportSite(siteId) {
    const site = this.db.getSite(siteId);
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    const bundle = {
      _schema: 'mdx-export-v1',
      _exported: new Date().toISOString(),
      siteId,
      meta: site.meta,
      pages: site.pages,
      navTree: site.navTree,
      styleProfile: site.styleProfile,
      mediaAssets: site.mediaAssets,
      contentBlocks: site.contentBlocks
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mdx-site-${site.meta?.businessName || siteId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true, siteId, pages: Object.keys(site.pages || {}).length };
  }

  /* ── EVENT SYSTEM ─────────────────────────────────────────────────────────── */

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    const idx = callbacks.indexOf(callback);
    if (idx !== -1) callbacks.splice(idx, 1);
  }

  _emit(event, data) {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[GatewayConnector] Event handler error for ${event}:`, e); }
    });
  }

  /* ── INTERNAL: DASHBOARD PAYLOAD BUILDERS ─────────────────────────────────── */

  _buildDashboardPayload(apiResponse, siteId, dbResult) {
    const site = apiResponse.site;

    return {
      siteId,
      businessName: apiResponse.meta?.businessName || 'Untitled',
      nichePrompt: apiResponse.meta?.nichePrompt,
      pages: Object.values(site?.pages || {}).map(p => ({
        route: p.route,
        label: p.label,
        template: p.template,
        title: p.title,
        canEdit: true,
        canPreview: true
      })),
      navTree: site?.navTree || [],
      stats: {
        pages: Object.keys(site?.pages || {}).length,
        editableNodes: site?.editorRegistry?.length || 0,
        cssBundleSize: site?.cssBundleSize || 0,
        generationTime: apiResponse.meta?.durationMs,
        persistedSize: dbResult.size
      },
      quickActions: [
        { label: 'Preview Site', action: 'preview', primary: true },
        { label: 'Edit Content', action: 'edit', primary: false },
        { label: 'Export HTML', action: 'export', primary: false },
        { label: 'Customize Style', action: 'style', primary: false }
      ],
      editor: {
        enabled: true,
        nodes: (site?.editorRegistry || []).slice(0, 20).map(n => ({
          id: n.editId,
          type: n.editType,
          category: n.category,
          path: n.editPath,
          preview: n.content?.slice(0, 40) + (n.content?.length > 40 ? '...' : '')
        }))
      }
    };
  }

  _buildDashboardSite(stored) {
    return {
      siteId: stored.siteId,
      businessName: stored.meta?.businessName || 'Untitled',
      nichePrompt: stored.meta?.nichePrompt,
      pageCount: stored.meta?.pageCount || 0,
      editableNodes: stored.meta?.editableNodes || 0,
      cssBundleSize: stored.meta?.cssBundleSize || 0,
      savedAt: stored.meta?.savedAt,
      locale: stored.meta?.locale,
      favorite: !!stored.meta?.favorite
    };
  }

  _getPageContentBlocks(siteId, route) {
    const site = this.db.getSite(siteId);
    if (!site || !site.contentBlocks) return [];

    const blocks = [];
    Object.entries(site.contentBlocks).forEach(([key, sectionBlocks]) => {
      if (key.startsWith(`${route}:`)) {
        const sectionId = key.split(':')[1];
        blocks.push({
          sectionId,
          blocks: sectionBlocks.map(b => ({
            blockId: b.blockId,
            type: b.type,
            category: b.category,
            tagName: b.tagName,
            text: b.text,
            meta: b.meta
          }))
        });
      }
    });
    return blocks;
  }

  _getPageEditableNodes(siteId, route) {
    const site = this.db.getSite(siteId);
    if (!site || !site.editorRegistry) return [];
    return site.editorRegistry.filter(n => n.editPath?.startsWith(`${route}:`));
  }

  _setState(updates) {
    this._dashboardState = { ...this._dashboardState, ...updates };
    this._emit('state:changed', this._dashboardState);
  }

  getState() {
    return { ...this._dashboardState };
  }
}
