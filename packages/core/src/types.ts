export type DeviceStrategy = "mobile" | "desktop";

/** Login credentials used to reach a form behind authentication. */
export interface FormLoginConfig {
  type: "form";
  loginUrl: string;
  username: string;
  password: string;
  /** Optional CSS selectors. Sensible defaults are used when omitted. */
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
}

/** An already-authenticated session, provided as browser cookies. */
export interface CookieAuthConfig {
  type: "cookies";
  /** Raw cookies as exported from a browser session (Playwright/Puppeteer JSON format). */
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    url?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
}

/**
 * An already-authenticated session provided as a token payload (e.g. a JWT bearer/refresh
 * token pair), as commonly used by SPAs that keep auth state in localStorage/sessionStorage
 * instead of cookies.
 */
export interface TokenAuthConfig {
  type: "token";
  /** Arbitrary object written as JSON into localStorage/sessionStorage before navigation. */
  payload: Record<string, unknown>;
  /** Storage key the payload is written under. Defaults to "auth". */
  storageKey?: string;
  storage?: "local" | "session";
  /** If set, sent as the literal `Authorization` header value on every request (e.g. "Bearer eyJ..."). */
  authorizationHeader?: string;
}

export type AuthConfig = FormLoginConfig | CookieAuthConfig | TokenAuthConfig;

export interface CheckOptions {
  url: string;
  device?: DeviceStrategy;
  auth?: AuthConfig;
  /** Run the local Lighthouse audit. Defaults to true. */
  runLighthouse?: boolean;
  /** Call the Google PageSpeed Insights API. Defaults to false (requires network egress to Google + optional API key). */
  runPageSpeedInsights?: boolean;
  psiApiKey?: string;
}

export interface WebVitals {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  domContentLoaded: number | null;
  load: number | null;
}

export interface ResourceBreakdownEntry {
  type: string;
  count: number;
  transferSizeBytes: number;
}

export interface NetworkSummary {
  totalRequests: number;
  totalTransferSizeBytes: number;
  failedRequests: number;
  byType: ResourceBreakdownEntry[];
  slowestRequests: Array<{
    url: string;
    method: string;
    status: number | null;
    durationMs: number;
    transferSizeBytes: number;
    resourceType: string;
  }>;
}

export interface ConsoleMessageEntry {
  type: string;
  text: string;
  location?: string;
}

export interface PlaywrightMetrics {
  finalUrl: string;
  pageTitle: string;
  webVitals: WebVitals;
  network: NetworkSummary;
  consoleMessages: ConsoleMessageEntry[];
  screenshotBase64: string | null;
  timedOut: boolean;
  durationMs: number;
}

export interface LighthouseAuditRef {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

export interface LighthouseResult {
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: {
    firstContentfulPaint: number | null;
    largestContentfulPaint: number | null;
    totalBlockingTime: number | null;
    cumulativeLayoutShift: number | null;
    speedIndex: number | null;
    timeToInteractive: number | null;
  };
  topOpportunities: LighthouseAuditRef[];
  reportError?: string;
}

export interface PageSpeedInsightsResult {
  requested: boolean;
  skippedReason?: string;
  lab?: {
    performanceScore: number | null;
    firstContentfulPaint: number | null;
    largestContentfulPaint: number | null;
    totalBlockingTime: number | null;
    cumulativeLayoutShift: number | null;
    speedIndex: number | null;
  };
  field?: {
    firstContentfulPaintCategory: string | null;
    largestContentfulPaintCategory: string | null;
    cumulativeLayoutShiftCategory: string | null;
    interactionToNextPaintCategory: string | null;
    overallCategory: string | null;
  } | null;
  error?: string;
}

export interface SecurityNotice {
  credentialsUsed: boolean;
  authType: AuthConfig["type"] | null;
  message: string | null;
}

export interface PerformanceReport {
  id: string;
  url: string;
  device: DeviceStrategy;
  generatedAt: string;
  durationMs: number;
  playwright: PlaywrightMetrics;
  lighthouse: LighthouseResult | null;
  pageSpeedInsights: PageSpeedInsightsResult;
  security: SecurityNotice;
}
