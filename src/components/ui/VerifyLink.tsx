import type { CSSProperties } from "react";

import { colors } from "@/lib/tokens";

interface VerifyLinkProps {
  label?: string;
  /** Explorer URL. Without one there is nothing to verify yet, so the label renders inert. */
  href?: string;
}

const BASE_STYLE: CSSProperties = {
  color: colors.primary,
  fontSize: 12,
  fontWeight: 400,
  textDecoration: "none",
  letterSpacing: "-0.1px",
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
};

const INERT_STYLE: CSSProperties = { ...BASE_STYLE, opacity: 0.5, cursor: "default" };

function ArrowIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path
        d="M2 7L7 2M7 2H3.2M7 2V5.8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VerifyLink({
  label = "Verify on BaseScan",
  href,
}: VerifyLinkProps) {
  if (!href) {
    return (
      <span aria-disabled="true" style={INERT_STYLE}>
        {label}
        <ArrowIcon />
      </span>
    );
  }

  return (
    <a href={href} style={BASE_STYLE}>
      {label}
      <ArrowIcon />
    </a>
  );
}
