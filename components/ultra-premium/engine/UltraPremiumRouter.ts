"use client";
/**
 * ============================================================================
 * UltraPremiumRouter — Lightweight Imperative Router
 * ============================================================================
 * Provides imperative route resolution, URL parsing, and deep-link handling.
 * Used by <AnimationProvider> for browser back/forward and deep-link support.
 *
 * No React dependency — can be used outside React for SSR or static generation.
 */

import type { RouteDefinition, RouteParams } from "../types/routing";

export class UltraPremiumRouter {
  private routes: RouteDefinition[];
  private basePath: string;

  constructor(routes: RouteDefinition[], basePath = "") {
    this.routes = routes;
    this.basePath = basePath.replace(/\/$/, "");
  }

  /** Resolve a path string to a matched route + params */
  resolve(path: string): {
    route: RouteDefinition | null;
    params: RouteParams;
    query: URLSearchParams;
    hash: string;
  } {
    const url = new URL(path, "http://localhost");
    const cleanPath = url.pathname.replace(this.basePath, "").replace(/\/$/, "") || "/";

    for (const route of this.routes) {
      const match = this.matchPath(cleanPath, route.path);
      if (match.matched) {
        return {
          route,
          params: match.params,
          query: new URLSearchParams(url.search),
          hash: url.hash,
        };
      }
    }

    return { route: null, params: {}, query: new URLSearchParams(), hash: "" };
  }

  private matchPath(
    actual: string,
    pattern: string
  ): { matched: boolean; params: RouteParams } {
    const actualParts = actual.split("/").filter(Boolean);
    const patternParts = pattern.split("/").filter(Boolean);

    if (actualParts.length !== patternParts.length && !pattern.endsWith("*")) {
      return { matched: false, params: {} };
    }

    const params: RouteParams = {};

    for (let i = 0; i < patternParts.length; i++) {
      const p = patternParts[i];
      const a = actualParts[i];

      if (p.startsWith(":")) {
        params[p.slice(1)] = a ?? "";
      } else if (p === "*") {
        params["*"] = actualParts.slice(i).join("/");
        return { matched: true, params };
      } else if (p !== a) {
        return { matched: false, params: {} };
      }
    }

    return { matched: true, params };
  }

  /** Generate a URL from route name + params */
  href(routeName: string, params?: RouteParams): string {
    const route = this.routes.find((r) => r.name === routeName);
    if (!route) return "/";

    let path = route.path;
    for (const [key, val] of Object.entries(params ?? {})) {
      path = path.replace(`:${key}`, encodeURIComponent(String(val)));
    }
    return this.basePath + path;
  }

  /** Get default transition type between two routes */
  getTransition(from: string, to: string): string {
    const fromRoute = this.resolve(from).route;
    const toRoute = this.resolve(to).route;

    if (fromRoute?.transition === "morph" || toRoute?.transition === "morph") {
      return "morph";
    }
    if (fromRoute?.transition === "zoom" || toRoute?.transition === "zoom") {
      return "zoom";
    }
    return "slide";
  }
}