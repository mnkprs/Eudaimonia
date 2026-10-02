import { describe, expect, it } from "vitest";
import { base, baseSepolia } from "wagmi/chains";

import { resolveAppChainId } from "./chain";

describe("resolveAppChainId", () => {
  it("returns Base mainnet when NEXT_PUBLIC_CHAIN is 'base'", () => {
    expect(resolveAppChainId({ NEXT_PUBLIC_CHAIN: "base" })).toBe(base.id);
  });

  it("returns Base Sepolia when NEXT_PUBLIC_CHAIN is 'base-sepolia'", () => {
    expect(resolveAppChainId({ NEXT_PUBLIC_CHAIN: "base-sepolia" })).toBe(
      baseSepolia.id,
    );
  });

  it("defaults to Base Sepolia when NEXT_PUBLIC_CHAIN is unset or empty", () => {
    expect(resolveAppChainId({})).toBe(baseSepolia.id);
    expect(resolveAppChainId({ NEXT_PUBLIC_CHAIN: "" })).toBe(baseSepolia.id);
  });

  it("defaults to Base Sepolia for an unrecognised value", () => {
    expect(resolveAppChainId({ NEXT_PUBLIC_CHAIN: "mainnet" })).toBe(
      baseSepolia.id,
    );
  });
});
