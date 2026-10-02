"use client";

import type { CheckoutPayload } from "@/types/checkout";

/** Same-origin path of the testnet demo donation route. */
export const DEMO_ENDPOINT = "/api/demo/donate";

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/** User-facing copy per server error code. Server-supplied text is never shown. */
const SERVER_ERROR_MESSAGES = {
  invalid_request: "That donation couldn’t be processed. Pick an amount and try again.",
  rate_limited:
    "Too many test donations from your network — try again in a few minutes.",
  demo_daily_cap:
    "The demo has reached its daily limit of test donations — try again tomorrow.",
  demo_disabled: "The testnet demo is switched off right now.",
  demo_busy: "The demo is handling another donation — try again in a moment.",
  demo_wallet_empty:
    "The demo wallet is out of test funds right now — try again later.",
  demo_misconfigured: "The testnet demo isn’t configured correctly right now.",
  chain_error:
    "The test transaction couldn’t be completed on Base Sepolia — try again.",
} as const;

type ServerErrorCode = keyof typeof SERVER_ERROR_MESSAGES;

export type DemoSubmitErrorCode =
  | ServerErrorCode
  | "network_error"
  | "unexpected_response";

/** Typed failure from {@link submitDemoDonation}; `message` is safe to render. */
export class DemoSubmitError extends Error {
  readonly code: DemoSubmitErrorCode;

  constructor(code: DemoSubmitErrorCode, message: string) {
    super(message);
    this.name = "DemoSubmitError";
    this.code = code;
    Object.setPrototypeOf(this, DemoSubmitError.prototype);
  }
}

export interface SubmitDemoDonationOptions {
  /** Navigation hook; defaults to `window.location.assign`. */
  readonly redirect?: (url: string) => void;
  /** Fetch override for tests. */
  readonly fetchImpl?: typeof fetch;
}

function browserRedirect(url: string): void {
  window.location.assign(url);
}

function isServerErrorCode(value: unknown): value is ServerErrorCode {
  return typeof value === "string" && value in SERVER_ERROR_MESSAGES;
}

function unexpected(message: string): DemoSubmitError {
  return new DemoSubmitError("unexpected_response", message);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorCodeOf(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;
  return (error as { code?: unknown }).code;
}

function txHashOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const { txHash } = body as { txHash?: unknown };
  return typeof txHash === "string" && TX_HASH_PATTERN.test(txHash)
    ? txHash
    : null;
}

/**
 * Sends the donation to the demo route and, on success, navigates to the
 * receipt. Only `campaignId` and `grossCents` leave the browser; the receipt
 * path is built here from a validated hash, never taken from the server.
 *
 * @throws {DemoSubmitError}
 */
export async function submitDemoDonation(
  payload: CheckoutPayload,
  options: SubmitDemoDonationOptions = {},
): Promise<void> {
  const doFetch = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(DEMO_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId: payload.campaignId,
        grossCents: payload.grossCents,
      }),
    });
  } catch {
    throw new DemoSubmitError(
      "network_error",
      "Couldn’t reach the donation service. Check your connection and try again.",
    );
  }

  const body = await readJson(response);

  if (!response.ok) {
    const code = errorCodeOf(body);
    if (isServerErrorCode(code)) {
      throw new DemoSubmitError(code, SERVER_ERROR_MESSAGES[code]);
    }
    throw unexpected(
      `The donation service responded unexpectedly (HTTP ${response.status}).`,
    );
  }

  const txHash = txHashOf(body);
  if (!txHash) {
    throw unexpected("The donation service returned an unrecognized response.");
  }

  (options.redirect ?? browserRedirect)(`/receipt/${txHash}`);
}
