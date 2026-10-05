import type { Address, Hex } from "viem";
import { logger } from "@/lib/log/logger";
import type { DemoChainGateway, DemoWalletState } from "./chain-gateway";
import type { DemoEnv } from "./env";
import { demoError } from "./errors";

/**
 * The critical section of a demo donation. Callers must hold the send lock:
 * the wallet is a single EOA, so reading the pending nonce and sending must not
 * interleave with another request.
 */

export interface SendRequest {
  readonly gateway: DemoChainGateway;
  readonly env: DemoEnv;
  readonly org: Address;
  readonly amount: bigint;
}

/** Log scope shared by the demo donate route and its critical section. */
export const DEMO_LOG_SCOPE = "demo/donate";

const NONCE_ERROR = /nonce/i;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Pre-flight checks on balances and allowance; null means the wallet can send. */
function checkWallet(
  state: DemoWalletState,
  env: DemoEnv,
  amount: bigint,
): Response | null {
  if (state.usdcBalance < amount || state.ethBalance < env.DEMO_MIN_ETH_WEI) {
    logger.error({ scope: DEMO_LOG_SCOPE }, "demo wallet is low on funds");
    return demoError("demo_wallet_empty");
  }
  if (state.allowance < amount) {
    logger.error({ scope: DEMO_LOG_SCOPE }, "demo wallet allowance too low");
    return demoError("demo_misconfigured");
  }
  return null;
}

type Attempt =
  | { readonly kind: "sent"; readonly txHash: Hex }
  | { readonly kind: "nonce_error" }
  | { readonly kind: "failed"; readonly err: unknown };

async function attemptSend(
  request: SendRequest,
  nonce: number,
): Promise<Attempt> {
  try {
    const txHash = await request.gateway.sendDonation({
      org: request.org,
      amount: request.amount,
      nonce,
    });
    return { kind: "sent", txHash };
  } catch (err: unknown) {
    return NONCE_ERROR.test(errorMessage(err))
      ? { kind: "nonce_error" }
      : { kind: "failed", err };
  }
}

function toResponse(attempt: Attempt): Response | null {
  if (attempt.kind === "sent") {
    return Response.json({ txHash: attempt.txHash }, { status: 200 });
  }
  if (attempt.kind === "failed") {
    logger.error({ err: attempt.err, scope: DEMO_LOG_SCOPE }, "send failed");
    return demoError("chain_error");
  }
  return null;
}

/** Reads wallet state, validates it, sends, and retries once on a nonce error. */
export async function sendUnderLock(request: SendRequest): Promise<Response> {
  try {
    const state = await request.gateway.readWalletState();
    const blocked = checkWallet(state, request.env, request.amount);
    if (blocked) return blocked;

    const first = await attemptSend(request, state.pendingNonce);
    const firstResponse = toResponse(first);
    if (firstResponse) return firstResponse;

    logger.warn({ scope: DEMO_LOG_SCOPE }, "nonce error; retrying once");
    const fresh = await request.gateway.readWalletState();
    const second = await attemptSend(request, fresh.pendingNonce);
    return toResponse(second) ?? demoError("demo_busy");
  } catch (err: unknown) {
    logger.error({ err, scope: DEMO_LOG_SCOPE }, "demo wallet read failed");
    return demoError("chain_error");
  }
}
