import type { Page } from "playwright";
import type { FormLoginConfig } from "../types.js";

const DEFAULT_USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="username"]',
  'input[name="email"]',
  'input[id*="user" i]',
  'input[id*="email" i]',
];

const DEFAULT_PASSWORD_SELECTORS = [
  'input[type="password"]',
];

const DEFAULT_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Log in")',
  'button:has-text("Sign in")',
  'button:has-text("Login")',
];

async function firstMatch(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      return selector;
    }
  }
  return null;
}

/**
 * Performs a generic form-based login: navigates to the login page, fills in
 * the username/password fields (using explicit selectors when provided, or
 * falling back to common field patterns), and submits the form.
 */
export async function performFormLogin(page: Page, auth: FormLoginConfig): Promise<void> {
  await page.goto(auth.loginUrl, { waitUntil: "domcontentloaded" });

  const usernameSelector =
    auth.usernameSelector ?? (await firstMatch(page, DEFAULT_USERNAME_SELECTORS));
  const passwordSelector =
    auth.passwordSelector ?? (await firstMatch(page, DEFAULT_PASSWORD_SELECTORS));

  if (!usernameSelector || !passwordSelector) {
    throw new Error(
      "Could not locate username/password fields on the login page. " +
        "Provide explicit usernameSelector/passwordSelector in the auth config.",
    );
  }

  await page.fill(usernameSelector, auth.username);
  await page.fill(passwordSelector, auth.password);

  const submitSelector =
    auth.submitSelector ?? (await firstMatch(page, DEFAULT_SUBMIT_SELECTORS));

  if (submitSelector) {
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => undefined),
      page.click(submitSelector),
    ]);
  } else {
    await Promise.all([
      page.waitForLoadState("networkidle").catch(() => undefined),
      page.keyboard.press("Enter"),
    ]);
  }
}
