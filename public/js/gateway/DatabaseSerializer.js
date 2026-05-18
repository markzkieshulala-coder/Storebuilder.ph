/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATABASE SERIALIZER — Persistent Storage & Retrieval Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Safely writes compiled page templates, content structures, and custom layout
 * styling values into persistent storage tables. Supports JSON serialization,
 * versioning, atomic writes, and queryable retrieval for the user dashboard.
 *
 * Schema:
 *   sites          → site metadata, signals, generation config
 *   pages          → per-page compiled HTML head/body, template, route
 *   content_blocks → section-level content structures (headings, copy, CTAs)
 *   media_assets   → image prompt metadata and resolved URLs per keyword
 *   style_profiles → custom CSS bundles, color palettes, font pairings
 *   generations    → generation audit log with pipeline metrics
 *
 * @module DatabaseSerializer
 * @author MDX Gateway Routing Layer
 */

export class DatabaseSerializer {
  constructor(opts = {}) {
    this.storageKey = opts.storageKey || 'mdx_sites_v1';
    this.maxSiteSize = opts.maxSiteSize || 5 * 1024 * 1024; // 5MB
    this.maxSites = opts.maxSites || 50;
    this.compression = opts.compression !== false;
    this.version = '1.0.0';
    this._init();
  }

  /* ── INITIALIZATION ─────────────────────────────────────────────────────────── */

  _init() {
    const existing = this._readRaw();
    if (!existing) {
      this._writeRaw({
        _version: this.version,
        _created: Date.now(),
        sites: {},
        generations: [],
        mediaIndex: {},
        styleIndex: {}
      });
    }
  }

  /* ── PUBLIC API: SITE CRUD ────────────────────────────────────────────────── */

  /**
   * Persist a fully compiled site.
   *
   * @param {Object} compiled — output from DeterministicLayoutCompiler.compile()
   * @param {Object} meta — site metadata
   *   @param {string} meta.requestId — originating gateway request
   *   @param {string} meta.nichePrompt — the business description
   *   @param {string} [meta.businessName] — brand name
   *   @param {string} meta.locale — content locale
   *   @param {number} meta.durationMs — total generation time
   * @returns {Object} { ok, siteId, warnings, size }
   */
  saveSite(compiled, meta = {}) {
    const siteId = this._generateSiteId();
    const startTime = performance.now();

    try {
      // Validate size
      const serialized = JSON.stringify(compiled);
      const size = new Blob([serialized]).size;

      if (size > this.maxSiteSize) {
        return {
          ok: false,
          siteId: null,
          error: 'SITE_TOO_LARGE',
          message: `Site exceeds ${(this.maxSiteSize / 1024 / 1024).toFixed(1)}MB limit. Actual: ${(size / 1024 / 1024).toFixed(2)}MB.`
        };
      }

      // Check storage quota
      const db = this._readRaw();
      if (Object.keys(db.sites).length >= this.maxSites) {
        // Evict oldest non-favorite
        const evictable = Object.values(db.sites)
          .filter(s => !s.meta?.favorite)
          .sort((a, b) => a.meta.savedAt - b.meta.savedAt)[0];
        if (evictable) {
          delete db.sites[evictable.siteId];
        } else {
          return {
            ok: false,
            siteId: null,
            error: 'QUOTA_EXCEEDED',
            message: `Maximum ${this.maxSites} sites reached. Delete an existing site first.`
          };
        }
      }

      // Serialize site
      const site = {
        siteId,
        version: this.version,
        meta: {
          ...meta,
          savedAt: Date.now(),
          pageCount: Object.keys(compiled.pages || {}).length,
          editableNodes: compiled.editorRegistry?.length || 0,
          cssBundleSize: compiled.cssBundleSize || 0,
          totalSize: size
        },
        // Core tables
        pages: this._serializePages(compiled),
        contentBlocks: this._serializeContentBlocks(compiled),
        mediaAssets: this._serializeMediaAssets(compiled),
        styleProfile: this._serializeStyleProfile(compiled),
        navTree: compiled.navTree || [],
        signals: compiled.signals || {},
        linkMap: compiled.linkMap || {},
        editorRegistry: compiled.editorRegistry?.slice(0, 100) || [], // Sample for quick lookup
        emitted: compiled.emitted || null
      };

      // Atomic write
      db.sites[siteId] = site;
      db.generations.push({
        siteId,
        requestId: meta.requestId,
        timestamp: Date.now(),
        durationMs: meta.durationMs,
        ok: true
      });

      this._writeRaw(db);

      return {
        ok: true,
        siteId,
        warnings: [],
        size,
        pages: Object.keys(site.pages).length,
        mediaAssets: Object.keys(site.mediaAssets).length,
        durationMs: Math.round(performance.now() - startTime)
      };

    } catch (err) {
      console.error('[DatabaseSerializer.saveSite]', err);
      return {
        ok: false,
        siteId: null,
        error: 'SERIALIZATION_FAILED',
        message: `Failed to serialize site: ${err.message}`,
        details: err.stack?.slice(0, 200)
      };
    }
  }

  /**
   * Retrieve a site by ID.
   * @param {string} siteId
   * @returns {Object|null} full site record or null
   */
  getSite(siteId) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return null;

    // Update access time
    site.meta.lastAccessed = Date.now();
    this._writeRaw(db);

    return this._deserializeSite(site);
  }

  /**
   * List all sites with lightweight metadata.
   * @param {Object} filters — { status, dateFrom, dateTo, hasMedia }
   */
  listSites(filters = {}) {
    const db = this._readRaw();
    let sites = Object.values(db.sites);

    if (filters.status) {
      sites = sites.filter(s => s.meta.status === filters.status);
    }
    if (filters.dateFrom) {
      sites = sites.filter(s => s.meta.savedAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      sites = sites.filter(s => s.meta.savedAt <= filters.dateTo);
    }
    if (filters.hasMedia) {
      sites = sites.filter(s => Object.keys(s.mediaAssets || {}).length > 0);
    }

    return sites.map(s => ({
      siteId: s.siteId,
      businessName: s.meta.businessName || 'Untitled',
      nichePrompt: s.meta.nichePrompt?.slice(0, 80) + '...',
      pageCount: s.meta.pageCount,
      editableNodes: s.meta.editableNodes,
      cssBundleSize: s.meta.cssBundleSize,
      totalSize: s.meta.totalSize,
      savedAt: s.meta.savedAt,
      lastAccessed: s.meta.lastAccessed,
      locale: s.meta.locale,
      durationMs: s.meta.durationMs,
      favorite: !!s.meta.favorite
    }));
  }

  /**
   * Delete a site and all associated records.
   * @param {string} siteId
   */
  deleteSite(siteId) {
    const db = this._readRaw();
    const existed = !!db.sites[siteId];
    if (existed) {
      delete db.sites[siteId];
      db.generations = db.generations.filter(g => g.siteId !== siteId);
      this._writeRaw(db);
    }
    return { ok: existed, siteId };
  }

  /**
   * Toggle favorite status.
   * @param {string} siteId
   */
  toggleFavorite(siteId) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return { ok: false };
    site.meta.favorite = !site.meta.favorite;
    this._writeRaw(db);
    return { ok: true, favorite: site.meta.favorite };
  }

  /* ── PUBLIC API: PAGE OPERATIONS ──────────────────────────────────────────── */

  /**
   * Get a single page from a site.
   * @param {string} siteId
   * @param {string} route
   */
  getPage(siteId, route) {
    const site = this.getSite(siteId);
    if (!site) return null;
    return site.pages[route] || null;
  }

  /**
   * Update a page's compiled HTML.
   * @param {string} siteId
   * @param {string} route
   * @param {Object} update — { head?, body?, title? }
   */
  updatePage(siteId, route, update = {}) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    const page = site.pages[route];
    if (!page) return { ok: false, error: 'PAGE_NOT_FOUND' };

    if (update.head !== undefined) page.head = update.head;
    if (update.body !== undefined) page.body = update.body;
    if (update.title !== undefined) page.title = update.title;
    page.meta.updatedAt = Date.now();
    page.meta.version = (page.meta.version || 1) + 1;

    this._writeRaw(db);
    return { ok: true, page, version: page.meta.version };
  }

  /* ── PUBLIC API: CONTENT BLOCKS ─────────────────────────────────────────────── */

  /**
   * Get content blocks for a specific section.
   * @param {string} siteId
   * @param {string} route
   * @param {string} sectionId
   */
  getContentBlocks(siteId, route, sectionId) {
    const site = this._readRaw().sites[siteId];
    if (!site) return null;

    const key = `${route}:${sectionId}`;
    return site.contentBlocks?.[key] || null;
  }

  /**
   * Update a content block.
   * @param {string} siteId
   * @param {string} route
   * @param {string} sectionId
   * @param {string} blockId
   * @param {Object} updates — { text?, href?, imageKeyword?, meta? }
   */
  updateContentBlock(siteId, route, sectionId, blockId, updates = {}) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    const key = `${route}:${sectionId}`;
    const blocks = site.contentBlocks?.[key];
    if (!blocks) return { ok: false, error: 'SECTION_NOT_FOUND' };

    const block = blocks.find(b => b.blockId === blockId);
    if (!block) return { ok: false, error: 'BLOCK_NOT_FOUND' };

    if (updates.text !== undefined) block.text = updates.text;
    if (updates.href !== undefined) block.href = updates.href;
    if (updates.imageKeyword !== undefined) block.imageKeyword = updates.imageKeyword;
    if (updates.meta !== undefined) block.meta = { ...block.meta, ...updates.meta };
    block.meta.updatedAt = Date.now();
    block.meta.version = (block.meta.version || 1) + 1;

    this._writeRaw(db);
    return { ok: true, block };
  }

  /* ── PUBLIC API: MEDIA ASSETS ─────────────────────────────────────────────── */

  /**
   * Get all media assets for a site.
   * @param {string} siteId
   */
  getMediaAssets(siteId) {
    const site = this._readRaw().sites[siteId];
    if (!site) return null;
    return Object.values(site.mediaAssets || {});
  }

  /**
   * Update a media asset (e.g., after re-generating an image).
   * @param {string} siteId
   * @param {string} assetId
   * @param {Object} updates — { prompt?, url?, status? }
   */
  updateMediaAsset(siteId, assetId, updates = {}) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    const asset = site.mediaAssets?.[assetId];
    if (!asset) return { ok: false, error: 'ASSET_NOT_FOUND' };

    if (updates.prompt !== undefined) asset.prompt = updates.prompt;
    if (updates.url !== undefined) asset.url = updates.url;
    if (updates.status !== undefined) asset.status = updates.status;
    asset.updatedAt = Date.now();

    this._writeRaw(db);
    return { ok: true, asset };
  }

  /* ── PUBLIC API: STYLE PROFILES ───────────────────────────────────────────── */

  /**
   * Get the style profile (CSS bundle + color palette + fonts) for a site.
   * @param {string} siteId
   */
  getStyleProfile(siteId) {
    const site = this._readRaw().sites[siteId];
    if (!site) return null;
    return site.styleProfile || null;
  }

  /**
   * Update a style profile.
   * @param {string} siteId
   * @param {Object} updates — { colors?, cssBundle?, fonts? }
   */
  updateStyleProfile(siteId, updates = {}) {
    const db = this._readRaw();
    const site = db.sites[siteId];
    if (!site) return { ok: false, error: 'SITE_NOT_FOUND' };

    if (!site.styleProfile) site.styleProfile = {};

    if (updates.colors) site.styleProfile.colors = { ...site.styleProfile.colors, ...updates.colors };
    if (updates.cssBundle) {
      site.styleProfile.cssBundle = updates.cssBundle;
      site.meta.cssBundleSize = updates.cssBundle.length;
    }
    if (updates.fonts) site.styleProfile.fonts = { ...site.styleProfile.fonts, ...updates.fonts };
    site.styleProfile.updatedAt = Date.now();
    site.styleProfile.version = (site.styleProfile.version || 1) + 1;

    this._writeRaw(db);
    return { ok: true, styleProfile: site.styleProfile };
  }

  /* ── PUBLIC API: STATISTICS ─────────────────────────────────────────────────── */

  getStats() {
    const db = this._readRaw();
    const sites = Object.values(db.sites);

    return {
      totalSites: sites.length,
      totalSize: sites.reduce((sum, s) => sum + (s.meta.totalSize || 0), 0),
      averagePageCount: sites.length > 0
        ? Math.round(sites.reduce((sum, s) => sum + s.meta.pageCount, 0) / sites.length)
        : 0,
      averageDurationMs: sites.length > 0
        ? Math.round(sites.reduce((sum, s) => sum + s.meta.durationMs, 0) / sites.length)
        : 0,
      totalGenerations: db.generations.length,
      totalMediaAssets: sites.reduce((sum, s) => sum + Object.keys(s.mediaAssets || {}).length, 0),
      locales: [...new Set(sites.map(s => s.meta.locale).filter(Boolean))],
      favorites: sites.filter(s => s.meta.favorite).length
    };
  }

  /* ── SERIALIZATION HELPERS ──────────────────────────────────────────────────── */

  _serializePages(compiled) {
    const pages = {};
    Object.entries(compiled.pages || {}).forEach(([route, page]) => {
      pages[route] = {
        route: page.route,
        label: page.label,
        template: page.template,
        title: page.title,
        head: page.head || '',
        body: page.body || '',
        sections: page.sections || [],
        meta: {
          savedAt: Date.now(),
          version: 1,
          size: new Blob([page.head + page.body]).size
        }
      };
    });
    return pages;
  }

  _serializeContentBlocks(compiled) {
    const blocks = {};
    const registry = compiled.editorRegistry || [];

    // Group by route:section
    registry.forEach(node => {
      const match = node.editPath?.match(/^([^:]+):([^:]+)/);
      if (!match) return;
      const [, route, sectionId] = match;
      const key = `${route}:${sectionId}`;

      if (!blocks[key]) blocks[key] = [];
      blocks[key].push({
        blockId: node.editId,
        type: node.editType,
        category: node.category,
        tagName: node.tagName,
        text: node.content,
        path: node.editPath,
        meta: { createdAt: Date.now(), version: 1 }
      });
    });

    return blocks;
  }

  _serializeMediaAssets(compiled) {
    const assets = {};

    // Extract from editor registry
    const registry = compiled.editorRegistry || [];
    const imageNodes = registry.filter(n => n.category === 'media');

    imageNodes.forEach((node, index) => {
      const assetId = `img-${String(index + 1).padStart(4, '0')}`;
      assets[assetId] = {
        assetId,
        type: node.editType || 'image',
        route: node.editPath?.split(':')[0] || '/',
        sectionId: node.editPath?.split(':')[1] || 'unknown',
        context: node.content?.slice(0, 60),
        status: 'pending', // pending | generating | ready | failed
        prompt: null,      // filled by image generator
        url: null,         // filled after generation
        keyword: null,     // extracted from imageKeyword attr
        createdAt: Date.now()
      };
    });

    // Also extract from imageAssets if available
    if (compiled.site?.imageAssets) {
      compiled.site.imageAssets.forEach((img, index) => {
        const assetId = `img-${String(imageNodes.length + index + 1).padStart(4, '0')}`;
        assets[assetId] = {
          assetId,
          type: 'generated-prompt',
          route: img.pageRoute || '/',
          sectionId: img.sectionId || 'unknown',
          context: `${img.pageLabel} — ${img.sectionName}`,
          status: 'pending',
          prompt: img.imagePrompt || null,
          negativePrompt: img.negativePrompt || null,
          url: null,
          keyword: null,
          metadata: img.promptMetadata || {},
          createdAt: Date.now()
        };
      });
    }

    return assets;
  }

  _serializeStyleProfile(compiled) {
    return {
      cssBundle: compiled.cssBundle || '',
      colors: compiled.site?.colors || {},
      fonts: compiled.site?.fontPairing || { display: 'Playfair Display', body: 'Inter' },
      version: 1,
      createdAt: Date.now()
    };
  }

  _deserializeSite(stored) {
    // Currently a pass-through — in a real DB this would reconstruct objects
    return stored;
  }

  /* ── STORAGE BACKEND (localStorage abstraction) ─────────────────────────────── */

  _readRaw() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[DatabaseSerializer] Failed to read storage:', e);
      return null;
    }
  }

  _writeRaw(data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('[DatabaseSerializer] Storage quota exceeded');
        // Attempt to free space by removing oldest generations
        const db = this._readRaw();
        if (db && db.generations.length > 10) {
          db.generations = db.generations.slice(-10);
          localStorage.setItem(this.storageKey, JSON.stringify(db));
        }
      } else {
        console.error('[DatabaseSerializer] Failed to write storage:', e);
      }
      return false;
    }
  }

  /* ── UTILITIES ─────────────────────────────────────────────────────────────── */

  _generateSiteId() {
    return `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Export all data as a JSON blob for backup.
   */
  exportAll() {
    const db = this._readRaw();
    if (!db) return null;

    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mdx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true, sites: Object.keys(db.sites).length, generations: db.generations.length };
  }

  /**
   * Import data from a JSON blob.
   * @param {string} jsonString
   */
  importAll(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported._version || !imported.sites) {
        return { ok: false, error: 'INVALID_BACKUP_FORMAT' };
      }

      const current = this._readRaw() || { _version: this.version, sites: {}, generations: [], mediaIndex: {}, styleIndex: {} };

      // Merge sites (imported takes precedence on ID conflict)
      Object.entries(imported.sites || {}).forEach(([id, site]) => {
        current.sites[id] = site;
      });

      // Append generations
      current.generations = [...current.generations, ...(imported.generations || [])];

      this._writeRaw(current);
      return { ok: true, importedSites: Object.keys(imported.sites || {}).length };
    } catch (e) {
      return { ok: false, error: 'IMPORT_FAILED', message: e.message };
    }
  }

  /**
   * Clear all data (destructive).
   */
  clearAll() {
    localStorage.removeItem(this.storageKey);
    this._init();
    return { ok: true };
  }
}
