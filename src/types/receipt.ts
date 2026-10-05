// Type contract for a Eudaimonia donation receipt.
// Mirrors the design-time shape in designs/receipt.jsx:5-97.
// Stage 4 ("Eudaimonia fee") is currently `inactive` for receipts that route
// through Endaoment directly without our platform fee — future donations
// originated by Eudaimonia will populate it.

export type Hex = `0x${string}`;

export type Network = "Base" | "Base Sepolia";

export interface ReceiptData {
  /** Truncated donor address for display, e.g. "0xe0adb1…7a097bb". */
  donorShort: string;
  /** Charity legal name. */
  charity: string;
  /** Employer Identification Number, e.g. "87-1055621". */
  ein: string;
  /** Charity mission statement (one paragraph). */
  mission: string;
  /** Donation amount in the donor's local currency, formatted. */
  amount: string;
  /** Settled USDC amount, e.g. "1.001017". */
  amountUsdc: string;
  /** Localized date, e.g. "May 30, 2025". */
  date: string;
  /** Localized time, e.g. "5:34 PM UTC". */
  time: string;
  /** L2 network the donation settled on. */
  network: Network;
  /** Full transaction hash. */
  txid: Hex;
  /** Truncated txid for display, e.g. "0xdc67…78ed". */
  txidShort: string;
  /** Block number with thousands separators, e.g. "30,918,548". */
  block: string;
  /** Confirmation count with thousands separators. */
  confirmations: string;
  /** Original ETH amount swapped, e.g. "0.0000627". */
  ethIn: string;
  /** Swap rate text, e.g. "1 ETH = 15,975 USDC". */
  rate: string;
  /** Eudaimonia platform fee (USDC). "0.00" when stage 4 is inactive. */
  platformFee: string;
  /** Endaoment protocol fee (USDC). */
  endaomentFee: string;
  /** OrgFundFactory address (Endaoment). */
  orgFund: Hex | string;
  /** Final charity multisig / fund address. */
  charityAddr: Hex | string;
  /** Donor-paid network/processing fee (USDC). */
  donorFee: string;
}

export type StageNumber = 1 | 2 | 3 | 4 | 5;

export type StageTitle =
  | "Donated"
  | "Converted"
  | "Routed"
  | "Eudaimonia fee"
  | "Settled";

export type StageUnit = "ETH" | "USDC";

export interface StageFeeHover {
  label: string;
  amount: string;
  to: string;
}

export interface Stage {
  /** Sequential stage number, 1–5. */
  n: StageNumber;
  /** Stage title used as the section heading. */
  title: StageTitle;
  /** One-line summary shown beneath the title. */
  short: string;
  /** Absolute timestamp, e.g. "17:34:01 UTC". "—" when inactive. */
  timestamp: string;
  /** Relative offset from stage 1, e.g. "+1s". */
  relative: string;
  /** Value transferred at this step, in `unit`. */
  amount: string;
  unit: StageUnit;
  /** Counterparty address or pool label (display string). */
  address: string;
  /** What the `address` field semantically represents. */
  addressLabel: string;
  /** Long-form explanation shown on hover/expand. */
  detail: string;
  /** Contract label, e.g. "Endaoment · OrgFundFactory". */
  contract: string;
  /** Optional fee tooltip overlay on this stage. */
  feeOnHover?: StageFeeHover;
  /**
   * Stage represents a fee deduction in the timeline — renders with muted
   * ring, navy fill, and a `−` prefix on the amount. Set true on stage 4
   * once the Eudaimonia platform fee becomes active.
   */
  fee?: boolean;
  /** Stage exists in the timeline but did not execute for this tx. */
  inactive?: boolean;
  /** Chip text for an inactive stage (e.g. "Off-chain"); the tracker defaults to "Future". */
  inactiveLabel?: string;
  /** Final stage — terminates the tracker line. */
  terminal?: boolean;
}

/** A fully decoded receipt — what the route loader returns. */
export interface ReceiptBundle {
  data: ReceiptData;
  stages: Stage[];
}
