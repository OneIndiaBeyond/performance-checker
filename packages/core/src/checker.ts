import { randomUUID } from "node:crypto";
import type { CheckOptions, PerformanceReport } from "./types.js";
import { collectPlaywrightMetrics } from "./collectors/playwrightCollector.js";
import { runLighthouse } from "./collectors/lighthouseRunner.js";
import { runPageSpeedInsights, skippedPageSpeedInsights } from "./integrations/pageSpeedInsights.js";
import { buildSecurityNotice } from "./auth/securityNotice.js";

export async function runCheck(options: CheckOptions): Promise<PerformanceReport> {
  const start = Date.now();
  const device = options.device ?? "mobile";
  const runLighthouseAudit = options.runLighthouse ?? true;

  const playwright = await collectPlaywrightMetrics(options.url, device, options.auth);

  const lighthouse = runLighthouseAudit ? await runLighthouse(options.url, device) : null;

  const pageSpeedInsights = options.runPageSpeedInsights
    ? await runPageSpeedInsights(options.url, device, options.psiApiKey)
    : skippedPageSpeedInsights(
        "PageSpeed Insights was not requested for this run (enable with --psi / runPageSpeedInsights).",
      );

  const security = buildSecurityNotice(options.auth);

  return {
    id: randomUUID(),
    url: options.url,
    device,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    playwright,
    lighthouse,
    pageSpeedInsights,
    security,
  };
}
