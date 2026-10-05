import { EndaomentBadge } from "@/components/brand/EndaomentBadge";
import { deriveMonogram } from "@/lib/receipt/format";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { isTestnetNetwork } from "@/lib/chain";
import { colors } from "@/lib/tokens";
import type { ReceiptData } from "@/types/receipt";

interface CharityCardProps {
  data: ReceiptData;
  /** Two-letter monogram for the avatar tile. Derived from charity name if omitted. */
  monogram?: string;
  /** External link to the charity's site. */
  href?: string;
  /**
   * BaseScan URL for the Endaoment org address. When provided the
   * "Verified by Endaoment" badge becomes an anchor to the on-chain record.
   */
  baseScanUrl?: string;
}

export function CharityCard({ data, monogram, href, baseScanUrl }: CharityCardProps) {
  const initials = monogram ?? deriveMonogram(data.charity);
  const isTestnet = isTestnetNetwork(data.network);

  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px 56px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "88px 1fr auto",
          gap: 28,
          alignItems: "center",
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,55,112,0.08)",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${colors.inkDark} 0%, ${colors.primary} 100%)`,
            color: colors.canvas,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: "-0.4px",
          }}
        >
          {initials}
        </div>

        <div>
          <EyebrowLabel>Recipient</EyebrowLabel>
          <h3
            style={{
              margin: "6px 0 4px",
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: "-0.22px",
              color: colors.ink,
            }}
          >
            {data.charity}
          </h3>
          <div
            style={{
              fontSize: 13,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
              fontFeatureSettings: '"tnum","ss01"',
              marginBottom: 10,
            }}
          >
            {isTestnet
              ? `501(c)(3) · EIN ${data.ein} · Testnet stand-in contract`
              : `501(c)(3) · EIN ${data.ein} · Endaoment Org Fund`}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 300,
              lineHeight: 1.45,
              color: colors.inkDeep,
              maxWidth: 580,
              letterSpacing: "-0.1px",
            }}
          >
            {data.mission}
          </p>
          <div style={{ marginTop: 12 }}>
            <EndaomentBadge
              size="sm"
              href={baseScanUrl}
              variant={isTestnet ? "testnet-stand-in" : "verified"}
            />
          </div>
        </div>

        {href && (
        <a
          href={href}
          rel="noopener noreferrer"
          target={href.startsWith("http") ? "_blank" : undefined}
          style={{
            color: colors.canvas,
            background: colors.primary,
            fontSize: 14,
            fontWeight: 400,
            padding: "8px 16px",
            borderRadius: 9999,
            textDecoration: "none",
            letterSpacing: "-0.1px",
            whiteSpace: "nowrap",
          }}
        >
          Visit charity →
        </a>
        )}
      </div>
    </section>
  );
}
