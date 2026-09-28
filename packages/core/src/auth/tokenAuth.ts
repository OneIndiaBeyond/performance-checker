import type { BrowserContext } from "playwright";
import type { TokenAuthConfig } from "../types.js";

/**
 * Injects a token payload (e.g. { loginId, bearerToken, refreshToken }) into
 * localStorage/sessionStorage before any page script runs, and optionally sets it as the
 * Authorization header on every request. Covers SPA auth that isn't cookie-based.
 */
export async function applyTokenAuth(context: BrowserContext, auth: TokenAuthConfig): Promise<void> {
  const key = auth.storageKey ?? "auth";
  const storageType = auth.storage ?? "local";
  const value = JSON.stringify(auth.payload);

  await context.addInitScript(
    ({ key, value, storageType }: { key: string; value: string; storageType: string }) => {
      const store = storageType === "session" ? window.sessionStorage : window.localStorage;
      store.setItem(key, value);
    },
    { key, value, storageType },
  );

  if (auth.authorizationHeader) {
    await context.setExtraHTTPHeaders({ Authorization: auth.authorizationHeader });
  }
}
