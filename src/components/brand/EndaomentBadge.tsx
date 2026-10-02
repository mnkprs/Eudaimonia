import { colors } from "@/lib/tokens";

interface EndaomentBadgeProps {
  /** When provided, wraps the badge in an anchor to e.g. a BaseScan URL. */
  href?: string;
  /** Visual size of the badge. Defaults to "md". */
  size?: "sm" | "md";
  /**
   * "verified" (default) reads "Verified by Endaoment". "testnet-stand-in"
   * reads "Testnet stand-in" for Base Sepolia demos, where the org is a
   * stand-in contract and not a real Endaoment entity.
   */
  variant?: "verified" | "testnet-stand-in";
}

const FONT_SIZE: Record<NonNullable<EndaomentBadgeProps["size"]>, number> = {
  sm: 10,
  md: 12,
};

/**
 * "Verified by Endaoment" trust badge (or "Testnet stand-in" on Base Sepolia).
 *
 * Renders as an `<a>` when `href` is supplied (e.g. a BaseScan org address),
 * or a `<span>` otherwise. Always visible — not decorative — so it carries
 * its own accessible label rather than being aria-hidden.
 *
 * Styled strictly with DESIGN.md tokens: no glow, no neon, no crypto motifs.
 */
export function EndaomentBadge({
  href,
  size = "md",
  variant = "verified",
}: EndaomentBadgeProps) {
  const isStandIn = variant === "testnet-stand-in";
  const fontSize = FONT_SIZE[size];

  const sharedStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: size === "sm" ? "3px 8px" : "4px 10px",
    background: colors.surfaceTint,
    border: `1px solid ${colors.hairline}`,
    borderRadius: 9999,
    fontSize,
    fontWeight: 400,
    color: colors.inkDeep,
    letterSpacing: "0.02em",
    textDecoration: "none",
    cursor: href ? "pointer" : "default",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  };

  const dot = (
    <span
      aria-hidden="true"
      style={{
        width: size === "sm" ? 6 : 7,
        height: size === "sm" ? 6 : 7,
        borderRadius: 9999,
        background: colors.primary,
        flexShrink: 0,
      }}
    />
  );

  const label = isStandIn ? "Testnet stand-in" : "Verified by Endaoment";
  const ariaLabel = href ? `${label} — view on BaseScan` : label;

  const inner = isStandIn ? (
    <>
      {dot}
      <span style={{ color: colors.primary, fontWeight: 500 }}>
        Testnet stand-in
      </span>
    </>
  ) : (
    <>
      {dot}
      <span style={{ color: colors.inkMute }}>Verified by</span>
      {" "}
      <span style={{ color: colors.primary, fontWeight: 500 }}>Endaoment</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        style={sharedStyle}
      >
        {inner}
      </a>
    );
  }

  return (
    <span aria-label={ariaLabel} style={sharedStyle}>
      {inner}
    </span>
  );
}
