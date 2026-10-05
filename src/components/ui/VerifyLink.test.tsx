import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { VerifyLink } from "@/components/ui/VerifyLink";

describe("VerifyLink", () => {
  test("links to the explorer when an href is known", () => {
    const html = renderToString(<VerifyLink label="Verify ↗" href="https://sepolia.basescan.org/tx/0x1" />);
    expect(html).toContain('href="https://sepolia.basescan.org/tx/0x1"');
    expect(html).toContain("Verify ↗");
  });

  test("renders an inert, non-link label when there is nothing to verify yet", () => {
    const html = renderToString(<VerifyLink label="Verify ↗" />);
    expect(html).not.toContain("<a");
    expect(html).not.toContain('href="#"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Verify ↗");
  });
});
