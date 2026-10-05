# Deploying Eudaimonia to Vercel

> Operator runbook for deploying the Eudaimonia Next.js 16 (App Router) frontend to
> Vercel and configuring its production environment variables.
>
> **Scope:** This document describes *how* to deploy and *what* to configure. The
> actual deploy is **human-gated** — it requires real accounts, live secrets, and
> funded keys that an agent cannot provision. Work through the
> [human-only go-live checklist](../prompts/post-epic-actions.md#-human-only-go-live-checklist-an-agent-cannot-do-these)
> (sections A–E) alongside this guide.

---

## 0. Live demo profile (Epic 8 — what is deployed today)

The public site **https://eudaimonia-nine.vercel.app** is the Base Sepolia testnet demo ([ADR 0003](adr/0003-testnet-demo.md)), not the real-money launch described in §1–2.

- **Project:** `eudaimonia` in team `backfrom13-4829s-projects`, Git-connected to `mnkprs/Eudaimonia`. Install `npm ci` (the repo also carries a pnpm lockfile — keep the override), **Node 24.x** (Node 20 reached end of support on Vercel on 2026-10-01; the 20.x row below is superseded).
- **Production branch is `main`.** Merging to `main` deploys production.
- **Env (Production + Preview):**

| Var | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CHAIN` | `base-sepolia` | Mainnet (`base`) can never run the demo |
| `NEXT_PUBLIC_DONATION_MODE` | `demo` | `onramp` restores the Stripe checkout |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` / `NEXT_PUBLIC_BASE_RPC_URL` | `https://sepolia.base.org` / `https://mainnet.base.org` | Client reads; also feed the CSP `connect-src` |
| `NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA` | `0x88964c6141D927dB05ddFA995a6ffA4BbD1beB91` | Baked in at build — redeploy after changing |
| `BASE_SEPOLIA_RPC_URL` | `https://base-sepolia-rpc.publicnode.com` | Server-only RPC for the demo wallet (fewer stale reads than `sepolia.base.org`) |
| `USDC_CONTRACT_BASE_SEPOLIA` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Circle test USDC |
| `DEMO_DONATIONS_ENABLED` | `true` | Kill switch — anything else returns `demo_disabled` |
| `DEMO_DAILY_CAP` | `25` | Global donations per day |
| `DEMO_WALLET_PRIVATE_KEY` | *(Sensitive)* | Testnet-only demo wallet; never `NEXT_PUBLIC_` |

No Stripe, KV or Sentry variables are needed for the demo; KV falls back to in-memory (limits are then per instance). Day-to-day demo operations (refill, recycle test USDC, rotate the key) are in [`prompts/HUMAN-ACTIONS.md`](../prompts/HUMAN-ACTIONS.md#demo-ops-base-sepolia-public-demo).

---

## 1. Vercel deploy steps

This is a standard Next.js App Router app (`next@16.2.6`, `react@19.2.4`). Vercel
auto-detects it, but pin the settings below explicitly so a misdetection cannot
break a production build.

### Project settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Framework Preset** | `Next.js` | Auto-detected from `next` in `package.json`. |
| **Build Command** | `next build` | Matches the `build` script in `package.json`. Leave as the framework default. |
| **Output** | *(managed by Vercel)* | Next.js on Vercel uses the native build output; do **not** set a custom output directory. |
| **Install Command** | `npm ci` | Reproducible install from `package-lock.json`. Do not use `npm install` in CI/CD — it can drift the lockfile. |
| **Node.js Version** | `20.x` | The repo targets `@types/node@^20`; pin Node 20 LTS in **Project Settings → General → Node.js Version**. Do not use Node 18 (some deps assume 20+). |
| **Root Directory** | repository root | The Next.js app lives at the repo root (`next.config.ts`, `src/app/`). |

### `postinstall` caveat — `patch-chrome-launcher`

`package.json` declares:

```json
"postinstall": "node scripts/patch-chrome-launcher.mjs"
```

This runs automatically after **every** `npm ci` / `npm install`, including on
Vercel. It patches a transitive `chrome-launcher` dependency pulled in by the
Lighthouse / Playwright a11y tooling.

- The script must be **idempotent and non-fatal** in a production build context
  (where the dev-only Chrome tooling may be absent). If a future change makes it
  throw when the target file is missing, the Vercel build will fail at the install
  step — guard it to exit `0` when there is nothing to patch.
- It does **not** require Chrome to be installed on the build machine; it only
  edits a launcher source file. No `PUPPETEER_*` / Playwright browser download is
  needed for `next build`, so do not add `playwright install` to the Vercel build.
- If you ever need to disable it on Vercel, set the build env var
  `npm_config_ignore_scripts=true` — but that also skips any other lifecycle
  scripts, so prefer fixing the script over disabling it.

### Deploy flow

1. **Connect the repo** — Vercel → *Add New Project* → import the Git repository.
2. **Confirm settings** — apply the table above (preset, install command, Node 20).
3. **Set environment variables** — add every required variable from
   [§2](#2-production-environment-variables) under **Project Settings →
   Environment Variables**, scoped to **Production** (and Preview if you run a
   staging deploy). Server secrets must **not** be given a `NEXT_PUBLIC_` name.
4. **Deploy** — trigger the first production deploy from the `main` branch (or your
   release branch). Vercel runs `npm ci` → `postinstall` → `next build`.
5. **Attach the domain** — see go-live checklist §E (custom domain + DNS/TLS).

### `vercel.json` — not required

No `vercel.json` is needed for this project:

- **Headers** are emitted in-app via `next.config.ts` → `headers()` (HSTS,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`). Do not duplicate them in `vercel.json`.
- There are no custom routes, redirects, rewrites, regions, or cron jobs that
  require it.

Add a `vercel.json` only if you later introduce config Vercel cannot infer (e.g.
cron functions or per-route region pinning). It is intentionally omitted today.

---

## 2. Production environment variables

Set these in **Vercel → Project Settings → Environment Variables** (Production
scope). The split below is load-bearing:

- **`NEXT_PUBLIC_*`** variables are **inlined into the client bundle at build
  time** and are publicly visible. Only put non-secret, browser-needed values here.
- **Server-only** variables are read at runtime via `process.env` in server code
  (route handlers, server components) and **must never** be renamed with a
  `NEXT_PUBLIC_` prefix. Doing so would leak secrets (Stripe key, KV token) into
  the client bundle.

Server-only secrets are validated at **first request** (not build time) by
`src/lib/env/server.ts` — `next build` succeeds without them, but the first server
request throws `ServerEnvError` if any required server var is missing or malformed.

### Required & optional variables

| Variable | Scope | Required? | Purpose |
|----------|-------|-----------|---------|
| `NEXT_PUBLIC_CHAIN` | `NEXT_PUBLIC_*` (client) | **Required** | Network selector, `"base"` \| `"base-sepolia"`. **Set to `base` in production.** Read by wagmi config, receipt page, OG image, on-ramp session, and the server env validator. |
| `NEXT_PUBLIC_BASE_RPC_URL` | `NEXT_PUBLIC_*` (client) | **Required (prod)** | Base **mainnet** RPC endpoint. Public `mainnet.base.org` is dev-only and rate-limits under load — use an authenticated Alchemy/QuickNode URL. Read by `wagmi.ts`, `publicClient.ts`, and referenced by the CSP plan in `security/headers.ts`. |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | `NEXT_PUBLIC_*` (client) | Optional (prod) | Base Sepolia RPC. Needed only if production also reads Sepolia; otherwise dev/preview only. Authenticated URL recommended for any real load. |
| `NEXT_PUBLIC_ROUTER_ADDRESS_BASE` | `NEXT_PUBLIC_*` (client) | **Required (prod)** | Deployed `TransparentDonationRouter` address on Base mainnet, read in the browser by `contracts.ts` (`getRouterAddress`). Blank/malformed → `undefined` (wallet flows can't route). Set after the mainnet contract deploy (checklist §D). |
| `NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA` | `NEXT_PUBLIC_*` (client) | Optional | Deployed router address on Base Sepolia, read by `contracts.ts`. Set for testnet/preview flows. |
| `STRIPE_SECRET_KEY` | **Server-only** | **Required** | Stripe Crypto Onramp **secret** API key (`sk_live_…` in prod). Authenticates server-side Stripe calls for on-ramp session creation. **Never expose to client.** |
| `STRIPE_ONRAMP_WEBHOOK_SECRET` | **Server-only** | **Required** | Stripe webhook signing secret (`whsec_…`) for the endpoint subscribed to `crypto.onramp_session.*` events. Verifies inbound webhook signatures. **Never expose to client.** |
| `KV_REST_API_URL` | **Server-only** | **Required (prod)** | Vercel KV / Upstash Redis REST URL. Backs the durable cross-instance on-ramp session, idempotency, processed-event, and rate-limit stores. Without it, the app falls back to an in-memory store (single-instance, MVP-only — see E3.1). Populated by `vercel env pull` from the Vercel KV integration. |
| `KV_REST_API_TOKEN` | **Server-only** | **Required (prod)** | Vercel KV / Upstash REST auth token paired with `KV_REST_API_URL`. **Never expose to client.** |
| `ROUTER_ADDRESS_BASE_SEPOLIA` | **Server-only** | **Required** | Server-validated router address on Base Sepolia (`0x` + 40 hex). Enforced by the Zod schema in `server.ts`; the first request fails if missing/malformed. Distinct from the `NEXT_PUBLIC_` router vars used in the browser. |
| `USDC_CONTRACT_BASE_SEPOLIA` | **Server-only** | **Required** | Canonical Base Sepolia USDC address (`0x` + 40 hex), server-validated by the Zod schema. |
| `ENDAOMENT_API_URL` | **Server-only** | Optional | Endaoment REST API base URL. **Defaults to `https://api.endaoment.org`** when unset (validated as a URL). Override only to point at a staging instance. |
| `LOG_LEVEL` | **Server-only** | Optional | Pino logger level (`logger.ts`). **Defaults to `info`** when unset. Set to `warn`/`error` to reduce production log volume, or `debug` to troubleshoot. |

### Not consumed by the Next.js app (do not set on Vercel)

These appear in the broader project but are **not** read by the deployed frontend
runtime — listed here so they aren't mistakenly added to the Vercel project:

| Variable | Where it lives | Notes |
|----------|----------------|-------|
| `BASESCAN_API_KEY` | `contracts/DEPLOY.md` (Foundry deploy) | Contract source verification during the **smart-contract** deploy, not the web app. See go-live checklist §A. |
| `VITEST` | test runner | Set automatically by Vitest; gates the in-memory KV fallback during tests. Never set in production. |

> **No Sentry / analytics variables exist** in the codebase as of this writing. If
> a monitoring or analytics integration is added later, document its variables here
> and decide its client/server scope deliberately (e.g. a Sentry DSN is typically
> `NEXT_PUBLIC_` and non-secret; an ingestion auth token is server-only).

### Server-only — must NOT be exposed to the client

The following **must never** be renamed with a `NEXT_PUBLIC_` prefix or otherwise
inlined into the browser bundle. The first four are secrets; leaking them is a
credential compromise:

- `STRIPE_SECRET_KEY` — Stripe live secret key (full account access).
- `STRIPE_ONRAMP_WEBHOOK_SECRET` — webhook forgery if leaked.
- `KV_REST_API_TOKEN` — write access to the session/rate-limit store.
- `KV_REST_API_URL` — store endpoint; keep server-side with its token.
- `ROUTER_ADDRESS_BASE_SEPOLIA`, `USDC_CONTRACT_BASE_SEPOLIA` — server-validated
  on-chain addresses (not secret, but intentionally server-scoped; the browser uses
  the separate `NEXT_PUBLIC_ROUTER_ADDRESS_*` vars).
- `ENDAOMENT_API_URL`, `LOG_LEVEL` — server runtime config.

---

## 3. Human-gated go-live checklist (cross-reference)

Several steps in deploying Eudaimonia for real **cannot be done from the
codebase** — they need accounts, KYB approval, funded wallets, irreversible
on-chain broadcasts, and legal sign-off. The authoritative list is the
**Human-Only Go-Live Checklist** in
[`prompts/post-epic-actions.md`](../prompts/post-epic-actions.md#-human-only-go-live-checklist-an-agent-cannot-do-these):

| Section | Covers | Relevance to this deploy |
|---------|--------|---------------------------|
| **A. Accounts & API keys** | Stripe Crypto Onramp (gated), authenticated RPC provider, Vercel KV/Upstash, Basescan key | Produces the values for the §2 env table (`STRIPE_*`, `NEXT_PUBLIC_BASE_RPC_URL`, `KV_*`). |
| **B. Wallets, keys & on-chain identities** | Funded deployer key, treasury (1% fee) address, owner/allowlist multisig | Prerequisite for the contract deploy that yields the router addresses. |
| **C. Endaoment data & relationship** | Real org Entity addresses, integration/partner access | Blocks the "Verified by Endaoment" badge (E5.1). |
| **D. Irreversible deploy & on-chain config** | Deploy router to Sepolia then mainnet, allowlist each org, **wire deployed addresses into prod env** | Supplies `NEXT_PUBLIC_ROUTER_ADDRESS_BASE` / `_BASE_SEPOLIA`. |
| **E. Hosting & domain** | Set every server secret in Vercel (server-only, never `NEXT_PUBLIC_*`), `NEXT_PUBLIC_CHAIN=base`, custom domain + DNS/TLS | The Vercel-side configuration this document operationalizes. |

> Section **F** (legal/compliance — fundraising registration, MSB analysis, ToS /
> Privacy Policy, tax-receipt responsibility, fee-disclosure sign-off) is founder/
> counsel work and is a prerequisite to taking live payments, independent of the
> Vercel deploy.

**Mainnet readiness note:** before flipping `NEXT_PUBLIC_CHAIN=base`, confirm the
open mainnet-correctness items in `post-epic-actions.md` (E6.1 — explicit
`chainId` threading into server-side receipt/OG metadata; E6.2 — network label
hardening). On mainnet these otherwise silently read against Sepolia.
