import { ArrowRight } from "@/components/ui/ArrowRight";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { colors } from "@/lib/tokens";

const TX_HASH = "0xdc671195…7a78ed";

const STAGES = [
  { label: "Donated", time: "17:34:01" },
  { label: "Converted", time: "17:34:02" },
  { label: "Routed", time: "17:34:04" },
  { label: "Settled", time: "17:34:07" },
] as const;

function MiniTracker({ exampleReceiptHref }: { exampleReceiptHref: string | null }) {
  return (
    <div>
      <div className="relative grid grid-cols-4 gap-2">
        <div
          aria-hidden="true"
          className="absolute left-[calc(12.5%+6px)] right-[calc(12.5%+6px)] top-[11px] h-px"
          style={{ background: colors.primary, opacity: 0.35 }}
        />
        {STAGES.map((stage) => (
          <div key={stage.label} className="relative text-center">
            <div
              className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-white"
              style={{ borderColor: colors.primary }}
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colors.primary }}
              />
            </div>
            <div className="mt-2.5 text-xs tracking-[-0.1px] text-ink">
              {stage.label}
            </div>
            <div
              className="mt-0.5 text-[10px] text-mute"
              style={{ fontFeatureSettings: '"tnum","ss01"' }}
            >
              {stage.time}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[22px] flex items-center justify-between gap-3 rounded-lg border border-rule bg-tint px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
            style={{ background: "#0052ff" }}
          >
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <Mono size={11} color={colors.ink}>
            {TX_HASH}
          </Mono>
        </div>
        {exampleReceiptHref ? (
          <a
            href={exampleReceiptHref}
            className="inline-flex items-center gap-1 text-xs tracking-[-0.1px] no-underline"
            style={{ color: colors.primary }}
          >
            Open example receipt <ArrowRight color={colors.primary} />
          </a>
        ) : (
          <a
            href="#example-receipt"
            aria-disabled="true"
            className="inline-flex items-center gap-1 text-xs tracking-[-0.1px] no-underline aria-disabled:opacity-60"
            style={{ color: colors.primary }}
          >
            Open on BaseScan <ArrowRight color={colors.primary} />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * A static, decorative product mock that mirrors the receipt page's vocabulary
 * (browser chrome → donor headline → fee split → 4-stage tracker). It is the
 * hero's depth medium — the brand's argument is "look at the actual product."
 */
interface HeroReceiptMockupProps {
  /** Path of a real sample receipt; the mock's link stays inert while there is none. */
  exampleReceiptHref?: string | null;
}

export function HeroReceiptMockup({ exampleReceiptHref = null }: HeroReceiptMockupProps = {}) {
  return (
    <div
      className="mt-16 max-w-[1080px] overflow-hidden rounded-2xl border border-rule bg-white"
      style={{
        boxShadow:
          "0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)",
      }}
    >
      <div className="flex items-center gap-3 border-b border-rule-soft bg-surface px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
          <span className="h-2.5 w-2.5 rounded-full bg-rule" />
        </div>
        <Mono size={11} color={colors.inkMute}>
          eudaimonia.app/receipt/{TX_HASH}
        </Mono>
        <span className="ml-auto text-[11px] tracking-[-0.1px] text-mute">
          Verified · 15,041,902 confirmations
        </span>
      </div>

      <div className="grid items-center gap-12 px-6 py-9 sm:px-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <EyebrowLabel>Receipt · May 30, 2025</EyebrowLabel>
          <div className="mt-3 text-2xl font-light leading-[1.15] tracking-[-0.4px] text-ink">
            Anonymous donor gave <Num size={28} weight={300} track="-0.4px">$1.00</Num> to
            Black Women in Blockchain Inc.
          </div>
          <div
            className="mt-3.5 text-[13px] tracking-[-0.1px] text-mute"
            style={{ fontFeatureSettings: '"tnum","ss01"' }}
          >
            Settled on Base · Endaoment Org Fund · EIN 87-1055621
          </div>

          <div
            className="mt-5 flex gap-6 text-xs text-slate"
            style={{ fontFeatureSettings: '"tnum","ss01"' }}
          >
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-mute">
                Donor paid
              </div>
              <Num size={18} track="-0.3px">$1.00</Num>
            </div>
            <div className="w-px bg-rule" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-mute">
                Eudaimonia fee
              </div>
              <Num size={18} track="-0.3px" color={colors.inkMute}>$0.01</Num>
            </div>
            <div className="w-px bg-rule" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-mute">
                Charity received
              </div>
              <Num size={18} track="-0.3px">$0.985</Num>
            </div>
          </div>
        </div>

        <MiniTracker exampleReceiptHref={exampleReceiptHref} />
      </div>
    </div>
  );
}
