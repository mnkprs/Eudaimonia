import Link from "next/link";

import { BaseMark } from "@/components/brand/BaseMark";
import { CharityAvatar } from "@/components/brand/CharityAvatar";
import { GradientMesh } from "@/components/brand/GradientMesh";
import { Wordmark } from "@/components/brand/Wordmark";
import { LiveTracker } from "@/components/receipt/LiveTracker";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { PillButton } from "@/components/ui/PillButton";
import {
  computeDonationSplit,
  formatUsdc,
  type LiveStage,
} from "@/lib/onramp/live-stages";
import type { ProcessingView } from "@/lib/onramp/processing-view";
import { ISSUES_URL } from "@/lib/links";
import { colors } from "@/lib/tokens";

/**
 * Live processing screen (Epic 5, Screen 1) — presentational composition.
 *
 * Pure view: takes a resolved {@link ProcessingView}, the live `stages`, and the
 * current stage index, and renders hero → tracker → stay-informed → skeleton
 * receipt → footer. All polling/redirect lives in `ProcessingClient`.
 *
 * Ported from `designs/.../screen-processing.jsx`. Responsive structure uses
 * Tailwind breakpoints; static visual detail uses inline styles keyed off the
 * `colors` tokens, matching the receipt page's mix.
 */

const STEEL_DOT = (
  <span
    aria-hidden="true"
    style={{
      width: 3,
      height: 3,
      borderRadius: 9999,
      background: colors.steel,
      display: "inline-block",
    }}
  />
);

interface ProcessingScreenProps {
  view: ProcessingView;
  stages: LiveStage[];
  currentStage: number;
  /** When the session failed, the hero drops its live framing for interrupted
   * copy. Full per-outcome failure UI is Screen 2 — this only de-conflicts the
   * hero from the tracker's failed stage on the shared route. */
  isFailed?: boolean;
}

export function ProcessingScreen({
  view,
  stages,
  currentStage,
  isFailed = false,
}: ProcessingScreenProps) {
  return (
    <div
      style={{
        background: colors.canvas,
        color: colors.ink,
        fontWeight: 300,
        fontFeatureSettings: '"ss01"',
        minHeight: "100%",
      }}
    >
      <Hero view={view} currentStage={currentStage} isFailed={isFailed} />
      <TrackerSection stages={stages} />
      <StayInformedCard donorEmailMasked={view.donorEmailMasked} />
      <SkeletonReceiptPreview grossCents={view.grossCents} />
      <Footer sessionId={view.sessionId} />
    </div>
  );
}

function Hero({
  view,
  currentStage,
  isFailed,
}: {
  view: ProcessingView;
  currentStage: number;
  isFailed: boolean;
}) {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-8 text-left md:px-16 md:pt-[88px] md:pb-14 md:text-center">
      <GradientMesh height={520} />

      <div className="absolute left-6 right-6 top-5 z-[2] flex items-center justify-between md:left-16 md:right-16 md:top-7">
        <Wordmark size={15} />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${isFailed ? colors.urgentSoft : colors.hairline}`,
            backdropFilter: "blur(6px)",
            borderRadius: 9999,
            fontSize: 11,
            letterSpacing: "-0.1px",
          }}
        >
          <span
            data-euda-motion={isFailed ? undefined : ""}
            style={{
              width: 5,
              height: 5,
              borderRadius: 9999,
              background: isFailed ? colors.urgent : colors.primary,
              boxShadow: isFailed ? "none" : "0 0 0 3px rgba(83,58,253,0.18)",
              animation: isFailed
                ? "none"
                : "euda-dot-pulse 1.2s ease-in-out infinite",
            }}
          />
          <span style={{ color: colors.ink }}>
            {isFailed ? "Interrupted" : "Settling on Base"}
          </span>
        </span>
      </div>

      <div className="relative z-[1] mx-auto max-w-[980px]">
        <div
          className="mb-5 md:mb-8"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: colors.canvas,
            border: `1px solid ${colors.hairline}`,
            borderRadius: 9999,
          }}
        >
          <EyebrowLabel color={isFailed ? colors.urgent : colors.irisPress}>
            {isFailed
              ? `Interrupted at step ${currentStage} of 5`
              : `In progress · Step ${currentStage} of 5`}
          </EyebrowLabel>
        </div>

        <h1
          className="m-0 text-[30px] leading-[1.05] tracking-[-0.6px] md:text-[48px] md:tracking-[-0.96px]"
          style={{ fontWeight: 300, color: colors.ink, textWrap: "pretty" }}
        >
          Your{" "}
          <span style={{ fontFeatureSettings: '"tnum","ss01"' }}>
            ${view.amountDisplay}
          </span>{" "}
          is on its way to{" "}
          <span
            style={{
              fontWeight: 300,
              backgroundImage:
                "linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)",
            }}
          >
            {view.charityName}
          </span>
          .
        </h1>

        <div
          className="mt-4 flex flex-wrap items-center justify-start gap-[10px] text-[13px] md:mt-[22px] md:justify-center md:gap-[18px] md:text-[15px]"
          style={{
            color: colors.inkMute,
            letterSpacing: "-0.1px",
            fontFeatureSettings: '"tnum","ss01"',
          }}
        >
          <span>Started {view.startedAt}</span>
          {STEEL_DOT}
          <span>Usually 6–12 seconds</span>
          {STEEL_DOT}
          <span>You can close this tab</span>
        </div>

        <div
          className="mt-6 md:mt-10"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px 10px 12px",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(6px)",
            border: `1px solid ${colors.hairline}`,
            borderRadius: 9999,
          }}
        >
          <CharityAvatar initials={view.charityInitials} size={28} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, color: colors.ink, letterSpacing: "-0.1px" }}>
              {view.charityName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: colors.inkMute,
                letterSpacing: "-0.1px",
                fontFeatureSettings: '"tnum","ss01"',
              }}
            >
              {`EIN ${view.ein} · 501(c)(3)`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackerSection({ stages }: { stages: LiveStage[] }) {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pt-2 pb-8 md:px-16 md:pt-6 md:pb-16">
      <div className="mb-[18px] flex flex-col items-start gap-[6px] md:mb-8 md:flex-row md:items-baseline md:justify-between md:gap-0">
        <div>
          <EyebrowLabel>The path</EyebrowLabel>
          <h2
            className="m-0 mt-2 text-[20px] md:text-[26px]"
            style={{
              fontWeight: 300,
              letterSpacing: "-0.26px",
              color: colors.ink,
            }}
          >
            Where your dollar is, right now.
          </h2>
        </div>
        <div style={{ fontSize: 13, color: colors.inkMute, letterSpacing: "-0.1px" }}>
          Live · refreshing on-chain
        </div>
      </div>

      <LiveTracker stages={stages} />
    </section>
  );
}

function StayInformedCard({ donorEmailMasked }: { donorEmailMasked: string }) {
  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-8 md:px-16 md:pb-14">
      <div
        className="flex flex-col items-start justify-between gap-[18px] p-[22px] md:flex-row md:items-center md:gap-6 md:p-7"
        style={{ background: colors.cream, borderRadius: 12 }}
      >
        <div style={{ maxWidth: 620 }}>
          <EyebrowLabel color={colors.inkDeep}>If you have to go</EyebrowLabel>
          <h3
            className="mt-2 mb-[6px] text-[18px] md:text-[22px]"
            style={{
              fontWeight: 300,
              letterSpacing: "-0.22px",
              color: colors.ink,
            }}
          >
            We’ll email you the receipt when it’s ready.
          </h3>
          <p
            className="m-0 text-[13px] md:text-[14px]"
            style={{
              color: colors.inkDeep,
              letterSpacing: "-0.1px",
              lineHeight: 1.5,
            }}
          >
            Closing this tab won’t cancel the donation. The receipt finishes
            settling on-chain either way. We’ll send it to{" "}
            <strong style={{ color: colors.ink, fontWeight: 400 }}>
              {donorEmailMasked}
            </strong>
            .
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <PillButton variant="ghost" size="md" type="button">
            Resend link
          </PillButton>
          <PillButton variant="dark" size="md" type="button">
            Got it
          </PillButton>
        </div>
      </div>
    </section>
  );
}

function SkeletonReceiptPreview({ grossCents }: { grossCents: number }) {
  const split = computeDonationSplit(grossCents);
  const skeletonBar: React.CSSProperties = {
    background: colors.hairlineMute,
    borderRadius: 4,
    animation: "euda-skel 1.6s ease-in-out infinite",
  };

  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-14 md:px-16 md:pb-[88px]">
      <div style={{ marginBottom: 16 }}>
        <EyebrowLabel>Coming up</EyebrowLabel>
        <h3
          className="m-0 mt-2 text-[18px] md:text-[22px]"
          style={{ fontWeight: 300, letterSpacing: "-0.22px", color: colors.ink }}
        >
          Your shareable receipt.
        </h3>
      </div>

      <div
        className="grid grid-cols-1 gap-[18px] p-[22px] md:grid-cols-[2.4fr_1fr_1fr] md:gap-0 md:p-8"
        style={{
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 12,
        }}
      >
        <div
          className="border-b pb-[18px] md:border-b-0 md:border-r md:pr-8 md:pb-0"
          style={{ borderColor: colors.hairline }}
        >
          <div
            style={{
              fontSize: 11,
              color: colors.inkMute,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Transaction hash
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div data-euda-motion="" style={{ ...skeletonBar, height: 14, width: "70%" }} />
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
            }}
          >
            Receipt URL appears once published
          </div>
        </div>

        <div
          className="border-b pb-[18px] md:border-b-0 md:border-r md:px-8 md:pb-0"
          style={{ borderColor: colors.hairline }}
        >
          <div
            style={{
              fontSize: 11,
              color: colors.inkMute,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Block
          </div>
          <div data-euda-motion="" style={{ ...skeletonBar, height: 22, width: 96 }} />
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
            }}
          >
            Awaiting confirmations
          </div>
        </div>

        <div className="md:pl-8">
          <div
            style={{
              fontSize: 11,
              color: colors.inkMute,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Network
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BaseMark size={28} />
            <div>
              <div style={{ fontSize: 14, color: colors.ink, letterSpacing: "-0.1px" }}>
                Base
              </div>
              <div style={{ fontSize: 11, color: colors.inkMute, letterSpacing: "-0.1px" }}>
                Ethereum L2
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-[18px] hidden items-center justify-between md:flex"
        style={{
          padding: "14px 20px",
          background: colors.surfaceTint,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 8,
          fontSize: 12,
          color: colors.inkDeep,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "center",
            fontFeatureSettings: '"tnum","ss01"',
          }}
        >
          <span>
            <span style={{ color: colors.inkMute }}>Donor paid</span> $
            {formatUsdc(split.grossMicros, 2)}
          </span>
          <span>
            <span style={{ color: colors.inkMute }}>Eudaimonia fee</span> $
            {formatUsdc(split.eudaimoniaFeeMicros, 2)} (1%)
          </span>
          <span>
            <span style={{ color: colors.inkMute }}>Endaoment fee</span> $
            {formatUsdc(split.endaomentFeeMicros, 2)} (1.5%)
          </span>
          <span style={{ paddingLeft: 16, borderLeft: `1px solid ${colors.hairline}` }}>
            <span style={{ color: colors.inkMute }}>Charity will receive</span>{" "}
            <strong style={{ color: colors.ink, fontWeight: 400 }}>
              ${formatUsdc(split.charityMicros, 3)}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer({ sessionId }: { sessionId: string }) {
  return (
    <footer className="mx-auto max-w-[1240px] px-6 pt-4 pb-10 md:px-16 md:pt-6 md:pb-14">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.inkMute,
          fontSize: 13,
          letterSpacing: "-0.1px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Wordmark size={12} color={colors.inkMute} />
        <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
          <Link href="/#how-it-works" style={{ color: colors.primary, textDecoration: "none" }}>
            What is Eudaimonia?
          </Link>
          <a
            href={ISSUES_URL}
            rel="noopener noreferrer"
            target="_blank"
            style={{ color: colors.inkMute, textDecoration: "none" }}
          >
            Report a problem
          </a>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: colors.inkMute,
          letterSpacing: "-0.1px",
          maxWidth: 720,
          lineHeight: 1.5,
        }}
      >
        Session{" "}
        <Mono size={11} color={colors.inkMute}>
          {sessionId}
        </Mono>{" "}
        · Eudaimonia is a non-custodial donation router. Your funds move on-chain
        through immutable contracts.
      </div>
    </footer>
  );
}
