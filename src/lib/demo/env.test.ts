import { describe, expect, it } from "vitest";
import { DemoEnvError, loadDemoEnv } from "./env";

const KEY = `0x${"ab".repeat(32)}`;
const valid = {
  NEXT_PUBLIC_CHAIN: "base-sepolia",
  DEMO_DONATIONS_ENABLED: "true",
  DEMO_WALLET_PRIVATE_KEY: KEY,
};

describe("loadDemoEnv", () => {
  it("accepts a minimal valid env without Stripe or KV vars", () => {
    const env = loadDemoEnv(valid);
    expect(env.DEMO_WALLET_PRIVATE_KEY).toBe(KEY);
  });

  it("applies defaults", () => {
    const env = loadDemoEnv(valid);
    expect(env.DEMO_DAILY_CAP).toBe(25);
    expect(env.DEMO_MIN_ETH_WEI).toBe(20_000_000_000_000n);
    expect(env.USDC_CONTRACT_BASE_SEPOLIA).toBe(
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    );
    expect(env.rpcUrl).toBe("https://sepolia.base.org");
  });

  it("parses overrides", () => {
    const env = loadDemoEnv({
      ...valid,
      DEMO_DAILY_CAP: "7",
      DEMO_MIN_ETH_WEI: "5",
    });
    expect(env.DEMO_DAILY_CAP).toBe(7);
    expect(env.DEMO_MIN_ETH_WEI).toBe(5n);
  });

  it("prefers the server RPC url, then the public one, then the default", () => {
    expect(
      loadDemoEnv({
        ...valid,
        BASE_SEPOLIA_RPC_URL: "https://a.example",
        NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: "https://b.example",
      }).rpcUrl,
    ).toBe("https://a.example");
    expect(
      loadDemoEnv({
        ...valid,
        NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: "https://b.example",
      }).rpcUrl,
    ).toBe("https://b.example");
  });

  it("rejects mainnet", () => {
    expect(() => loadDemoEnv({ ...valid, NEXT_PUBLIC_CHAIN: "base" })).toThrow(
      DemoEnvError,
    );
  });

  it("rejects when the kill switch is not exactly true", () => {
    expect(() =>
      loadDemoEnv({ ...valid, DEMO_DONATIONS_ENABLED: "false" }),
    ).toThrow(DemoEnvError);
    expect(() =>
      loadDemoEnv({ ...valid, DEMO_DONATIONS_ENABLED: undefined }),
    ).toThrow(DemoEnvError);
  });

  it("rejects a malformed key without echoing it", () => {
    const bad = "0xnot-a-real-key-SECRET-MARKER";
    try {
      loadDemoEnv({ ...valid, DEMO_WALLET_PRIVATE_KEY: bad });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DemoEnvError);
      const text = JSON.stringify(err) + String((err as Error).message);
      expect(text).not.toContain("SECRET-MARKER");
      expect(text).toContain("DEMO_WALLET_PRIVATE_KEY");
    }
  });

  it("does not echo a well-formed key when another field fails", () => {
    try {
      loadDemoEnv({ ...valid, NEXT_PUBLIC_CHAIN: "base" });
      expect.unreachable();
    } catch (err) {
      expect(String((err as Error).message)).not.toContain(KEY);
    }
  });
});
