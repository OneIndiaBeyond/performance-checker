import type { DeviceStrategy, PageSpeedInsightsResult } from "../types.js";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PsiApiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, { numericValue?: number }>;
  };
  loadingExperience?: {
    overall_category?: string;
    metrics?: Record<string, { category?: string }>;
  };
}

export async function runPageSpeedInsights(
  url: string,
  device: DeviceStrategy,
  apiKey?: string,
): Promise<PageSpeedInsightsResult> {
  const params = new URLSearchParams({
    url,
    strategy: device,
    category: "performance",
  });
  if (apiKey) {
    params.set("key", apiKey);
  }

  try {
    const response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      const body = await response.text();
      return {
        requested: true,
        error: `PageSpeed Insights API returned ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as PsiApiResponse;
    const audits = data.lighthouseResult?.audits ?? {};
    const metric = data.loadingExperience?.metrics ?? {};

    return {
      requested: true,
      lab: {
        performanceScore: data.lighthouseResult?.categories?.performance?.score != null
          ? Math.round(data.lighthouseResult.categories.performance.score * 100)
          : null,
        firstContentfulPaint: audits["first-contentful-paint"]?.numericValue ?? null,
        largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue ?? null,
        totalBlockingTime: audits["total-blocking-time"]?.numericValue ?? null,
        cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue ?? null,
        speedIndex: audits["speed-index"]?.numericValue ?? null,
      },
      field: data.loadingExperience
        ? {
            firstContentfulPaintCategory: metric.FIRST_CONTENTFUL_PAINT_MS?.category ?? null,
            largestContentfulPaintCategory: metric.LARGEST_CONTENTFUL_PAINT_MS?.category ?? null,
            cumulativeLayoutShiftCategory: metric.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category ?? null,
            interactionToNextPaintCategory: metric.INTERACTION_TO_NEXT_PAINT?.category ?? null,
            overallCategory: data.loadingExperience.overall_category ?? null,
          }
        : null,
    };
  } catch (error) {
    return {
      requested: true,
      error: error instanceof Error ? error.message : "Unknown PageSpeed Insights error.",
    };
  }
}

export function skippedPageSpeedInsights(reason: string): PageSpeedInsightsResult {
  return { requested: false, skippedReason: reason };
}
