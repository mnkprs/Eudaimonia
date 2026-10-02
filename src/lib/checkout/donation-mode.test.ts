import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDonationMode } from "./donation-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveDonationMode()", () => {
  it("defaults to demo when nothing is configured", () => {
    expect(resolveDonationMode({})).toBe("demo");
  });

  it("defaults to demo on base-sepolia", () => {
    expect(resolveDonationMode({ NEXT_PUBLIC_CHAIN: "base-sepolia" })).toBe("demo");
  });

  it("honours an explicit onramp opt-out on base-sepolia", () => {
    expect(
      resolveDonationMode({
        NEXT_PUBLIC_CHAIN: "base-sepolia",
        NEXT_PUBLIC_DONATION_MODE: "onramp",
      }),
    ).toBe("onramp");
  });

  it("falls back to the default for garbage values", () => {
    expect(resolveDonationMode({ NEXT_PUBLIC_DONATION_MODE: "banana" })).toBe("demo");
  });

  it("is ALWAYS onramp on base mainnet, even if demo is requested", () => {
    expect(
      resolveDonationMode({
        NEXT_PUBLIC_CHAIN: "base",
        NEXT_PUBLIC_DONATION_MODE: "demo",
      }),
    ).toBe("onramp");
    expect(resolveDonationMode({ NEXT_PUBLIC_CHAIN: "base" })).toBe("onramp");
  });

  it("reads process.env by default", () => {
    vi.stubEnv("NEXT_PUBLIC_DONATION_MODE", "onramp");
    expect(resolveDonationMode()).toBe("onramp");
  });
});
