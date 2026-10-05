import { isAddress, type Address } from "viem";
import { baseSepolia } from "wagmi/chains";

import type { RouterChainId } from "@/lib/contracts";

/**
 * Per-chain Endaoment org Entity addresses, keyed by EIN then chain id.
 *
 * EIN-first keying colocates "this org across chains", mirroring the
 * EIN-keyed metadata snapshot (Task 3): the absence of an Entity on a given
 * chain is simply a missing chain key, not a special case. The org *address*
 * is the only thing that varies per chain - name/mission/logo do not.
 */
export type OrgAddressMap = Readonly<
  Record<string, Partial<Record<RouterChainId, Address>>>
>;

/**
 * Production address map.
 *
 * **Base Sepolia entries are TESTNET STAND-INS, not Endaoment entities**
 * (Epic 8, ADR 0003). Endaoment's Base Sepolia deployment uses a non-mintable
 * mock base token, and the org addresses its dev registry returns for these
 * EINs are counterfactual (`isDeployed: false`, no code) — the router's
 * `IEndaomentEntity(org).donate()` would revert against them. The demo
 * therefore routes to `EndaomentOrgStandIn` contracts deployed by
 * `contracts/script/DeployTestnetDemo.s.sol`; the source of truth is
 * `contracts/deployments/base-sepolia.json`. For the record, Endaoment's
 * counterfactual Base Sepolia addresses were PCRF
 * 0xdfbab36381668f800a7b2d5aba796e7f5dac379a, WCK
 * 0x717242399bedd15ee647914f19b97f6a68deabdd and Direct Relief
 * 0xa179ef299b61d51807b6e826ee9e0ce94deb8c13.
 *
 * Base mainnet addresses are intentionally absent: we do NOT ship fabricated or
 * zero-address placeholders - a missing entry resolves to `undefined` in
 * `getOrgAddress`, which the receipt route renders as an explicit unverified
 * state. The verified mainnet entities are listed in `prompts/HUMAN-ACTIONS.md`
 * for a future real-money launch (out of scope for the portfolio demo).
 */
export const ENDAOMENT_ORG_ADDRESSES: OrgAddressMap = {
  // Palestine Children's Relief Fund
  "93-1057665": {
    [baseSepolia.id]: "0xa27cBA0B1B617dAED0De4686eD029f7B5ECd4720",
  },
  // World Central Kitchen
  "27-3521132": {
    [baseSepolia.id]: "0x43812bc126067fd9446901418721Bc9bbB239674",
  },
  // Direct Relief
  "95-1831116": {
    [baseSepolia.id]: "0xa591AFCc7F33aCdC62d323064Bf7Dd9f6bADB305",
  },
};

/**
 * Resolves the Endaoment org Entity address for an EIN on a given chain.
 *
 * Returns `undefined` for an unknown EIN, a chain with no configured Entity,
 * an unsupported chain id, or a malformed configured value - a typo'd address
 * is treated as "not configured" so a bad ops value degrades gracefully rather
 * than surfacing an invalid on-chain target.
 *
 * @param ein Charity EIN, format "NN-NNNNNNN".
 * @param chainId Active chain id (e.g. from wagmi's `useChainId`).
 * @param map Address map to read; defaults to the production map. Injectable
 *   so tests exercise the join without depending on the sparse production data.
 */
export function getOrgAddress(
  ein: string,
  chainId: number,
  map: OrgAddressMap = ENDAOMENT_ORG_ADDRESSES,
): Address | undefined {
  const byChain = map[ein];
  if (!byChain) return undefined;

  const candidate = byChain[chainId as RouterChainId];
  if (!candidate || !isAddress(candidate)) return undefined;

  return candidate;
}
