import { notFound } from "next/navigation";

import { TrackMount } from "@/components/analytics/TrackMount";
import { CampaignSummary } from "@/components/checkout/CampaignSummary";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutMesh } from "@/components/checkout/CheckoutMesh";
import { DemoNotice } from "@/components/checkout/DemoNotice";
import { Footer } from "@/components/landing/Footer";
import { NavBar } from "@/components/landing/NavBar";
import { getCampaignById } from "@/lib/campaigns";
import { resolveDonationMode } from "@/lib/checkout/donation-mode";
import { submitDemoDonation } from "@/lib/checkout/demoSubmit";
import { DEMO_POLICY } from "@/lib/checkout/policy";
import { submitDonation } from "@/lib/checkout/submitDonation";

interface DonatePageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function DonatePage({ params }: DonatePageProps) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);
  if (!campaign) notFound();
  const isDemo = resolveDonationMode() === "demo";

  return (
    <>
      <TrackMount event={{ name: "donate_intent", campaignId: campaign.id }} />
      <CheckoutMesh />
      <NavBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-6">
          <CampaignSummary campaign={campaign} />
        </div>
        {isDemo ? (
          <>
            <DemoNotice />
            <CheckoutForm
              campaignId={campaign.id}
              policy={DEMO_POLICY}
              onSubmit={submitDemoDonation}
            />
          </>
        ) : (
          <CheckoutForm campaignId={campaign.id} onSubmit={submitDonation} />
        )}
      </main>
      <Footer />
    </>
  );
}
