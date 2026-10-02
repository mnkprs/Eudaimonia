import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { CreamBand } from "@/components/landing/CreamBand";
import { Hero } from "@/components/landing/Hero";
import { HeroReceiptMockup } from "@/components/landing/HeroReceiptMockup";
import { NavBar } from "@/components/landing/NavBar";

const HREF = `/receipt/0x${"c".repeat(64)}`;

describe("example receipt links (Epic 8)", () => {
  test("Hero links the example-receipt CTA when a sample exists", () => {
    const html = renderToString(<Hero exampleReceiptHref={HREF} />);
    expect(html).toContain(`href="${HREF}"`);
    expect(html).not.toContain('aria-disabled="true"');
  });

  test("Hero keeps the CTA disabled without a sample", () => {
    const html = renderToString(<Hero exampleReceiptHref={null} />);
    expect(html).toContain("See an example receipt");
    expect(html).toContain('aria-disabled="true"');
  });

  test("Hero trust row says testnet demo and drops card/tax claims in demo mode", () => {
    const html = renderToString(<Hero isDemo />);
    expect(html).toContain("Testnet demo");
    expect(html).toContain("no real money");
    expect(html).not.toContain("Apple Pay");
    expect(html).not.toContain("tax-deductible");
  });

  test("HeroReceiptMockup links to the example receipt when a sample exists", () => {
    const html = renderToString(<HeroReceiptMockup exampleReceiptHref={HREF} />);
    expect(html).toContain(`href="${HREF}"`);
    expect(html).toContain("Open example receipt");
  });

  test("CreamBand links its CTA when a sample exists, disables it otherwise", () => {
    expect(renderToString(<CreamBand exampleReceiptHref={HREF} />)).toContain(`href="${HREF}"`);
    expect(renderToString(<CreamBand exampleReceiptHref={null} />)).toContain('aria-disabled="true"');
  });

  test("ClosingCTA shows 'See a receipt first' only when a sample exists", () => {
    expect(renderToString(<ClosingCTA exampleReceiptHref={HREF} />)).toContain(`href="${HREF}"`);
    expect(renderToString(<ClosingCTA exampleReceiptHref={null} />)).not.toContain("See a receipt first");
  });

  test("NavBar 'Receipts' points at the sample, and is omitted without one", () => {
    expect(renderToString(<NavBar receiptsHref={HREF} />)).toContain(`href="${HREF}"`);
    const without = renderToString(<NavBar />);
    expect(without).not.toContain(">Receipts<");
    expect(without).not.toContain('href="#receipts"');
  });
});
