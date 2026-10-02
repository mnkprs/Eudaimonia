import { AuthorityStrip } from "@/components/landing/AuthorityStrip";
import { CausesGrid } from "@/components/landing/CausesGrid";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { CreamBand } from "@/components/landing/CreamBand";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { NavBar } from "@/components/landing/NavBar";
import { LiveReceiptStripMount } from "@/components/receipt/LiveReceiptStripMount";
import { TrackMount } from "@/components/analytics/TrackMount";
import { getCampaigns } from "@/lib/campaigns";
import { resolveAppChainId } from "@/lib/chain";
import { resolveDonationMode } from "@/lib/checkout/donation-mode";
import { getExampleReceiptHref } from "@/lib/demo/sample-receipts";

// Per-request SSR so the nonce-based CSP (src/proxy.ts) applies — static
// prerender bakes scripts at build time with no nonce.
export const dynamic = "force-dynamic";

export default function Home() {
  const exampleReceiptHref = getExampleReceiptHref(resolveAppChainId());
  const isDemo = resolveDonationMode() === "demo";

  return (
    <>
      <TrackMount event={{ name: "landing_view" }} />
      <NavBar receiptsHref={exampleReceiptHref} />
      <main>
        <Hero exampleReceiptHref={exampleReceiptHref} isDemo={isDemo} />
        <AuthorityStrip />
        <CausesGrid campaigns={getCampaigns()} />
        <CreamBand exampleReceiptHref={exampleReceiptHref} />
        <HowItWorks />
        <LiveReceiptStripMount />
        <ClosingCTA exampleReceiptHref={exampleReceiptHref} />
      </main>
      <Footer />
    </>
  );
}
