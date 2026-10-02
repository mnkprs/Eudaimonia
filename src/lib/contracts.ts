import {
  decodeEventLog,
  isAddress,
  parseAbiItem,
  toEventSelector,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "wagmi/chains";

/**
 * On-chain contract surface for the TransparentDonationRouter (Epic 4).
 *
 * The router address is resolved from environment variables rather than baked
 * into source: the contract is deployed per-network by an operator (see
 * `contracts/script/Deploy.s.sol`), and the deployed address is wired in via
 * `NEXT_PUBLIC_ROUTER_ADDRESS_*` with no code change — mirroring how
 * `wagmi.ts` reads its RPC URLs from env.
 */

/**
 * The `DonationRouted` event, mirrored from `TransparentDonationRouter.sol`.
 * Epic 5's receipt decoder reads this log: `gross → routing`, `fee →
 * eudaimonia`, `net → settlement`. The signature is asserted against the
 * Solidity event hash in the test suite, so any drift fails the build.
 */
export const DONATION_ROUTED_EVENT = parseAbiItem(
  "event DonationRouted(address indexed donor, address indexed org, uint256 gross, uint256 fee, uint256 net)",
);

/** Chain IDs the router supports. Base mainnet and Base Sepolia only. */
export const ROUTER_SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;

export type RouterChainId = (typeof ROUTER_SUPPORTED_CHAIN_IDS)[number];

const isSupportedChainId = (chainId: number): chainId is RouterChainId =>
  (ROUTER_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

/**
 * Reads the deployed router address env var for a supported chain.
 *
 * Each branch is a direct `process.env.NEXT_PUBLIC_*` property access (never a
 * computed key) so Next.js inlines the value at build time. Reading lazily here
 * — rather than capturing into a module-level constant — keeps the value live
 * for both runtime overrides and test env stubbing.
 */
const readRouterAddressEnv = (chainId: RouterChainId): string | undefined => {
  switch (chainId) {
    case base.id:
      return process.env.NEXT_PUBLIC_ROUTER_ADDRESS_BASE;
    case baseSepolia.id:
      return process.env.NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA;
  }
};

/**
 * Resolves the deployed router address for a chain, or `undefined` when it is
 * not yet deployed/configured.
 *
 * Returns `undefined` for an unsupported chain, an unset env var, or a
 * malformed env value — a typo is treated the same as "not configured" so a
 * bad ops value degrades gracefully instead of surfacing an invalid address.
 *
 * @param chainId The active chain ID (e.g. from wagmi's `useChainId`).
 * @returns The validated router `Address`, or `undefined` if unavailable.
 */
export function getRouterAddress(chainId: number): Address | undefined {
  if (!isSupportedChainId(chainId)) return undefined;

  const candidate = readRouterAddressEnv(chainId);
  if (!candidate || !isAddress(candidate, { strict: true })) return undefined;

  // The zero address is a valid EVM address but is never a deployed contract;
  // treat it as "not configured" so a misconfigured env var degrades gracefully.
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  if (candidate.toLowerCase() === ZERO_ADDRESS) return undefined;

  return candidate;
}

/**
 * Decoded `DonationRouted` event arguments, as raw on-chain values.
 *
 * Amounts are USDC base units (6 decimals) as `bigint` — the same units the
 * contract emits. Display formatting and the mapping onto receipt stages
 * (`gross → routing`, `fee → eudaimonia`, `net → settlement`) are deliberately
 * left to the Epic 5 receipt decoder, which also composes the off-chain swap
 * and settlement data the event does not carry. Keeping this function value-
 * faithful means `fee + net === gross` always holds for callers.
 */
export interface DonationRoutedArgs {
  /** Donor EOA that funded the donation (indexed topic). */
  donor: Address;
  /** Targeted Endaoment org Entity (indexed topic). */
  org: Address;
  /** Total USDC pulled from the donor, in base units. */
  gross: bigint;
  /** Eudaimonia 1% platform fee routed to the treasury, in base units. */
  fee: bigint;
  /** Net USDC forwarded to the org Entity, in base units. */
  net: bigint;
}

/**
 * The raw log fields a decoder needs: the topic array and ABI-encoded data.
 *
 * `topics` is typed as `[Hex, ...Hex[]] | []` — exactly viem's own `Log.topics`
 * shape (mutable tuple of 32-byte hashes, no nulls, no nested arrays). This
 * matches `decodeEventLog`'s parameter type directly, so no cast is needed at
 * the decode callsite. Callers building synthetic logs from `encodeEventTopics`
 * (which returns a wider `(Hex | Hex[] | null)[]`) MUST narrow to this type
 * before constructing a `RawEventLog` — the cast belongs at the construction
 * site, not inside the decoder.
 */
export interface RawEventLog {
  topics: [Hex, ...Hex[]] | [];
  data: Hex;
}

/**
 * Decodes a raw `DonationRouted` log into typed arguments.
 *
 * Strictly bound to {@link DONATION_ROUTED_EVENT}: a log whose signature topic
 * belongs to a different event throws rather than silently mis-decoding, so the
 * receipt pipeline can never attribute a foreign transfer to a donation.
 *
 * @param log The `topics`/`data` pair from an on-chain log (e.g. a viem `Log`).
 * @returns The decoded donor, org, and gross/fee/net amounts as `bigint`.
 * @throws If the log does not match the `DonationRouted` signature/shape.
 */
export function decodeDonationRoutedLog(log: RawEventLog): DonationRoutedArgs {
  const { args } = decodeEventLog({
    abi: [DONATION_ROUTED_EVENT],
    eventName: "DonationRouted",
    topics: log.topics,
    data: log.data,
    strict: true,
  });

  return {
    donor: args.donor,
    org: args.org,
    gross: args.gross,
    fee: args.fee,
    net: args.net,
  };
}

// --- DonationRouted log finder (shared by receipt loaders / hooks) -----------

const DONATION_ROUTED_TOPIC: Hex = toEventSelector(DONATION_ROUTED_EVENT);

/** A raw log that also carries the emitting contract address (viem `Log` fits). */
export type AddressedEventLog = RawEventLog & { address: Address };

/**
 * Finds the first `DonationRouted` log (by topic-0) and decodes it.
 *
 * @returns The decoded args plus the emitting `address`, or `null` when no log
 *   carries the DonationRouted topic.
 * @throws If a log carries the DonationRouted topic but its payload is
 *   malformed. Same convention as `verifyDonation` (endaoment/verify.ts): a
 *   matching topic that fails to decode is corrupt data, not "absent".
 */
export function findDonationRouted(
  logs: readonly AddressedEventLog[],
): (DonationRoutedArgs & { address: Address }) | null {
  const routed = logs.find(
    (log) => log.topics[0]?.toLowerCase() === DONATION_ROUTED_TOPIC,
  );
  if (!routed) return null;

  return { ...decodeDonationRoutedLog(routed), address: routed.address };
}
