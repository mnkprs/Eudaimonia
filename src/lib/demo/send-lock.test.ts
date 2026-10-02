import { describe, expect, it } from "vitest";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { withSendLock } from "./send-lock";

const KEY = "demo:send-lock";
const base = { key: KEY, ttlSeconds: 30, waitMs: 1000, pollMs: 100 };

describe("withSendLock", () => {
  it("runs fn and releases the lock", async () => {
    const store = createInMemoryKvStore();
    const result = await withSendLock(store, async () => "done", {
      ...base,
      sleep: async () => {},
    });
    expect(result).toEqual({ acquired: true, value: "done" });
    expect(await store.has(KEY)).toBe(false);
  });

  it("serializes two callers", async () => {
    const store = createInMemoryKvStore();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withSendLock(
      store,
      async () => {
        events.push("first:start");
        await gate;
        events.push("first:end");
      },
      { ...base, sleep: async () => {} },
    );
    await Promise.resolve();
    await Promise.resolve();

    const second = withSendLock(
      store,
      async () => {
        events.push("second:start");
      },
      {
        ...base,
        sleep: async () => {
          releaseFirst();
          await first;
        },
      },
    );

    const [a, b] = await Promise.all([first, second]);
    expect(a.acquired && b.acquired).toBe(true);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("times out without running fn when the lock stays held", async () => {
    const store = createInMemoryKvStore();
    await store.setNx(KEY, "someone-else", 30);
    let slept = 0;
    let ran = false;
    const result = await withSendLock(
      store,
      async () => {
        ran = true;
      },
      {
        ...base,
        sleep: async (ms) => {
          slept += ms;
        },
      },
    );
    expect(result).toEqual({ acquired: false });
    expect(ran).toBe(false);
    expect(slept).toBeGreaterThanOrEqual(base.waitMs);
    expect(await store.get(KEY)).toBe("someone-else");
  });

  it("releases when fn throws", async () => {
    const store = createInMemoryKvStore();
    await expect(
      withSendLock(
        store,
        async () => {
          throw new Error("boom");
        },
        { ...base, sleep: async () => {} },
      ),
    ).rejects.toThrow("boom");
    expect(await store.has(KEY)).toBe(false);
  });

  it("does not delete a lock now held by someone else", async () => {
    const store = createInMemoryKvStore();
    await withSendLock(
      store,
      async () => {
        // Simulate TTL expiry + another holder taking over mid-flight.
        await store.set(KEY, "other-token", 30);
      },
      { ...base, sleep: async () => {}, token: "mine" },
    );
    expect(await store.get(KEY)).toBe("other-token");
  });
});
