import { ArrowRight } from "@/components/ui/ArrowRight";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Num } from "@/components/ui/Num";

export interface Step {
  n: number;
  title: string;
  short: string;
  detail: string;
}

export const STEPS: readonly Step[] = [
  {
    n: 1,
    title: "Pay",
    short: "Card or Apple Pay",
    detail: "Standard checkout. No wallet required. Donor never sees crypto.",
  },
  {
    n: 2,
    title: "Convert",
    short: "USDC on Base",
    detail:
      "Fiat is minted to USDC stablecoin on Base L2. Sub-cent network fees, settled in seconds.",
  },
  {
    n: 3,
    title: "Route",
    short: "1% to Eudaimonia",
    detail:
      "A flat 1% platform fee is taken on-chain and visible in the receipt. Nothing else, ever.",
  },
  {
    n: 4,
    title: "Deliver",
    short: "To charity’s fund",
    detail:
      "Remaining 99% is pushed directly to the charity’s Endaoment Org Fund. No middle account.",
  },
  {
    n: 5,
    title: "Publish",
    short: "Public receipt",
    detail:
      "A shareable receipt is published at eudaimonia.app/receipt/{tx} — immutable, infinitely verifiable.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-tint px-4 py-24 sm:px-6 lg:px-16"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <EyebrowLabel>How it works</EyebrowLabel>
            <h2
              id="how-it-works-heading"
              className="mt-2.5 max-w-[720px] text-3xl font-light leading-[1.1] text-ink sm:text-4xl"
              style={{ letterSpacing: "-0.72px", textWrap: "pretty" }}
            >
              Five seconds. Five steps. Five rows in a public log.
            </h2>
          </div>
          <p
            className="max-w-[320px] text-[13px] text-mute lg:text-right"
            style={{ letterSpacing: "-0.1px" }}
          >
            Hover any step to see what happens. Every step writes to Base —
            none of it lives on a Eudaimonia server.
          </p>
        </div>

        <ol
          className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Donation flow, five steps"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] hidden h-px bg-iris/35 lg:block"
          />
          {STEPS.map((step) => (
            <li key={step.n} className="group/step relative list-none">
              <div className="relative z-10 mb-[22px] flex justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-iris bg-white transition-shadow duration-150 group-hover/step:shadow-[0_0_0_6px_rgba(83,58,253,0.10)]">
                  <Num size={13} weight={400} track="-0.2px" color="#533afd">
                    {step.n}
                  </Num>
                </div>
              </div>
              <div className="min-h-[200px] rounded-xl border border-transparent bg-transparent p-[18px] transition-all duration-150 group-hover/step:border-rule group-hover/step:bg-white group-hover/step:shadow-[0_8px_24px_rgba(0,55,112,0.08),0_2px_6px_rgba(0,55,112,0.04)]">
                <div
                  className="text-lg font-light text-ink"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {step.title}
                </div>
                <div
                  className="mt-1 text-xs text-mute"
                  style={{ letterSpacing: "-0.1px" }}
                >
                  {step.short}
                </div>
                <p
                  className="mt-3.5 text-[13px] font-light leading-[1.5] text-slate"
                  style={{ letterSpacing: "-0.1px" }}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-9 flex flex-col gap-3 rounded-xl border border-rule bg-white px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-slate"
            style={{ letterSpacing: "-0.1px", fontFeatureSettings: '"tnum","ss01"' }}
          >
            <EyebrowLabel color="#0d253d">Fees, in plain sight</EyebrowLabel>
            <span>
              <span className="text-mute">Eudaimonia</span> 1.0%
            </span>
            <span className="text-steel">·</span>
            <span>
              <span className="text-mute">Endaoment</span> 1.5%
            </span>
            <span className="text-steel">·</span>
            <span>
              <span className="text-mute">Card processing</span> ~2.9% + $0.30
            </span>
            <span className="text-steel">·</span>
            <span>
              <span className="text-mute">Network</span> sub-cent
            </span>
          </div>
          <a
            href="/fee-policy"
            className="inline-flex items-center gap-1 text-[13px] text-iris hover:underline"
            style={{ letterSpacing: "-0.1px" }}
          >
            Full fee breakdown <ArrowRight color="currentColor" />
          </a>
        </div>
      </div>
    </section>
  );
}
