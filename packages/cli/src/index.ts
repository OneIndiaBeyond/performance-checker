#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import dotenv from "dotenv";
import { Command } from "commander";
import {
  runCheck,
  renderReportHtml,
  type AuthConfig,
  type CheckOptions,
  type DeviceStrategy,
} from "@performance-checker/core";

const program = new Command();

program
  .name("performance-checker")
  .description(
    "Navigates a web page with Playwright and produces a Lighthouse + Core Web Vitals + " +
      "PageSpeed Insights performance report.",
  )
  .argument("<url>", "URL of the page to check")
  .option("-d, --device <device>", "mobile or desktop", "mobile")
  .option("-o, --output <dir>", "output directory for the report", "./reports")
  .option("--no-lighthouse", "skip the local Lighthouse audit")
  .option("--psi", "also query the Google PageSpeed Insights API", false)
  .option("--psi-key <key>", "Google PageSpeed Insights API key (or set PSI_API_KEY)")
  .option("--login-url <url>", "URL of a login form to authenticate before the check")
  .option("--username <username>", "username for form login")
  .option("--password <password>", "password for form login")
  .option("--username-selector <selector>", "CSS selector for the username field")
  .option("--password-selector <selector>", "CSS selector for the password field")
  .option("--submit-selector <selector>", "CSS selector for the login submit button")
  .option("--cookies-file <path>", "path to a JSON file with session cookies to inject")
  .option(
    "--auth-json <pathOrJson>",
    "full auth object to use as-is — either a path to a JSON file or an inline JSON string, " +
      "e.g. '{\"type\":\"form\",\"loginUrl\":\"...\",\"username\":\"...\",\"password\":\"...\"}'. " +
      "Also accepts \"type\":\"token\" ({ payload, storageKey?, storage?, authorizationHeader? }). " +
      "Takes priority over --login-url/--username/--password/--cookies-file.",
  )
  .option(
    "--env-file <path>",
    "load auth/config from a per-site .env file. Recognized keys: LOGIN_URL, LOGIN_USERNAME, " +
      "LOGIN_PASSWORD, LOGIN_USERNAME_SELECTOR, LOGIN_PASSWORD_SELECTOR, LOGIN_SUBMIT_SELECTOR, " +
      "AUTH_JSON (full auth object as a JSON string, same shape as --auth-json), PSI_API_KEY.",
  )
  .action(async (url: string, opts) => {
    const device = (opts.device === "desktop" ? "desktop" : "mobile") as DeviceStrategy;

    if (opts.envFile) {
      const result = dotenv.config({ path: path.resolve(opts.envFile), override: true });
      if (result.error) {
        console.error(`Could not read --env-file ${opts.envFile}: ${result.error.message}`);
        process.exitCode = 1;
        return;
      }
    }

    const authJsonInput = opts.authJson ?? process.env.AUTH_JSON;
    const loginUrl = opts.loginUrl ?? process.env.LOGIN_URL;
    const username = opts.username ?? process.env.LOGIN_USERNAME;
    const password = opts.password ?? process.env.LOGIN_PASSWORD;
    const usernameSelector = opts.usernameSelector ?? process.env.LOGIN_USERNAME_SELECTOR;
    const passwordSelector = opts.passwordSelector ?? process.env.LOGIN_PASSWORD_SELECTOR;
    const submitSelector = opts.submitSelector ?? process.env.LOGIN_SUBMIT_SELECTOR;

    let auth: AuthConfig | undefined;
    if (authJsonInput) {
      auth = JSON.parse(await readAuthJsonInput(authJsonInput));
      if (!auth || (auth.type !== "form" && auth.type !== "cookies" && auth.type !== "token")) {
        console.error(
          '--auth-json / AUTH_JSON must be an object with "type": "form", "cookies" or "token".',
        );
        process.exitCode = 1;
        return;
      }
    } else if (opts.cookiesFile) {
      const raw = await readFile(path.resolve(opts.cookiesFile), "utf-8");
      auth = { type: "cookies", cookies: JSON.parse(raw) };
    } else if (loginUrl && username && password) {
      auth = {
        type: "form",
        loginUrl,
        username,
        password,
        usernameSelector,
        passwordSelector,
        submitSelector,
      };
    } else if (loginUrl || username || password) {
      console.error(
        "To use form login you must provide login URL, username and password together " +
          "(via flags, or LOGIN_URL/LOGIN_USERNAME/LOGIN_PASSWORD in --env-file).",
      );
      process.exitCode = 1;
      return;
    }

    const options: CheckOptions = {
      url,
      device,
      auth,
      runLighthouse: opts.lighthouse !== false,
      runPageSpeedInsights: Boolean(opts.psi),
      psiApiKey: opts.psiKey ?? process.env.PSI_API_KEY,
    };

    console.log(`Checking ${url} (${device})...`);
    const report = await runCheck(options);

    const outputDir = path.resolve(opts.output);
    await mkdir(outputDir, { recursive: true });
    const base = `report-${report.id.slice(0, 8)}`;
    const htmlPath = path.join(outputDir, `${base}.html`);
    const jsonPath = path.join(outputDir, `${base}.json`);

    await writeFile(htmlPath, renderReportHtml(report), "utf-8");
    await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8");

    printSummary(report);
    console.log(`\nHTML report: ${htmlPath}`);
    console.log(`JSON report: ${jsonPath}`);

    if (report.security.credentialsUsed) {
      printCredentialsWarning(report.security.message ?? "");
    }
  });

/** Accepts either a path to a JSON file or a raw JSON string, and returns the raw text. */
async function readAuthJsonInput(pathOrJson: string): Promise<string> {
  const trimmed = pathOrJson.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  try {
    return await readFile(path.resolve(trimmed), "utf-8");
  } catch {
    return trimmed;
  }
}

function printSummary(report: Awaited<ReturnType<typeof runCheck>>): void {
  console.log("");
  if (report.lighthouse) {
    const s = report.lighthouse.scores;
    console.log(
      `Lighthouse — Performance: ${s.performance ?? "–"}  Accessibility: ${
        s.accessibility ?? "–"
      }  Best Practices: ${s.bestPractices ?? "–"}  SEO: ${s.seo ?? "–"}`,
    );
  }
  const wv = report.playwright.webVitals;
  console.log(
    `Web Vitals — TTFB: ${wv.ttfb ?? "–"}ms  FCP: ${wv.fcp ?? "–"}ms  LCP: ${
      wv.lcp ?? "–"
    }ms  CLS: ${wv.cls ?? "–"}`,
  );
  console.log(
    `Network — ${report.playwright.network.totalRequests} requests, ${(
      report.playwright.network.totalTransferSizeBytes / 1024
    ).toFixed(0)} KB`,
  );
}

function printCredentialsWarning(message: string): void {
  const line = "!".repeat(72);
  console.log(`\n${line}`);
  console.log("SECURITY WARNING: credentials were used for this scan.");
  console.log(message);
  console.log(line);
}

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
