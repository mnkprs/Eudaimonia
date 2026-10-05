"use client";

/**
 * Worst-case last-line-of-defense boundary — the root layout itself crashed.
 *
 * Hard constraints (enforced by `global-error.test.tsx`):
 *   - NO imports from `@/components/` (atoms may not have loaded).
 *   - NO `next/navigation`, NO `next/link` (router may be unsafe).
 *   - NO `@/lib/tokens` import — every colour is an inline hex literal.
 *   - NO CSS-custom-property references — design-token stylesheet may not have loaded.
 *   - NO CSS keyframe animation, NO motion libraries.
 *   - NO Tailwind `className` — inline styles only.
 *   - System font stack only (Inter / JetBrains Mono may not have loaded).
 *
 * Single inline `<button>` with the design's iris background calls `reset()`.
 *
 * Designed in `designs-boundary-screens/designs/screen-global-error.jsx`.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// System fallback stacks — never assume web fonts loaded.
const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const digestLine = error.digest
    ? `GlobalLayoutCrash · digest ${error.digest}`
    : "GlobalLayoutCrash · digest unavailable";

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          background: "#f6f9fc",
          color: "#0d253d",
          fontFamily: SYSTEM_SANS,
          fontWeight: 300,
        }}
      >
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            maxWidth: 480,
            padding: 48,
            background: "#ffffff",
            border: "1px solid #e3e8ee",
            borderRadius: 16,
            boxShadow:
              "0 8px 24px rgba(0, 55, 112, 0.08), 0 2px 6px rgba(0, 55, 112, 0.04)",
            textAlign: "left",
          }}
        >
          {/* Inline wordmark — text only. PhiMark SVG forbidden here. */}
          <div
            style={{
              fontSize: 13,
              letterSpacing: "-0.1px",
              color: "#56627a",
              marginBottom: 28,
              fontWeight: 400,
            }}
          >
            Eudaimonia
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              // Weight 300 needs Inter; fall back at 400 for system stacks.
              fontWeight: 400,
              letterSpacing: "-0.28px",
              lineHeight: 1.15,
              color: "#0d253d",
            }}
          >
            Eudaimonia couldn&rsquo;t load.
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 15,
              fontWeight: 400,
              color: "#273951",
              letterSpacing: "-0.1px",
              lineHeight: 1.55,
            }}
          >
            The page broke before it could render. Funds only move through a
            signed transaction, not page loads &mdash; nothing happened to
            your money because of this error. Refresh and try again.
          </p>

          {/* Mono digest line — no copy button (CopyButton is an atom). */}
          <div
            style={{
              margin: "28px 0 24px",
              padding: "10px 12px",
              background: "#f6f9fc",
              border: "1px solid #eef2f6",
              borderRadius: 6,
              fontFamily: SYSTEM_MONO,
              fontSize: 12,
              color: "#56627a",
              letterSpacing: "-0.1px",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}
          >
            {digestLine}
          </div>

          {/* Single inline <button> — no PillButton, no router push. */}
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              background: "#533afd",
              color: "#ffffff",
              border: "1px solid #533afd",
              padding: "12px 22px",
              borderRadius: 9999,
              fontFamily: "inherit",
              fontWeight: 400,
              fontSize: 15,
              letterSpacing: "-0.1px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Refresh
          </button>

          <div
            style={{
              marginTop: 28,
              fontSize: 11,
              color: "#56627a",
              letterSpacing: "-0.05px",
              textAlign: "center",
            }}
          >
            Eudaimonia &middot; transparent giving on Base
          </div>
        </div>
      </body>
    </html>
  );
}
