import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import { createInMemoryKvStore, type KvStore } from "@/lib/kv/kv-store";
import { logger } from "@/lib/log/logger";
import type { RateLimiter, RateLimitResult } from "@/lib/ratelimit/rate-limiter";
import { loadDemoEnv } from "@/lib/demo/env";
import type {
  DemoChainGateway,
  DemoWalletState,
} from "@/lib/demo/chain-gateway";
import { centsToUsdcUnits } from "@/lib/demo/constants";
import { handleDemoDonate, type DemoDonateDeps } from "./route";

const KEY = `0x${"ab".repeat(32)}`;
const ORG = "0x3333333333333333333333333333333333333333" as Address;
const ROUTER = "0x1111111111111111111111111111111111111111" as Address;
const TX = `0x${"cd".repeat(32)}` as Hex;
const LOCK_KEY = "demo:send-lock";

const ENV = loadDemoEnv({
  NEXT_PUBLIC_CHAIN: "base-sepolia",
  DEMO_DONATIONS_ENABLED: "true",
  DEMO_WALLET_PRIVATE_KEY: KEY,
});

const HEALTHY: DemoWalletState = {
  address: "0x4444444444444444444444444444444444444444",
  usdcBalance: 100_000_000n,
  allowance: 2n ** 256n - 1n,
  ethBalance: 10n ** 16n,
  pendingNonce: 9,
};

const allow = (): RateLimiter => ({
  check: async (): Promise<RateLimitResult> => ({
    allowed: true,
    limit: 3,
    remaining: 2,
    resetAt: Date.now() + 60_000,
  }),
});
const deny = (resetInMs = 90_000): RateLimiter => ({
  check: async (): Promise<RateLimitResult> => ({
    allowed: false,
    limit: 3,
    remaining: 0,
    resetAt: Date.now() + resetInMs,
  }),
});
const throwing = (): RateLimiter => ({
  check: async () => {
    throw new Error("kv down");
  },
});

interface Harness {
  readonly deps: DemoDonateDeps;
  readonly gateway: {
    readWalletState: ReturnType<typeof vi.fn>;
    sendDonation: ReturnType<typeof vi.fn>;
  };
  readonly createGateway: ReturnType<typeof vi.fn>;
  readonly store: KvStore;
}

function harness(overrides: Partial<DemoDonateDeps> = {}): Harness {
  const gateway = {
    readWalletState: vi.fn(async () => HEALTHY),
    sendDonation: vi.fn(async () => TX),
  };
  const createGateway = vi.fn(() => gateway as DemoChainGateway);
  const store = createInMemoryKvStore();
  const deps: DemoDonateDeps = {
    loadEnv: () => ENV,
    getCampaign: (id) =>
      id === "pcrf"
        ? ({ id: "pcrf", ein: "93-1057665", name: "PCRF" } as never)
        : undefined,
    getOrgAddress: () => ORG,
    getRouterAddress: () => ROUTER,
    createGateway,
    store,
    ipLimiter: allow(),
    createDailyCapLimiter: () => allow(),
    sleep: async () => {},
    ...overrides,
  };
  return { deps, gateway, createGateway, store };
}

function post(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/demo/donate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}
const valid = { campaignId: "pcrf", grossCents: 200 };

async function errorOf(res: Response) {
  return ((await res.json()) as { error: { code: string; message: string } })
    .error;
}

afterEach(() => vi.restoreAllMocks());

describe("handleDemoDonate", () => {
  it("503 demo_disabled with zero gateway calls when env is invalid", async () => {
    const h = harness({
      loadEnv: () => {
        throw new Error("Invalid demo env");
      },
    });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_disabled");
    expect(h.createGateway).not.toHaveBeenCalled();
    expect(h.gateway.readWalletState).not.toHaveBeenCalled();
  });

  it.each([
    ["bad JSON", "{nope", true],
    ["unknown campaign", { campaignId: "zzz", grossCents: 200 }, false],
    ["below min", { campaignId: "pcrf", grossCents: 99 }, false],
    ["above max", { campaignId: "pcrf", grossCents: 501 }, false],
    ["fractional", { campaignId: "pcrf", grossCents: 1.5 }, false],
    ["not a preset", { campaignId: "pcrf", grossCents: 337 }, false],
    ["empty campaign", { campaignId: "  ", grossCents: 200 }, false],
  ])("400 invalid_request for %s", async (_name, body, raw) => {
    const h = harness();
    const res = await handleDemoDonate(post(body, raw), h.deps);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_request");
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
  });

  it("429 rate_limited with a Retry-After header", async () => {
    const h = harness({ ipLimiter: deny(90_000) });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(429);
    expect((await errorOf(res)).code).toBe("rate_limited");
    const retry = Number(res.headers.get("Retry-After"));
    expect(retry).toBeGreaterThanOrEqual(89);
    expect(retry).toBeLessThanOrEqual(90);
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
  });

  it("fails open when the per-IP limiter throws", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const h = harness({ ipLimiter: throwing() });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalled();
  });

  it("429 demo_daily_cap when the global cap is spent", async () => {
    const h = harness({ createDailyCapLimiter: () => deny() });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(429);
    expect((await errorOf(res)).code).toBe("demo_daily_cap");
  });

  it("passes the configured cap to the daily limiter factory", async () => {
    const factory = vi.fn(() => allow());
    const h = harness({ createDailyCapLimiter: factory });
    await handleDemoDonate(post(valid), h.deps);
    expect(factory).toHaveBeenCalledWith(25);
  });

  it("fails closed (503 demo_busy) when the daily-cap limiter throws", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const h = harness({ createDailyCapLimiter: () => throwing() });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_busy");
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
  });

  it("503 demo_busy when the send lock is held", async () => {
    const h = harness();
    await h.store.setNx(LOCK_KEY, "someone-else", 30);
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_busy");
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
    expect(await h.store.get(LOCK_KEY)).toBe("someone-else");
  });

  it("503 demo_wallet_empty when USDC is below the amount", async () => {
    const h = harness();
    h.gateway.readWalletState.mockResolvedValue({
      ...HEALTHY,
      usdcBalance: 1_999_999n,
    });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_wallet_empty");
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
  });

  it("503 demo_wallet_empty when ETH is below the minimum", async () => {
    const h = harness();
    h.gateway.readWalletState.mockResolvedValue({
      ...HEALTHY,
      ethBalance: ENV.DEMO_MIN_ETH_WEI - 1n,
    });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_wallet_empty");
  });

  it("503 demo_misconfigured when the allowance is too low", async () => {
    const h = harness();
    h.gateway.readWalletState.mockResolvedValue({
      ...HEALTHY,
      allowance: 1_999_999n,
    });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_misconfigured");
    expect(h.gateway.sendDonation).not.toHaveBeenCalled();
  });

  it("503 demo_misconfigured when the org address is missing", async () => {
    const h = harness({ getOrgAddress: () => undefined });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_misconfigured");
    expect(h.createGateway).not.toHaveBeenCalled();
  });

  it("503 demo_misconfigured when the router address is missing", async () => {
    const h = harness({ getRouterAddress: () => undefined });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_misconfigured");
  });

  it("200 with the tx hash, correct args, and releases the lock", async () => {
    const h = harness();
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ txHash: TX });
    expect(h.gateway.sendDonation).toHaveBeenCalledWith({
      org: ORG,
      amount: centsToUsdcUnits(200),
      nonce: HEALTHY.pendingNonce,
    });
    expect(await h.store.has(LOCK_KEY)).toBe(false);
  });

  it("retries once with a fresh pending nonce after a nonce error", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const h = harness();
    h.gateway.sendDonation
      .mockRejectedValueOnce(new Error("nonce too low"))
      .mockResolvedValueOnce(TX);
    h.gateway.readWalletState
      .mockResolvedValueOnce(HEALTHY)
      .mockResolvedValueOnce({ ...HEALTHY, pendingNonce: 10 });
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(200);
    expect(h.gateway.sendDonation).toHaveBeenCalledTimes(2);
    expect(h.gateway.sendDonation.mock.calls[1]?.[0].nonce).toBe(10);
  });

  it("503 demo_busy when the nonce error repeats", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const h = harness();
    h.gateway.sendDonation.mockRejectedValue(new Error("Nonce too low"));
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("demo_busy");
    expect(h.gateway.sendDonation).toHaveBeenCalledTimes(2);
    expect(await h.store.has(LOCK_KEY)).toBe(false);
  });

  it("502 chain_error for any other send failure", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const h = harness();
    h.gateway.sendDonation.mockRejectedValue(new Error("execution reverted"));
    const res = await handleDemoDonate(post(valid), h.deps);
    expect(res.status).toBe(502);
    const error = await errorOf(res);
    expect(error.code).toBe("chain_error");
    expect(error.message).not.toContain("reverted");
    expect(await h.store.has(LOCK_KEY)).toBe(false);
  });

  it("never passes the private key to the logger", async () => {
    const spies = (["info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(logger, level).mockImplementation(() => undefined),
    );
    const h = harness({
      loadEnv: () => {
        throw new Error("Invalid demo env");
      },
    });
    await handleDemoDonate(post(valid), h.deps);

    const ok = harness({ ipLimiter: throwing() });
    ok.gateway.sendDonation.mockRejectedValueOnce(new Error("boom"));
    await handleDemoDonate(post(valid), ok.deps);

    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(KEY);
    }
  });
});
