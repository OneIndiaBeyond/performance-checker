import { chromium, devices, type Request, type Response } from "playwright";
import type {
  AuthConfig,
  ConsoleMessageEntry,
  DeviceStrategy,
  NetworkSummary,
  PlaywrightMetrics,
  ResourceBreakdownEntry,
} from "../types.js";
import { performFormLogin } from "../auth/formLogin.js";
import { applyCookieAuth } from "../auth/cookieAuth.js";
import { applyTokenAuth } from "../auth/tokenAuth.js";
import { collectWebVitalsInBrowser } from "./webVitalsScript.js";

interface TrackedRequest {
  url: string;
  method: string;
  resourceType: string;
  startedAt: number;
  status: number | null;
  durationMs: number;
  transferSizeBytes: number;
  failed: boolean;
}

const NAVIGATION_TIMEOUT_MS = 45_000;
const SETTLE_TIME_MS = 2_000;

async function estimateSize(response: Response): Promise<number> {
  try {
    const sizes = await response.request().sizes();
    if (sizes.responseBodySize || sizes.responseHeadersSize) {
      return sizes.responseBodySize + sizes.responseHeadersSize;
    }
  } catch {
    // Falls through to the header-based estimate below.
  }
  const header = response.headers()["content-length"];
  return header ? parseInt(header, 10) || 0 : 0;
}

export async function collectPlaywrightMetrics(
  url: string,
  device: DeviceStrategy,
  auth?: AuthConfig,
): Promise<PlaywrightMetrics> {
  const start = Date.now();
  const browser = await chromium.launch({ headless: true });
  const deviceProfile = device === "mobile" ? devices["Pixel 7"] : undefined;

  const context = await browser.newContext({
    ...deviceProfile,
    ignoreHTTPSErrors: true,
  });

  const tracked = new Map<Request, TrackedRequest>();
  const consoleMessages: ConsoleMessageEntry[] = [];
  let timedOut = false;

  try {
    if (auth?.type === "cookies") {
      await applyCookieAuth(context, auth, url);
    } else if (auth?.type === "token") {
      await applyTokenAuth(context, auth);
    }

    const page = await context.newPage();

    page.on("console", (msg) => {
      if (consoleMessages.length >= 100) return;
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url,
      });
    });

    page.on("request", (request) => {
      tracked.set(request, {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        startedAt: Date.now(),
        status: null,
        durationMs: 0,
        transferSizeBytes: 0,
        failed: false,
      });
    });

    page.on("requestfailed", (request) => {
      const entry = tracked.get(request);
      if (entry) {
        entry.failed = true;
        entry.durationMs = Date.now() - entry.startedAt;
      }
    });

    page.on("response", (response) => {
      const entry = tracked.get(response.request());
      if (!entry) return;
      entry.status = response.status();
      entry.durationMs = Date.now() - entry.startedAt;
      void estimateSize(response).then((size) => {
        entry.transferSizeBytes = size;
      });
    });

    if (auth?.type === "form") {
      await performFormLogin(page, auth);
    }

    try {
      await page.goto(url, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Timeout")) {
        timedOut = true;
      } else {
        throw error;
      }
    }

    await page.waitForTimeout(SETTLE_TIME_MS);

    const webVitals = await page.evaluate(collectWebVitalsInBrowser);
    const finalUrl = page.url();
    const pageTitle = await page.title().catch(() => "");
    const screenshotBuffer = await page
      .screenshot({ type: "jpeg", quality: 60, fullPage: false })
      .catch(() => null);

    // Let any in-flight response-size lookups resolve before summarizing.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const network = summarizeNetwork(Array.from(tracked.values()));

    return {
      finalUrl,
      pageTitle,
      webVitals,
      network,
      consoleMessages,
      screenshotBase64: screenshotBuffer ? screenshotBuffer.toString("base64") : null,
      timedOut,
      durationMs: Date.now() - start,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

function summarizeNetwork(requests: TrackedRequest[]): NetworkSummary {
  const byType = new Map<string, ResourceBreakdownEntry>();
  let totalTransferSizeBytes = 0;
  let failedRequests = 0;

  for (const req of requests) {
    totalTransferSizeBytes += req.transferSizeBytes;
    if (req.failed) failedRequests += 1;

    const existing = byType.get(req.resourceType) ?? {
      type: req.resourceType,
      count: 0,
      transferSizeBytes: 0,
    };
    existing.count += 1;
    existing.transferSizeBytes += req.transferSizeBytes;
    byType.set(req.resourceType, existing);
  }

  const slowestRequests = [...requests]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10)
    .map((req) => ({
      url: req.url,
      method: req.method,
      status: req.status,
      durationMs: req.durationMs,
      transferSizeBytes: req.transferSizeBytes,
      resourceType: req.resourceType,
    }));

  return {
    totalRequests: requests.length,
    totalTransferSizeBytes,
    failedRequests,
    byType: Array.from(byType.values()).sort((a, b) => b.transferSizeBytes - a.transferSizeBytes),
    slowestRequests,
  };
}
