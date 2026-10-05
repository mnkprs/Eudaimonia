/**
 * POST /api/demo/donate — send a testnet demo donation from the server's demo
 * wallet via `router.donate(org, amount)` on Base Sepolia, returning the tx hash.
 *
 * Pipeline: env/kill switch → body validation → campaign/org/router resolution
 * → per-IP limit (fail-OPEN) → global daily cap (fail-CLOSED) → send lock →
 * wallet checks → send (one nonce retry) → 200 `{ txHash }`.
 *
 * Daily-cap fail-closed policy: the cap is the guard on the demo wallet's
 * finite test funds, so when its counter is unreadable we refuse with 503
 * `demo_busy` (retryable) rather than risk unbounded spend. The per-IP limiter
 * is only abuse smoothing, so it fails open like the on-ramp route.
 *
 * The daily cap counts accepted attempts, not confirmed sends: a request that
 * later fails (empty wallet, chain error) still consumed a slot.
 */

import { z } from "zod";
import type { Address } from "viem";
import { baseSepolia } from "viem/chains";
import { getCampaignById } from "@/lib/campaigns";
import { getRouterAddress } from "@/lib/contracts";
import {
  createDemoChainGateway,
  type DemoChainGateway,
} from "@/lib/demo/chain-gateway";
import { centsToUsdcUnits, isDemoAmountCents } from "@/lib/demo/constants";
import { demoEnv, type DemoEnv } from "@/lib/demo/env";
import { demoError } from "@/lib/demo/errors";
import { DEMO_LOG_SCOPE, sendUnderLock } from "@/lib/demo/send-under-lock";
import { withSendLock } from "@/lib/demo/send-lock";
import { getOrgAddress } from "@/lib/endaoment/orgs";
import type { KvStore } from "@/lib/kv/kv-store";
import { logger } from "@/lib/log/logger";
import { onrampKvStore } from "@/lib/onramp/onramp-kv";
import { clientIdentifier } from "@/lib/ratelimit/client-identifier";
import {
  createRateLimiter,
  type RateLimiter,
  type RateLimitResult,
} from "@/lib/ratelimit/rate-limiter";
import type { Campaign } from "@/types/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SCOPE = DEMO_LOG_SCOPE;

const IP_LIMIT = 3;
const IP_WINDOW_SECONDS = 600;
const DAILY_WINDOW_SECONDS = 86_400;
const SEND_LOCK_KEY = "demo:send-lock";
const SEND_LOCK_TTL_SECONDS = 30;
const SEND_LOCK_WAIT_MS = 8_000;
const SEND_LOCK_POLL_MS = 250;

const bodySchema = z.object({
  campaignId: z.string().trim().min(1).max(64),
  grossCents: z.number().int().refine(isDemoAmountCents, {
    message: "Demo donations must be $1, $2 or $5",
  }),
});

export interface DemoDonateDeps {
  /** Throws when the demo env is invalid or the kill switch is off. */
  readonly loadEnv: () => DemoEnv;
  readonly getCampaign: (id: string) => Campaign | undefined;
  readonly getOrgAddress: (ein: string) => Address | undefined;
  readonly getRouterAddress: () => Address | undefined;
  readonly createGateway: (config: {
    readonly env: DemoEnv;
    readonly routerAddress: Address;
  }) => DemoChainGateway;
  readonly store: KvStore;
  readonly ipLimiter: RateLimiter;
  readonly createDailyCapLimiter: (cap: number) => RateLimiter;
  readonly sleep: (ms: number) => Promise<void>;
}

interface ParsedBody {
  readonly campaign: Campaign;
  readonly grossCents: number;
}

async function parseDemoBody(
  request: Request,
  getCampaign: DemoDonateDeps["getCampaign"],
): Promise<ParsedBody | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return demoError("invalid_request", {
      message: "Request body must be valid JSON.",
    });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return demoError("invalid_request", {
      message: parsed.error.issues[0]?.message ?? "Invalid request.",
    });
  }
  const campaign = getCampaign(parsed.data.campaignId);
  if (!campaign) {
    return demoError("invalid_request", { message: "Unknown campaign." });
  }
  return { campaign, grossCents: parsed.data.grossCents };
}

function retryAfterHeaders(verdict: RateLimitResult): HeadersInit {
  const seconds = Math.max(1, Math.ceil((verdict.resetAt - Date.now()) / 1000));
  return { "Retry-After": String(seconds) };
}

async function checkIpLimit(
  request: Request,
  limiter: RateLimiter,
): Promise<Response | null> {
  try {
    const verdict = await limiter.check(clientIdentifier(request));
    if (verdict.allowed) return null;
    return demoError("rate_limited", { headers: retryAfterHeaders(verdict) });
  } catch (err: unknown) {
    logger.warn({ err, scope: SCOPE }, "ip limiter failed; allowing (fail-open)");
    return null;
  }
}

async function checkDailyCap(limiter: RateLimiter): Promise<Response | null> {
  try {
    const verdict = await limiter.check("global");
    if (verdict.allowed) return null;
    return demoError("demo_daily_cap", { headers: retryAfterHeaders(verdict) });
  } catch (err: unknown) {
    logger.error({ err, scope: SCOPE }, "daily cap failed; refusing (fail-closed)");
    return demoError("demo_busy");
  }
}

async function checkLimits(
  request: Request,
  deps: DemoDonateDeps,
  env: DemoEnv,
): Promise<Response | null> {
  const ipBlocked = await checkIpLimit(request, deps.ipLimiter);
  if (ipBlocked) return ipBlocked;
  return checkDailyCap(deps.createDailyCapLimiter(env.DEMO_DAILY_CAP));
}

function loadEnvOrNull(deps: DemoDonateDeps): DemoEnv | null {
  try {
    return deps.loadEnv();
  } catch (err: unknown) {
    // DemoEnvError carries only `path: message`, never values.
    logger.warn({ err, scope: SCOPE }, "demo disabled or misconfigured env");
    return null;
  }
}

export async function handleDemoDonate(
  request: Request,
  deps: DemoDonateDeps,
): Promise<Response> {
  const env = loadEnvOrNull(deps);
  if (!env) return demoError("demo_disabled");

  const body = await parseDemoBody(request, deps.getCampaign);
  if (body instanceof Response) return body;

  const org = deps.getOrgAddress(body.campaign.ein);
  const routerAddress = deps.getRouterAddress();
  if (!org || !routerAddress) {
    logger.error({ scope: SCOPE }, "org or router address not configured");
    return demoError("demo_misconfigured");
  }

  const blocked = await checkLimits(request, deps, env);
  if (blocked) return blocked;

  try {
    const locked = await withSendLock(
      deps.store,
      () =>
        sendUnderLock({
          gateway: deps.createGateway({ env, routerAddress }),
          env,
          org,
          amount: centsToUsdcUnits(body.grossCents),
        }),
      {
        key: SEND_LOCK_KEY,
        ttlSeconds: SEND_LOCK_TTL_SECONDS,
        waitMs: SEND_LOCK_WAIT_MS,
        pollMs: SEND_LOCK_POLL_MS,
        sleep: deps.sleep,
      },
    );
    return locked.acquired ? locked.value : demoError("demo_busy");
  } catch (err: unknown) {
    logger.error({ err, scope: SCOPE }, "send lock failed");
    return demoError("demo_busy");
  }
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function POST(request: Request): Promise<Response> {
  const store = onrampKvStore();
  return handleDemoDonate(request, {
    loadEnv: demoEnv,
    getCampaign: getCampaignById,
    getOrgAddress: (ein) => getOrgAddress(ein, baseSepolia.id),
    getRouterAddress: () => getRouterAddress(baseSepolia.id),
    createGateway: ({ env, routerAddress }) =>
      createDemoChainGateway({
        privateKey: env.DEMO_WALLET_PRIVATE_KEY,
        rpcUrl: env.rpcUrl,
        routerAddress,
        usdcAddress: env.USDC_CONTRACT_BASE_SEPOLIA,
      }),
    store,
    ipLimiter: createRateLimiter(store, {
      limit: IP_LIMIT,
      windowSeconds: IP_WINDOW_SECONDS,
      prefix: "rl:demo",
    }),
    createDailyCapLimiter: (cap) =>
      createRateLimiter(store, {
        limit: cap,
        windowSeconds: DAILY_WINDOW_SECONDS,
        prefix: "cap:demo",
      }),
    sleep: realSleep,
  });
}
