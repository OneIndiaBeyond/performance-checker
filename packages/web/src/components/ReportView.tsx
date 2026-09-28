import type { PerformanceReport } from "../types.js";
import { ScoreGauge } from "./ScoreGauge.js";

function formatMs(value: number | null): string {
  return value === null ? "–" : `${Math.round(value)} ms`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function VitalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="vital-card">
      <div className="vital-value">{value}</div>
      <div className="vital-label">{label}</div>
    </div>
  );
}

export function ReportView({ report }: { report: PerformanceReport }) {
  const { playwright, lighthouse, pageSpeedInsights } = report;

  return (
    <div className="report">
      <div className="report-meta">
        <h2>{playwright.finalUrl}</h2>
        <p className="muted">
          {report.device} · generated {new Date(report.generatedAt).toLocaleString()} · run took{" "}
          {(report.durationMs / 1000).toFixed(1)}s
        </p>
      </div>

      {lighthouse && (
        <section>
          <h3>Lighthouse audit</h3>
          {lighthouse.reportError && <p className="error">Lighthouse error: {lighthouse.reportError}</p>}
          <div className="score-grid">
            <ScoreGauge label="Performance" score={lighthouse.scores.performance} />
            <ScoreGauge label="Accessibility" score={lighthouse.scores.accessibility} />
            <ScoreGauge label="Best Practices" score={lighthouse.scores.bestPractices} />
            <ScoreGauge label="SEO" score={lighthouse.scores.seo} />
          </div>
          <div className="vital-grid">
            <VitalCard label="First Contentful Paint" value={formatMs(lighthouse.metrics.firstContentfulPaint)} />
            <VitalCard label="Largest Contentful Paint" value={formatMs(lighthouse.metrics.largestContentfulPaint)} />
            <VitalCard label="Total Blocking Time" value={formatMs(lighthouse.metrics.totalBlockingTime)} />
            <VitalCard
              label="Cumulative Layout Shift"
              value={lighthouse.metrics.cumulativeLayoutShift?.toFixed(3) ?? "–"}
            />
            <VitalCard label="Speed Index" value={formatMs(lighthouse.metrics.speedIndex)} />
            <VitalCard label="Time to Interactive" value={formatMs(lighthouse.metrics.timeToInteractive)} />
          </div>
          {lighthouse.topOpportunities.length > 0 && (
            <>
              <h4>Top opportunities</h4>
              <ul className="opportunities">
                {lighthouse.topOpportunities.map((opp) => (
                  <li key={opp.id}>
                    <strong>{opp.title}</strong>
                    {opp.displayValue ? ` — ${opp.displayValue}` : ""}
                    <br />
                    <span className="muted">{opp.description}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section>
        <h3>Google PageSpeed Insights</h3>
        {!pageSpeedInsights.requested && (
          <p className="muted">{pageSpeedInsights.skippedReason ?? "Not requested."}</p>
        )}
        {pageSpeedInsights.error && <p className="error">{pageSpeedInsights.error}</p>}
        {pageSpeedInsights.lab && (
          <>
            <div className="score-grid">
              <ScoreGauge label="Performance (lab)" score={pageSpeedInsights.lab.performanceScore} />
            </div>
            <div className="vital-grid">
              <VitalCard label="FCP" value={formatMs(pageSpeedInsights.lab.firstContentfulPaint)} />
              <VitalCard label="LCP" value={formatMs(pageSpeedInsights.lab.largestContentfulPaint)} />
              <VitalCard label="TBT" value={formatMs(pageSpeedInsights.lab.totalBlockingTime)} />
              <VitalCard
                label="CLS"
                value={pageSpeedInsights.lab.cumulativeLayoutShift?.toFixed(3) ?? "–"}
              />
              <VitalCard label="Speed Index" value={formatMs(pageSpeedInsights.lab.speedIndex)} />
            </div>
          </>
        )}
        {pageSpeedInsights.field ? (
          <>
            <h4>Real-user field data (CrUX) — overall: {pageSpeedInsights.field.overallCategory ?? "unknown"}</h4>
            <ul>
              <li>FCP: {pageSpeedInsights.field.firstContentfulPaintCategory ?? "n/a"}</li>
              <li>LCP: {pageSpeedInsights.field.largestContentfulPaintCategory ?? "n/a"}</li>
              <li>CLS: {pageSpeedInsights.field.cumulativeLayoutShiftCategory ?? "n/a"}</li>
              <li>INP: {pageSpeedInsights.field.interactionToNextPaintCategory ?? "n/a"}</li>
            </ul>
          </>
        ) : (
          pageSpeedInsights.requested && (
            <p className="muted">No CrUX field data available for this URL (likely low real-world traffic).</p>
          )
        )}
      </section>

      <section>
        <h3>Core Web Vitals (measured live via Playwright)</h3>
        {playwright.timedOut && (
          <p className="error">
            The page did not finish loading before the timeout; metrics below may be incomplete.
          </p>
        )}
        <div className="vital-grid">
          <VitalCard label="TTFB" value={formatMs(playwright.webVitals.ttfb)} />
          <VitalCard label="FCP" value={formatMs(playwright.webVitals.fcp)} />
          <VitalCard label="LCP" value={formatMs(playwright.webVitals.lcp)} />
          <VitalCard label="CLS" value={playwright.webVitals.cls?.toFixed(3) ?? "–"} />
          <VitalCard label="TBT (approx)" value={formatMs(playwright.webVitals.tbt)} />
          <VitalCard label="DOM Content Loaded" value={formatMs(playwright.webVitals.domContentLoaded)} />
          <VitalCard label="Load" value={formatMs(playwright.webVitals.load)} />
        </div>
        {playwright.screenshotBase64 && (
          <img
            className="screenshot"
            src={`data:image/jpeg;base64,${playwright.screenshotBase64}`}
            alt="Page screenshot"
          />
        )}
      </section>

      <section>
        <h3>Network</h3>
        <p>
          {playwright.network.totalRequests} requests · {formatBytes(playwright.network.totalTransferSizeBytes)}{" "}
          transferred · {playwright.network.failedRequests} failed
        </p>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Requests</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {playwright.network.byType.map((entry) => (
              <tr key={entry.type}>
                <td>{entry.type}</td>
                <td>{entry.count}</td>
                <td>{formatBytes(entry.transferSizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Slowest requests</h4>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {playwright.network.slowestRequests.map((req, i) => (
              <tr key={i}>
                <td className="truncate">{req.url}</td>
                <td>{req.status ?? "–"}</td>
                <td>{req.durationMs} ms</td>
                <td>{formatBytes(req.transferSizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Console errors &amp; warnings</h3>
        {playwright.consoleMessages.some((m) => m.type === "error" || m.type === "warning") ? (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {playwright.consoleMessages
                .filter((m) => m.type === "error" || m.type === "warning")
                .slice(0, 25)
                .map((m, i) => (
                  <tr key={i}>
                    <td>{m.type}</td>
                    <td className="truncate">{m.text}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No console errors or warnings were captured.</p>
        )}
      </section>
    </div>
  );
}
