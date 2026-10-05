"use client";

import { GradientMesh } from "@/components/brand/GradientMesh";
import { Wordmark } from "@/components/brand/Wordmark";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { CopyButton } from "@/components/ui/CopyButton";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PillButton } from "@/components/ui/PillButton";
import { ISSUES_URL } from "@/lib/links";
import { colors } from "@/lib/tokens";

/**
 * Route-level error boundary screen — backs `src/app/error.tsx`.
 *
 * Four variants by failed segment. The keystone is the 2-column "what was
 * happening" card: donor context (left) vs. money status (right). The
 * `processing_render_error` variant promotes `/processing/[sessionId]` so the
 * donor can recover. The other three render a calm "no active donation in
 * flight" pill.
 *
 * Designed in `designs-boundary-screens/designs/screen-error.jsx`.
 *
 * "use client" is required because:
 *  - The host page (`app/error.tsx`) must be a Client Component per Next.js.
 *  - `CopyButton` reads `navigator.clipboard`, which is client-only.
 */

export type ErrorVariant =
  | "route_render_error"
  | "checkout_render_error"
  | "processing_render_error"
  | "receipt_render_error";

interface VariantContent {
  pillLabel: string;
  eyebrow: string;
  actionEyebrow: string;
  actionTitle: string;
  actionBody: string;
  moneyEyebrow: string;
  moneyTitle: string;
  moneyBody: string;
  resumeable: boolean;
  /** Default diagnostic copy when the page doesn't pass `errorDigest`. */
  diagnostic: string;
}

const VARIANTS: Record<ErrorVariant, VariantContent> = {
  route_render_error: {
    pillLabel: "Something broke",
    eyebrow: "Unexpected error · Recovery available",
    actionEyebrow: "What you were doing",
    actionTitle: "Browsing Eudaimonia.",
    actionBody:
      "A page hit an unexpected state while rendering. The funnel itself is unaffected — you can keep going from any other route, including the home page.",
    moneyEyebrow: "Where your money is",
    moneyTitle: "Nothing in flight.",
    moneyBody:
      "You weren’t mid-donation when this happened. Nothing has been charged, nothing is settling, nothing needs to be refunded.",
    resumeable: false,
    diagnostic:
      "RouteRenderError · digest 9c7f3b1a · /campaigns/[slug]/page · server",
  },
  checkout_render_error: {
    pillLabel: "Checkout broke",
    eyebrow: "Unexpected error · Recovery available",
    actionEyebrow: "What you were doing",
    actionTitle: "Filling in the checkout form.",
    actionBody:
      "The donation form crashed before you could submit. No card was authorized, no on-ramp session was opened. Re-entering the amount takes about ten seconds.",
    moneyEyebrow: "Where your money is",
    moneyTitle: "Untouched.",
    moneyBody:
      "Stripe only sees a card number once you press Donate. You didn’t reach that step, so nothing left your account and no on-chain transaction was queued.",
    resumeable: false,
    diagnostic:
      "CheckoutRenderError · digest 4e2a8d50 · /donate/[campaignId]/page · client · Stripe Elements mount failed",
  },
  processing_render_error: {
    pillLabel: "Status page broke",
    eyebrow: "Unexpected error · Session still active",
    actionEyebrow: "What you were doing",
    actionTitle: "Watching your donation settle.",
    actionBody:
      "The live processing page lost its connection to our status endpoint and threw mid-render. The on-chain side keeps going either way — webhooks don’t care if the browser tab is open.",
    moneyEyebrow: "Where your money is",
    moneyTitle: "Still on the route.",
    moneyBody:
      "We recovered your session ID from the URL. The tracker is still updating server-side; you can pick up where you left off without losing anything.",
    resumeable: true,
    diagnostic:
      "ProcessingRenderError · digest 71c0fa9e · /processing/[sessionId]/page · client · status poll lost session in KV",
  },
  receipt_render_error: {
    pillLabel: "Receipt page broke",
    eyebrow: "Unexpected error · Funds delivered",
    actionEyebrow: "What you were doing",
    actionTitle: "Opening a published receipt.",
    actionBody:
      "The receipt page failed to render — likely an upstream RPC outage on Base. The donation itself is already settled on-chain; the rendering is just a view of it.",
    moneyEyebrow: "Where your money is",
    moneyTitle: "At the charity.",
    moneyBody:
      "Receipts only exist once the on-chain settlement has cleared. You can verify the transaction directly on Basescan in the meantime — the page is just a friendlier surface for the same data.",
    resumeable: false,
    diagnostic:
      "ReceiptRenderError · digest a45b22de · /receipt/[hash]/page · server · viem ContractFunctionExecutionError",
  },
};

interface ErrorScreenProps {
  variant?: ErrorVariant;
  /** Forwarded from Next's `error.tsx` reset prop. */
  reset: () => void;
  /** When set, overrides the variant's default diagnostic copy with Next's `error.digest`. */
  errorDigest?: string;
  /** When the failing route is `/processing/[sessionId]`, pass the recovered id here. */
  recoveredSessionId?: string;
}

export function ErrorScreen({
  variant = "route_render_error",
  reset,
  errorDigest,
  recoveredSessionId,
}: ErrorScreenProps) {
  const content = VARIANTS[variant];
  const diagnostic = errorDigest ?? content.diagnostic;

  return (
    <div
      style={{
        background: colors.canvas,
        color: colors.ink,
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
        fontWeight: 300,
        fontFeatureSettings: '"ss01"',
        minHeight: "100%",
      }}
    >
      <ErrorHero content={content} reset={reset} />
      <ErrorContextCard
        content={content}
        recoveredSessionId={recoveredSessionId}
      />
      <ErrorDiagnosticCard diagnostic={diagnostic} />
      <ErrorFooter />
    </div>
  );
}

function ErrorHero({
  content,
  reset,
}: {
  content: VariantContent;
  reset: () => void;
}) {
  return (
    <div
      style={{ position: "relative", overflow: "hidden", paddingBottom: 40 }}
    >
      <GradientMesh height={460} opacity={0.5} />

      <div
        style={{
          position: "absolute",
          top: 28,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 32px",
          maxWidth: 1080,
          margin: "0 auto",
          zIndex: 2,
        }}
      >
        <Wordmark size={15} />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 11px",
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${colors.urgentSoft}`,
            backdropFilter: "blur(6px)",
            borderRadius: 9999,
            fontSize: 11,
            color: colors.urgent,
            letterSpacing: "-0.1px",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 9999,
              background: colors.urgent,
              boxShadow: "0 0 0 3px rgba(193,64,64,0.18)",
            }}
          />
          {content.pillLabel}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "128px 32px 8px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 12px",
            background: colors.canvas,
            border: `1px solid ${colors.hairline}`,
            borderRadius: 9999,
            marginBottom: 28,
          }}
        >
          <EyebrowLabel color={colors.urgent}>{content.eyebrow}</EyebrowLabel>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 52,
            fontWeight: 300,
            letterSpacing: "-1.04px",
            lineHeight: 1.04,
            color: colors.ink,
            textWrap: "pretty",
            maxWidth: 880,
          }}
        >
          Something on{" "}
          <span
            style={{
              backgroundImage:
                "linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)",
            }}
          >
            our side
          </span>{" "}
          got in the way.
        </h1>

        <p
          style={{
            margin: "22px 0 0",
            fontSize: 18,
            fontWeight: 300,
            color: colors.inkDeep,
            letterSpacing: "-0.1px",
            lineHeight: 1.5,
            maxWidth: 760,
          }}
        >
          A page failed to render. No funds move when that happens &mdash;
          every cent on Eudaimonia moves through a signed transaction, never
          through a page load. You can safely retry or step back without
          anything getting lost.
        </p>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <PillButton
            variant="primary"
            size="lg"
            icon={<ArrowRight color="#fff" />}
            onClick={reset}
          >
            Try again
          </PillButton>
          <PillButton href="/" variant="ghost" size="lg">
            Go home
          </PillButton>
        </div>
      </div>
    </div>
  );
}

function ErrorContextCard({
  content,
  recoveredSessionId,
}: {
  content: VariantContent;
  recoveredSessionId?: string;
}) {
  const statusHref = recoveredSessionId
    ? `/processing/${recoveredSessionId}`
    : "/";

  return (
    <section
      style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 32px 24px" }}
    >
      <div
        style={{
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,55,112,0.06)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 28,
            bottom: 28,
            left: "calc(50% - 0.5px)",
            width: 1,
            background: colors.hairline,
          }}
        />

        <div style={{ paddingRight: 8 }}>
          <EyebrowLabel>{content.actionEyebrow}</EyebrowLabel>
          <h3
            style={{
              margin: "10px 0 10px",
              fontSize: 24,
              fontWeight: 300,
              letterSpacing: "-0.24px",
              color: colors.ink,
            }}
          >
            {content.actionTitle}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: colors.inkDeep,
              letterSpacing: "-0.1px",
              lineHeight: 1.55,
            }}
          >
            {content.actionBody}
          </p>
        </div>

        <div style={{ paddingLeft: 8 }}>
          <EyebrowLabel>{content.moneyEyebrow}</EyebrowLabel>
          <h3
            style={{
              margin: "10px 0 10px",
              fontSize: 24,
              fontWeight: 300,
              letterSpacing: "-0.24px",
              color: colors.ink,
            }}
          >
            {content.moneyTitle}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: colors.inkDeep,
              letterSpacing: "-0.1px",
              lineHeight: 1.55,
            }}
          >
            {content.moneyBody}
          </p>

          {content.resumeable ? (
            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                background: colors.irisBg,
                border: "1px solid rgba(83,58,253,0.12)",
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  background: colors.primary,
                  boxShadow: "0 0 0 3px rgba(83,58,253,0.18)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.irisPress,
                    letterSpacing: "-0.1px",
                  }}
                >
                  Your session is still active.
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: colors.inkMute,
                    letterSpacing: "-0.1px",
                    marginTop: 2,
                    fontFamily:
                      '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
                    fontFeatureSettings: '"tnum","ss01"',
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusHref}
                </div>
              </div>
              <PillButton
                href={statusHref}
                variant="primary"
                size="sm"
                icon={<ArrowRight color="#fff" />}
              >
                Pick up where you left off
              </PillButton>
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: colors.surfaceTint,
                border: `1px solid ${colors.hairlineMute}`,
                borderRadius: 9999,
                fontSize: 12,
                color: colors.inkMute,
                letterSpacing: "-0.1px",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 9999,
                  background: colors.steel,
                }}
              />
              No active donation in flight.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorDiagnosticCard({ diagnostic }: { diagnostic: string }) {
  return (
    <section
      style={{ maxWidth: 1080, margin: "0 auto", padding: "0 32px 32px" }}
    >
      <div
        style={{
          background: colors.ink,
          color: "#ffffff",
          borderRadius: 12,
          padding: 28,
          display: "flex",
          flexDirection: "row",
          gap: 32,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 280, maxWidth: 460 }}>
          <EyebrowLabel color="rgba(255,255,255,0.5)">
            For the curious
          </EyebrowLabel>
          <h3
            style={{
              margin: "8px 0 8px",
              fontSize: 20,
              fontWeight: 300,
              letterSpacing: "-0.2px",
              color: "#ffffff",
            }}
          >
            Diagnostic
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "-0.1px",
              lineHeight: 1.55,
            }}
          >
            If you contact support, paste this digest. It points us at the
            exact server log line &mdash; no back-and-forth, no &ldquo;what
            were you doing.&rdquo;
          </p>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 280,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "14px 18px",
            fontFamily:
              '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
            fontSize: 12,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.2px",
            fontFeatureSettings: '"tnum","ss01"',
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {diagnostic}
          </span>
          <CopyButton value={diagnostic} label="Copy" />
        </div>
      </div>
    </section>
  );
}

function ErrorFooter() {
  return (
    <footer
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: "8px 32px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.inkMute,
          fontSize: 12,
          letterSpacing: "-0.1px",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 16,
          borderTop: `1px solid ${colors.hairline}`,
        }}
      >
        <Wordmark size={12} color={colors.inkMute} />
        <div style={{ display: "flex", gap: 18 }}>
          <a
            href={ISSUES_URL}
            rel="noopener noreferrer"
            target="_blank"
            style={{ color: colors.primary, textDecoration: "none" }}
          >
            Report a problem
          </a>
        </div>
      </div>
    </footer>
  );
}
