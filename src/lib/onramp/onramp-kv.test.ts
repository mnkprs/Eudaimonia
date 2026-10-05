import { describe, expect, it } from "vitest";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { createSessionStore } from "./session-store";
import { isUsableKvConfig, onrampSessionStore } from "./onramp-kv";
import type { OnrampSession } from "@/types/onramp";

/** A freshly-minted session, as the POST /session route would persist it. */
const SESSION: OnrampSession = Object.freeze({
  id: "cos_xinst_1",
  status: "created",
  clientSecret: "cos_xinst_1_secret",
  redirectUrl: "https://crypto.link.com/session/cos_xinst_1",
  grossCents: 25000,
  campaignId: "wck",
  donorEmail: "donor@example.com",
});

/**
 * Regression for the session-store durability bug: the POST/webhook/status routes
 * used to wire the hardcoded `inMemorySessionStore` while every other piece of
 * routing state (idempotency, rate limit, processed events) was KV-backed. In a
 * multi-instance deploy a session minted on instance A was invisible to the
 * webhook/status calls landing on instance B — settlements were silently dropped
 * and the status poll 404'd forever. The fix routes all three through
 * `onrampSessionStore()` over the shared `onrampKvStore()`.
 */
describe("onrampSessionStore (cross-instance durability, security review HIGH)", () => {
  it("returns a process-shared singleton so every route reads the same store", () => {
    // The three routes each call onrampSessionStore(); they must get one instance.
    expect(onrampSessionStore()).toBe(onrampSessionStore());
  });

  it("a session minted on one instance is visible to another sharing the backing KV", async () => {
    // Two SessionStores over the SAME KvStore model two serverless instances
    // sharing one durable Vercel KV — what onrampSessionStore() does in prod.
    const sharedKv = createInMemoryKvStore();
    const instanceA = createSessionStore(sharedKv); // POST /session lands here
    const instanceB = createSessionStore(sharedKv); // webhook/status land here

    await instanceA.put(SESSION);

    // Instance B (the webhook) finds the session and can settle it...
    const settled = await instanceB.update(SESSION.id, {
      status: "settled",
      txHash: "0xabc",
    });
    expect(settled.status).toBe("settled");

    // ...and instance A (a later status poll) sees the settlement.
    const seenByA = await instanceA.get(SESSION.id);
    expect(seenByA?.status).toBe("settled");
    expect(seenByA?.txHash).toBe("0xabc");
  });

  it("demonstrates the old bug: independent in-memory stores never share a session", async () => {
    // The pre-fix wiring — each route effectively over its own in-memory KV.
    const instanceA = createSessionStore(createInMemoryKvStore());
    const instanceB = createSessionStore(createInMemoryKvStore());

    await instanceA.put(SESSION);

    // The webhook on instance B never finds the session: settlement is dropped.
    expect(await instanceB.get(SESSION.id)).toBeUndefined();
    await expect(
      instanceB.update(SESSION.id, { status: "settled" }),
    ).rejects.toThrow(/cos_xinst_1/);
  });
});

describe("isUsableKvConfig", () => {
  it("accepts real https credentials", () => {
    expect(isUsableKvConfig("https://real-123.upstash.io", "AXabc")).toBe(true);
  });

  it("rejects missing or non-https config", () => {
    expect(isUsableKvConfig(undefined, "tok")).toBe(false);
    expect(isUsableKvConfig("https://real.upstash.io", undefined)).toBe(false);
    expect(isUsableKvConfig("http://real.upstash.io", "tok")).toBe(false);
    expect(isUsableKvConfig("https://real.upstash.io", "")).toBe(false);
  });

  it("rejects the .env.local.example placeholders", () => {
    expect(isUsableKvConfig("https://example-kv.upstash.io", "tok")).toBe(false);
    expect(isUsableKvConfig("https://real.upstash.io", "replace_me")).toBe(
      false,
    );
  });
});
