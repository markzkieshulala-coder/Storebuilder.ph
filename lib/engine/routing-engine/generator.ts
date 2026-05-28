/**
 * Universal Dynamic Page & Routing Engine
 * Generates real route trees and independent pages for every clickable element.
 */

import { composeLayout } from '../layout-composer';
import type { ComposerInput, LayoutGraph, LayoutNode } from '../layout-composer';
import { parsePrompt, DEFAULT_PARSER_CONFIG } from '../prompt-engine';
import type { ParseResult, PromptUnderstandingObject } from '../prompt-engine';
import {
  GeneratedSite,
  RouteGenerationConfig,
  RouteGenerationInput,
  RouteGenerationResult,
  RoutePage,
  RouteTarget,
  DEFAULT_ROUTE_GENERATION_CONFIG,
  ClickableKind,
} from './types';
import { registerGeneratedSite, getGeneratedPageByPath } from './store';

// ───────────────────────────────────────────────────────────────
// Hash / seed helpers
// ───────────────────────────────────────────────────────────────

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function toHex(hash: number): string {
  return hash.toString(16).padStart(8, "0");
}

function hashString(str: string): string {
  return toHex(fnv1a(str));
}

function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

function joinPath(...parts: string[]): string {
  return parts
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/\/+/g, "/")
    .replace(/\/+$|^\/+/g, "")
    .replace(/^([^/])/, "/$1");
}

function normalizePath(path: string): string {
  const clean = path.replace(/\/+/g, "/").replace(/\/\/+/g, "/");
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function buildComposerInputFromUnderstanding(understanding: PromptUnderstandingObject): ComposerInput {
  return {
    puo: {
      visualMood: understanding.visualMood,
      designStyle: understanding.designStyle,
      websitePersonality: understanding.websitePersonality,
      visualDensity: understanding.visualDensity,
      layoutDirection: understanding.layout.direction,
      modernityLevel: understanding.modernityLevel,
      businessTone: understanding.businessTone,
      conversionStyle: understanding.conversionStyle,
      motion: { complexity: understanding.motion.complexity, enabled: understanding.motion.enabled },
      composition: { type: understanding.composition.type, readingPattern: understanding.composition.readingPattern },
      pageStructure: understanding.pageStructure.map((s) => ({
        id: s.id,
        type: s.type,
        importance: s.importance,
        order: s.order,
      })),
      originalPrompt: understanding.originalPrompt,
    },
  };
}

function makePagePrompt(basePrompt: string, title: string, kind: string, sourceLabel: string, sourceType: string, sourceVariant: string, depth: number): string {
  return [
    basePrompt,
    `page:${title}`,
    `kind:${kind}`,
    `source:${sourceLabel}`,
    `node:${sourceType}/${sourceVariant}`,
    `depth:${depth}`,
    `independent page`,
    `unique layout`,
    `unique routing`,
  ].join(" | ");
}

function resolveTitle(understanding: PromptUnderstandingObject, depth: number, sourceLabel: string, kind: string): string {
  const style = understanding.designStyle;
  const prefix = depth === 0 ? "Main" : depth === 1 ? "Deep" : "Nested";
  return `${prefix} ${style} ${kind} — ${sourceLabel}`.replace(/\s+/g, " ").trim();
}

function resolveSummary(understanding: PromptUnderstandingObject, sourceLabel: string, kind: string): string {
  return `A ${understanding.visualMood} ${understanding.designStyle} ${kind} page focused on ${sourceLabel}. Built from a unique prompt-derived layout and routing hierarchy.`;
}

function targetCountForNode(node: LayoutNode, config: RouteGenerationConfig): number {
  switch (node.type) {
    case "hero": return 2;
    case "signal": return 1;
    case "split": return node.variant === "thirds" ? 3 : 2;
    case "cluster":
    case "gallery":
    case "tile":
      return Math.max(2, Math.min(config.cardsPerCollection, node.grid.columns + (node.density === "dense" ? 1 : 0)));
    case "list": return Math.max(2, Math.min(config.detailsPerPage, node.grid.columns || 3));
    case "stage":
    case "frame":
    case "pivot": return 2;
    case "strip": return node.variant === "logo-wall" ? 2 : 1;
    default: return 1;
  }
}

function kindForNode(node: LayoutNode): ClickableKind {
  switch (node.type) {
    case "hero":
    case "signal": return "cta";
    case "cluster":
    case "gallery":
    case "tile": return "card";
    case "list":
    case "strip": return "menu";
    case "split": return "panel";
    case "stage":
    case "frame":
    case "pivot": return "section";
    case "bridge":
    case "plaza":
    case "spire": return "link";
    default: return "detail";
  }
}

function labelForNode(node: LayoutNode, index: number, depth: number): string {
  const base = `${node.type} ${node.variant}`.replace(/\s+/g, " ").trim();
  const descriptor = depth === 0 ? "entry" : depth === 1 ? "branch" : "detail";
  return `${base} ${descriptor} ${index + 1}`.trim();
}

function uniquePath(siteId: string, basePath: string, slug: string, index: Record<string, string>): string {
  let candidate = normalizePath(joinPath(basePath, slug));
  let n = 1;
  while (index[candidate]) {
    candidate = normalizePath(joinPath(basePath, `${slug}-${n}`));
    n++;
  }
  return candidate;
}

function pageRouteHash(siteId: string, path: string, prompt: string): string {
  return hashString([siteId, path, prompt].join("|"));
}

function buildClickableTargets(
  siteId: string,
  basePath: string,
  pageId: string,
  parentPageId: string | undefined,
  depth: number,
  node: LayoutNode,
  config: RouteGenerationConfig,
  existingIndex: Record<string, string>,
  maxTargets: number
): { targets: RouteTarget[]; nextIndex: number } {
  const count = Math.min(targetCountForNode(node, config), maxTargets);
  const kind = kindForNode(node);
  const targets: RouteTarget[] = [];

  for (let i = 0; i < count; i++) {
    const label = labelForNode(node, i, depth);
    const targetSlug = `${slugify(label)}-${hashString(`${siteId}|${node.id}|${depth}|${i}`).slice(0, 6)}`;
    const href = uniquePath(siteId, basePath, targetSlug, existingIndex);
    const childPageId = hashString(`${siteId}|${href}|${label}|${kind}|${depth + 1}`);

    targets.push({
      id: `${pageId}-${node.id}-${i}`,
      label,
      kind,
      href,
      pageId: childPageId,
      parentPageId: parentPageId || pageId,
      sourceNodeId: node.id,
      order: i,
      depth: depth + 1,
      description: `Navigate to an independently generated ${kind} page based on ${node.type}/${node.variant}`,
    });
  }

  return { targets, nextIndex: targets.length };
}

function pickNodesForPage(graph: LayoutGraph, config: RouteGenerationConfig): LayoutNode[] {
  const priority = ["hero", "signal", "cluster", "gallery", "tile", "split", "list", "frame", "stage", "strip", "pivot", "bridge", "plaza", "spire", "cascade", "matrix", "chamber"];
  const scored = [...graph.nodes].sort((a, b) => {
    const aClickable = a.ctaPlacement ? 0 : 1;
    const bClickable = b.ctaPlacement ? 0 : 1;
    if (aClickable !== bClickable) return aClickable - bClickable;

    const aIdx = priority.indexOf(a.type);
    const bIdx = priority.indexOf(b.type);
    const pa = aIdx === -1 ? priority.length : aIdx;
    const pb = bIdx === -1 ? priority.length : bIdx;
    if (pa !== pb) return pa - pb;
    const weightOrder = ["dominant", "heavy", "medium", "light"];
    return weightOrder.indexOf(a.visualWeight) - weightOrder.indexOf(b.visualWeight);
  });
  return scored.slice(0, config.maxPagesPerPage);
}

function generatePageGraph(input: RouteGenerationInput, pageUnderstanding: PromptUnderstandingObject): LayoutGraph {
  const composerInput = buildComposerInputFromUnderstanding(pageUnderstanding);
  const result = composeLayout(composerInput);
  if (!result.success) {
    return input.layoutGraph;
  }
  return result.graph;
}

function createPage(
  siteId: string,
  basePath: string,
  input: RouteGenerationInput,
  site: GeneratedSite,
  depth: number,
  parentPageId: string | undefined,
  sourceNode: LayoutNode | null,
  sourceLabel: string,
  kind: RoutePage["kind"],
  config: RouteGenerationConfig,
  rng: () => number
): RoutePage {
  const pageUnderstandingResult: ParseResult = parsePrompt(
    makePagePrompt(
      input.prompt,
      sourceLabel,
      kind,
      sourceLabel,
      sourceNode?.type || "root",
      sourceNode?.variant || "default",
      depth
    ),
    DEFAULT_PARSER_CONFIG
  );
  const pageUnderstanding = pageUnderstandingResult.success && pageUnderstandingResult.object
    ? pageUnderstandingResult.object
    : input.promptUnderstanding;

  const pageTitle = resolveTitle(pageUnderstanding, depth, sourceLabel, kind);
  const pageSummary = resolveSummary(pageUnderstanding, sourceLabel, kind);
  const pagePrompt = makePagePrompt(
    input.prompt,
    pageTitle,
    kind,
    sourceLabel,
    sourceNode?.type || "root",
    sourceNode?.variant || "default",
    depth
  );
  const pageGraph = generatePageGraph(input, pageUnderstanding);

  const pageId = hashString(`${siteId}|${normalizePath(basePath)}|${sourceLabel}|${kind}|${depth}`);
  const routeHash = pageRouteHash(siteId, basePath, pagePrompt);
  const slug = basePath === `/site/${siteId}`
    ? ""
    : basePath.split("/").filter(Boolean).slice(-1)[0] || "page";

  const page: RoutePage = {
    id: pageId,
    siteId,
    path: normalizePath(basePath),
    slug,
    title: pageTitle,
    summary: pageSummary,
    kind,
    depth,
    parentPageId,
    sourceNodeId: sourceNode?.id,
    sourceNodeType: sourceNode?.type,
    sourceLabel,
    pagePrompt,
    pageUnderstanding,
    pageGraph,
    routeTargets: [],
    routeTargetsByNodeId: {},
    navTargets: [],
    breadcrumbs: [],
    children: [],
    routeHash,
  };

  const nodesForTargets = pickNodesForPage(pageGraph, config);
  const routeTargets: RouteTarget[] = [];
  const routeTargetsByNodeId: Record<string, RouteTarget[]> = {};
  let remainingTargets = config.maxPagesPerPage;

  for (const node of nodesForTargets) {
    if (remainingTargets <= 0) break;
    const built = buildClickableTargets(
      siteId,
      page.path,
      pageId,
      parentPageId,
      depth,
      node,
      config,
      site.pathIndex,
      remainingTargets
    );

    routeTargetsByNodeId[node.id] = built.targets;
    routeTargets.push(...built.targets);
    remainingTargets -= built.targets.length;
  }

  const navTargets = shuffle(rng, [...routeTargets]).slice(0, Math.min(config.navFanout, routeTargets.length));

  const breadcrumbs = parentPageId && site.pages[parentPageId]
    ? [...site.pages[parentPageId].breadcrumbs, { label: site.pages[parentPageId].title, href: site.pages[parentPageId].path, pageId: parentPageId }]
    : [];

  page.routeTargets = routeTargets;
  page.routeTargetsByNodeId = routeTargetsByNodeId;
  page.navTargets = navTargets;
  page.breadcrumbs = breadcrumbs;

  return page;
}

function expandPageTree(
  siteId: string,
  input: RouteGenerationInput,
  site: GeneratedSite,
  page: RoutePage,
  depth: number,
  config: RouteGenerationConfig,
  rng: () => number,
  warnings: string[]
) {
  if (depth >= config.maxDepth) return;
  if (site.pageOrder.length >= config.maxTotalPages) {
    warnings.push(`Max total pages (${config.maxTotalPages}) reached for site ${siteId}`);
    return;
  }

  const childTargets = [...page.routeTargets];

  for (const target of childTargets) {
    if (site.pageOrder.length >= config.maxTotalPages) break;
    if (site.pathIndex[target.href]) continue;

    const childKind = target.kind === "cta" ? "action" : target.kind === "card" ? "collection" : target.kind === "panel" ? "section" : target.kind === "navigation" ? "navigation" : "content";
    const childPage = createPage(
      siteId,
      target.href,
      input,
      site,
      depth + 1,
      page.id,
      input.layoutGraph.nodes.find((n) => n.id === target.sourceNodeId) || null,
      target.label,
      childKind,
      config,
      rng
    );

    site.pages[childPage.id] = childPage;
    site.pathIndex[childPage.path] = childPage.id;
    site.pageOrder.push(childPage.id);
    page.children.push(childPage.id);

    expandPageTree(siteId, input, site, childPage, depth + 1, config, rng, warnings);
  }
}

// ───────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────

export function generateRouteTree(
  input: RouteGenerationInput,
  config: RouteGenerationConfig = DEFAULT_ROUTE_GENERATION_CONFIG
): RouteGenerationResult {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const siteSeed = hashString([input.prompt, input.siteFingerprint || input.layoutGraph.promptFingerprint || "site"].join("|"));
    const siteId = `site-${siteSeed.slice(0, 12)}`;
    const rng = makeRng(fnv1a(siteSeed));

    const siteTitle = `${input.promptUnderstanding.designStyle} ${input.promptUnderstanding.layout.direction} site`.replace(/\s+/g, " ").trim();
    const siteSummary = `A dynamic multi-page experience for ${input.promptUnderstanding.visualMood} ${input.promptUnderstanding.designStyle} content, routed through independently generated pages.`;

    const site: GeneratedSite = {
      siteId,
      siteTitle,
      siteSummary,
      prompt: input.prompt,
      rootPath: `/site/${siteId}`,
      rootPageId: "",
      createdAt: new Date().toISOString(),
      pages: {},
      pathIndex: {},
      pageOrder: [],
    };

    const rootSourceNode = input.layoutGraph.nodes.find((n) => n.type === "hero") || input.layoutGraph.nodes[0] || null;
    const rootPage = createPage(
      siteId,
      site.rootPath,
      input,
      site,
      0,
      undefined,
      rootSourceNode,
      siteTitle,
      "root",
      config,
      rng
    );

    site.rootPageId = rootPage.id;
    site.pages[rootPage.id] = rootPage;
    site.pathIndex[rootPage.path] = rootPage.id;
    site.pageOrder.push(rootPage.id);

    expandPageTree(siteId, input, site, rootPage, 0, config, rng, warnings);

    registerGeneratedSite(site);

    return {
      success: true,
      site,
      warnings,
      errors,
      processingTimeMs: Date.now() - start,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      success: false,
      site: {
        siteId: "site-error",
        siteTitle: "Error Site",
        siteSummary: "Failed to generate route tree",
        prompt: input.prompt,
        rootPath: "/site/site-error",
        rootPageId: "",
        createdAt: new Date().toISOString(),
        pages: {},
        pathIndex: {},
        pageOrder: [],
      },
      warnings,
      errors,
      processingTimeMs: Date.now() - start,
    };
  }
}

export function getRouteByPath(siteId: string, path: string): import('./types').RoutePage | null {
  return getGeneratedPageByPath(siteId, normalizePath(path));
}
