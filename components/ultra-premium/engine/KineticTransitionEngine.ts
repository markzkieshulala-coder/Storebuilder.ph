"use client";
/**
 * ============================================================================
 * Kinetic Transition Engine — GSAP-Based Page Transition Orchestrator
 * ============================================================================
 * Orchestrates exit and entrance animations using `cubic-bezier(0.16, 1, 0.3, 1)`
 * (GSAP `power3.inOut`). Exposes singleton for imperative page transitions.
 */

import gsap from "gsap";
import type { TransitionType } from "../types/routing";
import { buildPageExitTl, buildPageEnterTl } from "./transitionEngine";

export { buildPageExitTl, buildPageEnterTl } from "./transitionEngine";

export class KineticTransitionEngine {
  private tl: gsap.core.Timeline | null = null;
  private isRunning = false;
  private prefersReducedMotion = false;
  private onPhaseChange?: (phase: "idle" | "exiting" | "entering") => void;
  private onComplete?: () => void;

  constructor(opts?: {
    onPhaseChange?: (phase: "idle" | "exiting" | "entering") => void;
    onComplete?: () => void;
    prefersReducedMotion?: boolean;
  }) {
    this.onPhaseChange = opts?.onPhaseChange;
    this.onComplete = opts?.onComplete;
    this.prefersReducedMotion = opts?.prefersReducedMotion ?? false;
  }

  setReducedMotion(flag: boolean): void {
    this.prefersReducedMotion = flag;
  }

  isAnimating(): boolean {
    return this.isRunning;
  }

  /** Kill any running transition and reset isRunning flag */
  kill(): void {
    if (this.tl) {
      this.tl.kill();
      this.tl = null;
    }
    this.isRunning = false;
  }

  /**
   * Convenience entry: exit current page content.
   * Delegates to GSAP timeline builders with cubic-bezier easing.
   */
  async exitCurrentContent(type: TransitionType): Promise<void> {
    const container = document.getElementById("kinetic-page-container");
    const pageRoot = document.getElementById("page-root");
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-idx]")
    );

    if (!container || !pageRoot) return Promise.resolve();

    this.onPhaseChange?.("exiting");
    return this.executeExit(container, pageRoot, sections, type);
  }

  /**
   * Convenience entry: enter new page content.
   * Sections are animated via Framer Motion; this resolves once GSAP settles.
   */
  async enterNewContent(type: TransitionType): Promise<void> {
    const pageRoot = document.getElementById("page-root");
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-idx]")
    );

    if (!pageRoot) return Promise.resolve();

    this.onPhaseChange?.("entering");
    await this.executeEnter(pageRoot, sections, type);
    this.onPhaseChange?.("idle");
    this.onComplete?.();
  }

  /** Execute exit animation on current page DOM */
  async executeExit(
    container: HTMLElement,
    pageRoot: HTMLElement,
    sections: HTMLElement[],
    type: TransitionType,
    durationSec = 0.7
  ): Promise<void> {
    this.kill();
    this.isRunning = true;

    const tl = buildPageExitTl(container, pageRoot, sections, type, durationSec, this.prefersReducedMotion);
    this.tl = tl;

    return new Promise((resolve) => {
      tl.eventCallback("onComplete", () => {
        this.isRunning = false;
        this.tl = null;
        resolve();
      });
    });
  }

  /** Execute entrance animation on new page DOM */
  async executeEnter(
    pageRoot: HTMLElement,
    sections: HTMLElement[],
    type: TransitionType,
    durationSec = 0.8
  ): Promise<void> {
    this.kill();
    this.isRunning = true;

    const tl = buildPageEnterTl(pageRoot, sections, type, durationSec, this.prefersReducedMotion);
    this.tl = tl;

    return new Promise((resolve) => {
      tl.eventCallback("onComplete", () => {
        this.isRunning = false;
        this.tl = null;
        resolve();
      });
    });
  }
}
