import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Hero } from "@/components/landing/Hero";

describe("Hero", () => {
  test("renders exactly one <h1> landmark heading", () => {
    const html = renderToString(<Hero />);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
  });

  test("renders the statement headline", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("Give once.");
    expect(html).toContain("See exactly");
    expect(html).toContain("where it goes.");
  });

  test("renders the eyebrow positioning label", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("A donation platform");
  });

  test("renders the inline cycling chip line", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("We call it");
    expect(html).toContain("pays back the trust it asks for");
  });

  test("renders the rotating meanings card", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("/pronounce");
    expect(html).not.toContain("hear it");
  });

  test("composites the receipt product mock", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("eudaimonia.app/receipt");
    expect(html).toContain("Anonymous donor gave");
  });

  test('primary CTA "Choose a cause" anchors to #causes', () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("Choose a cause");
    expect(html).toContain('href="#causes"');
  });

  test('secondary "example receipt" CTA is aria-disabled (Epic 6 not shipped)', () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("See an example receipt");
    expect(html).toContain('aria-disabled="true"');
  });

  test("renders the trust micro-row with the three trust signals", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("$1 minimum");
    expect(html).toContain("Apple Pay");
    expect(html).toContain("tax-deductible");
  });

  test("decorative gradient backdrop is aria-hidden", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain('aria-hidden="true"');
  });
});
