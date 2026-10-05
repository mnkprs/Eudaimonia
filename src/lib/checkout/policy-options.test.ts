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

describe("calculateBreakdown() testnet demo labels", () => {
  const demo = calculateBreakdown(200, { includeCardProcessing: false, testnetDemo: true });
  const row = (kind: string) => demo.rows.find((r) => r.kind === kind);

  it("labels the Endaoment row as a stand-in", () => {
    expect(row("endaoment")?.label).toBe("Endaoment fee (stand-in)");
  });

  it("describes the net as test USDC to a Base Sepolia stand-in, not an Endaoment fund", () => {
    expect(row("net")?.sub).toContain("Base Sepolia");
    expect(row("net")?.sub).toContain("stand-in");
    expect(row("net")?.sub).not.toContain("Endaoment Org Fund");
  });

  it("keeps the production labels by default", () => {
    const live = calculateBreakdown(200);
    expect(live.rows.find((r) => r.kind === "endaoment")?.label).toBe("Endaoment fee");
    expect(live.rows.find((r) => r.kind === "net")?.sub).toBe("USDC · Base · Endaoment Org Fund");
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
