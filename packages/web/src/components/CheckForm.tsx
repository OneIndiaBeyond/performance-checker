import { useState } from "react";
import type { CreateCheckInput } from "../api.js";
import type { DeviceStrategy } from "../types.js";

interface Props {
  disabled: boolean;
  onSubmit: (input: CreateCheckInput) => void;
}

type AuthMode = "none" | "form" | "cookies" | "token" | "json";

export function CheckForm({ disabled, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [device, setDevice] = useState<DeviceStrategy>("mobile");
  const [runLighthouse, setRunLighthouse] = useState(true);
  const [runPsi, setRunPsi] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("none");

  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameSelector, setUsernameSelector] = useState("");
  const [passwordSelector, setPasswordSelector] = useState("");
  const [submitSelector, setSubmitSelector] = useState("");

  const [cookiesJson, setCookiesJson] = useState("");

  const [tokenPayloadJson, setTokenPayloadJson] = useState("");
  const [tokenStorageKey, setTokenStorageKey] = useState("auth");
  const [tokenStorage, setTokenStorage] = useState<"local" | "session">("local");
  const [tokenAuthHeader, setTokenAuthHeader] = useState("");

  const [authJson, setAuthJson] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!url.trim()) {
      setFormError("Please enter a URL to check.");
      return;
    }

    const input: CreateCheckInput = {
      url: url.trim(),
      device,
      runLighthouse,
      runPageSpeedInsights: runPsi,
    };

    if (authMode === "form") {
      if (!loginUrl || !username || !password) {
        setFormError("Login URL, username and password are all required for form login.");
        return;
      }
      input.auth = {
        type: "form",
        loginUrl,
        username,
        password,
        usernameSelector: usernameSelector || undefined,
        passwordSelector: passwordSelector || undefined,
        submitSelector: submitSelector || undefined,
      };
    } else if (authMode === "cookies") {
      try {
        const cookies = JSON.parse(cookiesJson);
        if (!Array.isArray(cookies)) throw new Error("not an array");
        input.auth = { type: "cookies", cookies };
      } catch {
        setFormError("Cookies must be valid JSON: an array of {name, value, domain} objects.");
        return;
      }
    } else if (authMode === "token") {
      let payload: unknown;
      try {
        payload = JSON.parse(tokenPayloadJson);
      } catch {
        setFormError("The token payload must be valid JSON, e.g. {\"bearerToken\": \"...\"}.");
        return;
      }
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        setFormError("The token payload must be a JSON object.");
        return;
      }
      input.auth = {
        type: "token",
        payload: payload as Record<string, unknown>,
        storageKey: tokenStorageKey || undefined,
        storage: tokenStorage,
        authorizationHeader: tokenAuthHeader || undefined,
      };
    } else if (authMode === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(authJson);
      } catch {
        setFormError("The auth object is not valid JSON.");
        return;
      }
      const parsedType = (parsed as { type?: unknown } | null)?.type;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsedType !== "form" && parsedType !== "cookies" && parsedType !== "token")
      ) {
        setFormError('The auth object must have "type": "form", "cookies" or "token".');
        return;
      }
      input.auth = parsed as CreateCheckInput["auth"];
    }

    onSubmit(input);
  }

  return (
    <form className="check-form" onSubmit={handleSubmit}>
      <label>
        Page URL
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </label>

      <div className="row">
        <label>
          Device
          <select value={device} onChange={(e) => setDevice(e.target.value as DeviceStrategy)}>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={runLighthouse}
            onChange={(e) => setRunLighthouse(e.target.checked)}
          />
          Run Lighthouse audit
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={runPsi} onChange={(e) => setRunPsi(e.target.checked)} />
          Query PageSpeed Insights
        </label>
      </div>

      <fieldset>
        <legend>Authenticated navigation (optional)</legend>
        <label>
          Mode
          <select value={authMode} onChange={(e) => setAuthMode(e.target.value as AuthMode)}>
            <option value="none">None — public page</option>
            <option value="form">Log in with username/password</option>
            <option value="cookies">Use existing session cookies</option>
            <option value="token">Use a bearer/refresh token (JWT, SPA login)</option>
            <option value="json">Paste full auth object (advanced)</option>
          </select>
        </label>

        {authMode === "form" && (
          <div className="auth-fields">
            <p className="hint">
              Credentials are used only in-memory for this run and are never written to the
              report. You'll get a reminder afterwards to revoke them anyway.
            </p>
            <label>
              Login page URL
              <input
                type="url"
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
                placeholder="https://example.com/login"
              />
            </label>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <details>
              <summary>Advanced: custom field selectors</summary>
              <label>
                Username field selector
                <input
                  value={usernameSelector}
                  onChange={(e) => setUsernameSelector(e.target.value)}
                  placeholder='e.g. input[name="email"]'
                />
              </label>
              <label>
                Password field selector
                <input
                  value={passwordSelector}
                  onChange={(e) => setPasswordSelector(e.target.value)}
                  placeholder='e.g. input[type="password"]'
                />
              </label>
              <label>
                Submit button selector
                <input
                  value={submitSelector}
                  onChange={(e) => setSubmitSelector(e.target.value)}
                  placeholder='e.g. button[type="submit"]'
                />
              </label>
            </details>
          </div>
        )}

        {authMode === "cookies" && (
          <div className="auth-fields">
            <p className="hint">
              Paste cookies exported from an already logged-in session (Playwright/Puppeteer JSON
              format: an array of {"{"}name, value, domain{"}"} objects).
            </p>
            <textarea
              rows={6}
              value={cookiesJson}
              onChange={(e) => setCookiesJson(e.target.value)}
              placeholder='[{"name":"session","value":"...","domain":"example.com"}]'
            />
          </div>
        )}

        {authMode === "token" && (
          <div className="auth-fields">
            <p className="hint">
              For SPAs that keep auth in localStorage/sessionStorage instead of cookies (e.g. a
              JWT bearer + refresh token pair). The payload is written to storage before the page
              loads. Treat any real token pasted here as compromised — revoke/rotate it after the
              scan.
            </p>
            <label>
              Token payload (JSON object)
              <textarea
                rows={6}
                value={tokenPayloadJson}
                onChange={(e) => setTokenPayloadJson(e.target.value)}
                placeholder='{"loginId":"...","bearerToken":"...","refreshToken":"..."}'
              />
            </label>
            <div className="row">
              <label>
                Storage key
                <input
                  value={tokenStorageKey}
                  onChange={(e) => setTokenStorageKey(e.target.value)}
                  placeholder="auth"
                />
              </label>
              <label>
                Storage
                <select
                  value={tokenStorage}
                  onChange={(e) => setTokenStorage(e.target.value as "local" | "session")}
                >
                  <option value="local">localStorage</option>
                  <option value="session">sessionStorage</option>
                </select>
              </label>
            </div>
            <label>
              Authorization header (optional)
              <input
                value={tokenAuthHeader}
                onChange={(e) => setTokenAuthHeader(e.target.value)}
                placeholder="Bearer eyJ..."
              />
            </label>
          </div>
        )}

        {authMode === "json" && (
          <div className="auth-fields">
            <p className="hint">
              Paste the entire auth object as-is — same shape used by the CLI's{" "}
              <code>--auth-json</code> flag and the API's <code>auth</code> field. Useful for
              reusing a saved config, or for fields the form above doesn't expose.
            </p>
            <textarea
              rows={8}
              value={authJson}
              onChange={(e) => setAuthJson(e.target.value)}
              placeholder={
                '{\n  "type": "form",\n  "loginUrl": "https://example.com/login",\n  "username": "...",\n  "password": "...",\n  "usernameSelector": "input[name=\\"email\\"]"\n}'
              }
            />
          </div>
        )}
      </fieldset>

      {formError && <p className="error">{formError}</p>}

      <button type="submit" disabled={disabled}>
        {disabled ? "Running..." : "Run performance check"}
      </button>
    </form>
  );
}
