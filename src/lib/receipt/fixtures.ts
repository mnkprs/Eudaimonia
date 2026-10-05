// Canonical mock donation receipt for Epic 6 (Task 0 — mock-Entity fallback).
//
// A real Base Sepolia broadcast (D3) is deferred until a funded key + live
// Endaoment Entity are available (see plan R2). In its place this module
// provides a *synthetic but on-chain-faithful* receipt that reproduces the
// real two-transfer pull model (Entity.sol:156-166): the router approves `net`
// to the Entity, which then pulls its own protocol fee and the remainder in two
// separate ERC20 Transfers. Every downstream test (Tasks 1, 2, 3) asserts
// against the constants exported here.
//
// The logs are built with viem's own `encodeEventTopics`/`encodeAbiParameters`
// rather than hand-written hex, so they round-trip through the real
// `decodeDonationRoutedLog` and any ERC20 Transfer decoder without drift.
//
// Invariants (asserted by importing tests):
//   fee + net          === gross   (DonationRouted accounting)
//   endaomentFee + netToEntity === net  (Entity two-transfer pull)

import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiItem,
  type Address,
  type Hex,
  type Log,
} from "viem";
import { baseSepolia } from "wagmi/chains";

import { DONATION_ROUTED_EVENT } from "@/lib/contracts";
import type { OrgAddressMap } from "@/lib/endaoment/orgs";

/** Chain the fixture donation settled on. */
export const FIXTURE_CHAIN_ID = baseSepolia.id;

// --- Canonical addresses -----------------------------------------------------
// Synthetic, internally consistent. The decoder classifies the four Transfer
// logs by matching (from, to) against these.

/** Deployed TransparentDonationRouter (emits DonationRouted; source of stages 3-5). */
export const ROUTER_ADDRESS: Address =
  "0x1111111111111111111111111111111111111111";
/** Eudaimonia platform-fee treasury (router → here = stage 4, the 1% fee). */
export const EUDAIMONIA_TREASURY: Address =
  "0x2222222222222222222222222222222222222222";
/** Endaoment protocol-fee treasury (router → here = stage 3 skim, the 1.5% fee). */
export const ENDAOMENT_TREASURY: Address =
  "0x3333333333333333333333333333333333333333";
/** Endaoment org Entity — the donation target (router → here = stage 5, settled). */
export const ORG_ENTITY: Address =
  "0x4444444444444444444444444444444444444444";
/** Donor EOA that signed the donation. */
export const DONOR: Address = "0x5555555555555555555555555555555555555555";
/** Circle's official Base Sepolia USDC — the token contract every Transfer is emitted by. */
export const USDC_BASE_SEPOLIA: Address =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// --- Amounts (USDC base units, 6 decimals) -----------------------------------

/** Total USDC pulled from the donor. 1.000000 USDC. */
export const GROSS = 1_000_000n;
/** Eudaimonia 1% platform fee (router → Eudaimonia treasury). 0.010000 USDC. */
export const EUDAIMONIA_FEE = 10_000n;
/** Net forwarded into the Endaoment Entity. gross − eudaimoniaFee. 0.990000 USDC. */
export const NET = GROSS - EUDAIMONIA_FEE; // 990_000n
/** Endaoment 1.5% protocol fee, skimmed from `net` (router → Endaoment treasury). 0.014850 USDC. */
export const ENDAOMENT_FEE = (NET * 15n) / 1000n; // 14_850n
/** Final amount that lands at the charity Entity. net − endaomentFee. 0.975150 USDC. */
export const NET_TO_ENTITY = NET - ENDAOMENT_FEE; // 975_150n

// --- Block / tx identity -----------------------------------------------------

export const FIXTURE_TX_HASH: Hex =
  "0xdc67000000000000000000000000000000000000000000000000000000ab78ed";
export const FIXTURE_BLOCK_HASH: Hex =
  "0xb10c0000000000000000000000000000000000000000000000000000000000ed";
export const FIXTURE_BLOCK_NUMBER = 30_918_548n;
/** Single block timestamp (D5 — all stages settle in one block). Unix seconds. */
export const FIXTURE_BLOCK_TIMESTAMP = 1_748_626_441n; // 2025-05-30T17:34:01Z
/** Confirmations recorded for the fixture (display-only). */
export const FIXTURE_CONFIRMATIONS = 12_500n;

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const UINT256 = [{ type: "uint256" as const }];

const baseLogFields = {
  blockHash: FIXTURE_BLOCK_HASH,
  blockNumber: FIXTURE_BLOCK_NUMBER,
  transactionHash: FIXTURE_TX_HASH,
  transactionIndex: 0,
  removed: false,
} as const;

function transferLog(
  from: Address,
  to: Address,
  value: bigint,
  logIndex: number,
): Log {
  return {
    ...baseLogFields,
    address: USDC_BASE_SEPOLIA,
    logIndex,
    topics: encodeEventTopics({
      abi: [TRANSFER_EVENT],
      eventName: "Transfer",
      args: { from, to },
    }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(UINT256, [value]),
  } as Log;
}

function donationRoutedLog(org: Address, logIndex: number): Log {
  return {
    ...baseLogFields,
    address: ROUTER_ADDRESS,
    logIndex,
    topics: encodeEventTopics({
      abi: [DONATION_ROUTED_EVENT],
      eventName: "DonationRouted",
      args: { donor: DONOR, org },
    }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [GROSS, EUDAIMONIA_FEE, NET],
    ),
  } as Log;
}

/**
 * The four ERC20 Transfer logs of the donation, in on-chain emission order:
 *   0. donor → router               (gross in)
 *   1. router → Eudaimonia treasury (1% platform fee)
 *   2. router → Endaoment treasury  (1.5% protocol fee — Entity's first pull)
 *   3. router → org Entity          (remainder — Entity's second pull)
 * followed by the router's DonationRouted event (log 4).
 *
 * Ordered by `logIndex`; the decoder (D5) relies on log index, not timestamps.
 */
function buildFixtureLogs(org: Address): readonly Log[] {
  return [
    transferLog(DONOR, ROUTER_ADDRESS, GROSS, 0),
    transferLog(ROUTER_ADDRESS, EUDAIMONIA_TREASURY, EUDAIMONIA_FEE, 1),
    transferLog(ROUTER_ADDRESS, ENDAOMENT_TREASURY, ENDAOMENT_FEE, 2),
    transferLog(ROUTER_ADDRESS, org, NET_TO_ENTITY, 3),
    donationRoutedLog(org, 4),
  ];
}

export const FIXTURE_LOGS: readonly Log[] = buildFixtureLogs(ORG_ENTITY);

/**
 * The recorded transaction receipt — the raw input to `decodeRouterReceipt`
 * (Task 1) and `buildReceiptBundle` (Task 3). Shaped as a successful viem
 * `TransactionReceipt`; only the fields the receipt pipeline reads are
 * populated with realistic values.
 */
export const MOCK_SEPOLIA_RECEIPT = {
  transactionHash: FIXTURE_TX_HASH,
  blockHash: FIXTURE_BLOCK_HASH,
  blockNumber: FIXTURE_BLOCK_NUMBER,
  transactionIndex: 0,
  from: DONOR,
  to: ROUTER_ADDRESS,
  status: "success" as const,
  type: "eip1559" as const,
  contractAddress: null,
  cumulativeGasUsed: 210_000n,
  gasUsed: 210_000n,
  effectiveGasPrice: 1_000_000n,
  logsBloom: `0x${"0".repeat(512)}` as Hex,
  logs: FIXTURE_LOGS,
} as const;

/**
 * The mock receipt re-targeted at a different org address: same amounts and
 * participants, with the router to org Transfer and `DonationRouted.org` both
 * pointing at `org`. Defaults to {@link MOCK_SEPOLIA_RECEIPT}.
 */
export function buildFixtureReceipt({
  org = ORG_ENTITY,
}: { org?: Address } = {}): typeof MOCK_SEPOLIA_RECEIPT {
  if (org === ORG_ENTITY) return MOCK_SEPOLIA_RECEIPT;
  return { ...MOCK_SEPOLIA_RECEIPT, logs: buildFixtureLogs(org) };
}

/** Fixture org Entity addresses for the other two campaigns (Base Sepolia). */
export const WCK_ORG_ENTITY: Address =
  "0x6666666666666666666666666666666666666666";
export const DIRECT_RELIEF_ORG_ENTITY: Address =
  "0x7777777777777777777777777777777777777777";

/**
 * Org-address map for the three campaign EINs on Base Sepolia, pointing at the
 * fixture org addresses (`ORG_ENTITY` is PCRF). Inject as `orgAddressMap`.
 */
export const FIXTURE_ORG_MAP: OrgAddressMap = {
  "93-1057665": { [baseSepolia.id]: ORG_ENTITY },
  "27-3521132": { [baseSepolia.id]: WCK_ORG_ENTITY },
  "95-1831116": { [baseSepolia.id]: DIRECT_RELIEF_ORG_ENTITY },
};

/**
 * `true` because the fixture routes through the Eudaimonia router and takes the
 * 1% platform fee on-chain (transfer #1), so stage 4 is **active** (plan
 * context line 61). A direct-to-Endaoment donation would set this `false`.
 */
export const FIXTURE_EUDAIMONIA_FEE_ACTIVE = true;

/**
 * Whether the fixture reflects a live, verifiable on-chain donation. `false`
 * here flags that live Sepolia verification is deferred (R2) — UI/verify layers
 * can treat the receipt as structurally valid while signaling provenance is mock.
 */
export const FIXTURE_IS_LIVE = false;
