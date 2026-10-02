import { describe, expect, it } from "vitest";

import { DEMO_MAX_AMOUNT_CENTS, DEMO_PRESETS_CENTS } from "@/lib/demo/constants";
import { DONATION_PRESETS_CENTS } from "./presets";
import { DEMO_POLICY, ONRAMP_POLICY, getCheckoutPolicy } from "./policy";
import { MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS } from "./validation";

describe("checkout policies", () => {
  it("ONRAMP_POLICY mirrors today's checkout", () => {
    expect(ONRAMP_POLICY).toMatchObject({
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
  });

  it("DEMO_POLICY is tiny, anonymous and card-free", () => {
    expect(DEMO_POLICY).toMatchObject({
      mode: "demo",
      presetsCents: DEMO_PRESETS_CENTS,
      allowCustomAmount: false,
      maxAmountCents: DEMO_MAX_AMOUNT_CENTS,
      collectEmail: false,
      showCardProcessingFee: false,
      submitLabel: "Send test donation",
      initialAmountCents: DEMO_PRESETS_CENTS[0],
    });
  });

  it("policies are frozen", () => {
    expect(Object.isFrozen(ONRAMP_POLICY)).toBe(true);
    expect(Object.isFrozen(DEMO_POLICY)).toBe(true);
  });

  it("getCheckoutPolicy maps a mode to its policy", () => {
    expect(getCheckoutPolicy("demo")).toBe(DEMO_POLICY);
    expect(getCheckoutPolicy("onramp")).toBe(ONRAMP_POLICY);
  });
});
