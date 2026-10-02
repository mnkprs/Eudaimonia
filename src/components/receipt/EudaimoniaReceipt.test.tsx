import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { base, baseSepolia } from "wagmi/chains";

import { EudaimoniaReceipt } from "@/components/receipt/EudaimoniaReceipt";
import { RECEIPT_BUNDLE_FIXTURE } from "@/lib/fixtures";
import type { ReceiptBundle } from "@/types/receipt";

const ORG = "0x4444444444444444444444444444444444444444";

const BUNDLE: ReceiptBundle = {
  ...RECEIPT_BUNDLE_FIXTURE,
  data: { ...RECEIPT_BUNDLE_FIXTURE.data, charityAddr: ORG },
};
const TX = BUNDLE.data.txid;

describe("EudaimoniaReceipt explorer links", () => {
  test("links the transaction, event log and org address on Base Sepolia", () => {
    const html = renderToString(
      <EudaimoniaReceipt bundle={BUNDLE} chainId={baseSepolia.id} />,
    );

    expect(html).toContain(`https://sepolia.basescan.org/tx/${TX}"`);
    expect(html).toContain(`https://sepolia.basescan.org/tx/${TX}#eventlog`);
    expect(html).toContain(`https://sepolia.basescan.org/address/${ORG}`);
  });

  test("uses the mainnet BaseScan origin on Base", () => {
    const html = renderToString(
      <EudaimoniaReceipt bundle={BUNDLE} chainId={base.id} />,
    );

    expect(html).toContain(`https://basescan.org/tx/${TX}"`);
    expect(html).toContain(`https://basescan.org/address/${ORG}`);
    expect(html).not.toContain("sepolia.basescan.org");
  });

  test("makes the Endaoment badge a link to the org address", () => {
    const html = renderToString(
      <EudaimoniaReceipt bundle={BUNDLE} chainId={baseSepolia.id} />,
    );
    const badgeLinks = html.match(
      /<a [^>]*aria-label="Verified by Endaoment[^>]*>/g,
    );

    expect(badgeLinks).toHaveLength(2);
    for (const link of badgeLinks ?? []) {
      expect(link).toContain(`/address/${ORG}`);
    }
  });

  test("does not link an org that is only a truncated display string", () => {
    const html = renderToString(
      <EudaimoniaReceipt
        bundle={RECEIPT_BUNDLE_FIXTURE}
        chainId={baseSepolia.id}
      />,
    );

    expect(html).not.toContain("/address/0x10e9");
  });
});
