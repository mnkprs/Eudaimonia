/**
 * Display formatting shared by the receipt bundle and its components.
 * The receipt UI contract is plain decimal strings — components add the `$`.
 */

const MIN_DISPLAY_DECIMALS = 2;

/** "0.029700" → "0.0297", "2.000000" → "2.00": strip trailing zeros, keep ≥ 2 decimals. */
export function trimDecimals(value: string, minDecimals = MIN_DISPLAY_DECIMALS): string {
  const [integer, fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "").padEnd(minDecimals, "0");
  return `${integer}.${trimmed}`;
}

/** Initials for a charity chip: "Direct Relief" → "DR", "Unicef" → "UN". */
export function deriveMonogram(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
