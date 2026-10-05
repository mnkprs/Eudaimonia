import {
  DEMO_MAX_AMOUNT_CENTS,
  DEMO_MIN_AMOUNT_CENTS,
  DEMO_PRESETS_CENTS,
} from "@/lib/demo/constants";
import type { DonationMode } from "./donation-mode";
import { DONATION_PRESETS_CENTS } from "./presets";
import { MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS } from "./validation";

/** Everything that differs between the on-ramp checkout and the testnet demo. */
export interface CheckoutPolicy {
  readonly mode: DonationMode;
  readonly presetsCents: readonly number[];
  readonly allowCustomAmount: boolean;
  readonly minAmountCents: number;
  readonly maxAmountCents: number;
  readonly collectEmail: boolean;
  readonly showCardProcessingFee: boolean;
  readonly submitLabel: string;
  readonly submittingLabel: string;
  /** Amount selected on first render; 0 means none. */
  readonly initialAmountCents: number;
}

export const ONRAMP_POLICY: CheckoutPolicy = Object.freeze({
  mode: "onramp",
  presetsCents: DONATION_PRESETS_CENTS,
  allowCustomAmount: true,
  minAmountCents: MIN_AMOUNT_CENTS,
  maxAmountCents: MAX_AMOUNT_CENTS,
  collectEmail: true,
  showCardProcessingFee: true,
  submitLabel: "Donate",
  submittingLabel: "Processing payment",
  initialAmountCents: 0,
});

export const DEMO_POLICY: CheckoutPolicy = Object.freeze({
  mode: "demo",
  presetsCents: DEMO_PRESETS_CENTS,
  allowCustomAmount: false,
  minAmountCents: DEMO_MIN_AMOUNT_CENTS,
  maxAmountCents: DEMO_MAX_AMOUNT_CENTS,
  collectEmail: false,
  showCardProcessingFee: false,
  submitLabel: "Send test donation",
  submittingLabel: "Sending test donation",
  initialAmountCents: DEMO_PRESETS_CENTS[0],
});

export function getCheckoutPolicy(mode: DonationMode): CheckoutPolicy {
  return mode === "demo" ? DEMO_POLICY : ONRAMP_POLICY;
}
