import { Mono } from "@/components/ui/Mono";
import { deriveMonogram } from "@/lib/receipt/format";
import { Wordmark } from "@/components/brand/Wordmark";
import { colors } from "@/lib/tokens";
import type { ReceiptData } from "@/types/receipt";

interface HeroProps {
  data: ReceiptData;
}

export function Hero({ data }: HeroProps) {
  return (
    <section
      style={{
        position: "relative",
        paddingTop: 96,
        paddingBottom: 88,
        paddingLeft: 64,
        paddingRight: 64,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-200px -200px auto -200px",
          height: 520,
          background:
            "radial-gradient(60% 80% at 20% 30%, rgba(245,233,212,0.55), transparent 60%), radial-gradient(50% 70% at 80% 20%, rgba(249,107,238,0.10), transparent 60%), radial-gradient(60% 80% at 60% 40%, rgba(83,58,253,0.10), transparent 65%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "absolute", top: 32, left: 64, zIndex: 2 }}>
        <Wordmark size={15} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 64,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: colors.inkMute,
            letterSpacing: "-0.1px",
          }}
        >
          Receipt
        </span>
        <Mono size={12} color={colors.inkMute}>
          {data.txidShort}
        </Mono>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: colors.canvas,
            border: `1px solid ${colors.hairline}`,
            borderRadius: 9999,
            marginBottom: 40,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: colors.primary,
              boxShadow: "0 0 0 4px rgba(83,58,253,0.12)",
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: colors.ink,
              letterSpacing: "-0.1px",
            }}
          >
            Verified on-chain · {data.confirmations} confirmations
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: "-1.4px",
            lineHeight: 1.05,
            color: colors.ink,
            textWrap: "pretty",
          }}
        >
          Anonymous donor gave{" "}
          <span
            style={{
              fontFeatureSettings: '"tnum","ss01"',
              letterSpacing: "-1.4px",
              color: colors.ink,
              fontWeight: 300,
            }}
          >
            ${data.amount}
          </span>{" "}
          to{" "}
          <span
            style={{
              fontWeight: 300,
              color: colors.ink,
              backgroundImage:
                "linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)",
            }}
          >
            {data.charity}
          </span>
          .
        </h1>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            color: colors.inkMute,
            fontSize: 15,
            letterSpacing: "-0.1px",
            fontFeatureSettings: '"tnum","ss01"',
          }}
        >
          <span>{data.date}</span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: 9999,
              background: "#a8c3de",
            }}
          />
          <span>Settled on {data.network}</span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: 9999,
              background: "#a8c3de",
            }}
          />
          <span>{data.time}</span>
        </div>

        <div
          style={{
            marginTop: 56,
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
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: "linear-gradient(135deg, #1c1e54 0%, #533afd 100%)",
              color: colors.canvas,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.05em",
            }}
          >
            {deriveMonogram(data.charity)}
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: 13,
                color: colors.ink,
                letterSpacing: "-0.1px",
              }}
            >
              {data.charity}
            </div>
            <div
              style={{
                fontSize: 11,
                color: colors.inkMute,
                letterSpacing: "-0.1px",
                fontFeatureSettings: '"tnum","ss01"',
              }}
            >
              EIN {data.ein} · 501(c)(3)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
