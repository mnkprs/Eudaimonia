import { CharityCard } from "@/components/receipt/CharityCard";
import { Footer } from "@/components/receipt/Footer";
import { Hero } from "@/components/receipt/Hero";
import { PizzaTracker } from "@/components/receipt/PizzaTracker";
import { ShareRow } from "@/components/receipt/ShareRow";
import { VerificationCard } from "@/components/receipt/VerificationCard";
import { isAddress } from "viem";
import { baseSepolia } from "wagmi/chains";

import { deriveBaseScanUrl } from "@/lib/endaoment/registry";
import { deriveTxUrl } from "@/lib/explorer";
import { colors } from "@/lib/tokens";
import type { ReceiptBundle } from "@/types/receipt";

interface EudaimoniaReceiptProps {
  bundle: ReceiptBundle;
  trackerVariant?: "card" | "minimal";
  showFeeStrip?: boolean;
  /** Chain the receipt settled on; picks the explorer origin. Defaults to Base Sepolia. */
  chainId?: number;
}

export function EudaimoniaReceipt({
  bundle,
  trackerVariant = "card",
  showFeeStrip = true,
  chainId = baseSepolia.id,
}: EudaimoniaReceiptProps) {
  const { txid, charityAddr } = bundle.data;
  const txUrl = deriveTxUrl(txid, chainId);
  // `charityAddr` is the full org address for live bundles; skip the link for
  // any truncated display string rather than emitting a broken URL.
  const orgUrl = isAddress(charityAddr, { strict: false })
    ? deriveBaseScanUrl(charityAddr, chainId)
    : undefined;

  return (
    <div
      style={{
        background: colors.canvas,
        color: colors.ink,
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
        fontWeight: 300,
        fontFeatureSettings: '"ss01"',
        WebkitFontSmoothing: "antialiased",
        minHeight: "100%",
      }}
    >
      <Hero data={bundle.data} />
      <PizzaTracker
        stages={bundle.stages}
        variant={trackerVariant}
        txid={txid}
        chainId={chainId}
      />
      <CharityCard data={bundle.data} baseScanUrl={orgUrl} />
      <VerificationCard
        data={bundle.data}
        showFeeStrip={showFeeStrip}
        baseScanUrl={txUrl}
        orgBaseScanUrl={orgUrl}
      />
      <ShareRow />
      <Footer network={bundle.data.network} />
    </div>
  );
}
