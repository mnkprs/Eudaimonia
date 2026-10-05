/**
 * Fee math for the Eudaimonia checkout flow. All inputs and outputs are integer
 * cents to keep this layer free of floating-point drift.
 *
 * The percentages below are the contract for Epic 2 only. Epic 3 (on-ramp,
 * card processor) and Epic 4 (Eudaimonia router contract) will negotiate the
 * final percentages; this single constants block is the only place to amend
 * them.
 *
 * Source: designs/checkout.jsx (OrderSummary, ~lines 477-486).
 */

import type { FeeBreakdown, FeeRow } from "@/types/checkout";

/** Eudaimonia platform fee, in basis points (1 bp = 0.01%). 100 bps = 1.00%. */
export const EUDAIMONIA_FEE_BPS = 100;

/** Endaoment infrastructure fee, in basis points. 150 bps = 1.50%. */
export const ENDAOMENT_FEE_BPS = 150;

/** Card processing percentage component, in basis points. 290 bps = 2.90%. */
export const CARD_PROCESSING_BPS = 290;

/** Card processing flat component, in cents. 30 = $0.30. */
export const CARD_PROCESSING_FLAT_CENTS = 30;

const BPS_DENOMINATOR = 10_000;

function applyBps(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / BPS_DENOMINATOR);
}

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

const EMPTY_BREAKDOWN: FeeBreakdown = {
  grossCents: 0,
  rows: [],
  netToCharityCents: 0,
  eudaimoniaFeeCents: 0,
  endaomentFeeCents: 0,
  cardProcessingFeeCents: 0,
};

export interface CalculateBreakdownOptions {
  /** Show the card processing row (on-ramp). Defaults to true. */
  readonly includeCardProcessing?: boolean;
  /** Base Sepolia demo: label Endaoment and the net as testnet stand-ins. Defaults to false. */
  readonly testnetDemo?: boolean;
}

/**
 * Compute the donor-facing fee breakdown for an entered amount. Returns a
 * frozen-shape object with both numeric totals (for math/CTA decisions) and
 * an ordered list of {@link FeeRow}s for the OrderSummary component to render.
 *
 * Invariants:
 * - Non-positive gross → empty rows + zero totals (callers render an
 *   instructional empty state, not a "0 cents" row).
 * - Net to charity is clamped at zero — a pathologically tiny gross never
 *   yields a negative payout.
 * - Card processing is shown to the donor for transparency but is NOT
 *   deducted from the charity's net (the processor takes it separately).
 */
export function calculateBreakdown(
  grossCents: number,
  options: CalculateBreakdownOptions = {},
): FeeBreakdown {
  const includeCardProcessing = options.includeCardProcessing ?? true;
  const testnetDemo = options.testnetDemo ?? false;
  if (!Number.isFinite(grossCents) || grossCents <= 0) {
    return EMPTY_BREAKDOWN;
  }

  const eudaimoniaFeeCents = applyBps(grossCents, EUDAIMONIA_FEE_BPS);
  const endaomentFeeCents = applyBps(grossCents, ENDAOMENT_FEE_BPS);
  const cardProcessingFeeCents = includeCardProcessing
    ? applyBps(grossCents, CARD_PROCESSING_BPS) + CARD_PROCESSING_FLAT_CENTS
    : 0;
  const netToCharityCents = clampNonNegative(
    grossCents - eudaimoniaFeeCents - endaomentFeeCents,
  );

  const rows: readonly FeeRow[] = [
    {
      kind: "gross",
      label: "Gross donation",
      sub: "Amount you intend to give",
      amountCents: grossCents,
    },
    {
      kind: "eudaimonia",
      label: "Eudaimonia routing fee",
      sub: "1.00% · taken on-chain, visible in receipt",
      amountCents: eudaimoniaFeeCents,
      muted: true,
    },
    {
      kind: "endaoment",
      label: testnetDemo ? "Endaoment fee (stand-in)" : "Endaoment fee",
      sub: testnetDemo
        ? "1.50% · simulated by a testnet contract"
        : "1.50% · charitable infrastructure",
      amountCents: endaomentFeeCents,
      muted: true,
    },
    ...(includeCardProcessing
      ? [
          {
            kind: "cardProcessing",
            label: "Card processing",
            sub: "2.90% + $0.30 · processor fee",
            amountCents: cardProcessingFeeCents,
            muted: true,
          } satisfies FeeRow,
        ]
      : []),
    {
      kind: "net",
      label: "Net to charity",
      sub: testnetDemo
        ? "Test USDC · Base Sepolia · stand-in contract"
        : "USDC · Base · Endaoment Org Fund",
      amountCents: netToCharityCents,
      strong: true,
    },
  ];

  return {
    grossCents,
    rows,
    netToCharityCents,
    eudaimoniaFeeCents,
    endaomentFeeCents,
    cardProcessingFeeCents,
  };
}
