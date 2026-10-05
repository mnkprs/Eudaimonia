import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  NotFoundScreen,
  type NotFoundVariant,
} from "@/components/boundary/NotFoundScreen";

/**
 * NotFoundScreen — route-level 404 boundary component.
 *
 * One layout, four content variants. All variants share the headline
 * ("That link doesn't lead anywhere."), the three exit cards, the broken-link
 * card, and the footer — only the eyebrow + subhead change per variant.
 *
 * Tests use SSR via `renderToString` to match the project's existing pattern
 * (Footer.test.tsx, Hero.test.tsx, etc).
 */
describe("NotFoundScreen", () => {
  const allVariants: NotFoundVariant[] = [
    "unknown_route",
    "unknown_campaign",
    "expired_session",
    "unknown_receipt",
  ];

  describe("shared layout (renders for every variant)", () => {
    test.each(allVariants)(
      "%s — renders the calm-dead-end headline",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        expect(html).toContain("That link doesn");
        expect(html).toContain("lead");
        expect(html).toContain("anywhere");
      },
    );

    test.each(allVariants)("%s — renders all three exit cards", (variant) => {
      const html = renderToString(<NotFoundScreen variant={variant} />);
      expect(html).toContain("Choose a charity");
      expect(html).not.toContain("Recover a receipt");
      expect(html).toContain("Read how it works");
    });

    test.each(allVariants)(
      "%s — primary exit links to the landing page",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        // Primary "Choose a charity" CTA must be wrapped in an <a href="/">.
        // The anchor wraps multiple nested elements, so match across them.
        expect(html).toMatch(
          /href="\/"[\s\S]*?Choose a charity[\s\S]*?<\/a>/,
        );
      },
    );

    test.each(allVariants)(
      "%s — how-it-works exit links to the home-page anchor",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        expect(html).toContain("/#how-it-works");
      },
    );

    test.each(allVariants)(
      "%s — broken-link card has a mailto CTA",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        expect(html).toContain("Report a broken link");
        // Anchor the assertion inside the broken-link card so the test can't
        // pass spuriously on the mailto used by the "Recover a receipt" exit.
        expect(html).toMatch(
          /Report a broken link[\s\S]+mailto:hello@philotimo\.app\?subject=Broken%20link/,
        );
      },
    );

    test.each(allVariants)(
      "%s — no <button> nested inside an <a> (invalid HTML / a11y)",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        // HTML5 forbids interactive content as an anchor descendant. The
        // exit cards put a styled pill inside the card-as-link — that pill
        // must render as <span>, never <button>.
        expect(html).not.toMatch(/<a[\s\S]*?<button/);
      },
    );

    test.each(allVariants)("%s — renders a <footer> landmark", (variant) => {
      const html = renderToString(<NotFoundScreen variant={variant} />);
      expect(html).toContain("<footer");
    });

    test.each(allVariants)(
      "%s — neutral status pill, not urgent-tinted",
      (variant) => {
        const html = renderToString(<NotFoundScreen variant={variant} />);
        // 404 is calm, not an emergency — design uses steel grey, never urgent red.
        expect(html).toContain("Page not found");
      },
    );
  });

  describe("variant-specific copy", () => {
    test("unknown_route — generic eyebrow + subhead", () => {
      const html = renderToString(<NotFoundScreen variant="unknown_route" />);
      expect(html).toContain("This page doesn");
      expect(html).toContain("public on Base");
    });

    test("unknown_campaign — campaign-specific copy", () => {
      const html = renderToString(
        <NotFoundScreen variant="unknown_campaign" />,
      );
      expect(html).toContain("Campaign not found");
      expect(html).toContain("has ended");
    });

    test("expired_session — points to receipt recovery", () => {
      const html = renderToString(
        <NotFoundScreen variant="expired_session" />,
      );
      expect(html).toContain("Processing session expired");
      expect(html).toContain("permanently findable");
    });

    test("unknown_receipt — TransparentDonationRouter mention", () => {
      const html = renderToString(
        <NotFoundScreen variant="unknown_receipt" />,
      );
      expect(html).toContain("Receipt not found");
      expect(html).toContain("TransparentDonationRouter");
    });

    test("defaults to unknown_route when no variant provided", () => {
      const html = renderToString(<NotFoundScreen />);
      expect(html).toContain("This page doesn");
    });
  });
});

describe("NotFoundScreen links (MVP)", () => {
  test("no dead domain; broken links are reported on GitHub; brand is Eudaimonia", () => {
    const html = renderToString(<NotFoundScreen />);
    expect(html).not.toContain("philotimo.app");
    expect(html).not.toContain("Philotimo");
    expect(html).toContain("https://github.com/mnkprs/Eudaimonia/issues");
    expect(html).toContain('href="/#causes"');
  });
});
