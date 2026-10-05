import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Footer } from "@/components/receipt/Footer";

describe("Footer", () => {
  test("mainnet disclaimer is unchanged by default", () => {
    const html = renderToString(<Footer />);
    expect(html).toContain("Donations are tax-deductible");
    expect(html).toContain("Endaoment Inc.");
    expect(html).not.toContain("Base Sepolia");
  });

  test("Base Sepolia replaces it with the testnet stand-in disclosure", () => {
    const html = renderToString(<Footer network="Base Sepolia" />);
    expect(html).toContain("test USDC on Base Sepolia");
    expect(html).toContain("no real money moved");
    expect(html).toContain("not tax-deductible");
    expect(html).toContain("not affiliated with Endaoment");
    expect(html).not.toContain("Donations are tax-deductible");
  });

  test("links How fees work to the fee policy page", () => {
    const html = renderToString(<Footer />);
    expect(html).toContain('href="/fee-policy"');
  });
});

describe("Footer links (MVP)", () => {
  test("has no dead # links and links the public source code", () => {
    const html = renderToString(<Footer network="Base Sepolia" />);
    expect(html).not.toContain('href="#"');
    expect(html).toContain('href="https://github.com/mnkprs/Eudaimonia"');
  });
});
