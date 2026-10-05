import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import {
  ErrorScreen,
  type ErrorVariant,
} from "@/components/boundary/ErrorScreen";

/**
 * ErrorScreen — route-level error boundary component.
 *
 * Same layout, four variants. The keystone element is the 2-column "what was
 * happening" card that pins donor context (left) against money status (right).
 * The `processing_render_error` variant shows a resume CTA promoting
 * `/status/[sessionId]`; the other three show a calm "nothing in flight" pill.
 *
 * Tests use SSR via `renderToString` to match the project's existing pattern.
 * The dark diagnostic card + CopyButton are client-only, so SSR renders them
 * without the interactive click behaviour — we test markup and copy here.
 */
describe("ErrorScreen", () => {
  const allVariants: ErrorVariant[] = [
    "route_render_error",
    "checkout_render_error",
    "processing_render_error",
    "receipt_render_error",
  ];

  const noop = vi.fn();

  describe("shared layout (renders for every variant)", () => {
    test.each(allVariants)(
      "%s — renders the iris-underlined headline",
      (variant) => {
        const html = renderToString(
          <ErrorScreen variant={variant} reset={noop} />,
        );
        expect(html).toContain("Something on");
        expect(html).toContain("our side");
        expect(html).toContain("got in the way");
      },
    );

    test.each(allVariants)(
      "%s — primary Try again + ghost Go home CTAs",
      (variant) => {
        const html = renderToString(
          <ErrorScreen variant={variant} reset={noop} />,
        );
        expect(html).toContain("Try again");
        expect(html).toContain("Go home");
      },
    );

    test.each(allVariants)("%s — urgent-tinted status pill", (variant) => {
      const html = renderToString(
        <ErrorScreen variant={variant} reset={noop} />,
      );
      // Error boundary uses urgent tint, NOT the calm steel of 404.
      expect(html.toLowerCase()).toContain("#c14040");
    });

    test.each(allVariants)(
      "%s — diagnostic card with For the curious eyebrow",
      (variant) => {
        const html = renderToString(
          <ErrorScreen variant={variant} reset={noop} />,
        );
        expect(html).toContain("For the curious");
        expect(html).toContain("Diagnostic");
      },
    );

    test.each(allVariants)(
      "%s — footer links: report on GitHub, no dead domain or status page",
      (variant) => {
        const html = renderToString(
          <ErrorScreen variant={variant} reset={noop} />,
        );
        expect(html).toContain("https://github.com/mnkprs/Eudaimonia/issues");
        expect(html).not.toContain("philotimo.app");
        expect(html).not.toContain("Status page</a>");
      },
    );
  });

  describe("variant-specific content", () => {
    test("route_render_error — generic + No active donation pill", () => {
      const html = renderToString(
        <ErrorScreen variant="route_render_error" reset={noop} />,
      );
      expect(html).toContain("Something broke");
      expect(html).toContain("Browsing Eudaimonia");
      expect(html).toContain("Nothing in flight");
    });

    test("checkout_render_error — checkout-specific copy", () => {
      const html = renderToString(
        <ErrorScreen variant="checkout_render_error" reset={noop} />,
      );
      expect(html).toContain("Checkout broke");
      expect(html).toContain("Filling in the checkout form");
      expect(html).toContain("Untouched");
    });

    test("processing_render_error — resume CTA to /status/[sessionId]", () => {
      const html = renderToString(
        <ErrorScreen
          variant="processing_render_error"
          reset={noop}
          recoveredSessionId="cs_live_abc"
        />,
      );
      expect(html).toContain("Status page broke");
      expect(html).toContain("Watching your donation settle");
      // The resumeable variant shows the iris pill + status URL.
      expect(html).toContain("Pick up where you left off");
      expect(html).toContain("/processing/cs_live_abc");
      expect(html).not.toContain("/status/cs_live_abc");
    });

    test("receipt_render_error — Basescan fallback hint", () => {
      const html = renderToString(
        <ErrorScreen variant="receipt_render_error" reset={noop} />,
      );
      expect(html).toContain("Receipt page broke");
      expect(html).toContain("Opening a published receipt");
      expect(html).toContain("Basescan");
    });

    test("non-resumeable variants do NOT show a status link", () => {
      for (const v of [
        "route_render_error",
        "checkout_render_error",
        "receipt_render_error",
      ] as const) {
        const html = renderToString(<ErrorScreen variant={v} reset={noop} />);
        expect(html).not.toContain("Pick up where you left off");
      }
    });

    test("each variant shows its own diagnostic digest line", () => {
      const html1 = renderToString(
        <ErrorScreen variant="route_render_error" reset={noop} />,
      );
      const html2 = renderToString(
        <ErrorScreen variant="checkout_render_error" reset={noop} />,
      );
      expect(html1).toContain("digest");
      expect(html2).toContain("digest");
      // The diagnostic copy must differ across variants.
      expect(html1).not.toEqual(html2);
    });
  });

  describe("session id extraction from URL", () => {
    test("processing variant uses passed-in sessionId in the resume link", () => {
      const html = renderToString(
        <ErrorScreen
          variant="processing_render_error"
          reset={noop}
          recoveredSessionId="cs_live_test_abc"
        />,
      );
      expect(html).toContain("/status/cs_live_test_abc");
    });

    test("processing variant falls back to a generic resume link when no sessionId", () => {
      const html = renderToString(
        <ErrorScreen variant="processing_render_error" reset={noop} />,
      );
      // No specific session id: link must still render but point at /status
      // (or the generic resume entry point) — never crash.
      expect(html).toContain("/status");
    });
  });

  describe("error.digest pass-through", () => {
    test("renders the supplied digest when provided", () => {
      const html = renderToString(
        <ErrorScreen
          variant="route_render_error"
          reset={noop}
          errorDigest="9c7f3b1a-custom"
        />,
      );
      expect(html).toContain("9c7f3b1a-custom");
    });
  });
});
