/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * API GATEWAY CONTROLLER — Request Reception & Pipeline Dispatch
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Receives generation requests from the user dashboard UI, sanitizes all inputs,
 * validates request shape, rate-limits, and hands off directly into the
 * multi-page engine pipeline (IntelligenceEngine → DeterministicLayoutCompiler).
 *
 * @module ApiGatewayController
 * @author MDX Gateway Routing Layer
 */

import { IntelligenceEngine } from '../intelligence/IntelligenceEngine.js';
import { DeterministicLayoutCompiler } from '../compiler/DeterministicLayoutCompiler.js';
import { ExceptionHandler } from './ExceptionHandler.js';

export class ApiGatewayController {
  constructor(opts = {}) {
    this.maxRequestSize = opts.maxRequestSize || 65536; // 64KB
    this.rateLimitWindow = opts.rateLimitWindow || 60000; // 1 min
    this.maxRequestsPerWindow = opts.maxRequestsPerWindow || 10;
    this.defaultTimeout = opts.defaultTimeout || 30000; // 30s
    this.maxNicheLength = opts.maxNicheLength || 500;
    this.verbose = opts.verbose !== false;
    this._requestLog = [];
    this._rateTracker = new Map(); // clientId → { count, windowStart }
    this._exceptionHandler = new ExceptionHandler({ verbose: this.verbose });
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Primary entry point: receive a generation request, validate, sanitize,
   * and dispatch to the full pipeline.
   *
   * @param {Object} request — raw request from dashboard UI
   *   @param {string} request.nichePrompt — business description (required, max 500 chars)
   *   @param {string} [request.businessName] — brand name override
   *   @param {string} [request.locale] — content locale (default 'en-US')
   *   @param {Object} [request.overrides] — manual signal overrides
   *   @param {string} [request.clientId] — caller identification for rate limiting
   *   @param {number} [request.timeoutMs] — custom timeout override
   *   @param {boolean} [request.emitHTML] — emit standalone HTML documents
   *   @param {boolean} [request.editorEnabled] — enable inline editing stamps
   * @returns {Promise<Object>} { ok, site, meta, diagnostics, requestId } or { ok: false, error, diagnostics }
   */
  async generate(request = {}) {
    const requestId = this._generateRequestId();
    const startTime = performance.now();

    try {
      // ── Stage 1: Sanitize ───────────────────────────────────────────────────
      const sanitized = this._sanitizeRequest(request);
      this._log('GATEWAY', 'Request received', { requestId, nicheLength: sanitized.nichePrompt.length });

      // ── Stage 2: Validate ───────────────────────────────────────────────────
      const validation = this._validateRequest(sanitized);
      if (!validation.ok) {
        this._log('GATEWAY', 'Validation failed', { requestId, errors: validation.errors });
        return this._buildErrorResponse(requestId, 'VALIDATION_FAILED', validation.errors, startTime);
      }

      // ── Stage 3: Rate Limit ────────────────────────────────────────────────
      const rateCheck = this._checkRateLimit(sanitized.clientId || 'anonymous');
      if (!rateCheck.allowed) {
        this._log('GATEWAY', 'Rate limit exceeded', { requestId, retryAfter: rateCheck.retryAfter });
        return this._buildErrorResponse(requestId, 'RATE_LIMITED', [
          { code: 'RATE_LIMIT', message: `Too many requests. Retry after ${rateCheck.retryAfter}ms.` }
        ], startTime);
      }

      // ── Stage 4: Dispatch Pipeline ────────────────────────────────────────
      this._log('GATEWAY', 'Dispatching to IntelligenceEngine', { requestId });

      const engine = new IntelligenceEngine({
        locale: sanitized.locale,
        verbose: false
      });

      const plan = await this._withTimeout(
        engine.generateSite(sanitized.nichePrompt, {
          businessName: sanitized.businessName,
          maxDepth: sanitized.overrides?.maxDepth || 2
        }),
        sanitized.timeoutMs || this.defaultTimeout,
        'IntelligenceEngine.generateSite'
      );

      this._log('GATEWAY', 'IntelligenceEngine complete', {
        requestId,
        pages: Object.keys(plan.architecture.pages).length,
        duration: Math.round(performance.now() - startTime)
      });

      // ── Stage 5: Compile ────────────────────────────────────────────────────
      this._log('GATEWAY', 'Dispatching to DeterministicLayoutCompiler', { requestId });

      const compiler = new DeterministicLayoutCompiler({
        locale: sanitized.locale,
        verbose: false,
        editorEnabled: sanitized.editorEnabled !== false,
        emitHTML: sanitized.emitHTML !== false
      });

      const compiled = await this._withTimeout(
        Promise.resolve(compiler.compile(plan, sanitized.overrides || {})),
        sanitized.timeoutMs || this.defaultTimeout,
        'DeterministicLayoutCompiler.compile'
      );

      const totalDuration = Math.round(performance.now() - startTime);

      this._log('GATEWAY', 'Pipeline complete', {
        requestId,
        duration: totalDuration,
        pages: Object.keys(compiled.pages).length,
        editableNodes: compiled.editorRegistry?.length || 0,
        cssBundleSize: compiled.cssBundleSize || 0
      });

      // ── Stage 6: Build Success Response ───────────────────────────────────
      const response = {
        ok: true,
        requestId,
        meta: {
          nichePrompt: sanitized.nichePrompt,
          businessName: sanitized.businessName || compiled.meta?.siteName,
          locale: sanitized.locale,
          durationMs: totalDuration,
          generatedAt: new Date().toISOString(),
          pipelineVersion: 'mdx-gateway-v1'
        },
        site: {
          architecture: plan.architecture,
          pages: compiled.pages,
          navTree: compiled.navTree,
          cssBundle: compiled.cssBundle,
          emitted: compiled.emitted,
          editorRegistry: compiled.editorRegistry,
          linkMap: compiled.linkMap
        },
        diagnostics: {
          stages: ['sanitize', 'validate', 'rateLimit', 'intelligence', 'compile', 'emit'],
          completedStages: 6,
          intelligence: {
            pages: Object.keys(plan.architecture.pages).length,
            signals: plan.architecture.signals,
            imageAssets: plan.imageAssets?.length || 0
          },
          compiler: {
            cssBundleSize: compiled.cssBundleSize || 0,
            editableNodes: compiled.editorRegistry?.length || 0,
            emittedDocuments: compiled._stageSummary?.emit?.documents || 0
          }
        }
      };

      this._recordRequest(requestId, sanitized, response, totalDuration);
      return response;

    } catch (err) {
      const handled = this._exceptionHandler.handle(err, {
        requestId,
        context: 'ApiGatewayController.generate',
        inputs: { nichePrompt: request.nichePrompt?.slice(0, 100) }
      });

      return this._buildErrorResponse(
        requestId,
        handled.errorCode,
        handled.diagnostics.errors,
        startTime,
        handled.recoverySuggestion
      );
    }
  }

  /**
   * Quick health check endpoint.
   * @returns {Object} { ok, status, version, timestamp }
   */
  health() {
    return {
      ok: true,
      status: 'healthy',
      version: 'mdx-gateway-v1.0.0',
      timestamp: new Date().toISOString(),
      capabilities: ['generate', 'health', 'schema'],
      limits: {
        maxNicheLength: this.maxNicheLength,
        maxRequestSize: this.maxRequestSize,
        maxRequestsPerWindow: this.maxRequestsPerWindow,
        defaultTimeout: this.defaultTimeout
      }
    };
  }

  /**
   * Get the JSON schema for valid generation requests.
   * Useful for dashboard UI form validation.
   */
  schema() {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'MDX Generation Request',
      type: 'object',
      required: ['nichePrompt'],
      properties: {
        nichePrompt: {
          type: 'string',
          minLength: 10,
          maxLength: this.maxNicheLength,
          description: 'Business niche description for site generation'
        },
        businessName: {
          type: 'string',
          maxLength: 60,
          description: 'Optional brand name override'
        },
        locale: {
          type: 'string',
          enum: ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'es-ES', 'ja-JP', 'zh-CN'],
          default: 'en-US'
        },
        overrides: {
          type: 'object',
          properties: {
            maxDepth: { type: 'integer', minimum: 1, maximum: 3, default: 2 },
            colors: { type: 'object' },
            styleAssets: { type: 'object' }
          }
        },
        emitHTML: { type: 'boolean', default: true },
        editorEnabled: { type: 'boolean', default: true },
        timeoutMs: { type: 'integer', minimum: 5000, maximum: 120000, default: this.defaultTimeout },
        clientId: { type: 'string', maxLength: 64 }
      }
    };
  }

  /**
   * Get request history for a client.
   * @param {string} clientId
   * @param {number} limit
   */
  getRequestHistory(clientId, limit = 50) {
    return this._requestLog
      .filter(r => r.clientId === clientId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get aggregated statistics.
   */
  getStats() {
    const total = this._requestLog.length;
    const successful = this._requestLog.filter(r => r.success).length;
    const avgDuration = total > 0
      ? Math.round(this._requestLog.reduce((sum, r) => sum + r.duration, 0) / total)
      : 0;

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: total - successful,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      averageDurationMs: avgDuration,
      rateLimitHits: this._requestLog.filter(r => r.errorCode === 'RATE_LIMITED').length,
      validationFailures: this._requestLog.filter(r => r.errorCode === 'VALIDATION_FAILED').length,
      timeoutFailures: this._requestLog.filter(r => r.errorCode === 'TIMEOUT').length
    };
  }

  /* ── SANITIZATION ─────────────────────────────────────────────────────────── */

  _sanitizeRequest(raw) {
    const sanitized = {};

    // nichePrompt: trim, strip HTML, normalize whitespace, truncate
    if (typeof raw.nichePrompt === 'string') {
      sanitized.nichePrompt = raw.nichePrompt
        .replace(/<[^>]*>/g, '')           // strip HTML tags
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
        .replace(/\s+/g, ' ')               // normalize whitespace
        .trim()
        .slice(0, this.maxNicheLength);
    } else {
      sanitized.nichePrompt = '';
    }

    // businessName: trim, strip HTML, truncate
    if (typeof raw.businessName === 'string') {
      sanitized.businessName = raw.businessName
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 60);
    }

    // locale: whitelist only
    const validLocales = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'es-ES', 'ja-JP', 'zh-CN'];
    sanitized.locale = validLocales.includes(raw.locale) ? raw.locale : 'en-US';

    // overrides: deep clone, strip functions
    if (raw.overrides && typeof raw.overrides === 'object') {
      sanitized.overrides = JSON.parse(JSON.stringify(raw.overrides));
    }

    // booleans
    sanitized.emitHTML = raw.emitHTML !== false;
    sanitized.editorEnabled = raw.editorEnabled !== false;

    // timeout: clamp
    sanitized.timeoutMs = Math.min(
      Math.max(parseInt(raw.timeoutMs) || this.defaultTimeout, 5000),
      120000
    );

    // clientId: alphanumeric only
    if (typeof raw.clientId === 'string') {
      sanitized.clientId = raw.clientId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    return sanitized;
  }

  /* ── VALIDATION ───────────────────────────────────────────────────────────── */

  _validateRequest(sanitized) {
    const errors = [];

    if (!sanitized.nichePrompt || sanitized.nichePrompt.length < 10) {
      errors.push({
        code: 'NICHE_TOO_SHORT',
        field: 'nichePrompt',
        message: `nichePrompt must be at least 10 characters. Got ${sanitized.nichePrompt?.length || 0}.`
      });
    }

    if (sanitized.nichePrompt.length > this.maxNicheLength) {
      errors.push({
        code: 'NICHE_TOO_LONG',
        field: 'nichePrompt',
        message: `nichePrompt exceeds maximum length of ${this.maxNicheLength} characters.`
      });
    }

    // Check for common injection patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /<script/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /document\.cookie/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized.nichePrompt)) {
        errors.push({
          code: 'POTENTIAL_INJECTION',
          field: 'nichePrompt',
          message: 'Request contains potentially dangerous patterns.'
        });
        break;
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /* ── RATE LIMITING ─────────────────────────────────────────────────────────── */

  _checkRateLimit(clientId) {
    const now = Date.now();
    const record = this._rateTracker.get(clientId);

    if (!record || now - record.windowStart > this.rateLimitWindow) {
      this._rateTracker.set(clientId, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.maxRequestsPerWindow - 1 };
    }

    if (record.count >= this.maxRequestsPerWindow) {
      const retryAfter = this.rateLimitWindow - (now - record.windowStart);
      return { allowed: false, retryAfter };
    }

    record.count++;
    return { allowed: true, remaining: this.maxRequestsPerWindow - record.count };
  }

  /* ── TIMEOUT WRAPPER ───────────────────────────────────────────────────────── */

  _withTimeout(promise, ms, context) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`TIMEOUT: ${context} exceeded ${ms}ms`));
        }, ms);
      })
    ]);
  }

  /* ── RESPONSE BUILDERS ──────────────────────────────────────────────────────── */

  _buildErrorResponse(requestId, errorCode, errors, startTime, recoverySuggestion = null) {
    const duration = Math.round(performance.now() - startTime);

    return {
      ok: false,
      requestId,
      error: {
        code: errorCode,
        message: this._errorMessage(errorCode),
        errors,
        recoverySuggestion,
        timestamp: new Date().toISOString()
      },
      meta: { durationMs: duration, generatedAt: new Date().toISOString() },
      site: null,
      diagnostics: {
        stagesAttempted: ['sanitize', 'validate', 'rateLimit', 'intelligence', 'compile', 'emit'],
        failedAt: errorCode,
        errors: errors.map(e => ({ ...e, severity: 'error' }))
      }
    };
  }

  _errorMessage(code) {
    const messages = {
      VALIDATION_FAILED: 'Request validation failed. Check the errors array for details.',
      RATE_LIMITED: 'Too many requests from this client. Please wait before retrying.',
      TIMEOUT: 'Generation exceeded the configured timeout. Try with a simpler niche or increase timeout.',
      INTELLIGENCE_ERROR: 'The intelligence engine encountered an error analyzing your niche.',
      COMPILE_ERROR: 'The layout compiler failed to assemble the site.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Contact support with the requestId.'
    };
    return messages[code] || messages.UNKNOWN_ERROR;
  }

  /* ── LOGGING & TRACKING ─────────────────────────────────────────────────────── */

  _generateRequestId() {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  _recordRequest(requestId, request, response, duration) {
    this._requestLog.push({
      requestId,
      clientId: request.clientId || 'anonymous',
      nichePrompt: request.nichePrompt.slice(0, 100),
      success: response.ok,
      errorCode: response.error?.code || null,
      duration,
      timestamp: Date.now(),
      pageCount: response.site?.pages ? Object.keys(response.site.pages).length : 0
    });

    // Trim log to prevent memory bloat
    if (this._requestLog.length > 1000) {
      this._requestLog = this._requestLog.slice(-500);
    }
  }

  _log(stage, message, data = {}) {
    if (this.verbose) {
      console.log(`[ApiGatewayController::${stage}] ${message}`, data);
    }
  }
}
