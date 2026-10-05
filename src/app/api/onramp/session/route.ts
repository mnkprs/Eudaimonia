/**
 * POST /api/onramp/session — create a Stripe Crypto Onramp session.
 *
 * Pipeline:
 *   1. Per-client rate limit (security review H1)            → 429 when exceeded.
 *   2. Validate the `x-client-request-id` header format (bounded length/charset).
 *   3. Parse + Zod-validate the CheckoutPayload body         → 400 on failure.
 *   4. Idempotency: key + payload-hash together identify the operation.
 *        - same key + same payload  → return the cached session (no Stripe call)
 *        - same key + diff payload   → 400 conflict (Stripe's reuse contract)
 *        - dangling index (session evicted) → fall through and recreate
 *   5. Call Stripe via `createOnrampSession`                  → 502 on failure.
 *   6. Persist the session + index it under (key → {id, hash}).
 *   7. Return the narrow `{ sessionId, redirectUrl }` the client needs.
 *
 * The pure handler takes its deps injected (store/idempotency/rateLimiter) so it
 * is unit-testable without the Next runtime; `POST` wires the process-shared,
 * KV-backed singletons (durable + bounded — security review M1/M2) + real env.
 *
 * Binding the idempotency key to a payload hash (not the key alone) is a security
 * boundary: a client-supplied key is otherwise an unauthenticated capability
 * handle that would let any caller fetch another donor's session.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { serverEnv, type ServerEnv } from "@/lib/env/server";
import { MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS } from "@/lib/checkout/validation";
import { CLIENT_REQUEST_ID_HEADER } from "@/lib/onramp/idempotency";
import { onrampKvStore, onrampSessionStore } from "@/lib/onramp/onramp-kv";
import { createOnrampSession } from "@/lib/onramp/stripe";
import { logger } from "@/lib/log/logger";
import {
  createIdempotencyIndex,
  type IdempotencyEntry,
  type IdempotencyIndex,
  type SessionStore,
} from "@/lib/onramp/session-store";
import { clientIdentifier } from "@/lib/ratelimit/client-identifier";
import {
  createRateLimiter,
  type RateLimiter,
  type RateLimitResult,
} from "@/lib/ratelimit/rate-limiter";
import type {
  CreateSessionInput,
  OnrampErrorBody,
  OnrampErrorCode,
  OnrampSession,
  OnrampSessionResponse,
} from "@/types/onramp";

/**
 * Re-exported so existing importers keep resolving `CLIENT_REQUEST_ID_HEADER`
 * from this route. The canonical definition lives in the dependency-free
 * `@/lib/onramp/idempotency` module so the `"use client"` submit path can share
 * it without pulling server-only code into the browser bundle.
 */
export { CLIENT_REQUEST_ID_HEADER };

/** Re-exported for tests that assert on the idempotency entry shape. */
export type { IdempotencyEntry } from "@/lib/onramp/session-store";

/** Upper bound on the idempotency key: generous for a UUID, hostile to abuse. */
const MAX_CLIENT_REQUEST_ID_LENGTH = 128;
/** Printable ASCII only — no control chars, no multi-byte padding attacks. */
const CLIENT_REQUEST_ID_PATTERN = /^[\x21-\x7e]+$/;

/**
 * Per-(IP+campaign) budget for session creation: each accepted call costs a
 * billable Stripe request, so this is the H1 cost/DoS throttle. 5/60s matches the
 * remediation plan; the per-campaign split can't meaningfully widen the attack
 * window at a budget this small even if a flooder rotates campaignIds.
 */
const SESSION_RATE_LIMIT = 5;
const SESSION_RATE_WINDOW_SECONDS = 60;

/**
 * Server-side schema mirroring `CheckoutPayload`. Enforces the SAME amount
 * envelope as the Epic 2 UI (no daylight between client and server) plus length
 * caps so oversized fields fail fast before any Stripe call. `note` is accepted
 * but never forwarded to Stripe.
 */
const createSessionBodySchema = z.object({
  campaignId: z.string().trim().min(1).max(64),
  grossCents: z.number().int().min(MIN_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS),
  email: z.string().trim().email().max(254),
  note: z.string().max(500).optional(),
});

export interface CreateSessionDeps {
  readonly env: ServerEnv;
  readonly store: SessionStore;
  /** Maps `clientRequestId` → { persisted session id, payload fingerprint }. */
  readonly idempotency: IdempotencyIndex;
  /** Optional per-client throttle; when omitted, no rate limiting is applied. */
  readonly rateLimiter?: RateLimiter;
  /** Injectable timer used by the reservation poll; defaults to real `setTimeout`. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Real-timer sleep; overridable via deps so tests stay deterministic. */
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Loser poll budget while a reservation is in flight: ~2s total (40 × 50ms),
 * comfortably inside the 60s reservation TTL. Covers a normal Stripe round-trip
 * with margin; on exhaustion the loser falls through and creates (the rare
 * crashed-winner case), trading a possible duplicate for never wedging a donor.
 */
const IDEMPOTENCY_POLL_ATTEMPTS = 40;
const IDEMPOTENCY_POLL_INTERVAL_MS = 50;

function jsonResponse(
  body: unknown,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(body, { status, headers });
}

function errorResponse(
  code: OnrampErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  const body: OnrampErrorBody = { error: { code, message } };
  return jsonResponse(body, status, headers);
}

function toResponse(session: OnrampSession): OnrampSessionResponse {
  return { sessionId: session.id, redirectUrl: session.redirectUrl };
}

/**
 * Deterministic fingerprint of the fields that actually reach Stripe. `note`
 * is deliberately excluded so two retries differing only in `note` still hit
 * the cache. Fixed field order avoids relying on JSON key-ordering semantics.
 *
 * The " " separator is collision-safe ONLY because the Zod schema rejects
 * spaces in email and renders grossCents as digits-only; if those validators
 * are ever loosened, switch to a "\x00" separator or length-prefixing.
 */
function hashPayload(input: CreateSessionInput): string {
  const canonical = [input.campaignId, input.grossCents, input.email].join(" ");
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Turn an EXISTING idempotency entry into a client Response, or return `null` to
 * signal "fall through and create a fresh session". Three outcomes:
 *   - payload clash (either state) → 400 (the key is not a bearer capability);
 *   - committed + session present  → 200 with the cached session;
 *   - reserved (concurrent create) → poll until the winner commits, then 200.
 * A committed-but-evicted entry (dangling) or an exhausted poll both return
 * `null` so the caller recreates.
 */
async function resolveExistingEntry(
  entry: IdempotencyEntry,
  clientRequestId: string,
  payloadHash: string,
  store: SessionStore,
  idempotency: IdempotencyIndex,
  sleep: (ms: number) => Promise<void>,
): Promise<Response | null> {
  if (entry.payloadHash !== payloadHash) {
    return errorResponse(
      "invalid_request",
      `${CLIENT_REQUEST_ID_HEADER} was already used with a different request`,
      400,
    );
  }

  if (entry.state === "committed") {
    const existing = await store.get(entry.sessionId);
    return existing ? jsonResponse(toResponse(existing), 200) : null;
  }

  // Reserved: a concurrent create owns this key. Poll briefly for its commit.
  for (let attempt = 0; attempt < IDEMPOTENCY_POLL_ATTEMPTS; attempt += 1) {
    await sleep(IDEMPOTENCY_POLL_INTERVAL_MS);
    const latest = await idempotency.get(clientRequestId);
    if (latest === undefined) break; // reservation expired (winner crashed)
    if (latest.state === "committed" && latest.payloadHash === payloadHash) {
      const existing = await store.get(latest.sessionId);
      return existing ? jsonResponse(toResponse(existing), 200) : null;
    }
  }
  return null; // poll exhausted / reservation gone → recreate
}

export async function handleCreateSession(
  request: Request,
  deps: CreateSessionDeps,
): Promise<Response> {
  const { env, store, idempotency, rateLimiter } = deps;
  const sleep = deps.sleep ?? defaultSleep;

  // 1. Validate the idempotency key's FORMAT (presence is optional).
  const rawKey = request.headers.get(CLIENT_REQUEST_ID_HEADER);
  if (rawKey !== null) {
    if (
      rawKey.length > MAX_CLIENT_REQUEST_ID_LENGTH ||
      !CLIENT_REQUEST_ID_PATTERN.test(rawKey)
    ) {
      return errorResponse(
        "invalid_request",
        `${CLIENT_REQUEST_ID_HEADER} must be <= ${MAX_CLIENT_REQUEST_ID_LENGTH} printable ASCII characters`,
        400,
      );
    }
  }
  const clientRequestId = rawKey;

  // 2. Parse + validate the donor's checkout payload (before idempotency, so a
  //    malformed retry is a clear 400 rather than a silent cache hit).
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(
      "invalid_request",
      "Request body must be valid JSON",
      400,
    );
  }

  const parsed = createSessionBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid request",
      400,
    );
  }

  const input: CreateSessionInput = {
    campaignId: parsed.data.campaignId,
    grossCents: parsed.data.grossCents,
    email: parsed.data.email,
  };

  // 3. Throttle per client AFTER parsing so the key can include campaignId (each
  //    accepted call costs a billable Stripe request — an unauthenticated flood
  //    is the H1 cost/DoS vector). Fail-open on limiter error (Decision 2): a KV
  //    blip must never block a donor, so a throw is logged and treated as allow.
  if (rateLimiter) {
    let verdict: RateLimitResult | undefined;
    try {
      verdict = await rateLimiter.check(
        `${clientIdentifier(request)}:${input.campaignId}`,
      );
    } catch (err: unknown) {
      logger.warn(
        { err, scope: "onramp/session" },
        "rate limiter failed; allowing request (fail-open)",
      );
    }
    if (verdict && !verdict.allowed) {
      // Tell the client when to retry: whole seconds until the window resets,
      // floored at 1 so the header is always a positive integer.
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((verdict.resetAt - Date.now()) / 1000),
      );
      return errorResponse(
        "rate_limited",
        "Too many requests. Please slow down and try again shortly.",
        429,
        { "Retry-After": String(retryAfterSeconds) },
      );
    }
  }

  // 4. Idempotency with an atomic reservation (security review M1). The key
  //    alone is not a capability — it must be paired with a matching payload.
  //    Reserving via `setNx` BEFORE the Stripe call is what closes the TOCTOU
  //    race: a concurrent retry sees the reservation and waits for the winner's
  //    session instead of launching a second billable Stripe session.
  const payloadHash = hashPayload(input);
  if (clientRequestId !== null) {
    try {
      let entry = await idempotency.get(clientRequestId);
      if (!entry) {
        // No entry yet — try to win the reservation. If we lose a race that
        // started after our read, re-read and resolve the winner's entry.
        const won = await idempotency.reserve(clientRequestId, payloadHash);
        if (!won) {
          entry = await idempotency.get(clientRequestId);
        }
      }
      if (entry) {
        const resolved = await resolveExistingEntry(
          entry,
          clientRequestId,
          payloadHash,
          store,
          idempotency,
          sleep,
        );
        if (resolved) return resolved;
      }
    } catch (err: unknown) {
      // Fail-open (Decision 2): a KV blip on the idempotency path must never
      // block a donor. Proceed to create — a duplicate session is the rare,
      // tolerable cost of staying available here.
      logger.warn(
        { err },
        "[onramp/session] idempotency check failed; proceeding (fail-open)",
      );
    }
  }

  // 5. Call Stripe. Any failure here is upstream, not the donor's fault → 502.
  let session: OnrampSession;
  try {
    session = await createOnrampSession(input, env);
  } catch (err: unknown) {
    // Surface server-side for diagnostics; the client gets only a generic 502.
    logger.error(
      { err, scope: "onramp/session" },
      "Stripe session creation failed",
    );
    return errorResponse(
      "provider_error",
      "Unable to create on-ramp session with the payment provider",
      502,
    );
  }

  // 6. Persist + commit the idempotency entry (only after a confirmed success),
  //    overwriting our reservation with the real session id for future retries.
  await store.put(session);
  if (clientRequestId !== null) {
    try {
      await idempotency.commit(clientRequestId, session.id, payloadHash);
    } catch (err: unknown) {
      // Fail-open: the session is created + persisted; a failed index write only
      // weakens idempotency on a later retry, it never loses the donor's session.
      logger.warn(
        { err },
        "[onramp/session] idempotency commit failed (fail-open)",
      );
    }
  }

  // 7. Return the narrow client contract.
  return jsonResponse(toResponse(session), 200);
}

/** Process-shared idempotency index + rate limiter over the on-ramp KvStore. */
const sessionIdempotencyIndex = createIdempotencyIndex(onrampKvStore());
const sessionRateLimiter = createRateLimiter(onrampKvStore(), {
  limit: SESSION_RATE_LIMIT,
  windowSeconds: SESSION_RATE_WINDOW_SECONDS,
  prefix: "rl:session",
});

export function POST(request: Request): Promise<Response> {
  return handleCreateSession(request, {
    env: serverEnv(),
    store: onrampSessionStore(),
    idempotency: sessionIdempotencyIndex,
    rateLimiter: sessionRateLimiter,
  });
}
