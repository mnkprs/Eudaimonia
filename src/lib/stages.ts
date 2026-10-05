import type { Stage, StageUnit } from "@/types/receipt";

export interface BuildStagesInput {
  donor: {
    /** Display-truncated donor EOA, e.g. "0xe0adb1…7a097bb". */
    addressShort: string;
    /** ETH amount sent by the donor (string-formatted), e.g. "0.0000627". */
    amountEth: string;
    /** Absolute timestamp of the donor tx, e.g. "17:34:01 UTC". */
    timestamp: string;
    /** Calendar date displayed on stage 1, e.g. "May 30, 2025". */
    date: string;
  };
  /**
   * USDC-provenance mode for on-chain-only receipts (D1, Epic 6 Task 3).
   *
   * When present, stage 1 is recast as "Donated (USDC in)" using the USDC
   * amount from the on-chain gross transfer (no fabricated ETH value), and
   * stage 2 is rendered as off-chain informational (`inactive: true`) with no
   * Uniswap pool or rate references. This overrides the `donor.amountEth`
   * and `swap.*` fields for stages 1-2 only; stages 3-5 are unaffected.
   *
   * Omit (or pass `undefined`) for the legacy ETH/swap-centric receipt path —
   * existing behaviour and tests are fully preserved.
   */
  usdcProvenance?: {
    /** USDC amount string, e.g. "1.000000". Used as stage 1 amount. */
    amountUsdc: string;
    /** Short description for stage 2, e.g. "Fiat → USDC via off-chain onramp". */
    offChainShort: string;
  };
  /**
   * Controls how relative-time labels are rendered.
   *
   * - `'seconds'` (default): "+Ns" offsets from stage 1 (legacy path).
   * - `'same-block'`: all on-chain stages share one block; relative = "same block".
   */
  relativeMode?: "seconds" | "same-block";
  swap: {
    /** Display label of the AMM pool, e.g. "Uniswap V3 · 0.05% pool". */
    pool: string;
    /** USDC out from the swap, e.g. "1.001017". */
    amountUsdcOut: string;
    /** Human-readable swap rate, e.g. "1 ETH = 15,975 USDC". */
    rate: string;
    /** Absolute timestamp of the swap. */
    timestamp: string;
    /** Whole-second offset from stage 1 — used to render "+1s". */
    relativeSeconds: number;
  };
  routing: {
    /** Display-truncated OrgFundFactory address, e.g. "0x10fd…a589". */
    orgFundShort: string;
    /** USDC remaining after the Endaoment fee, e.g. "0.986017". */
    amountAfterFee: string;
    /** Endaoment protocol fee shown on hover. */
    endaomentFee: { amount: string; to: string };
    /**
     * Eudaimonia platform fee amount string, e.g. "0.010000".
     * Only consumed when `eudaimoniaFeeActive` is true.
     * Falls back to "0.01" when omitted (legacy path).
     */
    eudaimoniaFeeAmount?: string;
    timestamp: string;
    relativeSeconds: number;
  };
  settlement: {
    /** Display-truncated charity fund address, e.g. "0x10e9…eb82". */
    charityAddrShort: string;
    /** Final fund label, e.g. "Black Women in Blockchain · Fund". */
    charityFundLabel: string;
    /** Final settled amount, e.g. "0.986017". */
    amountUsdc: string;
    /** Confirmation count with thousands separators. */
    confirmations: string;
    timestamp: string;
    relativeSeconds: number;
  };
  /** True only when a Eudaimonia platform fee was actually taken on-chain. */
  eudaimoniaFeeActive: boolean;
  /**
   * Stage copy flavour. `"testnet-demo"` (Base Sepolia) swaps wording that
   * would be false for a demo (card on-ramp, OrgFundFactory, charity multisig)
   * for accurate test-USDC / router / stand-in copy. Omit or `"default"` for
   * the production copy, which is unchanged.
   */
  variant?: "default" | "testnet-demo";
}

const formatRelativeSeconds = (seconds: number): string => `+${seconds}s`;

const SAME_BLOCK_RELATIVE = "same block";

const donorDetail =
  "Donor signed and broadcast the tx from their wallet. No personal data is stored; only the wallet hash.";

const buildSwapDetail = (rate: string): string =>
  `Swapped on the Base ETH/USDC 0.05% pool. Slippage settled at $0.00; rate locked at ${rate}.`;

const OFF_CHAIN_SWAP_DETAIL =
  "Fiat currency was converted to USDC off-chain via the onramp provider before this transaction. No ETH swap occurred on-chain.";

const routingDetail = (endaomentFeeAmount: string): string =>
  `OrgFundFactory routes donations to the recipient charity’s Endaoment fund based on its EIN. Endaoment’s 1.5% fee ($${endaomentFeeAmount}) is taken on-chain at this step.`;

const eudaimoniaFutureDetail =
  "Future Eudaimonia donations will route through our 1% platform fee here. This receipt is for an existing Endaoment donation, so no Eudaimonia fee was charged.";

const eudaimoniaActiveDetail =
  "Eudaimonia charges a 1% platform fee, taken on-chain in the same tx that routes the donation to Endaoment.";

const buildSettledDetail = (confirmations: string): string =>
  `${confirmations} confirmations. Final. The funds are spendable by the charity’s multisig.`;

const STAND_IN_FEE_LABEL = "Endaoment fee (stand-in)";

/**
 * Returns `stages` with the demo-only wording applied (testnet-demo variant).
 * Numbers, timestamps and addresses are untouched; only copy changes.
 */
function applyTestnetDemoCopy(
  stages: readonly Stage[],
  endaomentFeeAmount: string,
): Stage[] {
  const [donated, converted, routed, eudaimoniaFee, settled] = stages;

  return [
    {
      ...donated,
      short: "Demo wallet sent test USDC",
      detail:
        "The demo wallet signed and broadcast this tx on Base Sepolia. It moved test USDC, which has no monetary value.",
    },
    {
      ...converted,
      short: "No conversion · test USDC used directly",
      relative: "not needed",
      address: "None",
      addressLabel: "Provider",
      detail:
        "This demo spends test USDC directly, so no card payment, on-chain swap or currency conversion took place.",
      contract: "None · Test USDC",
      inactiveLabel: "Not needed",
    },
    {
      ...routed,
      short: "Through the Eudaimonia router · stand-in fee taken",
      detail: `The Eudaimonia router splits the donation in this single tx: its 1% platform fee, a 1.5% stand-in for Endaoment’s fee ($${endaomentFeeAmount}), and the rest to the testnet stand-in charity contract. Endaoment’s real contracts are not involved.`,
      contract: "Eudaimonia · Router",
      feeOnHover: routed.feeOnHover && {
        ...routed.feeOnHover,
        label: STAND_IN_FEE_LABEL,
      },
    },
    eudaimoniaFee.inactive
      ? eudaimoniaFee
      : {
          ...eudaimoniaFee,
          detail:
            "Eudaimonia charges a 1% platform fee, taken on-chain in the same tx that routes the donation to the stand-in charity contract.",
        },
    {
      ...settled,
      short: "Arrived at the testnet stand-in contract",
      detail:
        "This is a testnet stand-in contract, not a real charity account. No real funds moved.",
    },
  ];
}

export function buildStages(input: BuildStagesInput): Stage[] {
  const stages = buildDefaultStages(input);
  return input.variant === "testnet-demo"
    ? applyTestnetDemoCopy(stages, input.routing.endaomentFee.amount)
    : stages;
}

function buildDefaultStages(input: BuildStagesInput): Stage[] {
  const {
    donor,
    swap,
    routing,
    settlement,
    eudaimoniaFeeActive,
    usdcProvenance,
    relativeMode = "seconds",
  } = input;

  const isSameBlock = relativeMode === "same-block";

  // Stage 1 — varies by provenance mode
  const stage1Amount: string = usdcProvenance
    ? usdcProvenance.amountUsdc
    : donor.amountEth;
  const stage1Unit: StageUnit = usdcProvenance ? "USDC" : "ETH";
  const stage1Short: string = usdcProvenance
    ? "Donor wallet sent USDC"
    : "Donor wallet sent funds";

  const donated: Stage = {
    n: 1,
    title: "Donated",
    short: stage1Short,
    timestamp: donor.timestamp,
    relative: donor.date,
    amount: stage1Amount,
    unit: stage1Unit,
    address: donor.addressShort,
    addressLabel: "From",
    detail: donorDetail,
    contract: "Wallet · EOA",
  };

  // Stage 2 — off-chain informational when usdcProvenance is active
  const converted: Stage = usdcProvenance
    ? {
        n: 2,
        title: "Converted",
        short: usdcProvenance.offChainShort,
        timestamp: "—",
        relative: "off-chain",
        amount: "—",
        unit: "USDC",
        address: "Off-chain onramp",
        addressLabel: "Provider",
        detail: OFF_CHAIN_SWAP_DETAIL,
        contract: "Off-chain · Onramp",
        inactiveLabel: "Off-chain",
        inactive: true,
      }
    : {
        n: 2,
        title: "Converted",
        short: "ETH → USDC via Uniswap V3",
        timestamp: swap.timestamp,
        relative: isSameBlock
          ? SAME_BLOCK_RELATIVE
          : formatRelativeSeconds(swap.relativeSeconds),
        amount: swap.amountUsdcOut,
        unit: "USDC",
        address: swap.pool,
        addressLabel: "Pool",
        detail: buildSwapDetail(swap.rate),
        contract: "Uniswap V3 Router",
      };

  const routed: Stage = {
    n: 3,
    title: "Routed",
    short: "Through Endaoment · 1.5% fee taken",
    timestamp: routing.timestamp,
    relative: isSameBlock
      ? SAME_BLOCK_RELATIVE
      : formatRelativeSeconds(routing.relativeSeconds),
    amount: routing.amountAfterFee,
    unit: "USDC",
    address: routing.orgFundShort,
    addressLabel: "Contract",
    detail: routingDetail(routing.endaomentFee.amount),
    contract: "Endaoment · OrgFundFactory",
    feeOnHover: {
      label: "Endaoment fee",
      amount: routing.endaomentFee.amount,
      to: routing.endaomentFee.to,
    },
  };

  const eudaimoniaFee: Stage = eudaimoniaFeeActive
    ? {
        n: 4,
        title: "Eudaimonia fee",
        short: "1% platform fee taken on-chain",
        timestamp: routing.timestamp,
        relative: isSameBlock
          ? SAME_BLOCK_RELATIVE
          : formatRelativeSeconds(routing.relativeSeconds),
        amount: routing.eudaimoniaFeeAmount ?? "0.01",
        unit: "USDC",
        address: "Eudaimonia Treasury",
        addressLabel: "Treasury",
        detail: eudaimoniaActiveDetail,
        contract: "Eudaimonia · Treasury",
      }
    : {
        n: 4,
        title: "Eudaimonia fee",
        short: "Future stage · not active for this tx",
        timestamp: "—",
        relative: "inactive",
        amount: "0.00",
        unit: "USDC",
        address: "Not yet deployed",
        addressLabel: "Status",
        detail: eudaimoniaFutureDetail,
        contract: "Eudaimonia · Treasury (future)",
        inactive: true,
      };

  const settled: Stage = {
    n: 5,
    title: "Settled",
    short: "Arrived at charity address",
    timestamp: settlement.timestamp,
    relative: isSameBlock
      ? SAME_BLOCK_RELATIVE
      : formatRelativeSeconds(settlement.relativeSeconds),
    amount: settlement.amountUsdc,
    unit: "USDC",
    address: settlement.charityAddrShort,
    addressLabel: "Charity",
    detail: buildSettledDetail(settlement.confirmations),
    contract: settlement.charityFundLabel,
    terminal: true,
  };

  return [donated, converted, routed, eudaimoniaFee, settled];
}
