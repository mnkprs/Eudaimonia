import { describe, expect, it } from "vitest";
import { clientIdentifier } from "./client-identifier";

const req = (headers: Record<string, string>) =>
  new Request("http://localhost/x", { headers });

describe("clientIdentifier", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(
      clientIdentifier(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIdentifier(req({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
  });

  it("falls back to a shared unknown bucket", () => {
    expect(clientIdentifier(req({}))).toBe("unknown");
  });

  it("treats an empty first hop as unknown", () => {
    expect(clientIdentifier(req({ "x-forwarded-for": " , 2.2.2.2" }))).toBe(
      "unknown",
    );
  });
});
