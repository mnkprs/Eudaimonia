import { describe, expect, test } from "vitest";

import {
  INITIAL_FORM_STATE,
  checkoutFormReducer,
  createInitialFormState,
  selectAmountError,
  selectEmailError,
  selectIsSubmittable,
  selectPayload,
} from "@/components/checkout/checkoutFormState";
import { DEMO_POLICY, ONRAMP_POLICY } from "@/lib/checkout/policy";

const submitted = (amountCents: number) =>
  checkoutFormReducer(
    { ...createInitialFormState(DEMO_POLICY), amountCents },
    { type: "SUBMIT_ATTEMPT" },
  );

describe("createInitialFormState()", () => {
  test("onramp policy yields today's initial state", () => {
    expect(createInitialFormState(ONRAMP_POLICY)).toEqual(INITIAL_FORM_STATE);
  });

  test("demo policy preselects the first demo preset", () => {
    expect(createInitialFormState(DEMO_POLICY).amountCents).toBe(100);
  });
});

describe("checkoutFormState — demo policy", () => {
  test("payload carries an empty email and no note", () => {
    const state = {
      ...createInitialFormState(DEMO_POLICY),
      note: "hello",
    };
    expect(selectPayload(state, "pcrf", DEMO_POLICY)).toEqual({
      campaignId: "pcrf",
      grossCents: 100,
      email: "",
    });
  });

  test("email error is never surfaced", () => {
    expect(selectEmailError(submitted(100), DEMO_POLICY)).toBeUndefined();
  });

  test("amount above the demo max is rejected", () => {
    expect(selectAmountError(submitted(600), DEMO_POLICY)).toBe(
      "Amount cannot exceed $5.",
    );
    expect(selectIsSubmittable(submitted(600), DEMO_POLICY)).toBe(false);
    expect(selectPayload(submitted(600), "pcrf", DEMO_POLICY)).toBeNull();
  });

  test("$5 is accepted", () => {
    expect(selectIsSubmittable(submitted(500), DEMO_POLICY)).toBe(true);
  });

  test("default policy keeps requiring an email", () => {
    const state = { ...submitted(5000), email: "" };
    expect(selectEmailError(state)).toBe("Email is required for the receipt.");
    expect(selectPayload(state, "pcrf")).toBeNull();
  });
});
