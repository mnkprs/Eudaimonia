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
  });

  test("MVP: no sign-in and no 'For nonprofits' (neither exists)", () => {
    const html = renderToString(<NavBar receiptsHref="/receipt/0xabc" />);
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("/sign-in");
    expect(html).not.toContain("For nonprofits");
  });

  test("section links are root-anchored so they work from every page", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain('href="/#causes"');
    expect(html).toContain('href="/#how-it-works"');
  });

  test("Donate CTA links to the causes section (there is no /donate index)", () => {
    const html = renderToString(<NavBar />);
    expect(html).not.toContain('href="/donate"');
    expect(html).toContain("Donate");
  });
});
