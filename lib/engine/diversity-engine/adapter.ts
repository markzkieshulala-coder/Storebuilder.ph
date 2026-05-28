/**
 * Diversity Engine Adapter
 *
 * Bridges the layout-composer's LayoutGraph + prompt-engine's PUO into the
 * Diversity Mutation Engine, runs the diversity check, and merges any mutated
 * structure back onto the rich LayoutGraph the renderer consumes.
 *
 * The mutator only carries a structural subset of each node, so the merge
 * overlays mutated fields (type, ordering, depth, span, grid type, etc.) onto
 * the original rich nodes — preserving render-critical fields the mutator drops
 * (responsive grid columns, spacing scale, focal-point offsets).
 */

import type { LayoutGraph, LayoutNode } from "../layout-composer";
import type { PromptUnderstandingObject } from "../prompt-engine";
import { checkDiversity, registerGeneration } from "./engine";
import type { DiversityEngineInput } from "./types";

type DGNode = DiversityEngineInput["layoutGraph"]["nodes"][number];

function buildDiversityInput(
  prompt: string,
  graph: LayoutGraph,
  puo: PromptUnderstandingObject,
): DiversityEngineInput {
  const cp = puo.visual.colorPalette;
  const ty = puo.typography;
  const sp = puo.visual.spacing;

  return {
    prompt,
    layoutGraph: {
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        variant: n.variant,
        depth: n.depth,
        density: n.density,
        visualWeight: n.visualWeight,
        rhythm: n.rhythm,
        span: n.span,
        height: n.height,
        composition: {
          balance: n.composition.balance,
          tension: n.composition.tension,
          primaryAxis: n.composition.primaryAxis,
          focalPoints: n.composition.focalPoints.map((f) => ({ x: f.x, y: f.y })),
          negativeSpaceRatio: n.composition.negativeSpaceRatio,
          alignment: n.composition.alignment,
        },
        grid: {
          type: n.grid.type,
          columns: n.grid.columns,
          gap: n.grid.gap,
          autoFlow: n.grid.autoFlow,
          alignment: n.grid.alignment,
        },
        spacing: {
          before: n.spacing.before,
          after: n.spacing.after,
          internal: n.spacing.internal,
          rhythm: n.spacing.rhythm,
        },
        zIndex: n.zIndex,
        mediaPlacement: n.mediaPlacement,
        ctaPlacement: n.ctaPlacement,
        children: n.children,
      })),
      edges: graph.edges.map((e) => ({
        from: e.from,
        to: e.to,
        type: e.type,
        weight: e.weight,
        spacingMultiplier: e.spacingMultiplier,
      })),
      complexity: graph.complexity,
      hasNesting: graph.hasNesting,
      maxDepth: graph.maxDepth,
      nodeCount: graph.nodeCount,
      compositionProfile: {
        overallBalance: graph.compositionProfile.overallBalance,
        primaryAxis: graph.compositionProfile.primaryAxis,
        pacing: graph.compositionProfile.pacing,
        tensionCurve: graph.compositionProfile.tensionCurve,
        densityCurve: graph.compositionProfile.densityCurve,
      },
      flowProfile: {
        direction: graph.flowProfile.direction,
        scrollBehavior: graph.flowProfile.scrollBehavior,
        sectionTransitions: graph.flowProfile.sectionTransitions,
        readingPattern: graph.flowProfile.readingPattern,
      },
      gridSystem: {
        baseUnit: graph.gridSystem.baseUnit,
        maxWidth: graph.gridSystem.maxWidth,
        gutter: graph.gridSystem.gutter,
        columnCount: graph.gridSystem.columnCount,
        behavior: graph.gridSystem.behavior,
      },
      spacingRhythm: {
        pattern: graph.spacingRhythm.pattern,
        base: graph.spacingRhythm.base,
        ratio: graph.spacingRhythm.ratio,
        values: graph.spacingRhythm.values,
      },
      visualHierarchy: {
        levels: graph.visualHierarchy.levels,
        dominantElement: graph.visualHierarchy.dominantElement,
        rhythm: graph.visualHierarchy.rhythm,
        progression: graph.visualHierarchy.progression,
      },
    },
    visualSystem: {
      colorPalette: {
        primary: cp.primary,
        secondary: cp.secondary,
        accent: cp.accent,
        background: cp.background,
        surface: cp.surface,
        text: cp.text,
        muted: cp.muted,
        border: cp.border,
      },
      typography: {
        family: { heading: ty.family.heading, body: ty.family.body, mono: ty.family.mono },
        scale: { ...ty.scale },
        weight: { heading: ty.weight.heading, body: ty.weight.body, bold: ty.weight.bold },
        letterSpacing: { heading: ty.letterSpacing.heading, body: ty.letterSpacing.body },
      },
      borderRadius: { style: puo.visual.borderRadius.style },
      shadows: { style: puo.visual.shadows.style },
      spacing: {
        unit: sp.unit,
        section: sp.section,
        container: sp.container,
        gutter: sp.gutter,
        gridGap: sp.gridGap,
        scale: sp.scale,
      },
    },
  };
}

/** Synthesize a full LayoutNode for a node the mutator inserted (fold/nested). */
function synthesizeNode(m: DGNode, template: LayoutNode): LayoutNode {
  return {
    ...template,
    id: m.id,
    type: m.type as LayoutNode["type"],
    variant: m.variant,
    depth: m.depth as LayoutNode["depth"],
    density: m.density as LayoutNode["density"],
    visualWeight: m.visualWeight as LayoutNode["visualWeight"],
    rhythm: m.rhythm as LayoutNode["rhythm"],
    span: m.span as LayoutNode["span"],
    height: m.height as LayoutNode["height"],
    zIndex: m.zIndex,
    mediaPlacement: m.mediaPlacement as LayoutNode["mediaPlacement"],
    ctaPlacement: m.ctaPlacement as LayoutNode["ctaPlacement"],
    composition: {
      ...template.composition,
      balance: m.composition.balance as LayoutNode["composition"]["balance"],
      tension: m.composition.tension as LayoutNode["composition"]["tension"],
      primaryAxis: m.composition.primaryAxis as LayoutNode["composition"]["primaryAxis"],
      negativeSpaceRatio: m.composition.negativeSpaceRatio,
      alignment: m.composition.alignment as LayoutNode["composition"]["alignment"],
    },
    grid: {
      ...template.grid,
      type: m.grid.type as LayoutNode["grid"]["type"],
      columns: m.grid.columns,
      columnsDesktop: m.grid.columns,
      autoFlow: m.grid.autoFlow as LayoutNode["grid"]["autoFlow"],
      alignment: m.grid.alignment as LayoutNode["grid"]["alignment"],
    },
    spacing: {
      ...template.spacing,
      before: m.spacing.before,
      after: m.spacing.after,
      internal: m.spacing.internal,
      rhythm: m.spacing.rhythm as LayoutNode["spacing"]["rhythm"],
    },
    children: undefined,
  };
}

/** Overlay mutated structural fields onto the original rich node. */
function mergeNode(m: DGNode, orig: LayoutNode): LayoutNode {
  return {
    ...orig,
    type: m.type as LayoutNode["type"],
    variant: m.variant,
    depth: m.depth as LayoutNode["depth"],
    density: m.density as LayoutNode["density"],
    visualWeight: m.visualWeight as LayoutNode["visualWeight"],
    rhythm: m.rhythm as LayoutNode["rhythm"],
    span: m.span as LayoutNode["span"],
    height: m.height as LayoutNode["height"],
    zIndex: m.zIndex,
    mediaPlacement: m.mediaPlacement as LayoutNode["mediaPlacement"],
    ctaPlacement: m.ctaPlacement as LayoutNode["ctaPlacement"],
    composition: {
      ...orig.composition,
      balance: m.composition.balance as LayoutNode["composition"]["balance"],
      tension: m.composition.tension as LayoutNode["composition"]["tension"],
      primaryAxis: m.composition.primaryAxis as LayoutNode["composition"]["primaryAxis"],
      negativeSpaceRatio: m.composition.negativeSpaceRatio,
      alignment: m.composition.alignment as LayoutNode["composition"]["alignment"],
    },
    grid: {
      ...orig.grid,
      type: m.grid.type as LayoutNode["grid"]["type"],
      columns: m.grid.columns,
      autoFlow: m.grid.autoFlow as LayoutNode["grid"]["autoFlow"],
      alignment: m.grid.alignment as LayoutNode["grid"]["alignment"],
    },
    spacing: {
      ...orig.spacing,
      before: m.spacing.before,
      after: m.spacing.after,
      internal: m.spacing.internal,
      rhythm: m.spacing.rhythm as LayoutNode["spacing"]["rhythm"],
    },
  };
}

function mergeMutatedGraph(orig: LayoutGraph, mutated: DiversityEngineInput["layoutGraph"]): LayoutGraph {
  const origById = new Map(orig.nodes.map((n) => [n.id, n]));
  const template = orig.nodes[0];

  const nodes: LayoutNode[] = mutated.nodes.map((m) => {
    const o = origById.get(m.id);
    return o ? mergeNode(m, o) : synthesizeNode(m, template);
  });

  return {
    ...orig,
    nodes,
    edges: mutated.edges.map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type as LayoutGraph["edges"][number]["type"],
      weight: e.weight,
      spacingMultiplier: e.spacingMultiplier,
    })),
    compositionProfile: {
      ...orig.compositionProfile,
      overallBalance: mutated.compositionProfile.overallBalance as LayoutGraph["compositionProfile"]["overallBalance"],
      primaryAxis: mutated.compositionProfile.primaryAxis as LayoutGraph["compositionProfile"]["primaryAxis"],
      pacing: mutated.compositionProfile.pacing as LayoutGraph["compositionProfile"]["pacing"],
      tensionCurve: mutated.compositionProfile.tensionCurve,
      densityCurve: mutated.compositionProfile.densityCurve,
    },
    spacingRhythm: {
      ...orig.spacingRhythm,
      pattern: mutated.spacingRhythm.pattern as LayoutGraph["spacingRhythm"]["pattern"],
      ratio: mutated.spacingRhythm.ratio,
    },
    visualHierarchy: {
      ...orig.visualHierarchy,
      dominantElement: mutated.visualHierarchy.dominantElement,
      progression: mutated.visualHierarchy.progression as LayoutGraph["visualHierarchy"]["progression"],
    },
    nodeCount: nodes.length,
    hasNesting: nodes.some((n) => (n.children || []).length > 0),
  };
}

export interface DiversifyResult {
  graph: LayoutGraph;
  mutated: boolean;
  highestSimilarity: number;
  appliedStrategies: string[];
}

/**
 * Runs the diversity check against generation history. Returns a (possibly
 * mutated) LayoutGraph that diverges from previous generations, and registers
 * the result in history for future comparisons.
 */
export function diversifyLayout(
  prompt: string,
  graph: LayoutGraph,
  puo: PromptUnderstandingObject,
): DiversifyResult {
  const input = buildDiversityInput(prompt, graph, puo);
  const result = checkDiversity(input);

  let finalGraph = graph;
  if (result.mutatedInput) {
    finalGraph = mergeMutatedGraph(graph, result.mutatedInput.layoutGraph);
  }

  registerGeneration(prompt, result.fingerprint);

  return {
    graph: finalGraph,
    mutated: !!result.mutatedInput,
    highestSimilarity: result.report.highestSimilarity,
    appliedStrategies: result.mutationResult?.appliedStrategies ?? [],
  };
}
