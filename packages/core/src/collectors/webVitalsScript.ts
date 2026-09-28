import type { WebVitals } from "../types.js";

/**
 * Runs inside the page (via page.evaluate) after load + a settle period.
 * Reads buffered PerformanceObserver entries rather than requiring the
 * observer to be installed before navigation, so it works against a page we
 * don't control the source of.
 */
export function collectWebVitalsInBrowser(): WebVitals {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const paintEntries = performance.getEntriesByType("paint");
  const fcpEntry = paintEntries.find((entry) => entry.name === "first-contentful-paint");

  let lcp: number | null = null;
  try {
    const lcpEntries = performance.getEntriesByType(
      "largest-contentful-paint",
    ) as PerformanceEntry[];
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }
  } catch {
    lcp = null;
  }

  let cls = 0;
  let hasCls = false;
  try {
    const shiftEntries = performance.getEntriesByType("layout-shift") as Array<
      PerformanceEntry & { value: number; hadRecentInput: boolean }
    >;
    for (const entry of shiftEntries) {
      if (!entry.hadRecentInput) {
        cls += entry.value;
        hasCls = true;
      }
    }
  } catch {
    hasCls = false;
  }

  let tbt = 0;
  let hasTbt = false;
  try {
    const longTasks = performance.getEntriesByType("longtask");
    const fcpTime = fcpEntry?.startTime ?? 0;
    for (const task of longTasks) {
      const blocking = task.duration - 50;
      if (blocking > 0 && task.startTime >= fcpTime) {
        tbt += blocking;
        hasTbt = true;
      }
    }
  } catch {
    hasTbt = false;
  }

  return {
    ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
    fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
    lcp: lcp !== null ? Math.round(lcp) : null,
    cls: hasCls ? Math.round(cls * 1000) / 1000 : null,
    tbt: hasTbt ? Math.round(tbt) : null,
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
    load: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
  };
}
