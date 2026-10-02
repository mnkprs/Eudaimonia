/**
 * The single KvStore every on-ramp route shares for ALL routing state: the
 * session records themselves, the webhook processed-event log, the session
 * idempotency index, and the rate-limit counters (each under its own key prefix).
 *
 * Centralising it here is what makes the M2 durability swap a one-line decision:
 * when Vercel KV REST credentials are configured (production), back everything
 * with the durable, cross-instance `@vercel/kv` adapter; otherwise (local demo,
 * unit tests) fall back to the bounded in-memory store. Callers never know which.
 */

import { createInMemoryKvStore, type KvStore } from "@/lib/kv/kv-store";
import { createVercelKvStoreFromConfig } from "@/lib/kv/vercel-kv-store";
import { createSessionStore, type SessionStore } from "./session-store";

let shared: KvStore | null = null;
let sharedSessionStore: SessionStore | null = null;

/**
 * Use the durable KV only when real REST credentials are present AND we are not
 * inside a unit-test run — tests must never reach a live Redis (MSW would error
 * on the outbound request anyway). Vitest sets `process.env.VITEST`.
 */
function shouldUseVercelKv(): boolean {
  if (process.env.VITEST) return false;
  return isUsableKvConfig(
    process.env.KV_REST_API_URL,
    process.env.KV_REST_API_TOKEN,
  );
}

/** Placeholder values shipped in `.env.local.example`; they point at nothing. */
const EXAMPLE_KV_HOST = "example-kv.upstash.io";
const EXAMPLE_KV_TOKEN = "replace_me";

/**
 * True for real https REST credentials. The `.env.local.example` placeholders
 * are treated as unset so local dev falls back to in-memory instead of calling
 * a nonexistent host.
 */
export function isUsableKvConfig(
  url: string | undefined,
  token: string | undefined,
): boolean {
  if (!url?.startsWith("https://") || !token) return false;
  if (token === EXAMPLE_KV_TOKEN) return false;
  return !url.includes(EXAMPLE_KV_HOST);
}

/** Lazily-built process-shared KvStore for on-ramp routing state. */
export function onrampKvStore(): KvStore {
  if (shared === null) {
    shared = shouldUseVercelKv()
      ? createVercelKvStoreFromConfig({
          url: process.env.KV_REST_API_URL as string,
          token: process.env.KV_REST_API_TOKEN as string,
        })
      : createInMemoryKvStore();
  }
  return shared;
}

/**
 * Lazily-built process-shared SessionStore over {@link onrampKvStore}. This is
 * the durability fix: every route (POST create, webhook settle, GET status) must
 * read and write session records through the SAME backing store so a session
 * minted on one serverless instance is visible to the webhook and status calls
 * that land on another. Wiring the routes to the hardcoded `inMemorySessionStore`
 * instead would silently drop settlements in any multi-instance deploy — the
 * webhook would not find the session and the status poll would 404 forever.
 */
export function onrampSessionStore(): SessionStore {
  if (sharedSessionStore === null) {
    sharedSessionStore = createSessionStore(onrampKvStore());
  }
  return sharedSessionStore;
}
