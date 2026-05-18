/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTEXTUAL IMAGE PROMPT GENERATOR — Hyper-Detailed Studio Photography Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Accepts a product/service item name + the site's extracted signals from
 * ArchitecturePlanner, then writes cinematic, hyper-detailed studio photography
 * description prompts. Every image asset on the site receives a unique,
 * descriptive prompt that is 100% accurate to the niche.
 *
 * @module ContextualImagePromptGenerator
 * @author MDX Intelligence Engine
 */

export class ContextualImagePromptGenerator {
  /**
   * @param {Object} opts
   * @param {Object} opts.signals — ArchitecturePlanner signals object
   * @param {string} opts.locale — prompt locale (default: 'en-US')
   * @param {number} opts.promptLength — target prompt length in chars (default: 350)
   */
  constructor(opts = {}) {
    this.signals = opts.signals || { industry: 'luxury', tone: ['luxury', 'minimal'], priceTier: 'luxury' };
    this.locale = opts.locale || 'en-US';
    this.promptLength = opts.promptLength || 350;

    this._templateCache = new Map();
    this._shotVocabulary = this._buildShotVocabulary();
    this._lightingVocabulary = this._buildLightingVocabulary();
    this._materialVocabulary = this._buildMaterialVocabulary();
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────────────── */

  /**
   * Generate a hyper-detailed studio photography prompt for a single asset.
   *
   * @param {Object} asset
   * @param {string} asset.name — item/product/service name (e.g., "Minimalist Leather Cardholder")
   * @param {string} asset.context — slot context from ArchitecturePlanner (e.g., "Hero product photography")
   * @param {string} [asset.aspect] — image aspect ratio (e.g., "16:9", "4:5")
   * @param {string} [asset.slotType] — slot type from ArchitecturePlanner (e.g., "heroImage", "feature")
   * @returns {Object} { prompt, negativePrompt, metadata }
   */
  generate(asset = {}) {
    const { name = 'Unnamed Item', context = 'Product photography', aspect = '16:9', slotType = 'image' } = asset;

    const parsed = this._parseItemName(name);
    const shot = this._selectShotType(slotType, context);
    const lighting = this._selectLighting(context, parsed.material);
    const composition = this._buildComposition(aspect, shot, parsed);
    const styling = this._buildStyling(parsed, context);
    const atmosphere = this._buildAtmosphere();
    const technical = this._buildTechnical(aspect, shot);

    const prompt = this._assemblePrompt({
      subject: this._buildSubjectDescription(parsed, name),
      shot,
      lighting,
      composition,
      styling,
      atmosphere,
      technical
    });

    const negativePrompt = this._buildNegativePrompt(parsed);

    return {
      prompt,
      negativePrompt,
      metadata: {
        name,
        aspect,
        slotType,
        context,
        estimatedCharCount: prompt.length,
        targetLength: this.promptLength,
        industry: this.signals.industry,
        tone: this.signals.tone,
        materialDetected: parsed.material,
        colorDetected: parsed.color,
        shotType: shot.type,
        lightingStyle: lighting.style
      }
    };
  }

  /**
   * Batch-generate prompts for an entire site architecture.
   * Accepts the output of ArchitecturePlanner.getAllContentSlots().
   *
   * @param {Array} slots — content slots with hasImage:true
   * @returns {Array} enriched slots with prompt, negativePrompt, metadata
   */
  generateBatch(slots = []) {
    return slots
      .filter(slot => slot.hasImage || slot.type?.includes('Image'))
      .map(slot => {
        const generated = this.generate({
          name: slot.sectionName || slot.context || 'Unnamed Asset',
          context: `${slot.pageLabel} — ${slot.sectionName} — ${slot.context}`,
          aspect: slot.aspect || '16:9',
          slotType: slot.type
        });
        return {
          ...slot,
          imagePrompt: generated.prompt,
          negativePrompt: generated.negativePrompt,
          promptMetadata: generated.metadata
        };
      });
  }

  /**
   * Generate a prompt for a specific named product item.
   * Force-accurate to the exact item name.
   *
   * @param {string} itemName — e.g., "Minimalist Leather Cardholder"
   * @param {Object} overrides — optional overrides for shot, lighting, etc.
   */
  generateForProduct(itemName, overrides = {}) {
    const generated = this.generate({
      name: itemName,
      context: overrides.context || 'Individual product hero shot',
      aspect: overrides.aspect || '4:5',
      slotType: overrides.slotType || 'itemImage'
    });
    return generated;
  }

  /* ── ITEM NAME PARSER ─────────────────────────────────────────────────────── */

  _parseItemName(name) {
    const text = name.toLowerCase();
    const result = {
      material: null,
      color: null,
      form: null,
      size: null,
      style: [],
      texture: null,
      finish: null
    };

    // Materials
    const materials = {
      leather: ['leather', 'calfskin', 'nappa', 'saffiano', 'patent leather', 'suede', 'nubuck'],
      metal: ['gold', 'silver', 'brass', 'copper', 'bronze', 'titanium', 'platinum', 'sterling'],
      stone: ['marble', 'granite', 'onyx', 'travertine', 'limestone', 'quartz'],
      wood: ['walnut', 'oak', 'ash', 'teak', 'rosewood', 'ebony', 'birch', 'maple'],
      glass: ['crystal', 'glass', 'murano', 'blown glass'],
      textile: ['linen', 'cashmere', 'silk', 'velvet', 'wool', 'cotton', 'denim', 'canvas'],
      ceramic: ['porcelain', 'ceramic', 'stoneware', 'earthenware'],
      composite: ['carbon fiber', 'resin', 'acrylic', 'plexiglass', 'composite']
    };
    for (const [mat, words] of Object.entries(materials)) {
      if (words.some(w => text.includes(w))) result.material = mat;
    }

    // Colors
    const colors = {
      black: ['black', ' noir', 'obsidian', 'jet', 'ebony', 'carbon'],
      white: ['white', 'ivory', 'cream', 'off-white', 'alabaster', 'bone'],
      neutral: ['beige', 'taupe', 'greige', 'sand', 'oat', 'stone', 'mushroom'],
      brown: ['brown', 'cognac', 'tan', 'camel', 'hazelnut', 'chestnut', 'mocha'],
      gray: ['gray', 'grey', 'slate', 'charcoal', 'graphite', 'ash', 'steel'],
      navy: ['navy', 'midnight', 'indigo', 'sapphire'],
      green: ['green', 'olive', 'sage', 'emerald', 'forest', 'moss'],
      red: ['red', 'burgundy', 'bordeaux', 'wine', 'crimson', 'ruby'],
      gold: ['gold', 'champagne', 'amber', 'brass', 'metallic gold']
    };
    for (const [col, words] of Object.entries(colors)) {
      if (words.some(w => text.includes(w))) result.color = col;
    }

    // Style modifiers
    const styleMap = {
      minimal: ['minimal', 'minimalist', 'pared-back', 'reductive', 'essential'],
      maximal: ['maximal', 'ornate', 'baroque', 'decorative', 'embellished'],
      modern: ['modern', 'contemporary', 'current', 'present-day'],
      classic: ['classic', 'traditional', 'heritage', 'vintage', 'timeless'],
      brutalist: ['brutalist', 'raw', 'industrial', 'monolithic'],
      organic: ['organic', 'flowing', 'biomorphic', 'curved', 'soft'],
      geometric: ['geometric', 'angular', 'faceted', 'prismatic', 'cubic']
    };
    for (const [style, words] of Object.entries(styleMap)) {
      if (words.some(w => text.includes(w))) result.style.push(style);
    }

    // Form factors
    const forms = {
      vessel: ['vase', 'bowl', 'vessel', 'urn', 'jar', 'pot'],
      flat: ['cardholder', 'wallet', 'tray', 'placemat', 'coaster', 'dish'],
      upright: ['lamp', 'vase', 'sculpture', 'bust', 'figure'],
      container: ['bag', 'tote', 'pouch', 'box', 'case', 'chest'],
      wearable: ['watch', 'ring', 'necklace', 'bracelet', 'earring', 'brooch'],
      furniture: ['chair', 'table', 'stool', 'bench', 'shelf', 'console'],
      accessory: ['belt', 'strap', 'bookmark', 'keychain', 'pen', 'cufflink']
    };
    for (const [form, words] of Object.entries(forms)) {
      if (words.some(w => text.includes(w))) result.form = form;
    }

    // Texture / Finish
    const textures = {
      matte: ['matte', 'flat', 'soft-touch', 'velvet-touch'],
      glossy: ['gloss', 'high-gloss', 'lacquer', 'polished', 'shiny'],
      textured: ['textured', 'grained', 'pebbled', 'embossed', 'stamped'],
      smooth: ['smooth', 'slick', 'sleek', 'streamlined'],
      brushed: ['brushed', 'satin', 'hairline'],
      patinated: ['patina', 'oxidized', 'aged', 'distressed', 'vintage finish']
    };
    for (const [tex, words] of Object.entries(textures)) {
      if (words.some(w => text.includes(w))) result.texture = tex;
    }

    return result;
  }

  /* ── VOCABULARY BUILDERS ──────────────────────────────────────────────────── */

  _buildShotVocabulary() {
    const s = this.signals;
    const industry = s.industry || 'luxury';
    const tone = s.tone || ['luxury'];

    const baseShots = {
      hero: {
        angles: ['three-quarter hero', 'dramatic low-angle', 'monumental straight-on', 'cinematic wide'],
        depth: ['shallow depth of field', 'atmospheric haze', 'deep focus with layered background'],
        framing: ['full-bleed edge-to-edge', 'generous negative space above', 'asymmetric weighting']
      },
      detail: {
        angles: ['macro perpendicular', 'extreme close-up at 45°', 'surface grazing angle'],
        depth: ['paper-thin focus plane', 'bokeh falloff', 'detail-to-abstraction gradient'],
        framing: ['tight crop with bleed', 'off-center detail anchor', 'extreme magnification']
      },
      lifestyle: {
        angles: ['environmental context shot', 'hands-in-frame interaction', 'natural-use tableau'],
        depth: ['environmental focus', 'subject-to-setting relationship'],
        framing: ['editorial spacing', 'lifestyle context inclusion', 'scene composition']
      },
      flatlay: {
        angles: ['overhead perpendicular', 'near-overhead with subtle tilt', 'tabletop orthogonal'],
        depth: ['uniform focus plane', 'staged depth layers', 'surface-locked flatness'],
        framing: ['grid-structured', 'asymmetric cluster', 'minimal single-object']
      },
      portrait: {
        angles: ['eye-level intimate', 'three-quarter torso', 'environmental full-body'],
        depth: ['shallow focus on gaze', 'environmental context'],
        framing: ['rule-of-thirds face', 'centered monumental', 'off-balance tension']
      }
    };

    return baseShots;
  }

  _buildLightingVocabulary() {
    const s = this.signals;
    const tier = s.priceTier || 'luxury';
    const tone = s.tone || [];

    const moods = {
      luxury: 'soft diffused key light with subtle rim separation, controlled shadow density, warm undertone',
      minimal: 'clinical even illumination, near-shadowless, high-key with subtle gradient falloff',
      bold: 'hard directional source, deep sculptural shadows, high contrast ratio, dramatic chiaroscuro',
      warm: 'golden-hour quality, wrap-around softness, ambient bounce, intimate luminance',
      modern: 'clean white-balanced source, precise edge definition, minimal bounce, architectural clarity',
      timeless: 'Rembrandt-style key with fill ratio, classical portrait lighting, dimensional depth'
    };

    const modifiers = {
      ultra: ['museum-grade spotlighting', 'jewelry-case precision', 'halo backlight separation'],
      luxury: ['softbox diffusion', 'scrim gradient', 'subtle kicker rim'],
      mid: ['umbrella bounce', 'natural window quality', 'soft fill'],
      entry: ['even LED panel', 'clean flat light', 'minimal shadow']
    };

    const selectedMood = tone.find(t => moods[t]) || 'luxury';
    const selectedMod = modifiers[tier] || modifiers.luxury;

    return { moods, modifiers, selectedMood, selectedMod };
  }

  _buildMaterialVocabulary() {
    return {
      leather: {
        surface: ['natural grain topology', 'patina development', 'tactile creasing', 'dye saturation depth'],
        light: ['sub-surface light scatter', 'warm tonal absorption', 'edge highlight burnishing'],
        shadow: ['deep crease pooling', 'grain texture shadow detail']
      },
      metal: {
        surface: ['machined surface striation', 'mirror reflectivity', 'oxidation micro-detail', 'facet specularity'],
        light: ['specular hotspot', 'environment map reflection', 'anisotropic highlight'],
        shadow: ['contact shadow sharpness', 'reflection occlusion']
      },
      wood: {
        surface: ['grain figure pattern', 'pore structure', 'growth ring narrative', 'finish film thickness'],
        light: ['warm light absorption', 'specular bloom on film finish', 'end-grain brightness difference'],
        shadow: ['grain-revealing raking light', 'depth through figure']
      },
      stone: {
        surface: ['crystalline structure', 'vein pattern', 'polish clarity', 'honed matte tooth'],
        light: ['subsurface translucency', 'cold reflectivity', 'vein-catching raking light'],
        shadow: ['contact shadow weight', 'surface plane differentiation']
      },
      textile: {
        surface: ['weave structure', 'pile direction', 'fiber luminosity', 'drape fold formation'],
        light: ['fiber light transmission', 'sheen on nap', 'fold highlight gradient'],
        shadow: ['fold shadow depth', 'texture-revealing side light']
      },
      ceramic: {
        surface: ['glaze viscosity flow marks', 'crackle pattern', 'clay body texture', 'rim thinness'],
        light: ['glaze specularity', 'translucency at thin edges', 'surface reflection'],
        shadow: ['contact shadow', 'form-revealing tonal gradation']
      }
    };
  }

  /* ── SHOT SELECTOR ────────────────────────────────────────────────────────── */

  _selectShotType(slotType, context) {
    const shotTypes = {
      heroImage: { type: 'hero', priority: 'monumentality', elevation: 'low-angle dignity' },
      itemImage: { type: 'detail', priority: 'craft fidelity', elevation: 'object-neutral' },
      feature: { type: 'lifestyle', priority: 'contextual relevance', elevation: 'eye-level' },
      showcaseItem: { type: 'hero', priority: 'immersive scale', elevation: 'cinematic wide' },
      teamMember: { type: 'portrait', priority: 'character presence', elevation: 'eye-level intimate' },
      caseStudy: { type: 'lifestyle', priority: 'environmental narrative', elevation: 'contextual' },
      articleCard: { type: 'lifestyle', priority: 'editorial mood', elevation: 'atmospheric' }
    };

    return shotTypes[slotType] || { type: 'hero', priority: 'visual impact', elevation: 'neutral' };
  }

  /* ── LIGHTING SELECTOR ────────────────────────────────────────────────────── */

  _selectLighting(context, material) {
    const vocab = this._lightingVocabulary;
    const mood = vocab.moods[vocab.selectedMood];
    const mods = vocab.selectedMod;

    const materialLighting = this._materialVocabulary[material];
    const materialNote = materialLighting ? `, ${materialLighting.light[0]}` : '';

    return {
      style: vocab.selectedMood,
      description: `${mood}${materialNote}. ${mods[0]}, ${mods[1] || mods[0]}.`
    };
  }

  /* ── COMPOSITION BUILDER ──────────────────────────────────────────────────── */

  _buildComposition(aspect, shot, parsed) {
    const ratios = {
      '16:9': { orientation: 'landscape', instruction: 'cinematic widescreen framing with generous lateral negative space, subject positioned at golden-ratio intersection, background extending to atmospheric haze' },
      '4:5': { orientation: 'portrait', instruction: 'vertical portrait orientation with elevated top-space breathing room, subject anchored lower-third, background gradient or architectural context above' },
      '1:1': { orientation: 'square', instruction: 'centered square composition with radial symmetry or deliberate asymmetric tension, equal margin breathing on all sides' },
      '21:9': { orientation: 'ultra-wide', instruction: 'anamorphic widescreen with extreme lateral sweep, subject as focal anchor within vast environmental or atmospheric field' },
      '3:4': { orientation: 'portrait', instruction: 'classic portrait ratio with centered or rule-of-thirds subject placement, environmental context visible' },
      '4:3': { orientation: 'standard', instruction: 'balanced rectangular composition with moderate environmental context, classic editorial framing' }
    };

    const ratio = ratios[aspect] || ratios['16:9'];
    const shotVocab = this._shotVocabulary[shot.type] || this._shotVocabulary.hero;

    return {
      ratio,
      angle: shotVocab.angles[0],
      depth: shotVocab.depth[0],
      framing: shotVocab.framing[0]
    };
  }

  /* ── STYLING BUILDER ─────────────────────────────────────────────────────── */

  _buildStyling(parsed, context) {
    const props = [];

    if (parsed.material) {
      const matVocab = this._materialVocabulary[parsed.material];
      if (matVocab) {
        props.push(`${parsed.material} material accuracy: ${matVocab.surface[0]}, ${matVocab.surface[1]}`);
      }
    }

    if (parsed.color) {
      const colorDescriptions = {
        black: 'deep obsidian with warm undertone, not blue-shifted, subtle highlight edge reveal',
        white: 'warm ivory without blue cast, soft cream undertone, delicate shadow transition',
        neutral: 'greige sophistication, tonal complexity between warm and cool, matte powder finish',
        brown: 'cognac warmth with amber light response, natural hide variation, tonal depth',
        gray: 'graphite with warm neutral undertone, avoiding cold steel association, soft tonal range',
        navy: 'midnight depth with subtle purple undertone, not default blue, regal darkness',
        green: 'sage mutedness with gray undertone, botanical reference without vividness',
        red: 'bordeaux depth with brown undertone, wine-dark richness, avoiding primary red',
        gold: 'champagne warmth with soft reflection, burnished elegance, not yellow metallic'
      };
      props.push(`color fidelity: ${colorDescriptions[parsed.color] || parsed.color}`);
    }

    if (parsed.texture) {
      props.push(`surface finish: ${parsed.texture} treatment with accurate light response`);
    }

    if (parsed.style.length > 0) {
      props.push(`design language: ${parsed.style.join(', ')} aesthetic execution`);
    }

    // Context-specific props
    if (context.includes('hero')) {
      props.push('monumental scale presence, object as hero within generous spatial field');
    }
    if (context.includes('detail')) {
      props.push('craft narrative visible: stitching, edge treatment, corner radius, hardware integration');
    }

    return props;
  }

  /* ── ATMOSPHERE BUILDER ───────────────────────────────────────────────────── */

  _buildAtmosphere() {
    const tone = this.signals.tone || ['luxury'];
    const atmospheres = {
      luxury: ['hushed reverence', 'gallery silence', 'white-glove presentation', 'museum-case stillness'],
      minimal: ['essential quiet', 'reductive calm', 'monastic order', 'breathing room'],
      bold: ['charged tension', 'assertive presence', 'confident scale', 'unapologetic statement'],
      warm: ['intimate hospitality', 'inviting embrace', 'fireside comfort', 'personal connection'],
      modern: ['forward momentum', 'clean anticipation', ' tomorrow-ready', 'contemporary relevance'],
      timeless: ['generational permanence', 'patina of history', 'enduring relevance', 'heritage gravity']
    };

    const selected = tone.map(t => atmospheres[t] || atmospheres.luxury).flat();
    return selected[0] || 'hushed reverence';
  }

  /* ── TECHNICAL BUILDER ────────────────────────────────────────────────────── */

  _buildTechnical(aspect, shot) {
    const specs = [
      '8K resolution capable',
      ' Hasselblad H6D-100c or Phase One IQ4 medium format quality',
      '100-megapixel equivalent detail',
      'chromatic aberration-free optics',
      'noise-free shadow rendering'
    ];

    if (shot.type === 'detail') {
      specs.push('macro lens equivalent: 120mm at f/11 for maximum flat-field resolution');
    } else {
      specs.push('standard lens equivalent: 80mm at f/5.6 for natural perspective compression');
    }

    if (aspect === '21:9') {
      specs.push('anamorphic lens characteristic: horizontal flare, oval bokeh, cinematic perspective');
    }

    return specs;
  }

  /* ── SUBJECT DESCRIPTION ─────────────────────────────────────────────────── */

  _buildSubjectDescription(parsed, name) {
    const parts = [name];

    if (parsed.material) parts.push(`in ${parsed.material}`);
    if (parsed.color) parts.push(`, ${parsed.color} colorway`);
    if (parsed.texture) parts.push(`with ${parsed.texture} finish`);
    if (parsed.style.length > 0) parts.push(`, ${parsed.style.join(' ')} design language`);

    return parts.join('');
  }

  /* ── PROMPT ASSEMBLER ─────────────────────────────────────────────────────── */

  _assemblePrompt({ subject, shot, lighting, composition, styling, atmosphere, technical }) {
    const sections = [
      `SUBJECT: ${subject}.`,
      `SHOT TYPE: ${shot.type} photography — ${shot.priority}. ${composition.angle}. ${composition.depth}. ${composition.framing}.`,
      `COMPOSITION: ${composition.ratio.instruction}. Ratio: ${composition.ratio.orientation}.`,
      `LIGHTING: ${lighting.description}`,
      `STYLING: ${styling.join('. ')}.`,
      `ATMOSPHERE: ${atmosphere}.`,
      `TECHNICAL: ${technical.join('. ')}.`
    ];

    let prompt = sections.join(' ');

    // Ensure target length
    if (prompt.length < this.promptLength) {
      prompt += ` Additional detail: photorealistic rendering with physically accurate material simulation, ray-traced global illumination, subtle caustic response on transparent elements, accurate Fresnel falloff on glossy surfaces, micro-detail displacement mapping for surface texture.`;
    }

    return prompt;
  }

  /* ── NEGATIVE PROMPT BUILDER ────────────────────────────────────────────────── */

  _buildNegativePrompt(parsed) {
    const negatives = [
      'oversaturated colors',
      'cartoonish rendering',
      'cheap plastic appearance',
      'amateur photography',
      'cluttered background',
      'harsh direct flash',
      'chromatic aberration',
      'JPEG compression artifacts',
      'instagram filter aesthetic',
      'trendy neon lighting',
      'generic stock photo composition',
      'distracting watermark',
      'low resolution',
      'blurry soft focus (unless intentional)',
      'overly warm color cast (unless specified)'
    ];

    if (parsed.color === 'black') {
      negatives.push('blue-shifted shadows', 'washed-out blacks', 'gray instead of true black');
    }
    if (parsed.material === 'metal') {
      negatives.push('plastic-like reflection', 'oversaturated metallic sheen', 'CGI-looking chrome');
    }
    if (parsed.material === 'leather') {
      negatives.push('artificial grain pattern', 'vinyl-like surface', 'plastic leather appearance');
    }

    return negatives.join(', ');
  }
}