import { describe, expect, test } from "vitest";

import {
  DEMO_MAX_AMOUNT_CENTS,
  DEMO_MIN_AMOUNT_CENTS,
  DEMO_PRESETS_CENTS,
  centsToUsdcUnits,
  isDemoAmountCents,
} from "./constants";

describe("demo donation constants", () => {
  test("presets are $1, $2 and $5 in cents", () => {
    expect(DEMO_PRESETS_CENTS).toEqual([100, 200, 500]);
  });

  test("presets are frozen", () => {
    expect(Object.isFrozen(DEMO_PRESETS_CENTS)).toBe(true);
  });

  test("bounds span exactly the preset range", () => {
    expect(DEMO_MIN_AMOUNT_CENTS).toBe(100);
    expect(DEMO_MAX_AMOUNT_CENTS).toBe(500);
  });
});

describe("centsToUsdcUnits", () => {
  test("converts $1.00 to 1 USDC in 6-decimal units", () => {
    expect(centsToUsdcUnits(100)).toBe(1_000_000n);
  });

  test("converts $5.00 to 5 USDC", () => {
    expect(centsToUsdcUnits(500)).toBe(5_000_000n);
  });

  test("throws on a non-integer cent value", () => {
    expect(() => centsToUsdcUnits(1.5)).toThrow(/integer/);
  });
});

describe("isDemoAmountCents", () => {
  test.each([100, 200, 500])("accepts the %i-cent preset", (cents) => {
    expect(isDemoAmountCents(cents)).toBe(true);
  });

  test.each([0, 99, 300, 337, 501, 1_000, 150.5, Number.NaN, -100])(
    "rejects %s",
    (cents) => {
      expect(isDemoAmountCents(cents)).toBe(false);
    },
  );
});
