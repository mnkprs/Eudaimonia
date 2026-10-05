/**
 * Hand-rolled validators for the donor entry form. No new dependencies — these
 * run client-side on every keystroke, so they must be small and synchronous.
 *
 * Each validator returns a {@link ValidationResult} so callers can pattern-
 * match on `ok`. On success, the value is normalized (amount → cents, email →
 * trimmed + lowercased) so downstream code never branches on input shape.
 */

import type { ValidationResult } from "@/types/checkout";

/** Minimum donation: $1.00 = 100 cents. */
export const MIN_AMOUNT_CENTS = 100;

/** Maximum donation: $10,000.00 = 1,000,000 cents. */
export const MAX_AMOUNT_CENTS = 1_000_000;

/**
 * Optional leading sign-free, digits-only with up to two decimals. We reject
 * scientific notation, currency symbols, and stray characters by construction.
 * The `^[0-9]+` arm forbids a bare ".50" or "1." — both common donor typos.
 */
const DOLLAR_AMOUNT_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

/**
 * Pragmatic email pattern. Modeled on the HTML spec's input[type=email]
 * regex; not RFC 5322 (nobody ships RFC 5322 for a checkout). Requires:
 * - at least one local-part character (no leading `@`)
 * - exactly one `@`
 * - a domain with a `.` and a TLD ≥ 2 chars
 * - no whitespace anywhere
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatAmountError(cents: number): string {
  return `Amount cannot exceed ${USD_FORMATTER.format(cents / 100)}.`;
}

export interface ValidateAmountOptions {
  /** Upper bound in cents. Defaults to {@link MAX_AMOUNT_CENTS}. */
  readonly maxCents?: number;
}

/**
 * Parse and validate a donor-entered amount. Accepts either a raw string
 * (from a text input) or a number (from a preset chip). On success, returns
 * the value in integer cents.
 */
export function validateAmount(
  input: string | number,
  options: ValidateAmountOptions = {},
): ValidationResult<number> {
  const maxCents = options.maxCents ?? MAX_AMOUNT_CENTS;
  let cents: number;

  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      return { ok: false, error: "Enter a valid donation amount." };
    }
    cents = Math.round(input * 100);
  } else {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "Enter a donation amount." };
    }
    if (!DOLLAR_AMOUNT_PATTERN.test(trimmed)) {
      return { ok: false, error: "Enter a valid donation amount." };
    }
    // Multiply-then-round, not parseFloat-then-multiply, to dodge classic
    // FP errors like 1.10 * 100 === 110.00000000000001.
    cents = Math.round(Number.parseFloat(trimmed) * 100);
  }

  if (cents < MIN_AMOUNT_CENTS) {
    return {
      ok: false,
      error: `Donation must be at least $${(MIN_AMOUNT_CENTS / 100).toFixed(0)}.`,
    };
  }

  if (cents > maxCents) {
    return { ok: false, error: formatAmountError(maxCents) };
  }

  return { ok: true, value: cents };
}

/**
 * Validate and normalize a donor email. Returns the trimmed, lowercased
 * address on success so the rest of the checkout uses a single canonical
 * form for receipts and storage.
 */
export function validateEmail(input: string): ValidationResult<string> {
  const normalized = input.trim().toLowerCase();

  if (normalized.length === 0) {
    return { ok: false, error: "Email is required for the receipt." };
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  return { ok: true, value: normalized };
}
