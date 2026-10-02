import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { NavBar } from "@/components/landing/NavBar";

describe("NavBar", () => {
  test("renders a <nav> with the Primary aria-label landmark", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary"');
  });

  test("brand mark links home with an accessible name (no wordmark text)", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Eudaimonia — home"');
  });

  test("renders the four primary section links when a sample receipt exists", () => {
    const html = renderToString(<NavBar receiptsHref="/receipt/0xabc" />);
    expect(html).toContain("Causes");
    expect(html).toContain("How it works");
    expect(html).toContain("Receipts");
    expect(html).toContain("For nonprofits");
  });

  test("Donate CTA links to /donate", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain('href="/donate"');
    expect(html).toContain("Donate");
  });
});
