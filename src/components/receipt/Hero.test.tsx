import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Hero } from "@/components/receipt/Hero";
import { RECEIPT_FIXTURE } from "@/lib/fixtures";

describe("receipt Hero", () => {
  test("charity chip shows the charity's own initials, not the design mock's", () => {
    const html = renderToString(<Hero data={{ ...RECEIPT_FIXTURE, charity: "Direct Relief" }} />);
    expect(html).toContain(">DR<");
    expect(html).not.toContain(">BW<");
  });

  test("headline shows the amount with exactly one dollar sign", () => {
    const html = renderToString(<Hero data={{ ...RECEIPT_FIXTURE, amount: "2.00" }} />);
    expect(html).toMatch(/\$(<!-- -->)?2\.00/);
    expect(html).not.toContain("$$");
  });
});
