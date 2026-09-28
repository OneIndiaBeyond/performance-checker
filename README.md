# Performance Checker

A web page performance checker that blends the best of **Lighthouse**, **Google PageSpeed
Insights**, and GTmetrix-style reporting into a single tool. Point it at a URL — the app drives a
real Chromium browser with **Playwright**, navigates the page, and collects:

- A full **Lighthouse audit** (Performance / Accessibility / Best Practices / SEO), run locally —
  no API key needed.
- Live **Core Web Vitals** (TTFB, FCP, LCP, CLS, an approximate TBT) measured directly in the
  browser as it navigates.
- **Network analysis**: requests by type, total transfer size, failed requests, slowest requests.
- **Console errors and warnings**.
- Optionally, **Google PageSpeed Insights** lab + real-user (CrUX) field data.
- A full-page **screenshot**.

It can also navigate **authenticated pages**, three ways:

- a generic **form login** (username/password),
- injecting **cookies** from an already-authenticated session, or
- injecting a **bearer/refresh token payload** into localStorage/sessionStorage (and optionally an
  `Authorization` header) — for SPAs that keep auth state out of cookies.

Whenever credentials are used for a scan, the report (CLI and web UI) surfaces a clear **security
reminder to revoke/rotate them** afterwards.

The report is generated as a standalone HTML file (and JSON), and can also be viewed live in a
local web UI.

## Project layout

This is an npm workspaces monorepo:

- `packages/core` — the engine: Playwright collector, Lighthouse runner, PageSpeed Insights
  client, auth handling, HTML report renderer. Framework-agnostic, used by both the CLI and the
  server.
- `packages/cli` — `performance-checker <url>` command-line tool.
- `packages/server` — small Express API used by the web UI to run checks asynchronously.
- `packages/web` — React + Vite frontend.

## Setup

```bash
npm install       # installs all workspaces and downloads the Playwright Chromium browser
cp .env.example .env
```

`PSI_API_KEY` in `.env` is optional. Without it, PageSpeed Insights still works but with strict
Google-imposed rate limits. Get a free key at
https://developers.google.com/speed/docs/insights/v5/get-started.

## Usage — CLI

```bash
npm run build
npx performance-checker https://example.com --device mobile --psi
```

Useful flags:

- `--device mobile|desktop`
- `--no-lighthouse` — skip the local Lighthouse audit
- `--psi` — also query Google PageSpeed Insights (`--psi-key` or `PSI_API_KEY` env var)
- `--login-url`, `--username`, `--password` — log in via a form before measuring
- `--username-selector`, `--password-selector`, `--submit-selector` — override auto-detected
  login field selectors
- `--cookies-file <path>` — inject session cookies from a JSON file instead of logging in
- `--auth-json <pathOrJson>` — full auth object, as a JSON file path or an inline JSON string.
  Works for all three auth types, e.g. a token login:
  `--auth-json '{"type":"token","payload":{"bearerToken":"...","refreshToken":"..."},"storageKey":"auth"}'`
- `--env-file <path>` — load auth (and `PSI_API_KEY`) from a per-site `.env` file instead of
  passing flags. Recognized keys: `LOGIN_URL`, `LOGIN_USERNAME`, `LOGIN_PASSWORD`,
  `LOGIN_USERNAME_SELECTOR`, `LOGIN_PASSWORD_SELECTOR`, `LOGIN_SUBMIT_SELECTOR`, `AUTH_JSON` (same
  shape as `--auth-json` — the way to pass a token login via env file), `PSI_API_KEY`.
- `-o, --output <dir>` — where to write the HTML/JSON report (default `./reports`)

Reports are written to `./reports/report-<id>.html` and `.json`. If credentials were used, the CLI
prints a loud warning telling you to revoke/rotate them.

Example per-site `.env` file for a token-based SPA login (`--env-file ./sites/myapp.env`):

```bash
AUTH_JSON={"type":"token","payload":{"loginId":"...","bearerToken":"...","refreshToken":"..."},"storageKey":"auth","authorizationHeader":"Bearer ..."}
```

## Usage — Web UI

Run the API server and the frontend in two terminals:

```bash
npm run server   # http://localhost:4000
npm run web      # http://localhost:5173
```

Open http://localhost:5173, fill in the URL (and, if needed, login credentials, session cookies,
or a bearer/refresh token payload), and run the check. If credentials were used for the scan, a
modal alert appears reminding you to revoke/rotate them.

## Security notes

- Credentials you provide (username/password, cookies, or a token payload) are only ever held in
  memory for the duration of a single check. They are never written to the generated report or to
  disk.
- Never paste a *real, live* token/session into a shared or logged environment (including an AI
  assistant's chat) if you can avoid it — treat anything typed there as compromised and rotate it
  regardless of whether it was actually used.
- Whenever a check used credentials, both the CLI output and the web UI display a clear reminder
  to revoke or rotate them afterwards — since an automated tool held them, even transiently.
- Prefer a dedicated, low-privilege test account (or an already-authenticated session's cookies)
  over reusing real production credentials.
