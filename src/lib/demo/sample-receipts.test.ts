import { describe, expect, test } from "vitest";

import { getExampleReceiptHref } from "./sample-receipts";

const HASH_A = `0x${"a".repeat(64)}` as const;
const HASH_B = `0x${"b".repeat(64)}` as const;

describe("getExampleReceiptHref", () => {
  test("defaults to the PCRF smoke donation recorded for the Base Sepolia demo", () => {
    expect(getExampleReceiptHref(84532)).toBe(
      "/receipt/0x31335acb9328ae3136adb552943a07844c806165aaa43b547628986433c3cd9e",
    );
  });

  test("has no default sample on Base mainnet", () => {
    expect(getExampleReceiptHref(8453)).toBeNull();
  });

  test("returns the receipt path of the first sample on the chain", () => {
    const samples = { 84532: [HASH_A, HASH_B] };
    expect(getExampleReceiptHref(84532, samples)).toBe(`/receipt/${HASH_A}`);
  });

  test("returns null when the chain has no samples", () => {
    expect(getExampleReceiptHref(84532, { 84532: [] })).toBeNull();
  });

  test("returns null for a chain without an entry (e.g. mainnet)", () => {
    expect(getExampleReceiptHref(8453, { 84532: [HASH_A] })).toBeNull();
  });

  test("ignores a malformed hash rather than linking to a broken receipt", () => {
    expect(getExampleReceiptHref(84532, { 84532: ["0x1234"] })).toBeNull();
  });
});
