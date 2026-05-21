"use client";
/**
 * ============================================================================
 * BlueprintContext — Immutable SiteBlueprint Data Provider
 * ============================================================================
 * Wraps the generated SiteBlueprint JSON and exposes typed accessors.
 * Never mutates the blueprint; all derived data computed via useMemo.
 */

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteBlueprint, Page } from "../types/blueprint";

interface BlueprintContextValue {
  blueprint: SiteBlueprint;
  getPageByPath: (path: string) => Page | undefined;
  getPageByIndex: (index: number) => Page | undefined;
  pagePaths: string[];
}

export const BlueprintContext = createContext<BlueprintContextValue | null>(null);

interface BlueprintProviderProps {
  children: ReactNode;
  blueprint: SiteBlueprint;
}

export function BlueprintProvider({ children, blueprint }: BlueprintProviderProps) {
  const pagePaths = useMemo(() => blueprint.pages.map((p) => p.path), [blueprint.pages]);

  const getPageByPath = useMemo(
    () => (path: string) => blueprint.pages.find((p) => p.path === path),
    [blueprint.pages]
  );

  const getPageByIndex = useMemo(
    () => (index: number) => blueprint.pages[index],
    [blueprint.pages]
  );

  const value = useMemo(
    () => ({
      blueprint,
      getPageByPath,
      getPageByIndex,
      pagePaths,
    }),
    [blueprint, getPageByPath, getPageByIndex, pagePaths]
  );

  return (
    <BlueprintContext.Provider value={value}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprint(): BlueprintContextValue {
  const ctx = useContext(BlueprintContext);
  if (!ctx) {
    throw new Error(
      "useBlueprint must be used within a <BlueprintProvider>. " +
      "Ensure <UltraPremiumApp> is mounted with a valid SiteBlueprint."
    );
  }
  return ctx;
}