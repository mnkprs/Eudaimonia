/**
 * Pure state machine for the checkout form. Extracted from CheckoutForm.tsx so
 * the reducer and the derived-error selectors can be unit-tested in a node
 * environment (the project test runner has no DOM, so click-driven assertions
 * are not available — see vitest.config.ts).
 *
 * Decisions encoded here:
 * - Errors stay hidden until `submitted === true` (first submit attempt). After
 *   that, errors update live as the donor edits — see selectAmountError /
 *   selectEmailError.
 * - SUBMIT_FAILURE preserves all donor data so they can retry without
 *   re-typing. The CTA re-enables (status returns to 'error', which the
 *   selectIsSubmittable predicate treats as submittable).
 */

import { ONRAMP_POLICY, type CheckoutPolicy } from "@/lib/checkout/policy";
import { validateAmount, validateEmail } from "@/lib/checkout/validation";
import type { CheckoutPayload } from "@/types/checkout";

export type SubmitStatus = "idle" | "submitting" | "error";

export interface CheckoutFormState {
  readonly amountCents: number;
  readonly customMode: boolean;
  readonly email: string;
  readonly note: string;
  readonly noteOpen: boolean;
  /** Flips to true on the first submit click; gates error visibility. */
  readonly submitted: boolean;
  readonly status: SubmitStatus;
  /** Top-level error from the most recent onSubmit rejection. */
  readonly submitError: string | null;
}

export type CheckoutFormAction =
  | { type: "SET_AMOUNT"; cents: number }
  | { type: "SET_CUSTOM_MODE"; custom: boolean }
  | { type: "SET_EMAIL"; email: string }
  | { type: "SET_NOTE"; note: string }
  | { type: "SET_NOTE_OPEN"; open: boolean }
  | { type: "SUBMIT_ATTEMPT" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_FAILURE"; error: string }
  | { type: "SUBMIT_SUCCESS" };

export const INITIAL_FORM_STATE: CheckoutFormState = {
  amountCents: 0,
  customMode: false,
  email: "",
  note: "",
  noteOpen: false,
  submitted: false,
  status: "idle",
  submitError: null,
};

/** Initial state for a policy; the demo preselects a preset, on-ramp starts empty. */
export function createInitialFormState(policy: CheckoutPolicy): CheckoutFormState {
  return { ...INITIAL_FORM_STATE, amountCents: policy.initialAmountCents };
}

function amountResult(state: CheckoutFormState, policy: CheckoutPolicy) {
  // The reducer stores cents; validateAmount accepts a numeric dollar amount.
  return validateAmount(state.amountCents / 100, {
    maxCents: policy.maxAmountCents,
  });
}

export function checkoutFormReducer(
  state: CheckoutFormState,
  action: CheckoutFormAction,
): CheckoutFormState {
  switch (action.type) {
    case "SET_AMOUNT":
      return { ...state, amountCents: action.cents };
    case "SET_CUSTOM_MODE":
      return { ...state, customMode: action.custom };
    case "SET_EMAIL":
      return { ...state, email: action.email };
    case "SET_NOTE":
      return { ...state, note: action.note };
    case "SET_NOTE_OPEN":
      return { ...state, noteOpen: action.open };
    case "SUBMIT_ATTEMPT":
      return { ...state, submitted: true };
    case "SUBMIT_START":
      return { ...state, status: "submitting", submitError: null };
    case "SUBMIT_FAILURE":
      return { ...state, status: "error", submitError: action.error };
    case "SUBMIT_SUCCESS":
      return { ...state, status: "idle", submitError: null };
  }
}

export function selectAmountError(
  state: CheckoutFormState,
  policy: CheckoutPolicy = ONRAMP_POLICY,
): string | undefined {
  if (!state.submitted) return undefined;
  const result = amountResult(state, policy);
  return result.ok ? undefined : result.error;
}

export function selectEmailError(
  state: CheckoutFormState,
  policy: CheckoutPolicy = ONRAMP_POLICY,
): string | undefined {
  if (!policy.collectEmail || !state.submitted) return undefined;
  const result = validateEmail(state.email);
  return result.ok ? undefined : result.error;
}

export function selectIsSubmittable(
  state: CheckoutFormState,
  policy: CheckoutPolicy = ONRAMP_POLICY,
): boolean {
  if (state.status === "submitting") return false;
  // The amount is the primary submission gate — without a valid amount there is
  // nothing to donate. Email validity stays a soft gate so donors can click and
  // discover the inline error per Phase 7 spec.
  return amountResult(state, policy).ok;
}

/**
 * Build a normalized {@link CheckoutPayload} ready to hand to onSubmit, or
 * return null when validation fails. Centralizing this here keeps the
 * component free of branching on validation result shapes.
 */
export function selectPayload(
  state: CheckoutFormState,
  campaignId: string,
  policy: CheckoutPolicy = ONRAMP_POLICY,
): CheckoutPayload | null {
  const amount = amountResult(state, policy);
  if (!amount.ok) return null;

  // The demo collects no donor data: empty email, no note.
  if (!policy.collectEmail) {
    return { campaignId, grossCents: amount.value, email: "" };
  }

  const email = validateEmail(state.email);
  if (!email.ok) return null;

  const trimmedNote = state.note.trim();
  const payload: CheckoutPayload = {
    campaignId,
    grossCents: amount.value,
    email: email.value,
    ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
  };
  return payload;
}
