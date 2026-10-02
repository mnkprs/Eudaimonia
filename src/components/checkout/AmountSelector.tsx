"use client";

import type { ChangeEvent } from "react";
import { useId } from "react";

import { AmountChip } from "@/components/ui/AmountChip";
import { FieldLabel } from "@/components/ui/FieldLabel";
import {
  DONATION_PRESETS_CENTS,
  formatCentsAsAmountInput,
  parseAmountInputToCents,
} from "@/lib/checkout/presets";

interface AmountSelectorProps {
  /** Donor's currently selected amount in integer cents. 0 means none yet. */
  valueCents: number;
  /** Whether the donor has explicitly opened the custom input. */
  customMode: boolean;
  /** Called with the next integer-cent value when chip clicked or custom edited. */
  onValueChange: (cents: number) => void;
  /** Called when the donor toggles between preset chips and the custom input. */
  onCustomModeChange: (custom: boolean) => void;
  /** Optional validation error to surface beneath the selector. */
  error?: string;
  /** Override the default presets — primarily for tests / future configurability. */
  presetsCents?: readonly number[];
  /** Show the Custom chip and input. Defaults to true; the testnet demo disables it. */
  allowCustom?: boolean;
}

const CURRENCY = "$";
const CONTAINER_CLASSES = "flex flex-col gap-2.5";
const CHIP_ROW_CLASSES = "flex items-stretch gap-2";

const CUSTOM_CHIP_BASE =
  "flex-1 inline-flex items-center justify-center rounded-lg px-3 py-3.5 text-[15px] font-light tracking-[-0.1px] border transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-default";
const CUSTOM_CHIP_ACTIVE = "bg-ink text-white border-ink";
const CUSTOM_CHIP_INACTIVE = "bg-white text-ink border-rule hover:bg-tint";

const ERROR_CLASSES =
  "text-[12px] font-normal tracking-[-0.1px] text-urgent leading-snug";

export function AmountSelector({
  valueCents,
  customMode,
  onValueChange,
  onCustomModeChange,
  error,
  presetsCents = DONATION_PRESETS_CENTS,
  allowCustom = true,
}: AmountSelectorProps) {
  const errorId = useId();
  const customInputId = useId();

  const customChipClasses = [
    CUSTOM_CHIP_BASE,
    customMode ? CUSTOM_CHIP_ACTIVE : CUSTOM_CHIP_INACTIVE,
  ].join(" ");

  function handlePresetClick(cents: number): void {
    if (customMode) onCustomModeChange(false);
    onValueChange(cents);
  }

  function handleCustomClick(): void {
    onCustomModeChange(true);
    onValueChange(0);
  }

  function handleCustomInput(event: ChangeEvent<HTMLInputElement>): void {
    onValueChange(parseAmountInputToCents(event.target.value));
  }

  return (
    <div className={CONTAINER_CLASSES}>
      <FieldLabel
        htmlFor={customInputId}
        hint={
          allowCustom
            ? "Choose a preset or set a custom amount"
            : "Choose an amount"
        }
      >
        Donation amount
      </FieldLabel>

      <div className={CHIP_ROW_CLASSES}>
        {presetsCents.map((preset) => (
          <AmountChip
            key={preset}
            value={Math.round(preset / 100)}
            currency={CURRENCY}
            active={!customMode && valueCents === preset}
            onClick={() => handlePresetClick(preset)}
          />
        ))}

        {allowCustom && (
          <button
            type="button"
            onClick={handleCustomClick}
            aria-pressed={customMode}
            className={customChipClasses}
          >
            Custom
          </button>
        )}
      </div>

      {allowCustom && customMode && (
        <CustomAmountInput
          id={customInputId}
          valueCents={valueCents}
          onChange={handleCustomInput}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
      )}

      {error && (
        <p id={errorId} role="alert" className={ERROR_CLASSES}>
          {error}
        </p>
      )}
    </div>
  );
}

interface CustomAmountInputProps {
  id: string;
  valueCents: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  invalid: boolean;
  describedBy?: string;
}

const CONTAINER_BASE =
  "flex items-stretch overflow-hidden rounded-md border bg-white transition-colors duration-150";
const CONTAINER_DEFAULT = `${CONTAINER_BASE} border-steel focus-within:border-iris focus-within:ring-2 focus-within:ring-iris/15`;
const CONTAINER_INVALID = `${CONTAINER_BASE} border-urgent focus-within:border-urgent focus-within:ring-2 focus-within:ring-urgent/15`;

const PREFIX_CLASSES =
  "inline-flex items-center justify-center px-3 text-mute text-[15px] font-light tracking-[-0.1px] border-r border-rule-soft";
const INPUT_CLASSES =
  "flex-1 min-w-0 appearance-none bg-transparent px-3 py-2.5 text-[15px] font-light tracking-[-0.1px] tabular-nums text-ink outline-none placeholder:text-steel";

function CustomAmountInput({
  id,
  valueCents,
  onChange,
  invalid,
  describedBy,
}: CustomAmountInputProps) {
  return (
    <div className={invalid ? CONTAINER_INVALID : CONTAINER_DEFAULT}>
      <div className={PREFIX_CLASSES}>{CURRENCY}</div>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={formatCentsAsAmountInput(valueCents)}
        onChange={onChange}
        placeholder="0.00"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={INPUT_CLASSES}
      />
    </div>
  );
}
