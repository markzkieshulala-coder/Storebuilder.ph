/**
 * Universal Dynamic Page & Routing Engine - Types
 * Generates real route trees and independent pages for every clickable element.
 */

import type { PromptUnderstandingObject } from '../prompt-engine';
import type { LayoutGraph } from '../layout-composer';

export type ClickableKind =
  | "navigation"
  | "cta"
  | "card"
  | "menu"
  | "link"
  | "action"
  | "panel"
  | "media"
  | "section"
  | "detail";

export interface RouteTarget {
  id: string;
  label: string;
  kind: ClickableKind;
  href: string;
  pageId: string;
  parentPageId?: string;
  sourceNodeId?: string;
  order: number;
  depth: number;
  description: string;
}

export interface RoutePage {
  id: string;
  siteId: string;
  path: string;
  slug: string;
  title: string;
  summary: string;
  kind: "root" | "section" | "detail" | "collection" | "action" | "navigation" | "content";
  depth: number;
  parentPageId?: string;
  sourceNodeId?: string;
  sourceNodeType?: string;
  sourceLabel?: string;
  pagePrompt: string;
  pageUnderstanding: PromptUnderstandingObject;
  pageGraph: LayoutGraph;
  routeTargets: RouteTarget[];
  routeTargetsByNodeId: Record<string, RouteTarget[]>;
  navTargets: RouteTarget[];
  breadcrumbs: Array<{ label: string; href: string; pageId: string }>;
  children: string[];
  routeHash: string;
}

export interface GeneratedSite {
  siteId: string;
  siteTitle: string;
  siteSummary: string;
  prompt: string;
  rootPath: string;
  rootPageId: string;
  createdAt: string;
  pages: Record<string, RoutePage>;
  pathIndex: Record<string, string>;
  pageOrder: string[];
}

export interface RouteGenerationConfig {
  maxDepth: number;
  maxPagesPerPage: number;
  maxTotalPages: number;
  navFanout: number;
  cardsPerCollection: number;
  detailsPerPage: number;
}

export const DEFAULT_ROUTE_GENERATION_CONFIG: RouteGenerationConfig = {
  maxDepth: 2,
  maxPagesPerPage: 5,
  maxTotalPages: 40,
  navFanout: 4,
  cardsPerCollection: 4,
  detailsPerPage: 3,
};

export interface RouteGenerationInput {
  prompt: string;
  promptUnderstanding: PromptUnderstandingObject;
  layoutGraph: LayoutGraph;
  siteFingerprint?: string;
}

export interface RouteGenerationResult {
  success: boolean;
  site: GeneratedSite;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

export interface ResolvedPage {
  site: GeneratedSite;
  page: RoutePage;
}
