import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import GlobalError from "@/app/global-error";

/**
 * `global-error.tsx` — last-line-of-defense boundary.
 *
 * Fires when the ROOT LAYOUT itself crashes. At that moment we cannot assume:
 *   - any of our atoms loaded (no Wordmark, no PillButton, no CopyButton)
 *   - the CSS-in-JS provider initialised
 *   - the Inter / JetBrains Mono web fonts loaded
 *   - the design-token CSS variables are defined
 *
 * The screen must render correctly even if half the bundle didn't. Tests
 * enforce these isolation rules in two ways:
 *   1. SSR render the component and assert content shape.
 *   2. Read the source file as text and assert it has NO atom/router imports.
 */
describe("global-error", () => {
  const sourcePath = path.resolve(
    process.cwd(),
    "src/app/global-error.tsx",
  );
  const source = readFileSync(sourcePath, "utf8");

  describe("rendered output (SSR)", () => {
    const noop = vi.fn();
    const fakeError = { name: "Error", message: "boom" } as Error & {
      digest?: string;
    };

    test("renders a top-level <html><body> shell", () => {
      const html = renderToString(
        <GlobalError error={fakeError} reset={noop} />,
      );
      // Per Next docs, global-error.tsx must include its own <html> + <body>.
      expect(html).toContain("<html");
      expect(html).toContain("<body");
    });

    test("renders the headline and reassurance copy", () => {
      const html = renderToString(
        <GlobalError error={fakeError} reset={noop} />,
      );
      expect(html).toContain("Philotimo couldn");
      expect(html).toContain("load");
      // Reassurance that funds didn't move with a page render.
      expect(html).toContain("signed transaction");
    });

    test("renders a Refresh button as a plain inline <button>", () => {
      const html = renderToString(
        <GlobalError error={fakeError} reset={noop} />,
      );
      expect(html).toContain("Refresh");
      expect(html).toContain("<button");
    });

    test("renders the diagnostic digest line when provided", () => {
      const err = { name: "Error", message: "boom", digest: "abc123-test" };
      const html = renderToString(<GlobalError error={err} reset={noop} />);
      expect(html).toContain("abc123-test");
    });

    test("renders a brand-tagged footer line", () => {
      const html = renderToString(
        <GlobalError error={fakeError} reset={noop} />,
      );
      expect(html).toContain("Eudaimonia");
      expect(html).not.toContain("philotimo.app");
    });

    test("uses system font fallback (does not require Inter to be loaded)", () => {
      const html = renderToString(
        <GlobalError error={fakeError} reset={noop} />,
      );
      expect(html.toLowerCase()).toMatch(/system-ui|apple-system/);
    });
  });

  describe("isolation rules (source-level)", () => {
    test("does NOT import from @/components/", () => {
      // No atom imports. PhiMark, Wordmark, PillButton, CopyButton — all forbidden.
      expect(source).not.toMatch(/from\s+["']@\/components\//);
    });

    test("does NOT import next/navigation router", () => {
      // useRouter / usePathname may be unsafe at root-layout crash.
      expect(source).not.toMatch(/from\s+["']next\/navigation["']/);
    });

    test("does NOT import next/link", () => {
      expect(source).not.toMatch(/from\s+["']next\/link["']/);
    });

    test("does NOT import the design-token module", () => {
      // Tokens module is a literal hex object, but globally this screen wants
      // every literal inlined next to the markup so a missing module would
      // still leave the colour correct.
      expect(source).not.toMatch(/from\s+["']@\/lib\/tokens["']/);
    });

    test("does NOT reference design-token CSS variables", () => {
      // No `var(--color-...)` — those resolve to nothing if globals.css
      // failed to load. Every colour must be a literal hex.
      expect(source).not.toMatch(/var\(--color-/);
    });

    test("does NOT use framer-motion or CSS keyframe animations", () => {
      expect(source).not.toMatch(/framer-motion/);
      expect(source).not.toMatch(/animation\s*:/);
    });

    test("does NOT use Tailwind className", () => {
      // global-error renders before any CSS pipeline; inline styles only.
      expect(source).not.toMatch(/className=/);
    });

    test("marks itself as a Client Component", () => {
      // Next requires global-error.tsx to be a client component.
      expect(source).toMatch(/["']use client["']/);
    });
  });
});
