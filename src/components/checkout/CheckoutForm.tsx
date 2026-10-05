"use client";

import { useReducer, useRef, type FormEvent } from "react";

import {
  amountBucket,
  shouldTrackAmountEntered,
  trackAmountEntered,
} from "@/lib/analytics/events";
import { AmountSelector } from "@/components/checkout/AmountSelector";
import {
  checkoutFormReducer,
  createInitialFormState,
  selectAmountError,
  selectEmailError,
  selectIsSubmittable,
  selectPayload,
} from "@/components/checkout/checkoutFormState";
import { DonorDetails } from "@/components/checkout/DonorDetails";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PillButton } from "@/components/ui/PillButton";
import { calculateBreakdown } from "@/lib/checkout/fees";
import { ONRAMP_POLICY, type CheckoutPolicy } from "@/lib/checkout/policy";
import type { CheckoutPayload } from "@/types/checkout";

interface CheckoutFormProps {
  /** Campaign id used to stamp the outgoing payload (404 already enforced in the route). */
  campaignId: string;
  /** Hands the validated payload off to the on-ramp. Rejecting surfaces the error region. */
  onSubmit: (payload: CheckoutPayload) => Promise<void>;
  /** Flow-specific rules (presets, email, fees, labels). Defaults to the on-ramp. */
  policy?: CheckoutPolicy;
}

const FORM_LAYOUT =
  "grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:items-start";
const FIELDS_COLUMN = "flex flex-col gap-6";
const SUMMARY_COLUMN = "flex flex-col gap-4";

const ERROR_REGION =
  "rounded-lg border border-urgent/40 bg-urgent/5 px-4 py-3";
const ERROR_TITLE =
  "text-[13px] font-medium tracking-[-0.1px] text-urgent";
const ERROR_BODY =
  "mt-1 text-[12px] font-normal tracking-[-0.1px] text-ink/80";

const FAILURE_REASSURANCE: Readonly<Record<CheckoutPolicy["mode"], string>> = {
  onramp: "your card was not charged.",
  demo: "no test funds were sent.",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return "Unexpected error.";
}

export function CheckoutForm({
  campaignId,
  onSubmit,
  policy = ONRAMP_POLICY,
}: CheckoutFormProps) {
  const [state, dispatch] = useReducer(
    checkoutFormReducer,
    policy,
    createInitialFormState,
  );

  // Debounce `amount_entered` to one event per selection session. Reset when
  // the donor switches between preset chips and the custom input so a fresh
  // custom entry can re-fire. Only a coarse bucket is sent — never raw cents.
  const amountTrackedRef = useRef(false);

  function handleAmountChange(cents: number): void {
    dispatch({ type: "SET_AMOUNT", cents });
    if (shouldTrackAmountEntered(cents, amountTrackedRef.current)) {
      amountTrackedRef.current = true;
      trackAmountEntered(campaignId, amountBucket(cents));
    }
  }

  function handleCustomModeChange(custom: boolean): void {
    amountTrackedRef.current = false;
    dispatch({ type: "SET_CUSTOM_MODE", custom });
  }

  const amountError = selectAmountError(state, policy);
  const emailError = selectEmailError(state, policy);
  const isSubmittable = selectIsSubmittable(state, policy);
  const breakdown = calculateBreakdown(state.amountCents, {
    includeCardProcessing: policy.showCardProcessingFee,
    testnetDemo: policy.mode === "demo",
  });
  const summaryState = state.status === "submitting" ? "submitting" : "ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    dispatch({ type: "SUBMIT_ATTEMPT" });

    const payload = selectPayload(state, campaignId, policy);
    if (!payload) return;

    dispatch({ type: "SUBMIT_START" });
    try {
      await onSubmit(payload);
      dispatch({ type: "SUBMIT_SUCCESS" });
    } catch (error: unknown) {
      dispatch({ type: "SUBMIT_FAILURE", error: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={FORM_LAYOUT}>
      <div className={FIELDS_COLUMN}>
        <AmountSelector
          valueCents={state.amountCents}
          customMode={state.customMode}
          onValueChange={handleAmountChange}
          onCustomModeChange={handleCustomModeChange}
          error={amountError}
          presetsCents={policy.presetsCents}
          allowCustom={policy.allowCustomAmount}
        />

        {policy.collectEmail && (
          <DonorDetails
            email={state.email}
            note={state.note}
            noteOpen={state.noteOpen}
            onEmailChange={(email) => dispatch({ type: "SET_EMAIL", email })}
            onNoteChange={(note) => dispatch({ type: "SET_NOTE", note })}
            onNoteOpenChange={(open) =>
              dispatch({ type: "SET_NOTE_OPEN", open })
            }
            emailError={emailError}
          />
        )}

        {state.submitError && (
          <div role="alert" className={ERROR_REGION}>
            <p className={ERROR_TITLE}>We couldn’t complete your donation.</p>
            <p className={ERROR_BODY}>
              {state.submitError} — {FAILURE_REASSURANCE[policy.mode]} Please try
              again.
            </p>
          </div>
        )}

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isSubmittable}
        >
          {state.status === "submitting"
            ? policy.submittingLabel
            : policy.submitLabel}
        </PillButton>
      </div>

      <div className={SUMMARY_COLUMN}>
        <OrderSummary breakdown={breakdown} state={summaryState} />
      </div>
    </form>
  );
}
