"use client";
import gsap from "gsap";
import type { TransitionType } from "../types/routing";

const CUBIC_BEZIER = "cubic-bezier(0.16, 1, 0.3, 1)";

export function buildPageExitTl(
  container: HTMLElement,
  pageRoot: HTMLElement,
  sections: HTMLElement[],
  type: TransitionType,
  durationSec: number,
  reduced: boolean
) {
  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut", overwrite: true },
  });
  if (reduced) {
    tl.to(pageRoot, { autoAlpha: 0, duration: 0.15 });
    return tl;
  }
  switch (type) {
    case "slide":
      tl.to(sections, {
        y: 120,
        opacity: 0,
        rotateX: reduced ? 0 : 8,
        filter: reduced ? "none" : "blur(12px)",
        duration: durationSec * 0.6,
        stagger: reduced ? 0 : 0.06,
      });
      break;
    case "morph":
      tl.to(pageRoot, {
        scale: 0.92,
        opacity: 0,
        borderRadius: "24px",
        duration: durationSec * 0.55,
      });
      tl.to(
        pageRoot,
        { filter: reduced ? "none" : "blur(20px)", duration: durationSec * 0.45 },
        0
      );
      break;
    case "zoom":
      tl.to(sections, {
        scale: 0.85,
        opacity: 0,
        duration: durationSec * 0.5,
        stagger: reduced ? 0 : 0.04,
      });
      tl.to(pageRoot, { filter: reduced ? "none" : "blur(16px)", duration: durationSec * 0.5 }, 0);
      break;
    case "pageTurn":
      tl.to(pageRoot, {
        rotateY: -30,
        transformOrigin: "0% 50%",
        opacity: 0,
        duration: durationSec * 0.6,
        ease: "power2.in",
      });
      break;
    case "none":
    default:
      tl.to(pageRoot, { opacity: 0, duration: durationSec * 0.3 });
  }
  return tl;
}

export function buildPageEnterTl(
  pageRoot: HTMLElement,
  sections: HTMLElement[],
  type: TransitionType,
  durationSec: number,
  reduced: boolean
) {
  const tl = gsap.timeline({
    defaults: { ease: "power3.out", overwrite: true },
  });
  gsap.set(pageRoot, { clearProps: "all" });
  if (reduced) {
    tl.fromTo(pageRoot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 });
    return tl;
  }
  switch (type) {
    case "slide":
      gsap.set(sections, { y: 90, opacity: 0, rotateX: reduced ? 0 : 5, filter: reduced ? "none" : "blur(10px)" });
      tl.to(sections, {
        y: 0,
        opacity: 1,
        rotateX: 0,
        filter: "blur(0px)",
        duration: durationSec * 0.55,
        stagger: reduced ? 0 : 0.09,
      });
      break;
    case "morph":
      gsap.set(pageRoot, { scale: 1.06, opacity: 0, borderRadius: "24px" });
      tl.to(pageRoot, { scale: 1, opacity: 1, borderRadius: "0px", duration: durationSec * 0.6 });
      break;
    case "zoom":
      gsap.set(sections, { scale: 1.1, opacity: 0 });
      tl.to(sections, {
        scale: 1,
        opacity: 1,
        duration: durationSec * 0.55,
        stagger: reduced ? 0 : 0.07,
      });
      break;
    case "pageTurn":
      gsap.set(pageRoot, { rotateY: 30, transformOrigin: "100% 50%", opacity: 0 });
      tl.to(pageRoot, { rotateY: 0, opacity: 1, duration: durationSec * 0.7, ease: "power2.out" });
      break;
    case "none":
    default:
      gsap.set(pageRoot, { opacity: 0 });
      tl.to(pageRoot, { opacity: 1, duration: durationSec * 0.3 });
  }
  return tl;
}
