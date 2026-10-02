import { randomUUID } from "node:crypto";
import type { KvStore } from "@/lib/kv/kv-store";

/**
 * Cross-instance send lock over a {@link KvStore}. The demo wallet is a single
 * EOA, so concurrent sends would race on the nonce; serializing them behind a
 * `setNx` lock keeps nonces monotonic. The lock carries a TTL so a crashed
 * holder can never wedge the demo, and release is token-checked so a holder
 * whose TTL expired never deletes its successor's lock.
 */

export interface SendLockOptions {
  readonly key: string;
  readonly ttlSeconds: number;
  /** Max time to wait for the lock before giving up. */
  readonly waitMs: number;
  readonly pollMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  /** Injectable for tests; defaults to a random UUID. */
  readonly token?: string;
}

export type SendLockResult<T> =
  | { readonly acquired: true; readonly value: T }
  | { readonly acquired: false };

async function acquire(
  store: KvStore,
  token: string,
  options: SendLockOptions,
): Promise<boolean> {
  let waited = 0;
  while (true) {
    if (await store.setNx(options.key, token, options.ttlSeconds)) return true;
    if (waited >= options.waitMs) return false;
    await options.sleep(options.pollMs);
    waited += options.pollMs;
  }
}

async function releaseIfOwned(
  store: KvStore,
  key: string,
  token: string,
): Promise<void> {
  // Not atomic (get then delete): the residual race needs the TTL to expire
  // between the two calls, which the 30 s TTL vs. sub-second send makes remote.
  if ((await store.get<string>(key)) === token) {
    await store.delete(key);
  }
}

export async function withSendLock<T>(
  store: KvStore,
  fn: () => Promise<T>,
  options: SendLockOptions,
): Promise<SendLockResult<T>> {
  const token = options.token ?? randomUUID();
  if (!(await acquire(store, token, options))) return { acquired: false };

  try {
    return { acquired: true, value: await fn() };
  } finally {
    await releaseIfOwned(store, options.key, token);
  }
}
