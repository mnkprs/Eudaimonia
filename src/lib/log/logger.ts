import pino, { type DestinationStream, type Logger } from "pino";

/**
 * Structured logging for the on-ramp server pipeline (review finding M2).
 *
 * Design constraints:
 * - **No worker transport.** We emit plain JSON straight to the destination
 *   (stdout in production) rather than a `pino.transport`. Worker-thread
 *   transports have historically broken under Next.js route-handler bundling;
 *   plain JSON sidesteps that entirely and is what log collectors ingest anyway.
 * - **Key-based redaction only.** `redact` censors matching object *keys*; it
 *   never inspects string *values*. A secret embedded in free text (e.g. an
 *   error message) is NOT scrubbed — only place secrets under the keys below.
 * - **One level of nesting.** The `*.KEY` wildcard catches a redacted key one
 *   level deep (`{ env: { KV_REST_API_TOKEN } }`), not arbitrarily nested.
 */

/**
 * Secret- and PII-shaped keys whose values are replaced with the censor token.
 * The first group is secret material; `donorEmail`/`email` are donor PII added
 * as defense-in-depth (security review L3) — the wired call sites only log
 * `{ err }`, but these keys scrub a future mistake where a session or payload
 * object (which carries the donor's email) is logged directly.
 */
export const REDACTED_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_ONRAMP_WEBHOOK_SECRET",
  "KV_REST_API_TOKEN",
  "DEMO_WALLET_PRIVATE_KEY",
  "privateKey",
  "authorization",
  "clientSecret",
  "donorEmail",
  "email",
] as const;

const CENSOR = "[REDACTED]";

/** Redaction paths: each key at top level, plus one level of nesting. */
const REDACT_PATHS = REDACTED_KEYS.flatMap((key) => [key, `*.${key}`]);

/**
 * Builds a leveled JSON logger. The optional `destination` lets tests capture
 * output via a `{ write }` sink; production omits it and writes to stdout.
 */
export function createLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      redact: { paths: REDACT_PATHS, censor: CENSOR },
      serializers: { err: pino.stdSerializers.err },
    },
    destination,
  );
}

/** Process-wide logger for server code. */
export const logger = createLogger();
