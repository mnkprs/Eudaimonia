import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { base, baseSepolia } from "wagmi/chains";
import type { Address } from "viem";

import {
  ENDAOMENT_ORG_ADDRESSES,
  getOrgAddress,
  type OrgAddressMap,
} from "./orgs";

const PCRF_EIN = "93-1057665";
const SEPOLIA_ADDR =
  "0x1111111111111111111111111111111111111111" as Address;
const BASE_ADDR = "0x2222222222222222222222222222222222222222" as Address;

const FIXTURE_MAP: OrgAddressMap = {
  [PCRF_EIN]: {
    [base.id]: BASE_ADDR,
    [baseSepolia.id]: SEPOLIA_ADDR,
  },
};

describe("ENDAOMENT_ORG_ADDRESSES (production map)", () => {
  it("contains only real, checksummable EVM addresses — never fabricated stubs", () => {
    const hex = /^0x[a-fA-F0-9]{40}$/;
    for (const [ein, byChain] of Object.entries(ENDAOMENT_ORG_ADDRESSES)) {
      for (const [chainId, addr] of Object.entries(byChain)) {
        expect(addr, `${ein} @ ${chainId}`).toMatch(hex);
        // Guard against zero-address placeholders sneaking in.
        expect(addr).not.toBe(`0x${"0".repeat(40)}`);
      }
    }
  });
});

describe("Base Sepolia demo stand-ins (Epic 8)", () => {
  const deployment = JSON.parse(
    readFileSync(join(process.cwd(), "contracts/deployments/base-sepolia.json"), "utf-8"),
  ) as { contracts: Record<string, { address: string }> };
  const standIn = (campaignId: string) =>
    deployment.contracts[`EndaomentOrgStandIn:${campaignId}`]?.address;

  it.each([
    ["93-1057665", "pcrf"],
    ["27-3521132", "wck"],
    ["95-1831116", "directrelief"],
  ])("EIN %s resolves to the deployed %s stand-in on Base Sepolia", (ein, campaignId) => {
    const expected = standIn(campaignId);
    expect(expected).toBeDefined();
    expect(getOrgAddress(ein, baseSepolia.id)?.toLowerCase()).toBe(expected?.toLowerCase());
  });
});

describe("getOrgAddress", () => {
  it("returns the org address for a configured EIN + chain", () => {
    expect(getOrgAddress(PCRF_EIN, baseSepolia.id, FIXTURE_MAP)).toBe(
      SEPOLIA_ADDR,
    );
    expect(getOrgAddress(PCRF_EIN, base.id, FIXTURE_MAP)).toBe(BASE_ADDR);
  });

  it("returns undefined when the org exists but has no entity on that chain", () => {
    const sepoliaOnly: OrgAddressMap = {
      [PCRF_EIN]: { [baseSepolia.id]: SEPOLIA_ADDR },
    };
    expect(getOrgAddress(PCRF_EIN, base.id, sepoliaOnly)).toBeUndefined();
  });

  it("returns undefined for an unknown EIN", () => {
    expect(
      getOrgAddress("00-0000000", baseSepolia.id, FIXTURE_MAP),
    ).toBeUndefined();
  });

  it("returns undefined for an unsupported chain id", () => {
    expect(getOrgAddress(PCRF_EIN, 1, FIXTURE_MAP)).toBeUndefined();
  });

  it("treats a malformed configured address as not configured", () => {
    const bad: OrgAddressMap = {
      [PCRF_EIN]: { [baseSepolia.id]: "0xnot-an-address" as Address },
    };
    expect(getOrgAddress(PCRF_EIN, baseSepolia.id, bad)).toBeUndefined();
  });

  it("defaults to the production map when no map is injected", () => {
    // Production map is intentionally sparse today; this asserts the default
    // wiring resolves without throwing, not a specific address.
    expect(() => getOrgAddress(PCRF_EIN, baseSepolia.id)).not.toThrow();
  });
});
