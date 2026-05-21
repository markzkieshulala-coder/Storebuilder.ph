"use client";
/**
 * ============================================================================
 * InterceptLink — Navigation Link with Route Interception
 * ============================================================================
 * Wraps any <a> or custom clickable element. Intercepts click events to trigger
 * the kinetic transition engine instead of native browser navigation.
 *
 * Usage:
 *   <InterceptLink href="/roster">COURT VIEW</InterceptLink>
 *   <InterceptLink href="/join" variant="cta">JOIN THE ROSTER</InterceptLink>
 */

import React, { type ReactNode, type MouseEvent } from "react";
import { useNavigate } from "../hooks/useAnimationContext";
import type { NavigateOptions } from "../types/routing";

interface InterceptLinkProps {
  /** Target route path (e.g., "/roster") */
  href: string;
  /** Child content (niche-specific text) */
  children: ReactNode;
  /** Visual variant */
  variant?: "text" | "pill" | "cta" | "icon" | "dropdown";
  /** Optional transition override */
  transition?: NavigateOptions["transition"];
  /** Optional scroll-to-anchor target */
  scrollTo?: string;
  /** Additional class names */
  className?: string;
  /** Whether to open in new tab (bypasses transition) */
  external?: boolean;
  /** Accessibility title */
  ariaLabel?: string;
}

export const InterceptLink = React.forwardRef<HTMLAnchorElement, InterceptLinkProps>(
  ({ href, children, variant = "text", transition, scrollTo, className = "", external = false, ariaLabel }, ref) => {
    const navigate = useNavigate();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (external) return; // Let native behavior handle external links

      e.preventDefault();
      e.stopPropagation();

      navigate(href, {
        transition,
        scrollTo,
        source: "link",
        label: typeof children === "string" ? children : undefined,
      });
    };

    const baseClasses = `upw-link upw-link--${variant}`;
    const combinedClass = `${baseClasses} ${className}`.trim();

    return (
      <a
        ref={ref}
        href={href}
        onClick={handleClick}
        className={combinedClass}
        aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
        data-variant={variant}
        data-transition={transition || "default"}
      >
        {children}
      </a>
    );
  }
);

InterceptLink.displayName = "InterceptLink";
