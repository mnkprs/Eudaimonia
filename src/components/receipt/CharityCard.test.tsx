import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CharityCard } from "@/components/receipt/CharityCard";
import type { ReceiptData } from "@/types/receipt";

const FIXTURE: ReceiptData = {
  donorShort: "0xe0adb1…7a097bb",
  charity: "Palestine Children's Relief Fund",
  ein: "95-1234567",
  mission: "Providing medical care to children in the Middle East.",
  amount: "10.00",
  amountUsdc: "10.001017",
  date: "May 30, 2025",
  time: "5:34 PM UTC",
  network: "Base",
  txid: "0xdc67000000000000000000000000000000000000000000000000000000000078ed",
  txidShort: "0xdc67…78ed",
  block: "30,918,548",
  confirmations: "12",
  ethIn: "0.0000627",
  rate: "1 ETH = 15,975 USDC",
  platformFee: "0.00",
  endaomentFee: "0.15",
  orgFund: "0xorgfund000000000000000000000000000000000001",
  charityAddr: "0xcharityaddr00000000000000000000000000000001",
  donorFee: "0.00",
};

describe("CharityCard", () => {
  test("renders the charity name", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    // React SSR encodes apostrophes; assert unambiguous fragments
    expect(html).toContain("Palestine");
    expect(html).toContain("Relief Fund");
  });

  test("renders the EIN", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    expect(html).toContain(FIXTURE.ein);
  });

  test("renders the mission statement", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    expect(html).toContain(FIXTURE.mission);
  });

  test('renders "Verified by Endaoment" badge', () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    expect(html).toContain("Verified by Endaoment");
  });

  test("badge renders as a plain span when no baseScanUrl is provided", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    // No anchor pointing to BaseScan in the badge area
    expect(html).not.toContain("basescan.org");
  });

  test("badge renders as an anchor linking to baseScanUrl when provided", () => {
    const url = "https://basescan.org/address/0xabc123";
    const html = renderToString(
      <CharityCard data={FIXTURE} baseScanUrl={url} />,
    );
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("Verified by Endaoment");
  });

  test("derives monogram from charity name when monogram prop is omitted", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    // "Palestine Children's" → "PC"
    expect(html).toContain("PC");
  });

  test("uses custom monogram when supplied", () => {
    const html = renderToString(<CharityCard data={FIXTURE} monogram="XY" />);
    expect(html).toContain("XY");
  });
});

describe("CharityCard on Base Sepolia", () => {
  const SEPOLIA: ReceiptData = { ...FIXTURE, network: "Base Sepolia" };

  test("labels the recipient a testnet stand-in, not a verified Endaoment fund", () => {
    const html = renderToString(<CharityCard data={SEPOLIA} />);
    expect(html).toContain("Testnet stand-in");
    expect(html).not.toContain("Verified by Endaoment");
    expect(html).not.toContain("Endaoment Org Fund");
    expect(html).toContain(SEPOLIA.ein);
  });

  test("keeps the explorer link on the stand-in badge", () => {
    const url = "https://sepolia.basescan.org/address/0xabc123";
    const html = renderToString(<CharityCard data={SEPOLIA} baseScanUrl={url} />);
    expect(html).toContain(`href="${url}"`);
  });

  test("mainnet copy is unchanged", () => {
    const html = renderToString(<CharityCard data={FIXTURE} />);
    expect(html).toContain("Endaoment Org Fund");
    expect(html).not.toContain("Testnet stand-in");
  });
});
