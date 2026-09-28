export type DeviceStrategy = "mobile" | "desktop";

export interface FormAuthInput {
  type: "form";
  loginUrl: string;
  username: string;
  password: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
}

export interface CookieAuthInput {
  type: "cookies";
  cookies: Array<{ name: string; value: string; domain?: string; path?: string; url?: string }>;
}

export interface TokenAuthInput {
  type: "token";
  payload: Record<string, unknown>;
  storageKey?: string;
  storage?: "local" | "session";
  authorizationHeader?: string;
}

export type AuthInput = FormAuthInput | CookieAuthInput | TokenAuthInput;

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

export interface SlowRequest {
  url: string;
  method: string;
  status: number | null;
  durationMs: number;
  transferSizeBytes: number;
  resourceType: string;
}

export interface NetworkSummary {
  totalRequests: number;
  totalTransferSizeBytes: number;
  failedRequests: number;
  byType: ResourceBreakdownEntry[];
  slowestRequests: SlowRequest[];
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
  authType: "form" | "cookies" | "token" | null;
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

export type JobStatus = "pending" | "running" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  url: string;
  createdAt: string;
  report?: PerformanceReport;
  error?: string;
}
