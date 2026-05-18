/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DETERMINISTIC LAYOUT COMPILER — Full Assembly Loop Orchestrator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wires PageStitcher → AssetInversion → DocumentTransformation into a single
 * deterministic pipeline that compiles a multi-page site from an IntelligenceEngine
 * plan into fully rendered, style-injected, editor-ready HTML documents.
 *
 * @module DeterministicLayoutCompiler
 * @author MDX Assembly Loop
 */

import { PageStitcher } from './PageStitcher.js';
import { AssetInversion } from './AssetInversion.js';
import { DocumentTransformation } from './DocumentTransformation.js';

export class DeterministicLayoutCompiler {
  constructor(opts = {}) {
    this.locale = opts.locale || 'en-US';
    this.verbose = opts.verbose !== false;
    this.editorEnabled = opts.editorEnabled !== false;
    this.emitHTML = opts.emitHTML !== false;
    this._compilerLog = [];

    // Sub-module instances
    this._stitcher = new PageStitcher({ locale: this.locale, verbose: this.verbose });
    this._inverter = new AssetInversion({ inlineAll: true, minifyCSS: true, verbose: this.verbose });
    this._transformer = new DocumentTransformation({
      editorNamespace: opts.editorNamespace || 'mdx-edit',
      enableInlineEdit: this.editorEnabled,
      trackOrigin: true
    });
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Compile a complete multi-page site from an IntelligenceEngine plan.
   *
   * Pipeline stages:
   *   1. STITCH  — PageStitcher assembles layout blocks + content per page
   *   2. INVERT  — AssetInversion injects luxury CSS bundles into every head
   *   3. STAMP   — DocumentTransformation stamps editing data-attributes
   *   4. EMIT    — Optionally emit standalone HTML documents per page
   *
   * @param {Object} plan       — output from IntelligenceEngine.generateSite()
   * @param {Object} overrides  — optional content overrides per route
   * @returns {Object} compiled site with emitted pages, CSS, JS, and editor registry
   */
  compile(plan, overrides = {}) {
    const startTime = performance.now();
    this._log('INIT', 'DeterministicLayoutCompiler started', {
      pages: Object.keys(plan.architecture.pages).length,
      editorEnabled: this.editorEnabled,
      emitHTML: this.emitHTML
    });

    // ── STAGE 1: STITCH ───────────────────────────────────────────────────────
    this._log('STAGE', '1 — PageStitcher: assembling layout blocks');
    const stitched = this._stitcher.stitch(plan, overrides);
    this._log('STAGE', '1 — PageStitcher complete', {
      pages: Object.keys(stitched.pages).length,
      sections: Object.values(stitched.pages).reduce((s, p) => s + p.sections.length, 0)
    });

    // ── STAGE 2: INVERT ────────────────────────────────────────────────────────
    this._log('STAGE', '2 — AssetInversion: injecting luxury stylesheets');
    const inverted = this._inverter.invert(stitched, overrides.styleAssets || {});
    this._log('STAGE', '2 — AssetInversion complete', {
      cssBundleSize: inverted._cssBundle?.length || 0,
      assets: inverted._assetManifest || []
    });

    // ── STAGE 3: STAMP ───────────────────────────────────────────────────────────
    this._log('STAGE', '3 — DocumentTransformation: stamping edit attributes');
    const stamped = this._transformer.transform(inverted);
    this._log('STAGE', '3 — DocumentTransformation complete', {
      editableNodes: stamped._editableNodeCount || 0,
      namespace: stamped._editorNamespace
    });

    // ── STAGE 4: EMIT ───────────────────────────────────────────────────────────
    this._log('STAGE', '4 — Emit: generating standalone documents');
    const emitted = this.emitHTML ? this._emitPages(stamped) : null;
    this._log('STAGE', '4 — Emit complete', {
      emittedPages: emitted ? Object.keys(emitted.documents).length : 0
    });

    const duration = Math.round(performance.now() - startTime);
    const result = {
      ok: true,
      durationMs: duration,
      meta: stamped.meta,
      signals: stamped.signals,
      navTree: stamped.navTree,
      pages: stamped.pages,
      emitted: emitted,
      cssBundle: stamped._cssBundle,
      cssBundleSize: stamped._cssBundle?.length || 0,
      editorRegistry: this.editorEnabled ? this._transformer.buildEditableRegistry(stamped) : [],
      linkMap: stamped.linkMap || {},
      pipeline: [...this._compilerLog],
      _stageSummary: {
        stitch: { pages: Object.keys(stitched.pages).length },
        invert: { cssAssets: (inverted._assetManifest || []).length },
        stamp: { editableNodes: stamped._editableNodeCount || 0 },
        emit: { documents: emitted ? Object.keys(emitted.documents).length : 0 }
      }
    };

    this._log('COMPLETE', 'DeterministicLayoutCompiler finished', { duration, ok: true });
    return result;
  }

  /**
   * Compile a single page incrementally (for live preview / hot-reload).
   *
   * @param {Object} page       — page spec from ArchitecturePlanner
   * @param {Object} plan       — full intelligence plan
   * @param {Object} overrides  — content overrides
   */
  compilePage(page, plan, overrides = {}) {
    const stitchedPage = this._stitcher.stitchPage(page, plan, overrides);
    const singleSite = { pages: { [page.route]: stitchedPage }, meta: plan.architecture.meta };
    const inverted = this._inverter.invert(singleSite, overrides.styleAssets || {});
    const stamped = this._transformer.transform(inverted);

    return {
      route: page.route,
      head: stamped.pages[page.route]?.head || '',
      body: stamped.pages[page.route]?.body || '',
      title: stitchedPage.title,
      editableCount: stamped.pages[page.route]?._editableCount || 0
    };
  }

  /**
   * Emit a full HTML document string for a specific page.
   * @param {string} route — page route
   * @param {Object} compiled — output from compile()
   */
  emitDocument(route, compiled) {
    const page = compiled.pages[route];
    if (!page) return null;

    return `<!DOCTYPE html>
<html lang="${this.locale.split('-')[0]}">
<head>
${page.head}
</head>
<body>
${page.body}
</body>
</html>`;
  }

  /**
   * Extract all editable node paths for a route.
   * @param {string} route — page route
   * @param {Object} compiled — output from compile()
   */
  getEditableNodes(route, compiled) {
    return compiled.editorRegistry.filter(e => e.route === route);
  }

  /**
   * Get the full CSS bundle for external use.
   */
  getCSSBundle() {
    return this._inverter.getCompiledBundle();
  }

  /* ── EMIT STAGE ───────────────────────────────────────────────────────────── */

  _emitPages(stamped) {
    const documents = {};
    const summaries = [];

    Object.entries(stamped.pages).forEach(([route, page]) => {
      const doc = `<!DOCTYPE html>
<html lang="${this.locale.split('-')[0]}" data-compiler="mdx-layout-v1" data-route="${route}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.title || route}</title>
${page.head}
</head>
<body data-page-route="${route}" data-editable="${!!this.editorEnabled}">
${page.body}
</body>
</html>`;

      documents[route] = {
        html: doc,
        route: page.route,
        label: page.label,
        template: page.template,
        title: page.title,
        size: doc.length,
        isDynamic: page.isDynamic
      };

      summaries.push({
        route: page.route,
        label: page.label,
        template: page.template,
        size: doc.length,
        sections: page.sections?.length || 0,
        editableNodes: page._editableCount || 0
      });
    });

    return { documents, summaries };
  }

  /* ── LOGGING ───────────────────────────────────────────────────────────────── */

  _log(stage, message, data = {}) {
    const entry = { stage, message, data, time: Date.now() };
    this._compilerLog.push(entry);
    if (this.verbose) console.log(`[Compiler::${stage}] ${message}`, data);
  }
}
