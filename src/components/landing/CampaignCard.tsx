import { EndaomentBadge } from "@/components/brand/EndaomentBadge";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Num } from "@/components/ui/Num";
import { PillButton } from "@/components/ui/PillButton";
import { StripedPlaceholder } from "@/components/ui/StripedPlaceholder";
import { campaignHref, type Campaign } from "@/lib/campaigns";

export type CampaignCardStats =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "loaded";
      raised: string;
      donors: string;
      receipts: string;
    };

interface CampaignCardProps {
  campaign: Campaign;
  stats?: CampaignCardStats;
}

export function CampaignCard({ campaign, stats }: CampaignCardProps) {
  return (
    <article className="group flex flex-col rounded-xl border border-rule bg-white p-6 shadow-[0_1px_3px_rgba(0,55,112,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,55,112,0.08),0_2px_6px_rgba(0,55,112,0.04)]">
      <StripedPlaceholder
        height={200}
        caption={campaign.photoCaption}
        tint={campaign.swatch2}
        accent={campaign.swatch}
      />

      <div className="mt-5 flex flex-1 flex-col">
        <span
          className="mb-3 inline-flex self-start rounded-full bg-[#eef0fe] px-2 py-[3px] text-[10px] uppercase text-iris-hover"
          style={{ letterSpacing: "0.1em" }}
        >
          {campaign.tag}
        </span>

        <h3
          className="m-0 text-[22px] font-light leading-[1.15] text-ink"
          style={{ letterSpacing: "-0.22px", textWrap: "pretty" }}
        >
          {campaign.name}
        </h3>

        <p
          className="mt-1 text-xs text-mute"
          style={{
            letterSpacing: "-0.1px",
            fontFeatureSettings: '"tnum","ss01"',
          }}
        >
          {`EIN ${campaign.ein} · 501(c)(3)`}
        </p>

        <p
          className="mt-3.5 text-sm font-light leading-[1.5] text-slate"
          style={{ letterSpacing: "-0.1px", textWrap: "pretty" }}
        >
          {campaign.mission}
        </p>

        <div className="mt-3">
          <EndaomentBadge size="sm" />
        </div>

        <StatRow stats={stats} />

        <div className="flex items-center gap-2.5">
          <PillButton
            href={campaignHref(campaign)}
            variant="primary"
            icon={<ArrowRight color="#fff" />}
          >
            Donate
          </PillButton>
        </div>
      </div>
    </article>
  );
}

interface StatRowProps {
  stats?: CampaignCardStats;
}

function StatRow({ stats }: StatRowProps) {
  if (stats?.status === "error") {
    return (
      <div
        role="status"
        className="mt-auto mb-[18px] border-t border-dashed border-rule pt-5 text-xs text-mute"
      >
        Stats unavailable
      </div>
    );
  }

  if (stats === undefined || stats.status === "loading") {
    const isLoading = stats?.status === "loading";
    return (
      <div
        aria-busy={isLoading ? "true" : undefined}
        className="mt-auto mb-[18px] grid grid-cols-3 gap-3 border-t border-dashed border-rule pt-5"
      >
        {["Routed", "Donors", "Receipts"].map((label) => (
          <div key={label}>
            <div
              className="text-[10px] uppercase text-mute"
              style={{ letterSpacing: "0.06em" }}
            >
              {label}
            </div>
            <div
              className="mt-1 h-4 w-16 animate-pulse rounded bg-rule-soft"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-auto mb-[18px] grid grid-cols-3 gap-3 border-t border-dashed border-rule pt-5">
      <Stat label="Routed" value={`$${stats.raised}`} />
      <Stat label="Donors" value={stats.donors} />
      <Stat label="Receipts" value={stats.receipts} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase text-mute"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <Num size={16} weight={300} track="-0.3px">
        {value}
      </Num>
    </div>
  );
}
