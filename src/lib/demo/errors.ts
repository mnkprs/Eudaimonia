/**
 * Error envelope for `POST /api/demo/donate`. Same `{ error: { code, message } }`
 * shape as the on-ramp routes; messages are user-friendly and never contain
 * secrets, addresses, or raw chain/RPC error text.
 */

export type DemoErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "demo_daily_cap"
  | "demo_disabled"
  | "demo_busy"
  | "demo_wallet_empty"
  | "demo_misconfigured"
  | "chain_error";

interface ErrorSpec {
  readonly status: number;
  readonly message: string;
}

const ERROR_SPECS: Readonly<Record<DemoErrorCode, ErrorSpec>> = {
  invalid_request: { status: 400, message: "Invalid request." },
  rate_limited: {
    status: 429,
    message: "Too many demo donations from your network. Please try again shortly.",
  },
  demo_daily_cap: {
    status: 429,
    message: "The demo has reached its daily limit. Please try again tomorrow.",
  },
  demo_disabled: {
    status: 503,
    message: "The testnet demo is currently switched off.",
  },
  demo_busy: {
    status: 503,
    message: "The demo is busy right now. Please try again in a few seconds.",
  },
  demo_wallet_empty: {
    status: 503,
    message: "The demo wallet is out of test funds. Please try again later.",
  },
  demo_misconfigured: {
    status: 503,
    message: "The demo is not fully set up yet. Please try again later.",
  },
  chain_error: {
    status: 502,
    message: "The test transaction could not be sent. Please try again.",
  },
};

export function demoError(
  code: DemoErrorCode,
  options: { message?: string; headers?: HeadersInit } = {},
): Response {
  const spec = ERROR_SPECS[code];
  return Response.json(
    { error: { code, message: options.message ?? spec.message } },
    { status: spec.status, headers: options.headers },
  );
}
