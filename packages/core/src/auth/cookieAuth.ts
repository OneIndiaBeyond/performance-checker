import type { BrowserContext } from "playwright";
import type { CookieAuthConfig } from "../types.js";

/** Injects an already-authenticated session into the browser context via cookies. */
export async function applyCookieAuth(
  context: BrowserContext,
  auth: CookieAuthConfig,
  fallbackUrl: string,
): Promise<void> {
  const cookies = auth.cookies.map((cookie) => {
    if (!cookie.domain && !cookie.url) {
      return { ...cookie, url: fallbackUrl };
    }
    return cookie;
  });

  await context.addCookies(cookies as Parameters<BrowserContext["addCookies"]>[0]);
}
