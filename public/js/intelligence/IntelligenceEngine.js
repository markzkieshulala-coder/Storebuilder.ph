/**
 * IntelligenceEngine — Multi-Page Content Intelligence Orchestrator
 * Wires ArchitecturePlanner, ContextualImagePromptGenerator, and
 * StrictJsonResponseExtractor into a unified generation pipeline.
 */

import { ArchitecturePlanner } from './ArchitecturePlanner.js';
import { ContextualImagePromptGenerator } from './ContextualImagePromptGenerator.js';
import { StrictJsonResponseExtractor } from './StrictJsonResponseExtractor.js';

export class IntelligenceEngine {
  constructor(opts = {}) {
    this.locale = opts.locale || 'en-US';
    this.verbose = opts.verbose !== false;
    this._pipelineLog = [];
  }

  /**
   * Generate a complete multi-page site from a business niche description.
   * @param {string} nichePrompt — e.g. "A luxury leather goods atelier in Milan"
   * @param {Object} overrides — optional manual overrides for signals
   * @returns {Object} complete site specification with architecture, copy, images, colors
   */
  async generateSite(nichePrompt, overrides = {}) {
    const startTime = performance.now();
    this._log('START', 'Site generation initiated', { nichePrompt, overrides });

    // STEP 1: Architecture Planning
    const planner = new ArchitecturePlanner({
      nichePrompt,
      businessName: overrides.businessName,
      locale: this.locale,
      maxDepth: overrides.maxDepth || 2
    });
    const architecture = planner.plan();
    this._log('ARCHITECTURE', 'Multi-page map generated', {
      pages: Object.keys(architecture.pages).length,
      navTree: architecture.navTree,
      audit: architecture.audit
    });

    // STEP 2: Image Prompt Generation
    const promptGen = new ContextualImagePromptGenerator({
      signals: architecture.signals,
      locale: this.locale
    });
    const slots = architecture.contentSlots;
    const imageAssets = promptGen.generateBatch(slots);
    this._log('IMAGES', 'Image prompts generated', {
      totalAssets: imageAssets.length,
      sample: imageAssets[0]?.imagePrompt?.prompt?.slice(0, 80) || 'none'
    });

    // STEP 3: Structured Metrics Extraction
    const extractor = new StrictJsonResponseExtractor({ locale: this.locale });
    const siteSpec = this._buildSiteSpec(architecture, imageAssets, overrides);
    const extracted = extractor.extract(JSON.stringify(siteSpec));
    this._log('EXTRACT', 'Strict JSON extraction complete', {
      ok: extracted.ok,
      attempts: extracted.attempts,
      metrics: extracted.data?._metrics || null
    });

    const duration = Math.round(performance.now() - startTime);
    const result = {
      ok: extracted.ok && architecture.audit.ok,
      durationMs: duration,
      architecture,
      imageAssets,
      siteSpec: extracted.data || siteSpec,
      raw: extracted,
      pipeline: this._pipelineLog
    };

    this._log('COMPLETE', 'Site generation finished', { duration, ok: result.ok });
    return result;
  }

  /**
   * Generate a single product item detail page with full image prompts.
   * @param {string} itemName — e.g. "Minimalist Leather Cardholder"
   * @param {Object} siteSignals — signals from existing architecture
   * @returns {Object} item page spec with image prompts
   */
  generateItemPage(itemName, siteSignals = {}) {
    const promptGen = new ContextualImagePromptGenerator({ signals: siteSignals });

    const hero = promptGen.generateForProduct(itemName, { context: 'Product hero', aspect: '4:5' });
    const detail1 = promptGen.generateForProduct(itemName, { context: 'Craft detail macro', aspect: '1:1' });
    const detail2 = promptGen.generateForProduct(itemName, { context: 'Material texture close-up', aspect: '1:1' });
    const lifestyle = promptGen.generateForProduct(itemName, { context: 'Lifestyle use context', aspect: '16:9' });

    return {
      route: `/item/${this._slug(itemName)}`,
      label: itemName,
      template: 'item-detail',
      images: [hero, detail1, detail2, lifestyle],
      meta: {
        title: `${itemName} — Product Detail`,
        description: `Discover the ${itemName}. ${hero.prompt.slice(0, 120)}...`
      }
    };
  }

  /**
   * Generate a strict JSON prompt for an LLM to produce site copy.
   * @param {Object} architecture — ArchitecturePlanner output
   * @returns {string} prompt string
   */
  buildCopyPrompt(architecture) {
    const extractor = new StrictJsonResponseExtractor();
    return extractor.buildPrompt({
      task: 'Generate complete website copy for a luxury brand',
      industry: architecture.signals.industry,
      tone: architecture.signals.tone,
      audience: architecture.signals.audiences,
      pages: architecture.navTree.map(n => ({ route: n.route, label: n.label })),
      contentSlots: architecture.contentSlots.filter(s => !s.hasImage).map(s => ({
        page: s.pageRoute,
        section: s.sectionId,
        type: s.type,
        maxChars: s.maxChars || 200,
        context: s.context
      }))
    });
  }

  /**
   * Export the complete site specification as a deployable JSON bundle.
   * @param {Object} result — output from generateSite()
   * @returns {string} JSON string
   */
  exportBundle(result) {
    const bundle = {
      _schema: 'mdx-site-spec-v1',
      _generated: new Date().toISOString(),
      meta: result.architecture.meta,
      signals: result.architecture.signals,
      routes: result.architecture.routes,
      navTree: result.architecture.navTree,
      pages: Object.fromEntries(
        Object.entries(result.architecture.pages).map(([route, page]) => [
          route,
          {
            ...page,
            images: result.imageAssets
              .filter(img => img.pageRoute === route)
              .map(img => ({
                slotType: img.type,
                context: img.context,
                prompt: img.imagePrompt?.prompt || '',
                negativePrompt: img.imagePrompt?.negativePrompt || '',
                metadata: img.imagePrompt?.metadata || {}
              }))
          }
        ])
      ),
      colors: this._derivePalette(result.architecture.signals),
      fonts: { display: 'Playfair Display', body: 'Inter' },
      metrics: result.siteSpec?._metrics || {}
    };
    return JSON.stringify(bundle, null, 2);
  }

  /* ── INTERNAL ─────────────────────────────────────────────────────────────── */

  _buildSiteSpec(architecture, imageAssets, overrides) {
    return {
      siteName: overrides.businessName || architecture.meta.siteName,
      industry: architecture.signals.industry || 'luxury',
      tone: architecture.signals.tone,
      colors: { ...this._derivePalette(architecture.signals), ...(overrides.colors || {}) },
      pages: Object.values(architecture.pages).map(p => ({
        route: p.route,
        label: p.label,
        headline: p.label,
        subheadline: `Explore ${p.label.toLowerCase()}.`
      })),
      navigation: architecture.navTree.map(n => n.route),
      fontPairing: { display: 'Playfair Display', body: 'Inter' },
      assetManifest: {
        imageAssets: imageAssets.length,
        copyAssets: architecture.contentSlots.filter(s => !s.hasImage).length
      }
    };
  }

  _derivePalette(signals) {
    const tone = signals.tone?.[0] || 'luxury';
    const palettes = {
      luxury: { primary: '#C9A96E', secondary: '#1A1A1C', accent: '#E8D5B7', background: '#0B0B0C', text: '#F1F0EA', muted: '#8A8A8A' },
      minimal: { primary: '#1A1A1A', secondary: '#F5F5F0', accent: '#C4C4C4', background: '#FFFFFF', text: '#0A0A0A', muted: '#999999' },
      bold: { primary: '#D94F30', secondary: '#0B0B0C', accent: '#F2C94C', background: '#0B0B0C', text: '#FFFFFF', muted: '#6B6B6B' },
      warm: { primary: '#B87333', secondary: '#2C1810', accent: '#E8D4C4', background: '#FAF6F0', text: '#2C1810', muted: '#A09080' },
      modern: { primary: '#2563EB', secondary: '#0F172A', accent: '#38BDF8', background: '#0F172A', text: '#F8FAFC', muted: '#64748B' },
      timeless: { primary: '#8B7355', secondary: '#1C1917', accent: '#D4C5B0', background: '#F5F0E8', text: '#1C1917', muted: '#9C8B7A' }
    };
    return palettes[tone] || palettes.luxury;
  }

  _slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  _log(stage, message, data = {}) {
    const entry = { stage, message, data, time: Date.now() };
    this._pipelineLog.push(entry);
    if (this.verbose) console.log(`[IntelligenceEngine::${stage}] ${message}`, data);
  }
}
