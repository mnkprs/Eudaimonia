import { describe, expect, it } from "vitest";
import { base, baseSepolia } from "wagmi/chains";
import type { Address } from "viem";

import type { OrgAddressMap } from "./orgs";
import {
  deriveBaseScanUrl,
  getCharity,
  getCharityByOrgAddress,
} from "./registry";

const PCRF_EIN = "93-1057665";
const PCRF_ADDR =
  "0x1111111111111111111111111111111111111111" as Address;

const FIXTURE_MAP: OrgAddressMap = {
  [PCRF_EIN]: {
    [base.id]: PCRF_ADDR,
    [baseSepolia.id]: PCRF_ADDR,
  },
};

describe("deriveBaseScanUrl", () => {
  it("builds a mainnet BaseScan address link on Base", () => {
    expect(deriveBaseScanUrl(PCRF_ADDR, base.id)).toBe(
      `https://basescan.org/address/${PCRF_ADDR}`,
    );
  });

  it("builds a Sepolia BaseScan address link on Base Sepolia", () => {
    expect(deriveBaseScanUrl(PCRF_ADDR, baseSepolia.id)).toBe(
      `https://sepolia.basescan.org/address/${PCRF_ADDR}`,
    );
  });

  it("falls back to mainnet BaseScan for an unrecognised chain id", () => {
    expect(deriveBaseScanUrl(PCRF_ADDR, 1)).toBe(
      `https://basescan.org/address/${PCRF_ADDR}`,
    );
  });
});

describe("getCharity", () => {
  it("joins campaign presentation with the per-chain org address", () => {
    const charity = getCharity("pcrf", baseSepolia.id, FIXTURE_MAP);

    expect(charity).toEqual({
      id: "pcrf",
      name: "Palestine Children's Relief Fund",
      ein: PCRF_EIN,
      endaomentOrgAddress: PCRF_ADDR,
      baseScanUrl: `https://sepolia.basescan.org/address/${PCRF_ADDR}`,
    });
  });

  it("returns name + null address (not a crash) when the chain has no org entity", () => {
    const sepoliaOnly: OrgAddressMap = {
      [PCRF_EIN]: { [baseSepolia.id]: PCRF_ADDR },
    };
    const charity = getCharity("pcrf", base.id, sepoliaOnly);

    expect(charity).toMatchObject({
      id: "pcrf",
      name: "Palestine Children's Relief Fund",
      ein: PCRF_EIN,
      endaomentOrgAddress: null,
      baseScanUrl: null,
    });
  });

  it("returns undefined for an unknown campaign id", () => {
    expect(getCharity("unknown", baseSepolia.id, FIXTURE_MAP)).toBeUndefined();
  });

  it("returns a Charity view, not the underlying Campaign shape", () => {
    const charity = getCharity("pcrf", baseSepolia.id, FIXTURE_MAP);
    expect(charity).not.toHaveProperty("endaomentOrgId");
    expect(charity).not.toHaveProperty("swatch");
    expect(charity).not.toHaveProperty("mission");
  });

  it("defaults to the production address map when none is injected", () => {
    // Production map now carries the dev-registry Base Sepolia entries for
    // the three curated orgs (PCRF/WCK/Direct Relief) — assert the wiring
    // resolves a real address rather than the previous sparse-null state.
    const charity = getCharity("pcrf", baseSepolia.id);
    expect(charity?.name).toBe("Palestine Children's Relief Fund");
    expect(charity?.endaomentOrgAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(charity?.baseScanUrl).toContain("sepolia.basescan.org/address/");
  });
});

describe("getCharityByOrgAddress", () => {
  const WCK_EIN = "27-3521132";
  const DR_EIN = "95-1831116";
  const WCK_ADDR = "0x2222222222222222222222222222222222222222" as Address;
  const DR_ADDR = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa" as Address;

  const MAP: OrgAddressMap = {
    [PCRF_EIN]: { [baseSepolia.id]: PCRF_ADDR },
    [WCK_EIN]: { [baseSepolia.id]: WCK_ADDR },
    [DR_EIN]: { [baseSepolia.id]: DR_ADDR },
  };

  it.each([
    ["pcrf", PCRF_ADDR],
    ["wck", WCK_ADDR],
    ["directrelief", DR_ADDR],
  ])("matches the %s org address", (id, addr) => {
    expect(getCharityByOrgAddress(addr, baseSepolia.id, MAP)?.id).toBe(id);
  });

  it("matches case-insensitively", () => {
    const upper = `0x${DR_ADDR.slice(2).toUpperCase()}`;
    expect(getCharityByOrgAddress(upper, baseSepolia.id, MAP)?.id).toBe(
      "directrelief",
    );
  });

  it("returns undefined for an unknown org", () => {
    const unknown = "0x9999999999999999999999999999999999999999";
    expect(getCharityByOrgAddress(unknown, baseSepolia.id, MAP)).toBeUndefined();
  });

  it("returns undefined for a malformed org string", () => {
    expect(getCharityByOrgAddress("nope", baseSepolia.id, MAP)).toBeUndefined();
  });

  it("returns undefined on a chain with no configured entities", () => {
    expect(getCharityByOrgAddress(WCK_ADDR, base.id, MAP)).toBeUndefined();
  });
});
