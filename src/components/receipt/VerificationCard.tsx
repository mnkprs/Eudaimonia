import { EndaomentBadge } from "@/components/brand/EndaomentBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { VerifyLink } from "@/components/ui/VerifyLink";
import { colors } from "@/lib/tokens";
import type { ReceiptData } from "@/types/receipt";

interface VerificationCardProps {
  data: ReceiptData;
  /** Render the bottom fee disclosure strip. */
  showFeeStrip?: boolean;
  /**
   * BaseScan URL for the transaction, e.g. "https://basescan.org/tx/0x…".
   * When omitted the "Open on BaseScan" VerifyLink falls back to "#".
   */
  baseScanUrl?: string;
  /**
   * BaseScan URL for the org address. When provided the Endaoment badge in the
   * Proof header becomes an anchor to the on-chain record.
   */
  orgBaseScanUrl?: string;
}

export function VerificationCard({
  data,
  showFeeStrip = true,
  baseScanUrl,
  orgBaseScanUrl,
}: VerificationCardProps) {
  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px 56px" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <EyebrowLabel>Proof</EyebrowLabel>
        <EndaomentBadge size="sm" href={orgBaseScanUrl} />
      </div>
      <div
        style={{
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "2.4fr 1fr 1fr",
        }}
      >
        <div style={{ padding: 28, borderRight: `1px solid ${colors.hairline}` }}>
          <FieldLabel>Transaction hash</FieldLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mono size={13} color={colors.ink}>
              {data.txid}
            </Mono>
            <CopyButton value={data.txid} />
          </div>
          <div style={{ marginTop: 12 }}>
            <VerifyLink label="Open on BaseScan ↗" href={baseScanUrl ?? "#"} />
          </div>
        </div>

        <div style={{ padding: 28, borderRight: `1px solid ${colors.hairline}` }}>
          <FieldLabel>Block</FieldLabel>
          <Num size={22} weight={300} track="-0.3px">
            {data.block}
          </Num>
          <div
            style={{
              fontSize: 12,
              color: colors.inkMute,
              marginTop: 6,
              fontFeatureSettings: '"tnum","ss01"',
            }}
          >
            {data.confirmations} confirmations · final
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <FieldLabel>Network</FieldLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: "#0052ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 9999,
                  background: colors.canvas,
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 14, color: colors.ink, letterSpacing: "-0.1px" }}>
                {data.network}
              </div>
              <div style={{ fontSize: 11, color: colors.inkMute, letterSpacing: "-0.1px" }}>
                Ethereum L2
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFeeStrip && <FeeStrip data={data} />}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: colors.inkMute,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

interface FeeStripProps {
  data: ReceiptData;
}

function FeeStrip({ data }: FeeStripProps) {
  const platformFeeIsZero = data.platformFee === "0.00";
  const charityReceived = computeCharityReceived(data);

  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
        <FeeCell label="Donor paid" value={`$${data.amount}`} />
        <FeeCell label="Network fee" value={`$${data.donorFee} (sponsored)`} />
        <FeeCell label="Endaoment fee" value={`$${data.endaomentFee} (1.5%)`} />
        <FeeCell
          label="Eudaimonia fee"
          value={platformFeeIsZero ? "not active" : `$${data.platformFee} (1%)`}
        />
        <span
          style={{
            paddingLeft: 16,
            borderLeft: `1px solid ${colors.hairline}`,
          }}
        >
          <span style={{ color: colors.inkMute }}>Charity received</span>{" "}
          <strong style={{ color: colors.ink, fontWeight: 400 }}>${charityReceived}</strong>
        </span>
      </div>
    </div>
  );
}

function FeeCell({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span style={{ color: colors.inkMute }}>{label}</span> {value}
    </span>
  );
}

function computeCharityReceived(data: ReceiptData): string {
  const donor = Number(data.amount);
  const endaoment = Number(data.endaomentFee);
  const platform = Number(data.platformFee);
  if (!Number.isFinite(donor) || !Number.isFinite(endaoment) || !Number.isFinite(platform)) {
    return data.amount;
  }
  return (donor - endaoment - platform).toFixed(3);
}
