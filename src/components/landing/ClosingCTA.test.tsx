import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ClosingCTA } from "@/components/landing/ClosingCTA";

function render(): string {
  return renderToString(<ClosingCTA />);
}

describe("ClosingCTA", () => {
  test("renders as a <section> with an accessible name", () => {
    const html = render();
    expect(html).toMatch(/<section\b/);
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
  });

  test("renders the 'Give once' eyebrow", () => {
    expect(render()).toContain("Give once");
  });

  test("renders the 'One dollar in. One receipt out.' headline", () => {
    const html = render();
    expect(html).toContain("One dollar in");
    expect(html).toContain("One receipt out");
  });

  test("renders the body copy about receipts", () => {
    expect(render()).toContain("Pick a cause");
  });

  test("renders both CTAs when a sample receipt exists", () => {
    const html = renderToString(<ClosingCTA exampleReceiptHref="/receipt/0xabc" />);
    expect(html).toContain("Choose a cause");
    expect(html).toContain("See a receipt first");
  });

  test("primary CTA links to the causes section anchor", () => {
    expect(render()).toMatch(/href="#causes"/);
  });

  test("uses the ink dark surface and white text tokens", () => {
    const html = render();
    expect(html).toMatch(/bg-ink/);
    expect(html).toMatch(/text-white/);
  });

  test("no client JS state — pure server component", () => {
    const html = render();
    expect(html).not.toContain("useState");
  });
});
