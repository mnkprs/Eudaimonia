import { describe, expect, it, vi } from "vitest";

import type { CheckoutPayload } from "@/types/checkout";
import { DEMO_ENDPOINT, DemoSubmitError, submitDemoDonation } from "./demoSubmit";

const TX_HASH = `0x${"ab".repeat(32)}`;

const PAYLOAD: CheckoutPayload = Object.freeze({
  campaignId: "pcrf",
  grossCents: 200,
  email: "donor@example.com",
  note: "private note",
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(code: string, status: number): Response {
  return jsonResponse({ error: { code, message: "server text" } }, status);
}

async function run(response: Response | Error) {
  const redirect = vi.fn();
  const fetchImpl = vi.fn(async (..._args: Parameters<typeof fetch>) => {
    if (response instanceof Error) throw response;
    return response;
  });
  const result = await submitDemoDonation(PAYLOAD, { redirect, fetchImpl }).then(
    () => null,
    (error: unknown) => error,
  );
  return { redirect, fetchImpl, error: result };
}

describe("submitDemoDonation()", () => {
  it("POSTs only campaignId and grossCents to /api/demo/donate", async () => {
    const { fetchImpl } = await run(jsonResponse({ txHash: TX_HASH }));

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(DEMO_ENDPOINT);
    expect(DEMO_ENDPOINT).toBe("/api/demo/donate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      campaignId: "pcrf",
      grossCents: 200,
    });
  });

  it("redirects to a client-built receipt path on success", async () => {
    const { redirect, error } = await run(jsonResponse({ txHash: TX_HASH }));
    expect(error).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith(`/receipt/${TX_HASH}`);
  });

  it("ignores any server-supplied url", async () => {
    const { redirect } = await run(
      jsonResponse({ txHash: TX_HASH, redirectUrl: "https://evil.example" }),
    );
    expect(redirect).toHaveBeenCalledWith(`/receipt/${TX_HASH}`);
  });

  it.each([
    ["missing txHash", {}],
    ["short txHash", { txHash: "0x1234" }],
    ["non-hex txHash", { txHash: `0x${"zz".repeat(32)}` }],
    ["path-traversal txHash", { txHash: "../../etc/passwd" }],
    ["non-string txHash", { txHash: 5 }],
  ])("throws unexpected_response for %s", async (_name, body) => {
    const { redirect, error } = await run(jsonResponse(body));
    expect(error).toBeInstanceOf(DemoSubmitError);
    expect(error).toMatchObject({ code: "unexpected_response" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("throws network_error when fetch rejects", async () => {
    const { redirect, error } = await run(new TypeError("offline"));
    expect(error).toMatchObject({ name: "DemoSubmitError", code: "network_error" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("throws unexpected_response for a non-envelope error body", async () => {
    const { error } = await run(new Response("<html>", { status: 500 }));
    expect(error).toMatchObject({ code: "unexpected_response" });
  });

  it.each([
    ["invalid_request", 400],
    ["rate_limited", 429],
    ["demo_daily_cap", 429],
    ["demo_disabled", 503],
    ["demo_busy", 503],
    ["demo_wallet_empty", 503],
    ["demo_misconfigured", 503],
    ["chain_error", 502],
  ])("maps %s to a typed error with a friendly message", async (code, status) => {
    const { redirect, error } = await run(errorResponse(code, status));
    expect(error).toBeInstanceOf(DemoSubmitError);
    expect(error).toMatchObject({ code });
    expect((error as DemoSubmitError).message).not.toBe("server text");
    expect((error as DemoSubmitError).message.length).toBeGreaterThan(10);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("uses the agreed copy for wallet-empty and rate-limited", async () => {
    const empty = await run(errorResponse("demo_wallet_empty", 503));
    expect((empty.error as Error).message).toBe(
      "The demo wallet is out of test funds right now — try again later.",
    );
    const limited = await run(errorResponse("rate_limited", 429));
    expect((limited.error as Error).message).toBe(
      "Too many test donations from your network — try again in a few minutes.",
    );
  });

  it("treats an unknown error code as unexpected_response", async () => {
    const { error } = await run(errorResponse("totally_new", 500));
    expect(error).toMatchObject({ code: "unexpected_response" });
  });
});
