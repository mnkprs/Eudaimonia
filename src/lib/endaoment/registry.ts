import { isAddress, isAddressEqual, type Address } from "viem";
import { base, baseSepolia } from "wagmi/chains";

import { CAMPAIGNS, getCampaignById } from "@/lib/campaigns";
import type { Charity } from "@/types/charity";

import {
  ENDAOMENT_ORG_ADDRESSES,
  getOrgAddress,
  type OrgAddressMap,
} from "./orgs";

const BASESCAN_BASE_URL: Record<number, string> = {
  [base.id]: "https://basescan.org",
  [baseSepolia.id]: "https://sepolia.basescan.org",
};

/**
 * Builds a BaseScan explorer link for an org address on the active chain.
 * Falls back to mainnet BaseScan for any unrecognised chain id so the link is
 * never broken — callers only pass addresses that resolved on a known chain.
 */
export function deriveBaseScanUrl(address: Address, chainId: number): string {
  const origin = BASESCAN_BASE_URL[chainId] ?? BASESCAN_BASE_URL[base.id];
  return `${origin}/address/${address}`;
}

/**
 * Joins campaign presentation (id, name, ein) with the per-chain Endaoment org
 * address into the `Charity` view the receipt route consumes — the single
 * source of truth, with no parallel registry.
 *
 * When the org has no Entity on the active chain, `endaomentOrgAddress` and
 * `baseScanUrl` are `null`: the charity still resolves (name renders) and
 * downstream verification reports an unverified state rather than crashing.
 *
 * @param id Campaign slug, e.g. "pcrf".
 * @param chainId Active chain id.
 * @param map Address map to read; defaults to the production map (injectable
 *   for tests).
 * @returns The `Charity` view, or `undefined` if no campaign matches `id`.
 */
export function getCharity(
  id: string,
  chainId: number,
  map: OrgAddressMap = ENDAOMENT_ORG_ADDRESSES,
): Charity | undefined {
  const campaign = getCampaignById(id);
  if (!campaign) return undefined;

  const address = getOrgAddress(campaign.ein, chainId, map) ?? null;
  const baseScanUrl = address ? deriveBaseScanUrl(address, chainId) : null;

  return {
    id: campaign.id,
    name: campaign.name,
    ein: campaign.ein,
    endaomentOrgAddress: address,
    baseScanUrl,
  };
}

/**
 * Reverse lookup: resolves the `Charity` whose configured org address on
 * `chainId` equals `org` (case-insensitive). Used to attribute an on-chain
 * `DonationRouted.org` back to a campaign.
 *
 * @returns The `Charity` view, or `undefined` for an unknown org, a malformed
 *   address, or a chain with no configured entities.
 */
export function getCharityByOrgAddress(
  org: Address | string,
  chainId: number,
  map: OrgAddressMap = ENDAOMENT_ORG_ADDRESSES,
): Charity | undefined {
  if (!isAddress(org, { strict: false })) return undefined;

  const campaign = CAMPAIGNS.find((candidate) => {
    const resolved = getOrgAddress(candidate.ein, chainId, map);
    return resolved !== undefined && isAddressEqual(resolved, org);
  });

  return campaign ? getCharity(campaign.id, chainId, map) : undefined;
}
