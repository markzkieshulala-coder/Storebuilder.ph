/**
 * Route registry for generated sites.
 * Stores generated route trees so routes point to real, independently generated pages.
 */

import type { GeneratedSite, RoutePage } from "./types";

const globalKey = "__fleet_generated_sites__";

type Registry = Record<string, GeneratedSite>;

function getRegistry(): Registry {
  const g = globalThis as typeof globalThis & { [globalKey]?: Registry };
  if (!g[globalKey]) {
    g[globalKey] = {};
  }
  return g[globalKey]!;
}

export function registerGeneratedSite(site: GeneratedSite): GeneratedSite {
  const registry = getRegistry();
  registry[site.siteId] = site;
  return site;
}

export function getGeneratedSite(siteId: string): GeneratedSite | null {
  const registry = getRegistry();
  return registry[siteId] || null;
}

export function listGeneratedSites(): GeneratedSite[] {
  const registry = getRegistry();
  return Object.values(registry);
}

export function clearGeneratedSites(): void {
  const registry = getRegistry();
  for (const key of Object.keys(registry)) delete registry[key];
}

export function getGeneratedPageByPath(siteId: string, path: string): RoutePage | null {
  const site = getGeneratedSite(siteId);
  if (!site) return null;
  const pageId = site.pathIndex[path];
  if (!pageId) return null;
  return site.pages[pageId] || null;
}

export function getGeneratedPage(siteId: string, pageId: string): RoutePage | null {
  const site = getGeneratedSite(siteId);
  if (!site) return null;
  return site.pages[pageId] || null;
}
