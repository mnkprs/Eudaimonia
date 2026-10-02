import { ArrowRight } from "@/components/ui/ArrowRight";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PillButton } from "@/components/ui/PillButton";

interface ClosingCTAProps {
  /** Path of a real sample receipt; the secondary link is hidden while there is none. */
  exampleReceiptHref?: string | null;
}

export function ClosingCTA({ exampleReceiptHref = null }: ClosingCTAProps = {}) {
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className="bg-white px-4 py-24 sm:px-6 lg:px-16"
    >
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-2xl bg-ink px-8 py-16 text-white sm:px-12 lg:px-16 lg:py-[72px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[120px] -top-[100px] h-[480px] w-[480px] rounded-full bg-iris/40 blur-[30px]"
        />
        <div className="relative max-w-[640px]">
          <EyebrowLabel color="#a8c3de">Give once</EyebrowLabel>
          <h2
            id="closing-cta-heading"
            className="mt-3 text-3xl font-light leading-[1.05] text-white sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: "-0.96px", textWrap: "pretty" }}
          >
            One dollar in.{" "}
            <span className="bg-[linear-gradient(transparent_68%,rgba(102,94,253,0.45)_68%,rgba(102,94,253,0.45)_92%,transparent_92%)]">
              One receipt out.
            </span>
          </h2>
          <p
            className="mt-5 max-w-[480px] text-base font-light leading-[1.55] text-[#c7d1de]"
            style={{ letterSpacing: "-0.1px" }}
          >
            Pick a cause and send what you can. The receipt is published before
            you finish reading it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PillButton variant="primary" size="lg" href="#causes">
              Choose a cause <ArrowRight color="#fff" />
            </PillButton>
            {exampleReceiptHref && (
              <a
                href={exampleReceiptHref}
                className="inline-flex items-center gap-1 px-4 py-2.5 text-[15px] text-white/85 no-underline hover:text-white"
                style={{ letterSpacing: "-0.1px" }}
              >
                See a receipt first <ArrowRight color="currentColor" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
