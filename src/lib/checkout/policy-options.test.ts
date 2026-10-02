import { describe, expect, it } from "vitest";

import { calculateBreakdown } from "./fees";
import { validateAmount } from "./validation";

describe("validateAmount() with a custom max", () => {
  it("rejects amounts above the supplied maxCents", () => {
    expect(validateAmount(6, { maxCents: 500 })).toEqual({
      ok: false,
      error: "Amount cannot exceed $5.",
    });
  });

  it("accepts an amount equal to the supplied maxCents", () => {
    expect(validateAmount(5, { maxCents: 500 })).toEqual({ ok: true, value: 500 });
  });

  it("keeps the default maximum when no option is passed", () => {
    expect(validateAmount(10_001).ok).toBe(false);
    expect(validateAmount(10_000).ok).toBe(true);
  });
});

describe("calculateBreakdown() without card processing", () => {
  it("omits the card row and zeroes the card fee", () => {
    const breakdown = calculateBreakdown(500, { includeCardProcessing: false });
    expect(breakdown.rows.map((row) => row.kind)).toEqual([
      "gross",
      "eudaimonia",
      "endaoment",
      "net",
    ]);
    expect(breakdown.cardProcessingFeeCents).toBe(0);
  });

  it("leaves the net-to-charity amount unchanged", () => {
    const withCard = calculateBreakdown(500);
    const withoutCard = calculateBreakdown(500, { includeCardProcessing: false });
    expect(withoutCard.netToCharityCents).toBe(withCard.netToCharityCents);
  });

  it("includes the card row by default", () => {
    const kinds = calculateBreakdown(500).rows.map((row) => row.kind);
    expect(kinds).toContain("cardProcessing");
  });
});
