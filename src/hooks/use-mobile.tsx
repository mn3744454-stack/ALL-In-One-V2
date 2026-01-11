import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Original hook - uses 768px breakpoint
 * Keep for backward compatibility with existing components
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Desktop detection (>=1024px) - matches Tailwind lg: breakpoint
 * Initializes immediately from matchMedia to avoid flicker
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true; // SSR fallback
    return window.innerWidth >= TABLET_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    // Sync initial state
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

/**
 * Mobile viewport detection (<1024px) - includes tablet
 * Initializes immediately from matchMedia to avoid flicker
 */
export function useIsMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < TABLET_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobileViewport(mql.matches);
    mql.addEventListener("change", onChange);
    // Sync initial state
    setIsMobileViewport(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobileViewport;
}
