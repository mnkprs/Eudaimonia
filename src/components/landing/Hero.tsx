import { Fragment } from "react";

import { CycleWord } from "@/components/landing/CycleWord";
import { HeroReceiptMockup } from "@/components/landing/HeroReceiptMockup";
import { MeaningsCard } from "@/components/landing/MeaningsCard";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PillButton } from "@/components/ui/PillButton";
import { colors } from "@/lib/tokens";

interface HeroProps {
  /** Path of a real sample receipt; the CTA stays disabled while there is none. */
  exampleReceiptHref?: string | null;
  /** Testnet demo mode: the trust row must not promise cards or tax receipts. */
  isDemo?: boolean;
}

const LIVE_TRUST_SIGNALS = [
  "$1 minimum",
  "Card · Apple Pay · Google Pay",
  "501(c)(3) tax-deductible via Endaoment",
] as const;

const DEMO_TRUST_SIGNALS = [
  "$1 test donations",
  "Testnet demo — no real money",
  "Test USDC on Base Sepolia",
] as const;

export function Hero({ exampleReceiptHref = null, isDemo = false }: HeroProps = {}) {
  const trustSignals = isDemo ? DEMO_TRUST_SIGNALS : LIVE_TRUST_SIGNALS;

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-40 sm:px-6 lg:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-40 top-[-160px] z-0 h-[720px] blur-[36px]"
        style={{
          background: `
            radial-gradient(55% 70% at 18% 25%, rgba(245,233,212,0.65), transparent 60%),
            radial-gradient(45% 65% at 78% 18%, rgba(249,107,238,0.14), transparent 60%),
            radial-gradient(55% 75% at 52% 38%, rgba(83,58,253,0.13), transparent 65%),
            radial-gradient(40% 60% at 92% 50%, rgba(234,34,97,0.08), transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.85fr] lg:gap-16">
          {/* LEFT — the H1 statement is the hero */}
          <div>
            <EyebrowLabel color={colors.ink}>
              A donation platform · Base L2 · Endaoment-routed
            </EyebrowLabel>

            <h1
              className="mt-6 text-5xl font-light leading-[1.0] text-ink sm:text-7xl lg:text-[96px]"
              style={{ letterSpacing: "-3px", textWrap: "pretty" }}
            >
              Give once.
              <br />
              See exactly{" "}
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(transparent 70%, rgba(83,58,253,0.18) 70%, rgba(83,58,253,0.18) 92%, transparent 92%)",
                }}
              >
                where it goes.
              </span>
            </h1>

            {/* Inline rotating chip — the name as a living thing */}
            <div
              className="mt-9 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-base text-mute"
              style={{ letterSpacing: "-0.1px" }}
            >
              <span>We call it</span>
              <span className="inline-flex min-w-[220px] items-baseline justify-center overflow-hidden rounded-full border border-rule bg-white px-3 py-1">
                <CycleWord />
              </span>
              <span aria-hidden="true">—</span>
              <span>so it pays back the trust it asks for.</span>
            </div>

            <div className="mt-11 flex flex-wrap items-center gap-3">
              <PillButton
                href="#causes"
                variant="primary"
                size="lg"
                icon={<ArrowRight color="#fff" />}
              >
                Choose a cause
              </PillButton>
              <PillButton
                href={exampleReceiptHref ?? "#example-receipt"}
                variant="secondary"
                size="lg"
                disabled={exampleReceiptHref === null}
                icon={<ArrowRight color="currentColor" />}
              >
                See an example receipt
              </PillButton>
            </div>

            <div
              className="mt-8 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[13px] text-mute"
              style={{
                letterSpacing: "-0.1px",
                fontFeatureSettings: '"tnum","ss01"',
              }}
            >
              {trustSignals.map((signal, index) => (
                <Fragment key={signal}>
                  {index > 0 && (
                    <span className="inline-block h-[3px] w-[3px] rounded-full bg-steel" />
                  )}
                  <span>{signal}</span>
                </Fragment>
              ))}
            </div>
          </div>

          {/* RIGHT — rotating pronunciation / meanings card */}
          <MeaningsCard />
        </div>

        <HeroReceiptMockup exampleReceiptHref={exampleReceiptHref} />
      </div>
    </section>
  );
}
