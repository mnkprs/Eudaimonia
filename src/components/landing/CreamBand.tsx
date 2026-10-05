import { ArrowRight } from "@/components/ui/ArrowRight";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PillButton } from "@/components/ui/PillButton";

interface CreamBandProps {
  /** Path of a real sample receipt; the CTA stays disabled while there is none. */
  exampleReceiptHref?: string | null;
}

export function CreamBand({ exampleReceiptHref = null }: CreamBandProps = {}) {
  return (
    <section
      aria-labelledby="cream-band-heading"
      className="bg-white px-4 pb-24 sm:px-6 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px] rounded-2xl bg-cream px-8 py-14 sm:px-12 lg:px-14 lg:py-16">
        <div className="max-w-[640px]">
          <EyebrowLabel color="#7a4a14">The wedge</EyebrowLabel>
          <h2
            id="cream-band-heading"
            className="mt-3 text-3xl font-light leading-[1.08] text-ink sm:text-4xl lg:text-[42px]"
            style={{ letterSpacing: "-0.84px", textWrap: "pretty" }}
          >
            Every donation gets a receipt you can share, screenshot, and verify
            yourself.
          </h2>
          <p
            className="mt-5 max-w-[540px] text-base font-light leading-[1.55] text-slate"
            style={{ letterSpacing: "-0.1px" }}
          >
            The receipt isn’t a PDF we email — it’s a public page on Base.
            Anyone with the link can see exactly which contract held the funds
            and at what second they arrived. That is the only “crypto” you’ll
            ever need to know.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <PillButton
              variant="dark"
              href={exampleReceiptHref ?? "#receipt-example"}
              disabled={exampleReceiptHref === null}
            >
              See an example receipt <ArrowRight color="#fff" />
            </PillButton>
            <PillButton variant="ghost" href="/fee-policy">
              Read the fee policy <ArrowRight />
            </PillButton>
          </div>
        </div>
      </div>
    </section>
  );
}
