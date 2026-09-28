import type { AuthConfig, SecurityNotice } from "../types.js";

/**
 * Whenever real credentials (not just a cookie/session snapshot) are typed
 * into this tool, we surface a loud reminder afterwards: an automated tool
 * that just held plaintext credentials in memory/CLI args is a good reason
 * to rotate them, even if this tool never persists them itself.
 */
export function buildSecurityNotice(auth: AuthConfig | undefined): SecurityNotice {
  if (!auth) {
    return { credentialsUsed: false, authType: null, message: null };
  }

  if (auth.type === "form") {
    return {
      credentialsUsed: true,
      authType: "form",
      message:
        "This scan used a username and password to log in. For security, revoke or rotate " +
        "these credentials now, and prefer a dedicated low-privilege test account or a " +
        "session-cookie login for future scans instead of reusing real credentials.",
    };
  }

  if (auth.type === "cookies") {
    return {
      credentialsUsed: true,
      authType: "cookies",
      message:
        "This scan used session cookies to authenticate. If this session belongs to a real " +
        "account, sign it out / revoke the session now so the exported cookies can no longer " +
        "be used to access the account.",
    };
  }

  return {
    credentialsUsed: true,
    authType: "token",
    message:
      "This scan used a bearer/refresh token to authenticate. Treat it as compromised — " +
      "revoke or invalidate it (and its refresh token) on the backend now, since it was held " +
      "by an automated tool and may remain in logs or shell/session history.",
  };
}
