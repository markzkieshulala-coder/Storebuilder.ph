/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOCUMENT TRANSFORMATION — Inline Editing Data-Attribute Stamping Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Parses generated markup and stamps specific editing data attributes across
 * every section, image node, and text heading so the frontend editor maintains
 * complete inline styling capability. Operates as a final pass after PageStitcher.
 *
 * @module DocumentTransformation
 * @author MDX Deterministic Layout Compiler
 */

export class DocumentTransformation {
  constructor(opts = {}) {
    this.editorNamespace = opts.editorNamespace || 'mdx-edit';
    this.enableInlineEdit = opts.enableInlineEdit !== false;
    this.trackOrigin = opts.trackOrigin !== false;
    this._transformLog = [];
    this._counter = 0;
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Transform a complete stitched site by stamping editing attributes
   * on every editable node.
   *
   * @param {Object} invertedSite — output from AssetInversion.invert()
   * @returns {Object} transformed site with data attributes on all nodes
   */
  transform(invertedSite) {
    const startTime = performance.now();
    this._log('INIT', 'DocumentTransformation started', { pages: Object.keys(invertedSite.pages).length });

    const pages = {};
    Object.entries(invertedSite.pages).forEach(([route, page]) => {
      pages[route] = this._transformPage(page, route);
    });

    const duration = Math.round(performance.now() - startTime);
    this._log('COMPLETE', 'All pages transformed', { duration, totalNodes: this._counter });

    return {
      ...invertedSite,
      pages,
      _transformLog: [...this._transformLog],
      _editableNodeCount: this._counter,
      _editorEnabled: this.enableInlineEdit,
      _editorNamespace: this.editorNamespace
    };
  }

  /**
   * Transform a single page's body HTML string.
   * @param {string} html  — raw HTML body content
   * @param {string} route — page route for context
   */
  transformHTML(html, route = '/') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div class="page-root" data-page-route="${route}">${html}</div>`, 'text/html');
    const root = doc.querySelector('.page-root');

    if (root) {
      this._transformNodeRecursive(root, {
        route,
        sectionId: null,
        sectionName: null,
        sectionIndex: -1,
        depth: 0
      });
    }

    return root ? root.innerHTML : html;
  }

  /**
   * Get a map of all editable nodes with their data attributes.
   * Useful for building an editor UI.
   *
   * @param {Object} transformedSite
   * @returns {Array} editable node registry
   */
  buildEditableRegistry(transformedSite) {
    const registry = [];
    Object.entries(transformedSite.pages).forEach(([route, page]) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${page.body}</div>`, 'text/html');
      const editables = doc.querySelectorAll(`[data-${this.editorNamespace}]`);
      editables.forEach(node => {
        registry.push({
          route,
          editId: node.getAttribute(`data-${this.editorNamespace}`),
          editType: node.getAttribute(`data-${this.editorNamespace}-type`),
          editPath: node.getAttribute(`data-${this.editorNamespace}-path`),
          content: node.textContent.trim().slice(0, 120),
          tagName: node.tagName.toLowerCase()
        });
      });
    });
    return registry;
  }

  /* ── PAGE TRANSFORMATION ────────────────────────────────────────────────────── */

  _transformPage(page, route) {
    const parser = new DOMParser();
    const fullDoc = parser.parseFromString(`<html><head>${page.head}</head><body>${page.body}</body></html>`, 'text/html');

    const body = fullDoc.body;

    // Walk body and stamp every relevant node
    this._transformNodeRecursive(body, {
      route,
      sectionId: null,
      sectionName: null,
      sectionIndex: -1,
      depth: 0
    });

    // Also stamp the head's title for editing
    const title = fullDoc.querySelector('title');
    if (title && this.enableInlineEdit) {
      this._stampNode(title, {
        type: 'page-title',
        path: `${route}:title`,
        section: null,
        editable: true,
        category: 'meta'
      });
    }

    return {
      ...page,
      head: fullDoc.head.innerHTML,
      body: fullDoc.body.innerHTML,
      _transformed: true,
      _editableCount: this._countEditables(fullDoc.body)
    };
  }

  /* ── RECURSIVE NODE TRANSFORMATION ──────────────────────────────────────────── */

  _transformNodeRecursive(node, context) {
    // Section boundaries
    if (node.tagName === 'SECTION' || node.hasAttribute?.('data-section')) {
      const sectionId = node.getAttribute('data-section') || `section-${context.sectionIndex + 1}`;
      const sectionName = node.getAttribute('data-section-name') || sectionId;
      const sectionIndex = context.sectionIndex + 1;

      // Stamp the section container itself
      this._stampNode(node, {
        type: 'section',
        path: `${context.route}:${sectionId}`,
        section: sectionId,
        editable: false,
        category: 'structure',
        attrs: {
          'data-section-index': String(sectionIndex),
          'data-section-name': sectionName
        }
      });

      context = { ...context, sectionId, sectionName, sectionIndex };
    }

    // Image nodes
    if (node.tagName === 'IMG' || node.hasAttribute?.('role') && node.getAttribute('role') === 'img') {
      this._stampNode(node, {
        type: 'image',
        path: `${context.route}:${context.sectionId || 'global'}:image-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'media',
        attrs: {
          'data-image-keyword': node.getAttribute('data-image-keyword') || node.getAttribute('alt') || '',
          'data-image-role': node.tagName === 'IMG' ? 'img' : 'bg'
        }
      });
    }

    // Div with background image (role=img)
    if (node.tagName === 'DIV' && (node.style?.backgroundImage || node.getAttribute('style')?.includes('background-image'))) {
      this._stampNode(node, {
        type: 'image',
        path: `${context.route}:${context.sectionId || 'global'}:bg-image-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'media',
        attrs: {
          'data-image-keyword': node.getAttribute('data-image-keyword') || '',
          'data-image-role': 'bg'
        }
      });
    }

    // Text headings (h1–h6)
    if (/^H[1-6]$/.test(node.tagName)) {
      this._stampNode(node, {
        type: 'heading',
        path: `${context.route}:${context.sectionId || 'global'}:${node.tagName.toLowerCase()}-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'text',
        attrs: {
          'data-heading-level': node.tagName.toLowerCase(),
          'data-text-type': 'heading'
        }
      });
    }

    // Paragraphs with meaningful content (not just spacing)
    if (node.tagName === 'P' && node.textContent?.trim().length > 0) {
      this._stampNode(node, {
        type: 'paragraph',
        path: `${context.route}:${context.sectionId || 'global'}:p-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'text',
        attrs: {
          'data-text-type': 'body'
        }
      });
    }

    // Links / CTAs
    if (node.tagName === 'A') {
      const isCTA = node.classList?.contains('btn') ||
                    node.classList?.contains('hero-cta') ||
                    node.classList?.contains('feature-card-link');
      this._stampNode(node, {
        type: isCTA ? 'cta' : 'link',
        path: `${context.route}:${context.sectionId || 'global'}:link-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'interactive',
        attrs: {
          'data-link-href': node.getAttribute('href') || '#',
          'data-link-type': isCTA ? 'cta' : 'nav'
        }
      });
    }

    // Buttons
    if (node.tagName === 'BUTTON') {
      this._stampNode(node, {
        type: 'button',
        path: `${context.route}:${context.sectionId || 'global'}:btn-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'interactive',
        attrs: {
          'data-button-action': node.getAttribute('data-nav') || node.getAttribute('aria-label') || 'action'
        }
      });
    }

    // Navigation links
    if (node.classList?.contains('nav-link') || node.classList?.contains('footer-column-links')?.a) {
      this._stampNode(node, {
        type: 'nav-item',
        path: `${context.route}:nav:${node.textContent?.trim().slice(0, 20) || 'item'}-${this._counter}`,
        section: 'navigation',
        editable: true,
        category: 'navigation',
        attrs: {
          'data-nav-route': node.getAttribute('data-nav-route') || node.getAttribute('href') || '#'
        }
      });
    }

    // Quote / brand statement text
    if (node.tagName === 'BLOCKQUOTE' || node.classList?.contains('brand-statement') ||
        (node.classList?.contains('quote') || node.getAttribute('data-quote'))) {
      this._stampNode(node, {
        type: 'quote',
        path: `${context.route}:${context.sectionId || 'global'}:quote-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'text',
        attrs: {
          'data-text-type': 'quote'
        }
      });
    }

    // Cards (feature cards, case study cards, article cards)
    if (node.tagName === 'ARTICLE' || node.classList?.contains('feature-card') ||
        node.classList?.contains('case-study') || node.classList?.contains('article-card')) {
      this._stampNode(node, {
        type: 'card',
        path: `${context.route}:${context.sectionId || 'global'}:card-${this._counter}`,
        section: context.sectionId,
        editable: false,
        category: 'component',
        attrs: {
          'data-card-index': node.getAttribute('data-card-index') || String(this._counter),
          'data-card-type': node.classList?.contains('feature-card') ? 'feature' :
                           node.classList?.contains('case-study') ? 'case-study' :
                           node.classList?.contains('article-card') ? 'article' : 'generic'
        }
      });
    }

    // Form fields
    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
      this._stampNode(node, {
        type: 'form-field',
        path: `${context.route}:${context.sectionId || 'global'}:field-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'form',
        attrs: {
          'data-field-name': node.getAttribute('name') || node.getAttribute('placeholder') || 'field',
          'data-field-type': node.getAttribute('type') || node.tagName.toLowerCase()
        }
      });
    }

    // Form labels
    if (node.tagName === 'LABEL') {
      this._stampNode(node, {
        type: 'form-label',
        path: `${context.route}:${context.sectionId || 'global'}:label-${this._counter}`,
        section: context.sectionId,
        editable: true,
        category: 'form',
        attrs: {
          'data-field-target': node.getAttribute('for') || ''
        }
      });
    }

    // Recurse into children
    if (node.children && node.children.length > 0) {
      Array.from(node.children).forEach(child => {
        this._transformNodeRecursive(child, { ...context, depth: context.depth + 1 });
      });
    }
  }

  /* ── NODE STAMPING ────────────────────────────────────────────────────────── */

  _stampNode(node, spec) {
    if (!node || !node.setAttribute) return;

    this._counter++;
    const editId = `edit-${String(this._counter).padStart(5, '0')}`;

    // Primary edit attribute
    if (this.enableInlineEdit && spec.editable) {
      node.setAttribute(`data-${this.editorNamespace}`, editId);
    }

    // Type classification
    node.setAttribute(`data-${this.editorNamespace}-type`, spec.type);

    // Full path for reference
    node.setAttribute(`data-${this.editorNamespace}-path`, spec.path);

    // Section association
    if (spec.section) {
      node.setAttribute(`data-${this.editorNamespace}-section`, spec.section);
    }

    // Category for editor grouping
    node.setAttribute(`data-${this.editorNamespace}-category`, spec.category);

    // Origin tracking
    if (this.trackOrigin) {
      node.setAttribute(`data-${this.editorNamespace}-origin`, 'compiler-v1');
    }

    // Additional custom attributes
    if (spec.attrs) {
      Object.entries(spec.attrs).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          node.setAttribute(key, String(val));
        }
      });
    }

    this._log('STAMP', `Stamped ${spec.type} → ${editId}`, {
      path: spec.path,
      tag: node.tagName?.toLowerCase(),
      category: spec.category
    });
  }

  /* ── COUNTING ─────────────────────────────────────────────────────────────── */

  _countEditables(body) {
    if (!body) return 0;
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${body.innerHTML || body}</div>`, 'text/html');
    return doc.querySelectorAll(`[data-${this.editorNamespace}]`).length;
  }

  /* ── LOGGING ───────────────────────────────────────────────────────────────── */

  _log(stage, message, data = {}) {
    const entry = { stage, message, data, time: Date.now() };
    this._transformLog.push(entry);
    if (console && console.log) console.log(`[DocumentTransformation::${stage}] ${message}`, data);
  }
}
