import { baseSepolia } from "wagmi/chains";

/**
 * Real demo donations a visitor can open without donating: the smoke donations
 * recorded in `contracts/deployments/base-sepolia.json`. Mainnet has none.
 */
export const SAMPLE_RECEIPT_TX_HASHES: Readonly<Partial<Record<number, readonly string[]>>> = Object.freeze({
  [baseSepolia.id]: Object.freeze([
    // $1 smoke donations from the 2026-10-06 deploy, one per charity (PCRF first).
    "0x31335acb9328ae3136adb552943a07844c806165aaa43b547628986433c3cd9e",
    "0x4f2f6f693b295da40bb971f26dbe08e83b765de22f1377bf6bccdd54293ed849",
    "0xc5388d494291b06cb7e51b5c1828aa5212e8199e0d02231ae217d44a548e49e1",
  ]),
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
