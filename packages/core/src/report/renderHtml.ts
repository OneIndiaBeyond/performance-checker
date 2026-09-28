import type { PerformanceReport } from "../types.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreClass(score: number | null): string {
  if (score === null) return "score-unknown";
  if (score >= 90) return "score-good";
  if (score >= 50) return "score-average";
  return "score-poor";
}

function formatMs(value: number | null): string {
  return value === null ? "–" : `${Math.round(value)} ms`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function scoreCard(label: string, score: number | null): string {
  return `
    <div class="score-card ${scoreClass(score)}">
      <div class="score-value">${score === null ? "–" : score}</div>
      <div class="score-label">${label}</div>
    </div>`;
}

function vitalCard(label: string, value: string): string {
  return `
    <div class="vital-card">
      <div class="vital-value">${value}</div>
      <div class="vital-label">${label}</div>
    </div>`;
}

export function renderReportHtml(report: PerformanceReport): string {
  const { playwright, lighthouse, pageSpeedInsights, security } = report;

  const securityBanner = security.credentialsUsed
    ? `<div class="security-banner">
        <strong>⚠ Security reminder:</strong> ${escapeHtml(security.message ?? "")}
      </div>`
    : "";

  const lighthouseSection = lighthouse
    ? `
    <section>
      <h2>Lighthouse audit (${escapeHtml(report.device)})</h2>
      ${lighthouse.reportError ? `<p class="error">Lighthouse error: ${escapeHtml(lighthouse.reportError)}</p>` : ""}
      <div class="score-grid">
        ${scoreCard("Performance", lighthouse.scores.performance)}
        ${scoreCard("Accessibility", lighthouse.scores.accessibility)}
        ${scoreCard("Best Practices", lighthouse.scores.bestPractices)}
        ${scoreCard("SEO", lighthouse.scores.seo)}
      </div>
      <div class="vital-grid">
        ${vitalCard("First Contentful Paint", formatMs(lighthouse.metrics.firstContentfulPaint))}
        ${vitalCard("Largest Contentful Paint", formatMs(lighthouse.metrics.largestContentfulPaint))}
        ${vitalCard("Total Blocking Time", formatMs(lighthouse.metrics.totalBlockingTime))}
        ${vitalCard("Cumulative Layout Shift", lighthouse.metrics.cumulativeLayoutShift?.toFixed(3) ?? "–")}
        ${vitalCard("Speed Index", formatMs(lighthouse.metrics.speedIndex))}
        ${vitalCard("Time to Interactive", formatMs(lighthouse.metrics.timeToInteractive))}
      </div>
      ${lighthouse.topOpportunities.length > 0
        ? `<h3>Top opportunities</h3><ul class="opportunities">${lighthouse.topOpportunities
            .map(
              (opp) =>
                `<li><strong>${escapeHtml(opp.title)}</strong>${
                  opp.displayValue ? ` — ${escapeHtml(opp.displayValue)}` : ""
                }<br/><span class="muted">${escapeHtml(opp.description)}</span></li>`,
            )
            .join("")}</ul>`
        : ""}
    </section>`
    : "";

  const psiSection = pageSpeedInsights.requested
    ? `
    <section>
      <h2>Google PageSpeed Insights</h2>
      ${pageSpeedInsights.error ? `<p class="error">${escapeHtml(pageSpeedInsights.error)}</p>` : ""}
      ${pageSpeedInsights.lab
        ? `<div class="score-grid">
            ${scoreCard("Performance (lab)", pageSpeedInsights.lab.performanceScore)}
          </div>
          <div class="vital-grid">
            ${vitalCard("FCP", formatMs(pageSpeedInsights.lab.firstContentfulPaint))}
            ${vitalCard("LCP", formatMs(pageSpeedInsights.lab.largestContentfulPaint))}
            ${vitalCard("TBT", formatMs(pageSpeedInsights.lab.totalBlockingTime))}
            ${vitalCard("CLS", pageSpeedInsights.lab.cumulativeLayoutShift?.toFixed(3) ?? "–")}
            ${vitalCard("Speed Index", formatMs(pageSpeedInsights.lab.speedIndex))}
          </div>`
        : ""}
      ${pageSpeedInsights.field
        ? `<h3>Real-user field data (CrUX) — overall: ${escapeHtml(
            pageSpeedInsights.field.overallCategory ?? "unknown",
          )}</h3>
           <ul>
             <li>FCP: ${escapeHtml(pageSpeedInsights.field.firstContentfulPaintCategory ?? "n/a")}</li>
             <li>LCP: ${escapeHtml(pageSpeedInsights.field.largestContentfulPaintCategory ?? "n/a")}</li>
             <li>CLS: ${escapeHtml(pageSpeedInsights.field.cumulativeLayoutShiftCategory ?? "n/a")}</li>
             <li>INP: ${escapeHtml(pageSpeedInsights.field.interactionToNextPaintCategory ?? "n/a")}</li>
           </ul>`
        : `<p class="muted">No CrUX field data available for this URL (likely low real-world traffic).</p>`}
    </section>`
    : `<section><h2>Google PageSpeed Insights</h2><p class="muted">${escapeHtml(
        pageSpeedInsights.skippedReason ?? "Not requested.",
      )}</p></section>`;

  const networkRows = playwright.network.byType
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.type)}</td><td>${entry.count}</td><td>${formatBytes(
          entry.transferSizeBytes,
        )}</td></tr>`,
    )
    .join("");

  const slowestRows = playwright.network.slowestRequests
    .map(
      (req) =>
        `<tr><td class="truncate">${escapeHtml(req.url)}</td><td>${req.status ?? "–"}</td><td>${
          req.durationMs
        } ms</td><td>${formatBytes(req.transferSizeBytes)}</td></tr>`,
    )
    .join("");

  const consoleRows = playwright.consoleMessages
    .filter((msg) => msg.type === "error" || msg.type === "warning")
    .slice(0, 25)
    .map(
      (msg) =>
        `<tr><td>${escapeHtml(msg.type)}</td><td class="truncate">${escapeHtml(msg.text)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Performance report — ${escapeHtml(report.url)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #f5f6f8; color: #1a1a1a; }
  header { background: #111827; color: #fff; padding: 24px 32px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .meta { color: #9ca3af; font-size: 13px; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 32px 64px; }
  section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  h2 { margin-top: 0; font-size: 17px; }
  h3 { font-size: 14px; margin-top: 24px; }
  .security-banner { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 16px 24px; border-radius: 12px; margin-bottom: 20px; font-size: 14px; }
  .score-grid, .vital-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 12px; }
  .score-card { border-radius: 10px; padding: 16px; text-align: center; }
  .score-value { font-size: 28px; font-weight: 700; }
  .score-label { font-size: 12px; margin-top: 4px; opacity: 0.85; }
  .score-good { background: #dcfce7; color: #166534; }
  .score-average { background: #fef9c3; color: #854d0e; }
  .score-poor { background: #fee2e2; color: #991b1b; }
  .score-unknown { background: #e5e7eb; color: #374151; }
  .vital-card { background: #f3f4f6; border-radius: 10px; padding: 12px; text-align: center; }
  .vital-value { font-size: 16px; font-weight: 600; }
  .vital-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
  .truncate { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .muted { color: #6b7280; font-size: 13px; }
  .error { color: #991b1b; }
  .opportunities li { margin-bottom: 10px; }
  .screenshot { max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 12px; }
</style>
</head>
<body>
<header>
  <h1>Performance report</h1>
  <div class="meta">${escapeHtml(playwright.finalUrl)} · ${escapeHtml(report.device)} · generated ${escapeHtml(
    report.generatedAt,
  )} · total run ${(report.durationMs / 1000).toFixed(1)}s</div>
</header>
<main>
  ${securityBanner}
  ${lighthouseSection}
  ${psiSection}
  <section>
    <h2>Core Web Vitals (measured live via Playwright)</h2>
    ${playwright.timedOut ? '<p class="error">The page did not finish loading before the timeout; metrics below may be incomplete.</p>' : ""}
    <div class="vital-grid">
      ${vitalCard("TTFB", formatMs(playwright.webVitals.ttfb))}
      ${vitalCard("FCP", formatMs(playwright.webVitals.fcp))}
      ${vitalCard("LCP", formatMs(playwright.webVitals.lcp))}
      ${vitalCard("CLS", playwright.webVitals.cls?.toFixed(3) ?? "–")}
      ${vitalCard("TBT (approx)", formatMs(playwright.webVitals.tbt))}
      ${vitalCard("DOM Content Loaded", formatMs(playwright.webVitals.domContentLoaded))}
      ${vitalCard("Load", formatMs(playwright.webVitals.load))}
    </div>
    ${playwright.screenshotBase64 ? `<img class="screenshot" src="data:image/jpeg;base64,${playwright.screenshotBase64}" alt="Page screenshot" />` : ""}
  </section>
  <section>
    <h2>Network</h2>
    <p>${playwright.network.totalRequests} requests · ${formatBytes(
      playwright.network.totalTransferSizeBytes,
    )} transferred · ${playwright.network.failedRequests} failed</p>
    <table>
      <thead><tr><th>Type</th><th>Requests</th><th>Size</th></tr></thead>
      <tbody>${networkRows}</tbody>
    </table>
    <h3>Slowest requests</h3>
    <table>
      <thead><tr><th>URL</th><th>Status</th><th>Duration</th><th>Size</th></tr></thead>
      <tbody>${slowestRows}</tbody>
    </table>
  </section>
  <section>
    <h2>Console errors &amp; warnings</h2>
    ${consoleRows
      ? `<table><thead><tr><th>Type</th><th>Message</th></tr></thead><tbody>${consoleRows}</tbody></table>`
      : '<p class="muted">No console errors or warnings were captured.</p>'}
  </section>
</main>
</body>
</html>`;
}
