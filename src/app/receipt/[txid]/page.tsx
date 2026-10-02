import type { Metadata } from "next";

import { TrackMount } from "@/components/analytics/TrackMount";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { resolveAppChainId } from "@/lib/chain";
import { loadReceiptForMetadata } from "@/lib/receipt/loadReceiptForMetadata";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptPageProps {
  params: Promise<{ txid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------------------------------------------------------------------------
// generateMetadata — server-side, independent of the client page body (D4)
// ---------------------------------------------------------------------------

/**
 * Generates Open Graph + Twitter share metadata for a donation receipt.
 *
 * Resolved:  "<charity> donation — Verified on Eudaimonia" + amount description.
 * Fallback:  generic "Donation receipt — Eudaimonia" when the receipt cannot
 *            be decoded (tx not found, wrong network, decode failure).
 *
 * Next auto-wires `opengraph-image.tsx` as `og:image` — we do NOT set
 * `openGraph.images` manually to avoid duplicating the auto-wired route.
 */
export async function generateMetadata({
  params,
}: ReceiptPageProps): Promise<Metadata> {
  const { txid } = await params;

  const chainId = resolveAppChainId();

  const receipt = await loadReceiptForMetadata(
    txid as `0x${string}`,
    chainId,
  );

  if (receipt) {
    const title = `${receipt.charityName} donation — Verified on Eudaimonia`;
    const description = `${receipt.amountUsdc} USDC donated to ${receipt.charityName}, verified on-chain via Eudaimonia.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  }

  // Fallback — valid metadata, no charity-specific details
  const fallbackTitle = "Donation receipt — Eudaimonia";
  const fallbackDescription =
    "A verified on-chain donation receipt, powered by Eudaimonia.";

  return {
    title: fallbackTitle,
    description: fallbackDescription,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDescription,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fallbackTitle,
      description: fallbackDescription,
    },
  };
}

// ---------------------------------------------------------------------------
// Page — server shell (D4: full client rendering via ReceiptView)
// ---------------------------------------------------------------------------

/**
 * Server shell for `/receipt/[txid]`.
 *
 * Parses the dynamic route param and delegates all data loading + rendering
 * to the `ReceiptView` client component, which calls `useReceipt` via wagmi.
 *
 * `generateMetadata` and `opengraph-image` are independent server exports —
 * the shell body is not affected by the metadata layer.
 */
export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { txid } = await params;

  return (
    <main>
      <TrackMount event={{ name: "receipt_viewed" }} />
      <ReceiptView txid={txid} chainId={resolveAppChainId()} />
    </main>
  );
}
