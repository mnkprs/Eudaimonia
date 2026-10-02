import { baseSepolia } from "wagmi/chains";

/**
 * Real demo donations a visitor can open without donating. Filled in after the
 * Base Sepolia stack is deployed (one smoke donation per charity — see
 * `contracts/deployments/base-sepolia.json`). Mainnet has none.
 */
export const SAMPLE_RECEIPT_TX_HASHES: Readonly<Partial<Record<number, readonly string[]>>> = Object.freeze({
  [baseSepolia.id]: Object.freeze([]),
});

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/** Path of the first sample receipt on `chainId`, or null when there is none. */
export function getExampleReceiptHref(
  chainId: number,
  samples: Readonly<Partial<Record<number, readonly string[]>>> = SAMPLE_RECEIPT_TX_HASHES,
): string | null {
  const first = samples[chainId]?.[0];
  return first !== undefined && TX_HASH_PATTERN.test(first) ? `/receipt/${first}` : null;
}
