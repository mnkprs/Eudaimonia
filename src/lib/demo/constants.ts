/**
 * Testnet demo donation constants. Shared by the client (checkout presets,
 * validation) and the server (`POST /api/demo/donate` bounds), so this module
 * must stay dependency-free and safe to import in a client bundle.
 *
 * Demo donations move Circle's Base Sepolia test USDC from a server-side demo
 * wallet. Amounts are deliberately tiny so a 20-USDC faucet drip funds many
 * demos — see `prompts/epic-8-testnet-demo-plan.md`.
 */

const CENTS_PER_DOLLAR = 100;

/** USDC has 6 decimals; 1 cent = 10^4 base units. */
const USDC_UNITS_PER_CENT = 10_000n;

export const DEMO_PRESETS_CENTS: readonly number[] = Object.freeze([
  1 * CENTS_PER_DOLLAR,
  2 * CENTS_PER_DOLLAR,
  5 * CENTS_PER_DOLLAR,
]);

/** Smallest demo donation: $1.00. */
export const DEMO_MIN_AMOUNT_CENTS = 1 * CENTS_PER_DOLLAR;

/** Largest demo donation: $5.00. */
export const DEMO_MAX_AMOUNT_CENTS = 5 * CENTS_PER_DOLLAR;

/** True only for one of the demo presets ($1, $2 or $5) — the server's allowlist. */
export function isDemoAmountCents(cents: number): boolean {
  return DEMO_PRESETS_CENTS.includes(cents);
}

/** Integer cents → 6-decimal USDC base units (USDC is pegged 1:1 to USD here). */
export function centsToUsdcUnits(cents: number): bigint {
  if (!Number.isInteger(cents)) {
    throw new Error(`centsToUsdcUnits: cents must be an integer, received ${cents}`);
  }
  return BigInt(cents) * USDC_UNITS_PER_CENT;
}
