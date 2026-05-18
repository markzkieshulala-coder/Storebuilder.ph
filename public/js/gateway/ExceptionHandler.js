/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXCEPTION HANDLER — Graceful Error Interception & Diagnostic Reporting
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Intercepts generation timeouts, layout compilation errors, intelligence failures,
 * and any runtime crashes during the pipeline. Produces clean diagnostic warning
 * blocks for the frontend instead of raw stack traces or silent failures.
 *
 * @module ExceptionHandler
 * @author MDX Gateway Routing Layer
 */

export class ExceptionHandler {
  constructor(opts = {}) {
    this.verbose = opts.verbose !== false;
    this.includeStackTrace = opts.includeStackTrace || false;
    this._errorLog = [];
    this._circuitBreaker = new Map(); // context → { failures, lastFailure, open }
    this.circuitThreshold = opts.circuitThreshold || 5;
    this.circuitResetMs = opts.circuitResetMs || 30000; // 30s
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Main entry: catch any error and produce a structured diagnostic response.
   *
   * @param {Error} error — the thrown error/exception
   * @param {Object} context — execution context
   *   @param {string} context.requestId — originating request ID
   *   @param {string} context.context — pipeline stage name
   *   @param {Object} context.inputs — sanitized inputs that caused the error
   * @returns {Object} { errorCode, severity, diagnostics, recoverySuggestion, safeToRetry }
   */
  handle(error, context = {}) {
    const { requestId = 'unknown', context: stage = 'unknown', inputs = {} } = context;
    const now = Date.now();

    // Classify the error
    const classification = this._classify(error, stage);

    // Update circuit breaker
    this._updateCircuitBreaker(stage, classification.severity);

    // Check if circuit is open
    const circuitState = this._getCircuitState(stage);
    if (circuitState.open) {
      classification.errorCode = 'CIRCUIT_OPEN';
      classification.severity = 'critical';
      classification.recoverySuggestion = `Service temporarily unavailable for ${stage}. Retry after ${Math.ceil(circuitState.retryAfter / 1000)}s.`;
      classification.safeToRetry = false;
    }

    // Build diagnostic block
    const diagnostic = {
      errorCode: classification.errorCode,
      severity: classification.severity,
      diagnostics: {
        requestId,
        stage,
        errorType: error.name || 'Error',
        errorMessage: this._sanitizeMessage(error.message || String(error)),
        timestamp: new Date().toISOString(),
        inputs: this._safeInputs(inputs),
        stackTrace: this.includeStackTrace ? this._sanitizeStack(error.stack) : undefined,
        circuitState: circuitState,
        suggestions: classification.suggestions
      },
      recoverySuggestion: classification.recoverySuggestion,
      safeToRetry: classification.safeToRetry
    };

    // Log the error
    this._logError(diagnostic);

    if (this.verbose) {
      console.error(`[ExceptionHandler::${stage}] ${classification.errorCode}: ${error.message}`, {
        requestId,
        severity: classification.severity,
        safeToRetry: classification.safeToRetry
      });
    }

    return diagnostic;
  }

  /**
   * Check if a context's circuit breaker is open.
   * @param {string} context — pipeline stage name
   */
  isCircuitOpen(context) {
    const state = this._getCircuitState(context);
    return state.open;
  }

  /**
   * Reset circuit breaker for a context.
   * @param {string} context
   */
  resetCircuit(context) {
    this._circuitBreaker.delete(context);
  }

  /**
   * Get all circuit breaker states.
   */
  getCircuitStates() {
    const states = {};
    this._circuitBreaker.forEach((record, context) => {
      states[context] = this._getCircuitState(context);
    });
    return states;
  }

  /**
   * Get recent error log.
   * @param {number} limit
   */
  getErrorLog(limit = 50) {
    return this._errorLog.slice(-limit);
  }

  /**
   * Get error statistics.
   */
  getStats() {
    const total = this._errorLog.length;
    const bySeverity = { error: 0, warn: 0, critical: 0 };
    const byCode = {};

    this._errorLog.forEach(e => {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      byCode[e.errorCode] = (byCode[e.errorCode] || 0) + 1;
    });

    return { total, bySeverity, byCode, circuitBreakers: this.getCircuitStates() };
  }

  /* ── ERROR CLASSIFICATION ─────────────────────────────────────────────────── */

  _classify(error, stage) {
    const msg = (error.message || String(error)).toLowerCase();
    const name = error.name || 'Error';

    // Timeout patterns
    if (msg.includes('timeout') || msg.includes('exceeded') || name === 'TimeoutError') {
      return {
        errorCode: 'TIMEOUT',
        severity: 'warn',
        recoverySuggestion: 'The generation took too long. Try with a shorter niche prompt, reduce maxDepth, or increase the timeoutMs parameter.',
        safeToRetry: true,
        suggestions: ['Reduce niche prompt length', 'Lower maxDepth to 1', 'Increase timeoutMs to 60000']
      };
    }

    // Intelligence / AI patterns
    if (stage === 'IntelligenceEngine' || msg.includes('intelligence') || msg.includes('plan')) {
      return {
        errorCode: 'INTELLIGENCE_ERROR',
        severity: 'error',
        recoverySuggestion: 'The niche analyzer failed. Try rephrasing your business description with clearer industry keywords (e.g., "luxury leather goods", "fine dining restaurant", "architectural studio").',
        safeToRetry: true,
        suggestions: ['Use clearer industry keywords', 'Specify a geographic location', 'Mention price tier (luxury, affordable, etc.)']
      };
    }

    // Compilation patterns
    if (stage === 'DeterministicLayoutCompiler' || msg.includes('compile') || msg.includes('stitch') || msg.includes('layout')) {
      return {
        errorCode: 'COMPILE_ERROR',
        severity: 'error',
        recoverySuggestion: 'The layout assembler encountered an issue. This may be due to an incompatible section layout mapping. Try regenerating with default overrides.',
        safeToRetry: true,
        suggestions: ['Clear manual overrides', 'Use default layout registry', 'Check section type names']
      };
    }

    // Validation patterns
    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
      return {
        errorCode: 'VALIDATION_ERROR',
        severity: 'warn',
        recoverySuggestion: 'Input validation failed. Check that all required fields are present and within allowed limits.',
        safeToRetry: true,
        suggestions: ['Check required fields', 'Verify field lengths', 'Review schema constraints']
      };
    }

    // Network / fetch patterns
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('cors') || msg.includes('failed to load')) {
      return {
        errorCode: 'NETWORK_ERROR',
        severity: 'warn',
        recoverySuggestion: 'A network request failed during generation. Check your internet connection and retry.',
        safeToRetry: true,
        suggestions: ['Check network connection', 'Retry the request', 'Verify CDN / image URLs are accessible']
      };
    }

    // Memory / performance patterns
    if (msg.includes('memory') || msg.includes('allocation') || msg.includes('out of memory')) {
      return {
        errorCode: 'RESOURCE_EXHAUSTED',
        severity: 'critical',
        recoverySuggestion: 'The generation consumed too much memory. Try a smaller site scope or reduce the number of sections.',
        safeToRetry: false,
        suggestions: ['Reduce maxDepth to 1', 'Request fewer pages', 'Clear browser cache', 'Close other tabs']
      };
    }

    // DOM / browser patterns
    if (name === 'DOMException' || msg.includes('dom') || msg.includes('parser') || msg.includes('not supported')) {
      return {
        errorCode: 'BROWSER_COMPATIBILITY',
        severity: 'error',
        recoverySuggestion: 'Your browser may not support a required feature. Try using a modern browser (Chrome 90+, Firefox 88+, Safari 14+).',
        safeToRetry: false,
        suggestions: ['Update your browser', 'Try Chrome or Firefox', 'Disable browser extensions']
      };
    }

    // Default fallback
    return {
      errorCode: 'UNKNOWN_ERROR',
      severity: 'error',
      recoverySuggestion: 'An unexpected error occurred. Please retry the request. If the issue persists, contact support with the request ID.',
      safeToRetry: true,
      suggestions: ['Retry the request', 'Check browser console for details', 'Contact support with requestId']
    };
  }

  /* ── CIRCUIT BREAKER ──────────────────────────────────────────────────────── */

  _updateCircuitBreaker(context, severity) {
    const now = Date.now();
    const record = this._circuitBreaker.get(context) || { failures: 0, lastFailure: 0, open: false };

    if (severity === 'critical' || severity === 'error') {
      record.failures++;
      record.lastFailure = now;

      if (record.failures >= this.circuitThreshold) {
        record.open = true;
      }
    }

    // Decay old failures
    if (now - record.lastFailure > this.circuitResetMs) {
      record.failures = Math.max(0, record.failures - 1);
      if (record.failures < this.circuitThreshold) {
        record.open = false;
      }
    }

    this._circuitBreaker.set(context, record);
  }

  _getCircuitState(context) {
    const record = this._circuitBreaker.get(context);
    if (!record) return { open: false, failures: 0, retryAfter: 0 };

    const now = Date.now();
    const timeSinceLast = now - record.lastFailure;

    if (record.open && timeSinceLast < this.circuitResetMs) {
      return {
        open: true,
        failures: record.failures,
        retryAfter: this.circuitResetMs - timeSinceLast
      };
    }

    // Auto-close after reset period
    if (record.open && timeSinceLast >= this.circuitResetMs) {
      record.open = false;
      record.failures = Math.max(0, record.failures - 2);
      this._circuitBreaker.set(context, record);
    }

    return { open: false, failures: record.failures, retryAfter: 0 };
  }

  /* ── SANITIZATION ───────────────────────────────────────────────────────────── */

  _sanitizeMessage(msg) {
    if (!msg) return 'Unknown error';
    return msg
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .slice(0, 500);
  }

  _sanitizeStack(stack) {
    if (!stack) return undefined;
    return stack
      .split('\n')
      .slice(0, 10) // Limit to 10 frames
      .map(line => line.replace(/\(.*?\)/, '(...)')) // Strip absolute paths
      .join('\n');
  }

  _safeInputs(inputs) {
    // Only log safe, non-sensitive input summaries
    const safe = {};
    if (inputs.nichePrompt) {
      safe.nichePrompt = String(inputs.nichePrompt).slice(0, 100) + '...';
    }
    if (inputs.businessName) {
      safe.businessName = String(inputs.businessName).slice(0, 30);
    }
    if (inputs.locale) {
      safe.locale = String(inputs.locale);
    }
    return safe;
  }

  /* ── LOGGING ───────────────────────────────────────────────────────────────── */

  _logError(diagnostic) {
    this._errorLog.push({
      errorCode: diagnostic.errorCode,
      severity: diagnostic.severity,
      timestamp: Date.now(),
      requestId: diagnostic.diagnostics?.requestId,
      stage: diagnostic.diagnostics?.stage
    });

    // Trim to prevent unbounded growth
    if (this._errorLog.length > 500) {
      this._errorLog = this._errorLog.slice(-250);
    }
  }
}
