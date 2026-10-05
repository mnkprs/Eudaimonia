/**
 * Pure receipt bundle composer (Epic 6, Task 3).
 *
 * `buildReceiptBundle` maps already-fetched inputs into a `ReceiptBundle`
 * (ReceiptData + Stage[]). It has **no I/O** — the caller (the Task 5 wagmi
 * hook) performs all async reads (getCharity, resolveOrgMetadata, getBlock,
 * getTransactionConfirmations) and passes the results in, keeping this
 * function deterministic and testable against the Task 0 fixture.
 *
 * Decision mapping:
 *   D1 — Stage 1 = "Donated (USDC in)" from gross + donor; no fabricated ETH.
 *        Stage 2 = off-chain informational (inactive: true), no Uniswap copy.
 *   D2 — platformFee from decoded eudaimoniaFee; endaomentFee from decoded
 *        endaomentFee. Both asserted on-chain, not estimated.
 *   D5 — All stages share the single block timestamp; relative = "same block".
 *
 * Error contract:
 *   Throws `DecodeReceiptError` (typed, exported) when `decodeRouterReceipt`
 *   returns `{ ok: false }`. The caller should catch and map to an error state.
 */

import { formatUnits } from "viem";

import { trimDecimals } from "@/lib/receipt/format";
import type { Address, Hex as ViemHex, Log } from "viem";
import { base, baseSepolia } from "wagmi/chains";

import type { Charity, EndaomentOrgMetadata } from "@/types/charity";
import type { ReceiptBundle, ReceiptData, Hex, Network } from "@/types/receipt";
import { buildStages } from "@/lib/stages";
import {
  decodeRouterReceipt,
  type DecodeReceiptFailure,
} from "./decodeReceipt";

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

/**
 * Thrown by `buildReceiptBundle` when the receipt cannot be decoded.
 * Carries the reason from `DecodeReceiptFailure` so callers can distinguish
 * `wrong-router` (network mismatch / spoofed receipt) from `missing-legs`
 * (incomplete receipt structure).
 */
export class DecodeReceiptError extends Error {
  readonly reason: DecodeReceiptFailure["reason"];

  constructor(reason: DecodeReceiptFailure["reason"]) {
    super(`Receipt decode failed: ${reason}`);
    this.name = "DecodeReceiptError";
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

/** Minimal receipt shape accepted — mirrors decodeReceipt.ts's ReceiptLike. */
interface ReceiptLike {
  transactionHash: ViemHex;
  logs: readonly Log[];
}

export interface BuildReceiptBundleInput {
  /** The raw viem transaction receipt. */
  receipt: ReceiptLike;
  /** Deployed TransparentDonationRouter address. */
  routerAddress: Address;
  /** Target Endaoment org Entity address. */
  orgAddress: Address;
  /** Active chain id (e.g. baseSepolia.id). */
  chainId: number;
  /** Full transaction hash. */
  txid: Hex;
  /** Resolved charity view (from getCharity). */
  charity: Charity;
  /** Resolved org metadata (from resolveOrgMetadata). */
  orgMetadata: EndaomentOrgMetadata;
  /** Block data — number and Unix-seconds timestamp. */
  block: { number: bigint; timestamp: bigint };
  /** Confirmation count at time of reading. */
  confirmations: bigint;
}

// ---------------------------------------------------------------------------
// Formatting helpers (locale-pinned for deterministic tests)
// ---------------------------------------------------------------------------

/**
 * Formats a USDC base-unit bigint to a fixed-6-decimal string.
 * formatUnits(1_000_000n, 6) = "1" → padded to "1.000000".
 */
function formatUsdc(value: bigint): string {
  const raw = formatUnits(value, 6);
  const [integer, fraction = ""] = raw.split(".");
  const paddedFraction = fraction.padEnd(6, "0").slice(0, 6);
  return `${integer}.${paddedFraction}`;
}

/** USDC base units → 2-decimal dollar string, e.g. 2_000_000n → "2.00" (truncates sub-cent dust). */
function formatDollars(value: bigint): string {
  const [integer, fraction] = formatUsdc(value).split(".");
  return `${integer}.${fraction!.slice(0, 2)}`;
}

/** Thousands-separator formatting with explicit en-US locale. */
function formatNumber(n: bigint): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Formats a Unix-seconds timestamp as "HH:MM:SS UTC" (24-hour, UTC).
 * Explicit locale + timeZone prevent CI/env drift.
 */
function formatTime(unixSeconds: bigint): string {
  const date = new Date(Number(unixSeconds) * 1000);
  const hms = date.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${hms} UTC`;
}

/**
 * Formats a Unix-seconds timestamp as "Month DD, YYYY" (en-US, UTC).
 */
function formatDate(unixSeconds: bigint): string {
  const date = new Date(Number(unixSeconds) * 1000);
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Truncates an address for display: "0xABCD…WXYZ" (first 6 + last 4 chars).
 * Input: "0x1234567890abcdef..." → "0x1234…cdef"
 */
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Truncates a transaction hash: "0xABCD…WXYZ" (first 6 + last 4 chars).
 */
function truncateTxHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Resolves a human-readable network label from a chain id.
 *
 * Matches against the explicit wagmi/chains constants so any future renaming
 * of the id values stays in sync automatically. Returns `"Unknown"` (cast to
 * `Network`) for unrecognised chain ids to avoid mislabelling.
 */
function resolveNetworkLabel(chainId: number): Network {
  if (chainId === base.id) return "Base";
  if (chainId === baseSepolia.id) return "Base Sepolia";
  // Cast: "Unknown" is a valid display string but not yet in the Network union.
  // This is intentional — the receipt UI will show "Unknown" rather than
  // silently mislabelling an unrecognised chain as "Base Sepolia".
  return "Unknown" as Network;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Composes decoded receipt data + charity/metadata into a `ReceiptBundle`.
 *
 * @throws {DecodeReceiptError} When `decodeRouterReceipt` returns `ok: false`.
 */
export function buildReceiptBundle(
  input: BuildReceiptBundleInput,
): ReceiptBundle {
  const {
    receipt,
    routerAddress,
    orgAddress,
    txid,
    charity,
    orgMetadata,
    block,
    confirmations,
  } = input;

  // --- Step 1: Decode the receipt -------------------------------------------

  const decoded = decodeRouterReceipt(receipt, routerAddress, orgAddress);
  if (!decoded.ok) {
    throw new DecodeReceiptError(decoded.reason);
  }

  const { gross, eudaimoniaFee, endaomentFee, netToEntity, donor, org } =
    decoded;

  // --- Step 2: Format all display values ------------------------------------

  const blockTimestamp = block.timestamp;
  const timeStr = formatTime(blockTimestamp);
  const dateStr = formatDate(blockTimestamp);

  const grossFormatted = formatUsdc(gross);
  const eudaimoniaFeeFormatted = formatUsdc(eudaimoniaFee);
  const endaomentFeeFormatted = formatUsdc(endaomentFee);
  const netToEntityFormatted = formatUsdc(netToEntity);
  const confirmationsFormatted = formatNumber(confirmations);
  const blockFormatted = formatNumber(block.number);

  const donorShort = truncateAddress(donor);
  const orgShort = truncateAddress(org);
  const txidShort = truncateTxHash(txid);

  // --- Step 3: Build ReceiptData --------------------------------------------

  const data: ReceiptData = {
    donorShort,
    charity: orgMetadata.name,
    ein: charity.ein,
    mission: orgMetadata.mission,
    // `amount` = plain 2-dp dollar string (USDC ≈ USD); components add the `$`.
    amount: formatDollars(gross),
    amountUsdc: grossFormatted,
    date: dateStr,
    time: timeStr,
    network: resolveNetworkLabel(input.chainId),
    txid,
    txidShort,
    block: blockFormatted,
    confirmations: confirmationsFormatted,
    // D1: no ETH or swap rate in a USDC-only on-chain tx
    ethIn: "—",
    rate: "Off-chain onramp",
    platformFee: trimDecimals(eudaimoniaFeeFormatted),
    endaomentFee: trimDecimals(endaomentFeeFormatted),
    // orgFund: reuse the org Entity address (no separate factory in this flow)
    orgFund: org,
    charityAddr: org,
    // donorFee: no explicit donor network fee surfaced on-chain for this tx
    donorFee: "0.00",
  };

  // --- Step 4: Build stages (D1 usdcProvenance + D5 same-block) -------------

  const stages = buildStages({
    // D1 — USDC provenance: stage 1 shows gross USDC, stage 2 is off-chain
    usdcProvenance: {
      amountUsdc: grossFormatted,
      offChainShort: "Fiat → USDC via off-chain onramp",
    },
    // D5 — all on-chain stages in one block; relative = "same block"
    relativeMode: "same-block",
    donor: {
      addressShort: donorShort,
      amountEth: "—",        // unused in usdcProvenance mode
      timestamp: timeStr,
      date: dateStr,
    },
    // swap is not used when usdcProvenance is active, but the field is required
    swap: {
      pool: "Off-chain onramp",
      amountUsdcOut: grossFormatted,
      rate: "Off-chain",
      timestamp: "—",
      relativeSeconds: 0,
    },
    routing: {
      // orgFundShort: the org entity is the routing destination
      orgFundShort: orgShort,
      // amountAfterFee: net that arrived at the org (netToEntity)
      amountAfterFee: netToEntityFormatted,
      endaomentFee: {
        amount: endaomentFeeFormatted,
        to: orgShort,
      },
      eudaimoniaFeeAmount: eudaimoniaFeeFormatted,
      timestamp: timeStr,
      relativeSeconds: 0,
    },
    settlement: {
      charityAddrShort: orgShort,
      charityFundLabel: orgMetadata.name,
      amountUsdc: netToEntityFormatted,
      confirmations: confirmationsFormatted,
      timestamp: timeStr,
      relativeSeconds: 0,
    },
    eudaimoniaFeeActive: true,
    // Base Sepolia donations go to testnet stand-ins, so the copy must say so
    variant: input.chainId === baseSepolia.id ? "testnet-demo" : "default",
  });

  return { data, stages };
}
