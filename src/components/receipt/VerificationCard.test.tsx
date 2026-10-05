import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { VerificationCard } from "@/components/receipt/VerificationCard";
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

describe("VerificationCard fee strip amounts", () => {
  test("charity received is gross minus both fees, with a single $ sign", () => {
    const html = renderToString(
      <VerificationCard
        data={{ ...FIXTURE, amount: "2.00", platformFee: "0.02", endaomentFee: "0.0297" }}
      />,
    );
    expect(html).toMatch(/Charity received.*\$<!-- -->1\.9503|Charity received.*\$1\.9503/s);
    expect(html).not.toContain("$$");
  });
});

describe("VerificationCard", () => {
  test("renders the transaction hash", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain(FIXTURE.txid);
  });

  test("renders the block number", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("30,918,548");
  });

  test("renders the network name", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("Base");
  });

  test('renders "Verified by Endaoment" badge', () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("Verified by Endaoment");
  });

  test("BaseScan link uses placeholder href when baseScanUrl is not provided", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("BaseScan");
  });

  test("BaseScan link uses real baseScanUrl when provided", () => {
    const url = "https://basescan.org/address/0xabc123";
    const html = renderToString(
      <VerificationCard data={FIXTURE} baseScanUrl={url} />,
    );
    expect(html).toContain(`href="${url}"`);
  });

  test("fee strip renders when showFeeStrip=true (default)", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("Donor paid");
  });

  test("fee strip is hidden when showFeeStrip=false", () => {
    const html = renderToString(
      <VerificationCard data={FIXTURE} showFeeStrip={false} />,
    );
    expect(html).not.toContain("Donor paid");
  });
});

describe("VerificationCard on Base Sepolia", () => {
  const SEPOLIA: ReceiptData = { ...FIXTURE, network: "Base Sepolia" };

  test("fee strip labels the Endaoment fee as a stand-in", () => {
    const html = renderToString(<VerificationCard data={SEPOLIA} />);
    expect(html).toContain("Endaoment fee (stand-in)");
  });

  test("proof badge reads testnet stand-in and links to the org address", () => {
    const url = "https://sepolia.basescan.org/address/0xabc";
    const html = renderToString(
      <VerificationCard data={SEPOLIA} orgBaseScanUrl={url} />,
    );
    expect(html).toContain("Testnet stand-in");
    expect(html).not.toContain("Verified by Endaoment");
    expect(html).toContain(`href="${url}"`);
  });

  test("mainnet copy is unchanged", () => {
    const html = renderToString(<VerificationCard data={FIXTURE} />);
    expect(html).toContain("Endaoment fee");
    expect(html).not.toContain("(stand-in)");
    expect(html).toContain("Verified by Endaoment");
  });
});
