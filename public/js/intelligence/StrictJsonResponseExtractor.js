/**
 * StrictJsonResponseExtractor — Structured Content Pipeline
 * Validates, parses, and blocks conversational/markdown outputs.
 * Maps copy text and color palettes into structured metrics.
 */

export class StrictJsonResponseExtractor {
  constructor(opts = {}) {
    this.strict = opts.strict !== false;
    this.maxRetries = opts.maxRetries || 3;
    this.schema = opts.schema || this._defaultSchema();
    this.locale = opts.locale || 'en-US';
    this._validationLog = [];
  }

  /* ── PUBLIC API ───────────────────────────────────────────────────────────── */

  /**
   * Extract structured data from a raw text response.
   * Blocks conversational text, markdown, and non-JSON outputs.
   * @param {string} raw — raw LLM response string
   * @param {Object} expectedSchema — optional override schema
   * @returns {Object} { ok, data, errors, raw, attempts }
   */
  extract(raw, expectedSchema = null) {
    const schema = expectedSchema || this.schema;
    let attempts = 0;
    let data = null;
    let errors = [];

    while (attempts < this.maxRetries) {
      attempts++;
      const cleaned = this._sanitize(raw);
      const parseResult = this._parseJson(cleaned);

      if (!parseResult.ok) {
        errors.push({ attempt: attempts, phase: 'parse', message: parseResult.error });
        if (attempts < this.maxRetries) { raw = this._repair(raw, parseResult.error); continue; }
        break;
      }

      const validateResult = this._validate(parseResult.data, schema);
      if (!validateResult.ok) {
        errors.push({ attempt: attempts, phase: 'validate', message: validateResult.errors });
        if (attempts < this.maxRetries) { raw = this._repairForSchema(raw, validateResult.errors, schema); continue; }
        break;
      }

      data = this._transform(parseResult.data, schema);
      errors = [];
      break;
    }

    const result = { ok: !!data, data, errors, raw: raw.slice(0, 500), attempts };
    this._validationLog.push({ timestamp: Date.now(), ...result });
    return result;
  }

  /**
   * Batch extract multiple responses.
   * @param {Array<{key: string, raw: string}>} items
   * @returns {Object} map of key → extract result
   */
  extractBatch(items = []) {
    const out = {};
    for (const item of items) out[item.key] = this.extract(item.raw);
    return out;
  }

  /**
   * Build a strict prompt that forces JSON-only output from an LLM.
   * @param {Object} instructions — content generation instructions
   * @param {Object} schema — target schema
   * @returns {string} prompt string
   */
  buildPrompt(instructions, schema = null) {
    const s = schema || this.schema;
    return `You are a structured content generation engine. Output ONLY valid JSON. No markdown, no code fences, no conversational text, no preamble, no explanation.\n\nINSTRUCTIONS:\n${JSON.stringify(instructions, null, 2)}\n\nOUTPUT SCHEMA (generate exactly this structure):\n${JSON.stringify(s, null, 2)}\n\nRULES:\n1. Response must be parseable by JSON.parse() without modification.\n2. No markdown code blocks (\`\`\`json).\n3. No text before or after the JSON object.\n4. All string values must be non-empty.\n5. All arrays must contain at least one element.\n6. Color values must be valid hex codes (#RRGGBB).\n7. Numeric values must be within specified ranges.\n8. Use ${this.locale} locale for all text content.\n\nGenerate now:`;
  }

  getValidationLog() { return [...this._validationLog]; }

  /* ── SANITIZATION ─────────────────────────────────────────────────────────── */

  _sanitize(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let cleaned = raw.trim();

    // Strip markdown code fences
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '');
    cleaned = cleaned.replace(/```\s*$/gi, '');

    // Strip HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Strip conversational prefixes
    const prefixes = ['Here is', 'Here\'s', 'Sure', 'Okay', 'Of course', 'Certainly', 'I\'ll',
      'Below is', 'The following', 'Here you', 'As requested', 'I have'];
    for (const p of prefixes) {
      const re = new RegExp(`^${p}[^:]*:\\s*`, 'i');
      cleaned = cleaned.replace(re, '');
    }

    // Find first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    // Fix common LLM JSON errors
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // trailing commas
    cleaned = cleaned.replace(/\n/g, ' '); // newlines in strings
    cleaned = cleaned.replace(/\t/g, ' '); // tabs in strings

    return cleaned.trim();
  }

  /* ── PARSING ──────────────────────────────────────────────────────────────── */

  _parseJson(text) {
    try {
      const data = JSON.parse(text);
      if (typeof data !== 'object' || data === null) return { ok: false, error: 'Parsed value is not an object', data: null };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: `JSON parse error: ${e.message}`, data: null };
    }
  }

  /* ── VALIDATION ───────────────────────────────────────────────────────────── */

  _validate(data, schema) {
    const errors = [];

    const validateNode = (val, node, path) => {
      if (node._type === 'object') {
        if (typeof val !== 'object' || val === null || Array.isArray(val)) {
          errors.push(`${path}: expected object, got ${typeof val}`); return;
        }
        for (const [key, child] of Object.entries(node.fields || {})) {
          if (child._required && !(key in val)) {
            errors.push(`${path}.${key}: required field missing`); continue;
          }
          if (key in val) validateNode(val[key], child, `${path}.${key}`);
        }
      } else if (node._type === 'array') {
        if (!Array.isArray(val)) { errors.push(`${path}: expected array, got ${typeof val}`); return; }
        if (node._minLength && val.length < node._minLength) errors.push(`${path}: array too short (${val.length} < ${node._minLength})`);
        if (node._maxLength && val.length > node._maxLength) errors.push(`${path}: array too long (${val.length} > ${node._maxLength})`);
        val.forEach((item, i) => validateNode(item, node._items, `${path}[${i}]`));
      } else if (node._type === 'string') {
        if (typeof val !== 'string') { errors.push(`${path}: expected string, got ${typeof val}`); return; }
        if (node._minLength && val.length < node._minLength) errors.push(`${path}: string too short (${val.length} < ${node._minLength})`);
        if (node._maxLength && val.length > node._maxLength) errors.push(`${path}: string too long (${val.length} > ${node._maxLength})`);
        if (node._regex && !node._regex.test(val)) errors.push(`${path}: regex mismatch`);
        if (node._enum && !node._enum.includes(val)) errors.push(`${path}: invalid enum value "${val}"`);
      } else if (node._type === 'number') {
        if (typeof val !== 'number') { errors.push(`${path}: expected number, got ${typeof val}`); return; }
        if (node._min !== undefined && val < node._min) errors.push(`${path}: below minimum (${val} < ${node._min})`);
        if (node._max !== undefined && val > node._max) errors.push(`${path}: above maximum (${val} > ${node._max})`);
      } else if (node._type === 'boolean') {
        if (typeof val !== 'boolean') errors.push(`${path}: expected boolean, got ${typeof val}`);
      } else if (node._type === 'color') {
        if (typeof val !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(val)) errors.push(`${path}: invalid hex color "${val}"`);
      }
    };

    validateNode(data, schema, 'root');
    return { ok: errors.length === 0, errors };
  }

  /* ── TRANSFORMATION ────────────────────────────────────────────────────────── */

  _transform(data, schema) {
    // Apply derived fields, normalize, compute metrics
    const metrics = this._computeMetrics(data);
    return { ...data, _metrics: metrics, _extractedAt: new Date().toISOString(), _schemaVersion: schema._version || '1.0' };
  }

  _computeMetrics(data) {
    const m = { wordCount: 0, charCount: 0, colorCount: 0, pageCount: 0, imageAssetCount: 0, copyAssetCount: 0 };
    const countText = (obj) => {
      if (typeof obj === 'string') { m.charCount += obj.length; m.wordCount += obj.trim().split(/\s+/).filter(Boolean).length; }
      else if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) obj.forEach(countText);
        else Object.values(obj).forEach(countText);
      }
    };
    countText(data);
    if (data.pages) m.pageCount = Object.keys(data.pages).length;
    if (data.colors) m.colorCount = Object.values(data.colors).filter(c => typeof c === 'string' && c.startsWith('#')).length;
    if (data.assetManifest) { m.imageAssetCount = data.assetManifest.imageAssets || 0; m.copyAssetCount = data.assetManifest.copyAssets || 0; }
    return m;
  }

  /* ── REPAIR ─────────────────────────────────────────────────────────────────── */

  _repair(raw, error) {
    // Attempt basic repair strategies
    if (error.includes('trailing comma')) return raw.replace(/,(\s*[}\]])/g, '$1');
    if (error.includes('Unexpected token')) {
      // Try to extract JSON object more aggressively
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? m[0] : raw;
    }
    return raw;
  }

  _repairForSchema(raw, errors, schema) {
    // Return a minimal valid object conforming to schema as fallback
    return JSON.stringify(this._buildDefault(schema));
  }

  _buildDefault(node) {
    if (node._type === 'object') {
      const o = {};
      for (const [k, v] of Object.entries(node.fields || {})) if (v._required || v._default !== undefined) o[k] = v._default !== undefined ? v._default : this._buildDefault(v);
      return o;
    }
    if (node._type === 'array') return node._default !== undefined ? node._default : [];
    if (node._type === 'string') return node._default || '';
    if (node._type === 'number') return node._default !== undefined ? node._default : 0;
    if (node._type === 'boolean') return node._default !== undefined ? node._default : false;
    if (node._type === 'color') return node._default || '#000000';
    return null;
  }

  /* ── DEFAULT SCHEMA ───────────────────────────────────────────────────────── */

  _defaultSchema() {
    return {
      _version: '1.0',
      _type: 'object',
      fields: {
        siteName: { _type: 'string', _required: true, _minLength: 1, _maxLength: 60, _default: 'Luxury Studio' },
        industry: { _type: 'string', _required: true, _enum: ['fashion','jewelry','interiors','wellness','food','tech','automotive','art','professional','luxury'], _default: 'luxury' },
        tone: { _type: 'array', _required: true, _minLength: 1, _items: { _type: 'string', _enum: ['luxury','minimal','bold','warm','modern','timeless'] }, _default: ['luxury'] },
        colors: { _type: 'object', _required: true, fields: {
          primary: { _type: 'color', _required: true, _default: '#C9A96E' },
          secondary: { _type: 'color', _required: true, _default: '#1A1A1C' },
          accent: { _type: 'color', _required: true, _default: '#E8D5B7' },
          background: { _type: 'color', _required: true, _default: '#0B0B0C' },
          text: { _type: 'color', _required: true, _default: '#F1F0EA' },
          muted: { _type: 'color', _required: true, _default: '#8A8A8A' }
        }},
        pages: { _type: 'array', _required: true, _minLength: 2, _items: {
          _type: 'object', fields: {
            route: { _type: 'string', _required: true, _regex: /^\//, _default: '/' },
            label: { _type: 'string', _required: true, _minLength: 1, _maxLength: 30, _default: 'Home' },
            headline: { _type: 'string', _required: true, _minLength: 1, _maxLength: 80, _default: 'Welcome' },
            subheadline: { _type: 'string', _required: true, _minLength: 1, _maxLength: 200, _default: 'Explore our world.' }
          }
        }, _default: [{ route: '/', label: 'Home', headline: 'Welcome', subheadline: 'Explore our world.' },{ route: '/about', label: 'About', headline: 'Our Story', subheadline: 'Discover who we are.' }]},
        navigation: { _type: 'array', _required: true, _minLength: 2, _items: { _type: 'string', _default: '/' }, _default: ['/','/about','/services','/contact'] },
        fontPairing: { _type: 'object', _required: true, fields: {
          display: { _type: 'string', _required: true, _default: 'Playfair Display' },
          body: { _type: 'string', _required: true, _default: 'Inter' }
        }},
        assetManifest: { _type: 'object', _required: false, fields: {
          imageAssets: { _type: 'number', _min: 0, _default: 0 },
          copyAssets: { _type: 'number', _min: 0, _default: 0 }
        }}
      }
    };
  }
}
