import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DemoNotice } from "@/components/checkout/DemoNotice";

describe("DemoNotice", () => {
  test("renders the TESTNET pill", () => {
    expect(renderToString(<DemoNotice />)).toContain("TESTNET");
  });

  test("states that no real money moves", () => {
    const html = renderToString(<DemoNotice />);
    expect(html).toContain("Testnet demo — no real money.");
  });

  test("explains test USDC on Base Sepolia to stand-in charity contracts", () => {
    const html = renderToString(<DemoNotice />);
    expect(html).toContain(
      "Donations send test USDC on Base Sepolia to testnet stand-in charity contracts.",
    );
  });

  test("is exposed as a status region for assistive tech", () => {
    expect(renderToString(<DemoNotice />)).toMatch(/role="status"/);
  });
});
