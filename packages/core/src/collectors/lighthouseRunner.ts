import { chromium } from "playwright";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import type { DeviceStrategy, LighthouseAuditRef, LighthouseResult } from "../types.js";

function toScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.round(value * 100);
}

function metricValue(audits: Record<string, { numericValue?: number }>, id: string): number | null {
  const value = audits[id]?.numericValue;
  return typeof value === "number" ? Math.round(value) : null;
}

export async function runLighthouse(
  url: string,
  device: DeviceStrategy,
): Promise<LighthouseResult> {
  let chrome: chromeLauncher.LaunchedChrome | undefined;
  try {
    chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    });

    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "silent",
      formFactor: device,
      screenEmulation:
        device === "mobile"
          ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625, disabled: false }
          : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    });

    if (!result?.lhr) {
      return {
        scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
        metrics: {
          firstContentfulPaint: null,
          largestContentfulPaint: null,
          totalBlockingTime: null,
          cumulativeLayoutShift: null,
          speedIndex: null,
          timeToInteractive: null,
        },
        topOpportunities: [],
        reportError: "Lighthouse did not return a report.",
      };
    }

    const lhr = result.lhr;
    const audits = lhr.audits as Record<
      string,
      { numericValue?: number; score?: number | null; title: string; description: string; displayValue?: string }
    >;

    const opportunityIds = [
      "render-blocking-resources",
      "unused-javascript",
      "unminified-css",
      "unminified-javascript",
      "offscreen-images",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "efficient-animated-content",
      "modern-image-formats",
    ];

    const topOpportunities: LighthouseAuditRef[] = opportunityIds
      .map((id) => audits[id])
      .filter((audit): audit is NonNullable<typeof audit> => Boolean(audit) && audit.score !== 1)
      .map((audit, index) => ({
        id: opportunityIds[index],
        title: audit.title,
        description: audit.description,
        score: audit.score ?? null,
        displayValue: audit.displayValue,
      }))
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 5);

    return {
      scores: {
        performance: toScore(lhr.categories.performance?.score),
        accessibility: toScore(lhr.categories.accessibility?.score),
        bestPractices: toScore(lhr.categories["best-practices"]?.score),
        seo: toScore(lhr.categories.seo?.score),
      },
      metrics: {
        firstContentfulPaint: metricValue(audits, "first-contentful-paint"),
        largestContentfulPaint: metricValue(audits, "largest-contentful-paint"),
        totalBlockingTime: metricValue(audits, "total-blocking-time"),
        cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue ?? null,
        speedIndex: metricValue(audits, "speed-index"),
        timeToInteractive: metricValue(audits, "interactive"),
      },
      topOpportunities,
    };
  } catch (error) {
    return {
      scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
      metrics: {
        firstContentfulPaint: null,
        largestContentfulPaint: null,
        totalBlockingTime: null,
        cumulativeLayoutShift: null,
        speedIndex: null,
        timeToInteractive: null,
      },
      topOpportunities: [],
      reportError: error instanceof Error ? error.message : "Unknown Lighthouse error.",
    };
  } finally {
    await chrome?.kill();
  }
}
